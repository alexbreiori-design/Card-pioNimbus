'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PRODUCTS, CATEGORIES } from '@/lib/data/products';
import { formatPrice } from '@/lib/utils/format';
import { fetchViaCep } from '@/lib/cep/viacep';
import { findCupomByCode } from '@/lib/cupons';
import {
  mergePromocoesIntoCardapio,
  prependPromoCategory,
  PROMO_CATEGORY_NAME,
} from '@/lib/promocoes';
import { ADMIN_STORAGE_KEY, DEFAULT_ADMIN_DATA, withDerivedData } from '@/lib/adminData';
import { ensureCustomer, normalizePhone, updateCustomerStats } from '@/lib/supabase/customers';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { trackMetaEvent } from '@/lib/meta/pixel';
import { getEmpresaBySlug, mergeEmpresaIntoLoja } from '@/lib/supabase/empresa';
import { fetchStoreStateBySlug } from '@/lib/supabase/storeState';

const CardapioContext = createContext(null);

const STORE_ADDRESS = DEFAULT_ADMIN_DATA.loja.endereco;
const STEP_LABELS = ['Dados', 'Entrega', 'Pagamento', 'Confirmar'];

const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', group: 'Pagar online' },
  { id: 'dinheiro', label: 'Dinheiro', group: 'Pagar na entrega' },
  { id: 'credito', label: 'Cartão de crédito', group: 'Pagar na entrega' },
  { id: 'debito', label: 'Cartão de débito', group: 'Pagar na entrega' },
  { id: 'vale', label: 'Vale refeição', group: 'Pagar na entrega' },
];

const PAY_LABELS = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  vale: 'Vale refeição',
};
const PROFILE_STORAGE_KEY = 'cardapio_profile_v1';

function hexToRgb(hex) {
  const normalized = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function mixColors(hex, target, weight) {
  const from = hexToRgb(hex);
  const to = hexToRgb(target);
  if (!from || !to) return hex;
  return rgbToHex({
    r: from.r * (1 - weight) + to.r * weight,
    g: from.g * (1 - weight) + to.g * weight,
    b: from.b * (1 - weight) + to.b * weight,
  });
}

/** Aplica cor de destaque apenas no cardápio público (não altera --admin-* do painel). */
function applyBrandColor(hex) {
  const brand = hex || '#610C27';
  const target = document.querySelector('.cardapio-theme-root') || document.documentElement;
  target.style.setProperty('--brand', brand);
  target.style.setProperty('--brand-hover', mixColors(brand, '#000000', 0.18));
  target.style.setProperty('--brand-light', mixColors(brand, '#ffffff', 0.9));
  target.style.setProperty('--brand-mid', mixColors(brand, '#ffffff', 0.42));
}

function getInitialProfile() {
  if (typeof window === 'undefined') {
    return { name: 'Seu nome', phone: '(00) 00000-0000', image: '' };
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { name: 'Seu nome', phone: '(00) 00000-0000', image: '' };
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || 'Seu nome',
      phone: parsed.phone || '(00) 00000-0000',
      image: parsed.image || '',
    };
  } catch {
    return { name: 'Seu nome', phone: '(00) 00000-0000', image: '' };
  }
}

export function CardapioProvider({ children, slug = '' }) {
  const [storeConfig, setStoreConfig] = useState(DEFAULT_ADMIN_DATA.loja);
  const [dynamicProducts, setDynamicProducts] = useState(PRODUCTS);
  const [dynamicCategories, setDynamicCategories] = useState(CATEGORIES);
  const [page, setPage] = useState('main');
  const [navActive, setNavActive] = useState('navInicio');
  const [mobileNavActive, setMobileNavActive] = useState('mNavInicio');

  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const [currentDeliveryMode, setCurrentDeliveryMode] = useState('retirar');
  const [deliveryMiniOpen, setDeliveryMiniOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryMeta, setDeliveryMeta] = useState(null);

  const [productOpen, setProductOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQty, setCurrentQty] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [addonExtras, setAddonExtras] = useState(0);
  const [popupHeaderCompact, setPopupHeaderCompact] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState({
    name: '',
    phone: '',
    delivery: 'retirar',
    payment: '',
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutOrderNumber, setCheckoutOrderNumber] = useState('');
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');

  const [cepOpen, setCepOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [cupomOpen, setCupomOpen] = useState(false);

  const [cepValue, setCepValue] = useState('');
  const [addrForm, setAddrForm] = useState({
    cep: '',
    rua: '',
    num: '',
    bairro: '',
    comp: '',
    ref: '',
    cidade: 'São Paulo',
    estado: 'SP',
  });
  const [cupomValue, setCupomValue] = useState('');
  const [availableCupons, setAvailableCupons] = useState([]);
  const [appliedCupom, setAppliedCupom] = useState(null);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const initialProfile = getInitialProfile();
  const [profileImage, setProfileImage] = useState(initialProfile.image);
  const [profileDisplayName, setProfileDisplayName] = useState(initialProfile.name);
  const [profileDisplayPhone, setProfileDisplayPhone] = useState(initialProfile.phone);

  const [showMobileSacola, setShowMobileSacola] = useState(false);

  const popupDetailsRef = useRef(null);
  const cepInputRef = useRef(null);
  const cupomInputRef = useRef(null);

  const modalOpen =
    productOpen || checkoutOpen || cepOpen || addressOpen || cupomOpen;

  useEffect(() => {
    const targetSlug =
      String(slug || '')
        .trim()
        .toLowerCase() ||
      (typeof window !== 'undefined'
        ? window.location.pathname.split('/').filter(Boolean).at(-1)?.toLowerCase() || ''
        : '');

    const syncFromAdmin = async () => {
      try {
        let parsed = null;
        try {
          const remote = await fetchStoreStateBySlug(targetSlug);
          if (remote?.data) {
            parsed = withDerivedData(remote.data);
            window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch {
          // Falha remota nao bloqueia fallback local.
        }

        if (!parsed) {
          const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
          if (raw) parsed = withDerivedData(JSON.parse(raw));
        }

        if (!parsed) {
          applyBrandColor(DEFAULT_ADMIN_DATA.loja.corMarca);
          return;
        }

        let loja = parsed.loja;
        if (targetSlug) {
          try {
            const empresa = await getEmpresaBySlug(targetSlug);
            loja = mergeEmpresaIntoLoja(loja, empresa);
          } catch {
            /* mantém loja do estado remoto/local */
          }
        }

        const cats = parsed.categorias.filter((c) => c.ativo);
        const categoryOrder = new Map(cats.map((c, idx) => [c.id, idx]));
        const activeAddons = parsed.adicionaisItens.filter((item) => item.ativo !== false);
        const addonByCategory = new Map();
        activeAddons.forEach((item) => {
          if (!addonByCategory.has(item.categoriaId)) addonByCategory.set(item.categoriaId, []);
          addonByCategory.get(item.categoriaId).push(item);
        });

        function normalizeSelection(selection) {
          return {
            categoriaIds: Array.isArray(selection?.categoriaIds) ? selection.categoriaIds : [],
            itemIds: Array.isArray(selection?.itemIds) ? selection.itemIds : [],
          };
        }

        function buildAddonSections(selection, sectionTitlePrefix = '') {
          const safe = normalizeSelection(selection);
          const sections = [];

          safe.categoriaIds.forEach((categoryId) => {
            const category = parsed.adicionaisCategorias.find((cat) => cat.id === categoryId && cat.ativo !== false);
            if (!category) return;
            const items = (addonByCategory.get(categoryId) || []).map((item) => ({
              id: item.id,
              name: item.nome,
              desc: item.descricao || '',
              extra: Number(item.preco || 0),
            }));
            if (!items.length) return;
            sections.push({
              section: `${sectionTitlePrefix}${category.nome}`,
              required: false,
              max: items.length,
              items,
            });
          });

          const singles = safe.itemIds
            .map((id) => activeAddons.find((item) => item.id === id))
            .filter(Boolean)
            .map((item) => ({
              id: item.id,
              name: item.nome,
              desc: item.descricao || '',
              extra: Number(item.preco || 0),
            }));

          if (singles.length) {
            sections.push({
              section: `${sectionTitlePrefix}Selecionados`,
              required: false,
              max: singles.length,
              items: singles,
            });
          }

          return sections;
        }

        const sizeLookup = new Map(
          parsed.produtos
            .filter((item) => item.tipo === 'tamanho_pizza')
            .map((item) => [item.id, { nome: item.nome, preco: Number(item.preco || 0) }])
        );

        const prods = [...parsed.produtos]
          .filter((p) => p.ativo)
          .sort((a, b) => {
            const catCmp = (categoryOrder.get(a.categoriaId) ?? 9999) - (categoryOrder.get(b.categoriaId) ?? 9999);
            if (catCmp !== 0) return catCmp;
            return (a.ordem ?? 0) - (b.ordem ?? 0);
          })
          .map((p) => {
            const pizzaConfig = p.pizzaConfig
              ? {
                  ...p.pizzaConfig,
                  tamanhoConfig: (p.pizzaConfig.tamanhoConfig || []).map((sizeCfg) => ({
                    ...sizeCfg,
                    tamanhoNome: sizeLookup.get(sizeCfg.tamanhoId)?.nome || sizeCfg.tamanhoId,
                    tamanhoPreco: sizeLookup.get(sizeCfg.tamanhoId)?.preco || 0,
                  })),
                }
              : null;
            return {
            id: p.id,
            category: cats.find((c) => c.id === p.categoriaId)?.nome || 'Sem categoria',
            name: p.nome,
            desc: p.descricao || '',
            price: Number(p.preco || 0),
            imageUrl: p.imagemUrl || '',
            addons: buildAddonSections(p.adicionais),
            type: p.tipo || 'comum',
            pizzaConfig,
          };
          });
        const { products: mergedProducts } = mergePromocoesIntoCardapio(
          prods,
          parsed.promocoes,
          parsed.produtos
        );
        const hasPromos = mergedProducts.some((p) => p.category === PROMO_CATEGORY_NAME);
        const categoryNames = prependPromoCategory(
          cats.map((c) => c.nome),
          hasPromos
        );

        setDynamicProducts(mergedProducts);
        setDynamicCategories(['Todos', ...categoryNames]);
        setAvailableCupons((parsed.cupons || []).filter((c) => c.ativo !== false));
        setStoreConfig(loja);
        applyBrandColor(loja.corMarca);
      } catch {}
    };
    syncFromAdmin();
    window.addEventListener('storage', syncFromAdmin);
    window.addEventListener('admin-data-updated', syncFromAdmin);
    return () => {
      window.removeEventListener('storage', syncFromAdmin);
      window.removeEventListener('admin-data-updated', syncFromAdmin);
    };
  }, [slug]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  useEffect(() => {
    const updateMobileSacola = () => {
      if (cart.length === 0) {
        setShowMobileSacola(false);
        return;
      }
      setShowMobileSacola(window.innerWidth < 768);
    };
    updateMobileSacola();
    window.addEventListener('resize', updateMobileSacola);
    return () => window.removeEventListener('resize', updateMobileSacola);
  }, [cart]);

  useEffect(() => {
    if (!categoryMenuOpen && !deliveryMiniOpen) return;
    const close = (e) => {
      if (categoryMenuOpen && !e.target.closest('.dropdown-wrapper')) {
        setCategoryMenuOpen(false);
      }
      if (deliveryMiniOpen && !e.target.closest('#locationBar')) {
        setDeliveryMiniOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [categoryMenuOpen, deliveryMiniOpen]);

  useEffect(() => {
    if (cepOpen && cepInputRef.current) {
      setTimeout(() => cepInputRef.current?.focus(), 100);
    }
  }, [cepOpen]);

  useEffect(() => {
    if (cupomOpen && cupomInputRef.current) {
      setTimeout(() => cupomInputRef.current?.focus(), 100);
    }
  }, [cupomOpen]);

  const cartSubtotal = useCallback(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );

  const cartTotal = useCallback(() => {
    const sub = cartSubtotal();
    const fee = currentDeliveryMode === 'entregar' ? Number(deliveryFee) || 0 : 0;
    const cupomOff = Number(appliedCupom?.valorDesconto) || 0;
    return Math.max(0, sub + fee - cupomOff);
  }, [cartSubtotal, currentDeliveryMode, deliveryFee, appliedCupom]);

  const cartCount = useCallback(
    () => cart.reduce((s, i) => s + i.qty, 0),
    [cart]
  );

  const recalcExtras = useCallback((product, addons) => {
    let extras = 0;
    if (!product) return 0;
    product.addons.forEach((sec, si) => {
      const sel = addons[si] || [];
      sel.forEach((id) => {
        const item = sec.items.find((i) => i.id === id);
        if (item) extras += item.extra;
      });
    });
    return extras;
  }, []);

  const showMainPage = useCallback(() => {
    setPage('main');
    setNavActive('navInicio');
    setMobileNavActive('mNavInicio');
    setSelectedCategory('Todos');
  }, []);

  const showOrdersPage = useCallback(() => {
    setPage('orders');
    setNavActive('navPedidos');
    setMobileNavActive('mNavPedidos');
  }, []);

  const showProfile = useCallback(() => {
    setPage('profile');
    setNavActive('navPerfil');
    setMobileNavActive('mNavPerfil');
  }, []);

  const setMobileNav = useCallback((id) => {
    setMobileNavActive(id);
  }, []);

  const saveProfile = useCallback(() => {
    const name = profileName.trim() || 'Seu nome';
    const phone = profilePhone.trim() || '(00) 00000-0000';
    setProfileDisplayName(name);
    setProfileDisplayPhone(phone);
    try {
      window.localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ name, phone, image: profileImage })
      );
    } catch {}
    showMainPage();
  }, [profileName, profilePhone, profileImage, showMainPage]);

  const filteredProducts = useMemo(() => {
    const cats =
      selectedCategory === 'Todos' ? [...new Set(dynamicProducts.map((p) => p.category))] : [selectedCategory];
    const sections = [];
    cats.forEach((cat) => {
      const items = dynamicProducts.filter(
        (p) =>
          p.category === cat &&
          (searchQuery === '' ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.desc.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      if (items.length > 0) sections.push({ category: cat, items });
    });
    return sections;
  }, [searchQuery, selectedCategory, dynamicProducts]);

  const relatedItems = useMemo(() => {
    const cartIds = new Set(cart.map((item) => item.productId));
    const lastProduct = cart.length
      ? dynamicProducts.find((p) => p.id === cart[cart.length - 1].productId)
      : null;

    let pool = dynamicProducts.filter((p) => !cartIds.has(p.id));
    if (lastProduct) {
      const sameCategory = pool.filter((p) => p.category === lastProduct.category);
      if (sameCategory.length > 0) pool = sameCategory;
    }
    return pool.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl || '',
    }));
  }, [cart, dynamicProducts]);

  const selectCategory = useCallback((cat) => {
    setSelectedCategory(cat);
    setCategoryMenuOpen(false);
  }, []);

  const toggleInfo = useCallback(() => setInfoOpen((v) => !v), []);

  const toggleDeliveryCard = useCallback((e) => {
    e.stopPropagation();
    setDeliveryMiniOpen((v) => !v);
  }, []);

  const selectDeliveryMode = useCallback(
    (mode) => {
      setCurrentDeliveryMode(mode);
      setDeliveryMiniOpen(false);
      if (mode === 'entregar') {
        setCepValue('');
        setCepOpen(true);
      } else {
        setDeliveryFee(0);
        setDeliveryMeta(null);
      }
    },
    []
  );

  const openCepPopup = useCallback(() => {
    setCepValue('');
    setCepOpen(true);
  }, []);

  const closeCepPopup = useCallback(() => {
    setCepOpen(false);
    if (!savedAddress) {
      setCurrentDeliveryMode('retirar');
    }
  }, [savedAddress]);

  const maskCep = useCallback((value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5, 8)}`;
    return v;
  }, []);

  const goToAddress = useCallback(async () => {
    setCepOpen(false);
    const cepDigits = cepValue.replace(/\D/g, '');
    if (cepDigits.length === 8) {
      try {
        const result = await fetchViaCep(cepDigits);
        if (result && !result.erro) {
          setAddrForm((f) => ({
            ...f,
            cep: maskCep(cepValue),
            rua: result.logradouro || f.rua,
            bairro: result.bairro || f.bairro,
            cidade: result.cidade || f.cidade,
            estado: result.estado || f.estado,
          }));
        } else {
          setAddrForm((f) => ({ ...f, cep: maskCep(cepValue) }));
          alert('CEP não encontrado. Preencha o endereço manualmente.');
        }
      } catch {
        setAddrForm((f) => ({ ...f, cep: maskCep(cepValue) }));
        alert('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
      }
    }
    setAddressOpen(true);
  }, [cepValue, maskCep]);

  const closeAddressPopup = useCallback(() => {
    setAddressOpen(false);
    if (!savedAddress) {
      setCurrentDeliveryMode('retirar');
    }
  }, [savedAddress]);

  const confirmAddress = useCallback(async () => {
    const { rua, num, bairro, cidade, estado, cep, comp, ref } = addrForm;
    if (!rua.trim() || !bairro.trim()) {
      alert('Preencha pelo menos a rua e o bairro.');
      return;
    }

    const storeSlug = String(storeConfig.slug || slug || '').toLowerCase();
    if (!storeSlug) {
      alert('Cardápio sem slug configurado. Contate a loja.');
      return;
    }

    try {
      const res = await fetch('/api/delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: storeSlug,
          endereco: {
            logradouro: rua.trim(),
            numero: num.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            estado: estado.trim(),
            cep: cep.replace(/\D/g, ''),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Não foi possível calcular a entrega para este endereço.');
        return;
      }

      setDeliveryFee(Number(json.taxaEntrega) || 0);
      setDeliveryMeta({
        distanciaKm: json.distanciaKm,
        zonaNome: json.zonaNome,
        latitude: json.latitude,
        longitude: json.longitude,
      });
      setSavedAddress({
        rua: rua.trim(),
        num: num.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        cep: cep.trim(),
        comp: comp.trim(),
        ref: ref.trim(),
      });
      setAddressOpen(false);
      setCurrentDeliveryMode('entregar');
    } catch {
      alert('Erro ao calcular taxa de entrega. Tente novamente.');
    }
  }, [addrForm, storeConfig.slug, slug]);

  const openCupomPopup = useCallback(() => {
    setCupomValue('');
    setCupomOpen(true);
  }, []);

  const closeCupomPopup = useCallback(() => setCupomOpen(false), []);

  const clearAppliedCupom = useCallback(() => setAppliedCupom(null), []);

  const aplicarCupom = useCallback(() => {
    const code = cupomValue.trim();
    if (!code) {
      alert('Digite um código de cupom.');
      return;
    }
    const found = findCupomByCode(availableCupons, code);
    if (!found) {
      alert('Cupom inválido ou indisponível.');
      return;
    }
    setAppliedCupom({
      id: found.id,
      codigo: found.codigo,
      valorDesconto: Number(found.valorDesconto) || 0,
    });
    closeCupomPopup();
  }, [cupomValue, availableCupons, closeCupomPopup]);

  const openProduct = useCallback(
    (id) => {
      const product = dynamicProducts.find((p) => p.id === id);
      if (!product) return;
      setCurrentProduct(product);
      setCurrentQty(1);
      setSelectedAddons({});
      setAddonExtras(0);
      setPopupHeaderCompact(false);
      setProductOpen(true);
    },
    [dynamicProducts]
  );

  const closeProductPopup = useCallback(() => {
    setProductOpen(false);
    setPopupHeaderCompact(false);
  }, []);

  const toggleAddon = useCallback(
    (sectionIdx, itemId, extra) => {
      if (!currentProduct) return;
      setSelectedAddons((prev) => {
        const next = { ...prev };
        if (!next[sectionIdx]) next[sectionIdx] = [];
        const arr = [...next[sectionIdx]];
        const sec = currentProduct.addons[sectionIdx];
        const idx = arr.indexOf(itemId);
        if (idx > -1) {
          arr.splice(idx, 1);
        } else {
          if (arr.length >= sec.max) arr.shift();
          arr.push(itemId);
        }
        next[sectionIdx] = arr;
        setAddonExtras(recalcExtras(currentProduct, next));
        return next;
      });
    },
    [currentProduct, recalcExtras]
  );

  const changeQty = useCallback((delta) => {
    setCurrentQty((q) => Math.max(1, q + delta));
  }, []);

  const addToCart = useCallback(() => {
    if (!currentProduct) return;
    const optLabels = [];
    currentProduct.addons.forEach((sec, si) => {
      const sel = selectedAddons[si] || [];
      sel.forEach((id) => {
        const item = sec.items.find((i) => i.id === id);
        if (item) optLabels.push(item.name);
      });
    });
    const unitPrice = currentProduct.price + addonExtras;
    setCart((prev) => [
      ...prev,
      {
        id: Date.now(),
        productId: currentProduct.id,
        name: currentProduct.name,
        price: unitPrice,
        qty: currentQty,
        opts: optLabels,
        imageUrl: currentProduct.imageUrl || '',
      },
    ]);
    trackMetaEvent('AddToCart', {
      content_name: currentProduct.name,
      value: unitPrice * currentQty,
      currency: 'BRL',
    });
    closeProductPopup();
  }, [currentProduct, selectedAddons, addonExtras, currentQty, closeProductPopup]);

  const addToCartCustom = useCallback(
    ({ product, qty = 1, unitPrice = 0, opts = [] }) => {
      if (!product) return;
      setCart((prev) => [
        ...prev,
        {
          id: Date.now(),
          productId: product.id,
          name: product.name,
          price: unitPrice,
          qty,
          opts,
          imageUrl: product.imageUrl || '',
        },
      ]);
      trackMetaEvent('AddToCart', {
        content_name: product.name,
        value: unitPrice * qty,
        currency: 'BRL',
      });
      closeProductPopup();
    },
    [closeProductPopup]
  );

  const clearCart = useCallback(() => setCart([]), []);

  const removeCartItem = useCallback((id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const editCartItem = useCallback(
    (id) => {
      const item = cart.find((i) => i.id === id);
      if (!item) return;
      setCart((prev) => prev.filter((i) => i.id !== id));
      openProduct(item.productId);
    },
    [cart, openProduct]
  );

  const openCheckout = useCallback(() => {
    if (cart.length === 0 || !storeConfig.aberta) return;
    setCheckoutStep(1);
    setCheckoutSuccess(false);
    setCheckoutData({
      name: '',
      phone: '',
      delivery: currentDeliveryMode,
      payment: '',
    });
    setCheckoutName('');
    setCheckoutPhone('');
    setCheckoutOrderNumber('');
    setCheckoutOpen(true);
    trackMetaEvent('InitiateCheckout', {
      value: cartTotal(),
      currency: 'BRL',
      num_items: cart.length,
    });
  }, [cart.length, cartTotal, currentDeliveryMode, storeConfig.aberta]);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
    setCheckoutSuccess(false);
    setCheckoutOrderNumber('');
  }, []);

  const selectDelivery = useCallback((opt) => {
    setCheckoutData((d) => ({ ...d, delivery: opt }));
  }, []);

  const selectPayment = useCallback((id) => {
    setCheckoutData((d) => ({ ...d, payment: id }));
  }, []);

  const checkoutNext = useCallback(async () => {
    if (checkoutStep === 1) {
      const name = checkoutName.trim();
      const phone = checkoutPhone.trim();
      if (!name || !phone) {
        alert('Preencha nome e telefone.');
        return;
      }
      setCheckoutData((d) => ({ ...d, name, phone }));
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      setCheckoutStep(3);
    } else if (checkoutStep === 3) {
      if (!checkoutData.payment) {
        alert('Selecione uma forma de pagamento.');
        return;
      }
      setCheckoutStep(4);
    } else if (checkoutStep === 4) {
      try {
        const customer = await ensureCustomer({ name: checkoutData.name, phone: checkoutData.phone });
        const orderNumber = String(Date.now()).slice(-10);
        const supabase = createSupabaseClient();
        const addressText =
          checkoutData.delivery === 'entregar'
            ? (savedAddress
              ? `${savedAddress.rua}${savedAddress.num ? `, ${savedAddress.num}` : ''} – ${savedAddress.bairro}`
              : storeConfig.endereco || STORE_ADDRESS)
            : 'Retirada no balcão';
        const subtotal = cartSubtotal();
        const taxaEntrega =
          checkoutData.delivery === 'entregar' ? Number(deliveryFee) || 0 : 0;
        const cupomOff = Number(appliedCupom?.valorDesconto) || 0;
        const payload = {
          id: orderNumber,
          customer_id: customer?.id || null,
          status: 'novo',
          tipo: checkoutData.delivery === 'entregar' ? 'delivery' : 'retirada',
          customer_name: checkoutData.name,
          customer_phone: normalizePhone(checkoutData.phone),
          address_text: addressText,
          subtotal,
          taxa_entrega: taxaEntrega,
          desconto: cupomOff,
          total: Math.max(0, subtotal + taxaEntrega - cupomOff),
          payment_method: checkoutData.payment,
          source: 'cardapio_online',
          cupom_codigo: appliedCupom?.codigo || null,
          endereco_latitude: deliveryMeta?.latitude ?? null,
          endereco_longitude: deliveryMeta?.longitude ?? null,
          distancia_km: deliveryMeta?.distanciaKm ?? null,
        };
        await supabase.from('orders').insert(payload);
        await updateCustomerStats({ customerId: customer?.id, orderValue: cartTotal() });
        setCheckoutOrderNumber(orderNumber);
        trackMetaEvent('Purchase', {
          value: cartTotal(),
          currency: 'BRL',
          num_items: cart.length,
        });
      } catch {
        setCheckoutOrderNumber(`LOCAL-${String(Date.now()).slice(-6)}`);
        trackMetaEvent('Purchase', {
          value: cartTotal(),
          currency: 'BRL',
          num_items: cart.length,
        });
      }
      setCheckoutSuccess(true);
    }
  }, [
    checkoutStep,
    checkoutName,
    checkoutPhone,
    checkoutData,
    cart,
    cartSubtotal,
    cartTotal,
    deliveryFee,
    appliedCupom,
    deliveryMeta,
    savedAddress,
    storeConfig.endereco,
  ]);

  const checkoutBack = useCallback(() => {
    if (checkoutStep > 1 && !checkoutSuccess) {
      setCheckoutStep((s) => s - 1);
    }
  }, [checkoutStep, checkoutSuccess]);

  const finalizeOrder = useCallback(() => {
    setCart([]);
    closeCheckout();
    showMainPage();
  }, [closeCheckout, showMainPage]);

  const handlePromoNav = useCallback(() => {
    const promoCategory =
      dynamicCategories.find((cat) => cat.toLowerCase().includes('promo')) || 'Combos com Promoção!';
    setPage('main');
    setSelectedCategory(promoCategory);
    setCategoryMenuOpen(false);
    setNavActive('navPromo');
    setMobileNavActive('mNavPromo');
  }, [dynamicCategories]);

  const locStrong =
    currentDeliveryMode === 'retirar'
      ? 'Retirar no estabelecimento'
      : 'Entregar no endereço';

  const locSub =
    currentDeliveryMode === 'retirar'
      ? storeConfig.endereco || STORE_ADDRESS
      : savedAddress
        ? `${savedAddress.rua}${savedAddress.num ? `, ${savedAddress.num}` : ''} – ${savedAddress.bairro}`
        : storeConfig.endereco || STORE_ADDRESS;

  const adicionarTotal = currentProduct
    ? (currentProduct.price + addonExtras) * currentQty
    : 0;

  const value = {
    page,
    navActive,
    mobileNavActive,
    cart,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    categoryMenuOpen,
    setCategoryMenuOpen,
    infoOpen,
    currentDeliveryMode,
    deliveryMiniOpen,
    savedAddress,
    productOpen,
    currentProduct,
    currentQty,
    selectedAddons,
    addonExtras,
    popupHeaderCompact,
    setPopupHeaderCompact,
    checkoutOpen,
    checkoutStep,
    checkoutData,
    checkoutSuccess,
    checkoutOrderNumber,
    checkoutName,
    setCheckoutName,
    checkoutPhone,
    setCheckoutPhone,
    cepOpen,
    addressOpen,
    cupomOpen,
    cepValue,
    setCepValue,
    addrForm,
    setAddrForm,
    cupomValue,
    setCupomValue,
    appliedCupom,
    clearAppliedCupom,
    profileName,
    setProfileName,
    profilePhone,
    setProfilePhone,
    profileDisplayName,
    profileDisplayPhone,
    profileImage,
    setProfileImage,
    showMobileSacola,
    popupDetailsRef,
    cepInputRef,
    cupomInputRef,
    CATEGORIES: dynamicCategories,
    relatedItems,
    STORE_ADDRESS,
    storeConfig,
    STEP_LABELS,
    PAYMENT_METHODS,
    PAY_LABELS,
    showMainPage,
    showProfile,
    showOrdersPage,
    setMobileNav,
    saveProfile,
    filteredProducts,
    selectCategory,
    toggleInfo,
    toggleDeliveryCard,
    selectDeliveryMode,
    openCepPopup,
    closeCepPopup,
    maskCep,
    goToAddress,
    closeAddressPopup,
    confirmAddress,
    openCupomPopup,
    closeCupomPopup,
    aplicarCupom,
    openProduct,
    closeProductPopup,
    toggleAddon,
    changeQty,
    addToCart,
    addToCartCustom,
    clearCart,
    removeCartItem,
    editCartItem,
    openCheckout,
    closeCheckout,
    selectDelivery,
    selectPayment,
    checkoutNext,
    checkoutBack,
    finalizeOrder,
    handlePromoNav,
    cartSubtotal,
    cartTotal,
    deliveryFee,
    deliveryMeta,
    cartCount,
    formatPrice,
    locStrong,
    locSub,
    adicionarTotal,
    setNavActive,
    isStoreOpen: Boolean(storeConfig.aberta),
  };

  return (
    <CardapioContext.Provider value={value}>{children}</CardapioContext.Provider>
  );
}

export function useCardapio() {
  const ctx = useContext(CardapioContext);
  if (!ctx) throw new Error('useCardapio must be used within CardapioProvider');
  return ctx;
}
