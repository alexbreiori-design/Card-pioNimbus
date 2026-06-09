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
import { formatPrice } from '@/lib/utils/format';
import { fetchViaCep } from '@/lib/cep/viacep';
import { calculateCupomDiscount, findCupomByCode } from '@/lib/cupons';
import { buildCardapioCatalog } from '@/lib/cardapio/catalogFromStore';
import { getConfiguredDefaultSlug } from '@/lib/storeBoot';
import { applyScheduleOpenStatus } from '@/lib/storeHours';
import { DEFAULT_ADMIN_DATA, withDerivedData } from '@/lib/adminData';
import { fetchStoreStateMetaRemote, fetchStoreStateRemote } from '@/lib/storeStateClient';
import {
  fetchPublicOrdersRemote,
  mergePublicOrders,
  addHiddenHistoryOrderIds,
  clearClientOrderHistory,
  filterOrdersForClientView,
  readCachedOrders,
  resolveOrderPhoneDigits,
  writeCachedOrders,
} from '@/lib/publicOrders';
import { normalizePhone, normalizeSlug } from '@/lib/normalize';
import {
  formatMobilePhoneBr,
  isCompleteMobilePhoneBr,
  mobilePhoneIncompleteMessage,
} from '@/lib/phoneBr';
import { formatMoneyBrInput, hasMoneyBrValue, parseMoneyBrInput } from '@/lib/moneyMask';
import { mergeEmpresaIntoLoja } from '@/lib/supabase/empresa';
import { fetchPublicEmpresaCardapio } from '@/lib/supabase/publicEmpresa';
import { trackMetaEvent } from '@/lib/meta/pixel';
import { MAX_PECA_TAMBEM } from '@/lib/productSuggestions';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';
import {
  formatDurationMinutes,
  getEtaFromConfirmedAt,
  getEstimateMinutesForOrderTipo,
} from '@/lib/deliveryDuration';

const CardapioContext = createContext(null);
const CardapioCatalogContext = createContext(null);
const CardapioCartContext = createContext(null);
const CardapioCheckoutContext = createContext(null);

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
const STORE_SYNC_MS = 10000;
const ORDERS_SYNC_MS = 10000;

function emptyProfile() {
  return {
    name: 'Seu nome',
    phone: '(00) 00000-0000',
    image: '',
    address: {
      cep: '',
      rua: '',
      num: '',
      bairro: '',
      comp: '',
      ref: '',
      cidade: '',
      estado: '',
    },
  };
}

function formatPhoneBr(value) {
  return formatMobilePhoneBr(value);
}

function formatStoreAddress(loja) {
  const structured = [
    loja?.enderecoLogradouro,
    loja?.enderecoNumero ? `, ${loja.enderecoNumero}` : '',
    loja?.enderecoBairro ? ` - ${loja.enderecoBairro}` : '',
    loja?.enderecoCidade ? ` - ${loja.enderecoCidade}` : '',
    loja?.enderecoEstado ? `/${loja.enderecoEstado}` : '',
  ]
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return structured || loja?.endereco || STORE_ADDRESS;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function upsertClientInStoreSnapshot(adminState, { name, phone, address = null }) {
  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits || !String(name || '').trim()) return adminState;

  const previousCustomer = (adminState.clientes || []).find(
    (customer) => normalizePhone(customer.phone) === phoneDigits
  );
  const localCustomerId = previousCustomer?.id || `cliente-${phoneDigits}`;
  const nextAddress = address
    ? {
        id: previousCustomer?.addresses?.[0]?.id || `end-${Date.now()}`,
        cep: address.cep || '',
        street: address.rua || address.street || '',
        number: address.num || address.numero || address.number || '',
        district: address.bairro || address.district || '',
        city: address.cidade || address.city || '',
        state: address.estado || address.state || '',
        complement: address.comp || address.complement || '',
        referencia: address.ref || address.referencia || '',
        principal: true,
      }
    : null;
  const nextCustomer = {
    ...(previousCustomer || {}),
    id: localCustomerId,
    name: String(name).trim(),
    phone: phoneDigits,
    total_orders: Number(previousCustomer?.total_orders || 0),
    total_spent: Number(previousCustomer?.total_spent || 0),
    last_order_at: previousCustomer?.last_order_at || null,
    updated_at: new Date().toISOString(),
    created_at: previousCustomer?.created_at || new Date().toISOString(),
    addresses: nextAddress
      ? [nextAddress, ...(previousCustomer?.addresses || []).filter((item) => item.id !== nextAddress.id)]
      : previousCustomer?.addresses || [],
  };
  return withDerivedData({
    ...adminState,
    clientes: [
      nextCustomer,
      ...(adminState.clientes || []).filter((customer) => customer.id !== nextCustomer.id),
    ],
  });
}

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

/** Aplica cor de destaque no cardápio público (inclui diálogos fora do theme-root). */
function applyBrandColor(hex) {
  const brand = hex || '#610C27';
  const targets = new Set([document.documentElement]);
  const themeRoot = document.querySelector('.cardapio-theme-root');
  if (themeRoot) targets.add(themeRoot);
  targets.forEach((target) => {
    target.style.setProperty('--brand', brand);
    target.style.setProperty('--brand-hover', mixColors(brand, '#000000', 0.18));
    target.style.setProperty('--brand-light', mixColors(brand, '#ffffff', 0.9));
    target.style.setProperty('--brand-mid', mixColors(brand, '#ffffff', 0.42));
  });
}

function getInitialProfile() {
  if (typeof window === 'undefined') {
    return emptyProfile();
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw);
    const fallback = emptyProfile();
    return {
      name: parsed.name || fallback.name,
      phone: parsed.phone || fallback.phone,
      image: parsed.image || '',
      address: { ...fallback.address, ...(parsed.address || {}) },
    };
  } catch {
    return emptyProfile();
  }
}

export function CardapioProvider({ children, slug = '' }) {
  const [effectiveSlug, setEffectiveSlug] = useState(() => normalizeSlug(slug));
  const [storeConfig, setStoreConfig] = useState(DEFAULT_ADMIN_DATA.loja);
  const [dynamicProducts, setDynamicProducts] = useState([]);
  const [promoCarouselProducts, setPromoCarouselProducts] = useState([]);
  const [dynamicCategories, setDynamicCategories] = useState(['Todos']);
  const [storeReady, setStoreReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [categoryIconsByName, setCategoryIconsByName] = useState({});
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

  const [cartReviewOpen, setCartReviewOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState({
    name: '',
    phone: '',
    delivery: 'retirar',
    payment: '',
    trocoAnswer: '',
    trocoValue: '',
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutSuccessSnapshot, setCheckoutSuccessSnapshot] = useState(null);
  const [checkoutOrderNumber, setCheckoutOrderNumber] = useState('');
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAddressConfirmed, setCheckoutAddressConfirmed] = useState(false);
  const [addressFlowContext, setAddressFlowContext] = useState('header');

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
  const [profileImage, setProfileImage] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('Seu nome');
  const [profileDisplayPhone, setProfileDisplayPhone] = useState('(00) 00000-0000');
  const [profileAddress, setProfileAddress] = useState(emptyProfile().address);
  const [publicOrders, setPublicOrders] = useState([]);

  useEffect(() => {
    const profile = getInitialProfile();
    setProfileDisplayName(profile.name);
    setProfileDisplayPhone(profile.phone);
    setProfileImage(profile.image);
    setProfileAddress(profile.address);
    setProfileName(profile.name === 'Seu nome' ? '' : profile.name);
    setProfilePhone(profile.phone === '(00) 00000-0000' ? '' : profile.phone);
  }, []);

  const [showMobileSacola, setShowMobileSacola] = useState(false);

  const popupDetailsRef = useRef(null);
  const cepInputRef = useRef(null);
  const cupomInputRef = useRef(null);
  const storeSnapshotRef = useRef(withDerivedData(DEFAULT_ADMIN_DATA));
  const catalogWatermarkRef = useRef(null);
  const ordersWatermarkRef = useRef(null);
  const checkoutSubmittingRef = useRef(false);
  const [dialog, setDialog] = useState(null);

  const showAlert = useCallback((message, { title = 'Aviso' } = {}) => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
      });
    });
  }, []);

  const persistStoreSnapshot = useCallback(
    async (nextState) => {
      const safeSlug = normalizeSlug(
        nextState.loja?.slug || storeConfig.slug || effectiveSlug || slug || DEFAULT_ADMIN_DATA.loja.slug
      );
      storeSnapshotRef.current = nextState;
      window.dispatchEvent(new CustomEvent('admin-data-updated', { detail: nextState }));
      window.dispatchEvent(new CustomEvent('cardapio-public-orders-updated'));
      return nextState;
    },
    [storeConfig.slug, effectiveSlug, slug]
  );

  const persistClientSnapshot = useCallback(
    async ({ name, phone, address = null }) => {
      const next = upsertClientInStoreSnapshot(storeSnapshotRef.current, { name, phone, address });
      return persistStoreSnapshot(next);
    },
    [persistStoreSnapshot]
  );

  const hydratePublicOrders = useCallback(async ({ force = false } = {}) => {
    if (typeof window === 'undefined') return;

    const slugToUse = normalizeSlug(
      effectiveSlug || storeConfig.slug || slug || storeSnapshotRef.current?.loja?.slug || getConfiguredDefaultSlug()
    );
    const cachedOrders = readCachedOrders(slugToUse);
    const phoneDigits = resolveOrderPhoneDigits({
      profileDisplayPhone,
      profilePhone,
      checkoutPhone: checkoutData.phone,
      cachedOrders,
    });

    if (!phoneDigits) {
      if (cachedOrders.length) setPublicOrders(cachedOrders);
      return;
    }

    const { orders: apiOrders, latestUpdatedAt } = await fetchPublicOrdersRemote(slugToUse, phoneDigits);
    if (!force && latestUpdatedAt && ordersWatermarkRef.current === latestUpdatedAt) {
      return;
    }
    ordersWatermarkRef.current = latestUpdatedAt;

    const merged = mergePublicOrders({
      jsonPedidos: [],
      apiOrders,
      cachedOrders,
      phoneDigits,
    });

    setPublicOrders(merged);
    writeCachedOrders(slugToUse, merged);
  }, [
    checkoutData.phone,
    effectiveSlug,
    profileDisplayPhone,
    profilePhone,
    slug,
    storeConfig.slug,
  ]);

  const modalOpen =
    productOpen || cartReviewOpen || checkoutOpen || cepOpen || addressOpen || cupomOpen;

  useEffect(() => {
    if (slug) {
      setEffectiveSlug(normalizeSlug(slug));
      return;
    }
    if (storeSnapshotRef.current?.loja?.slug) {
      setEffectiveSlug(normalizeSlug(storeSnapshotRef.current.loja.slug));
    } else {
      setEffectiveSlug(normalizeSlug(getConfiguredDefaultSlug()));
    }
  }, [slug]);

  useEffect(() => {
    const targetSlug =
      effectiveSlug ||
      (typeof window !== 'undefined'
        ? window.location.pathname.split('/').filter(Boolean).at(-1)?.toLowerCase() || ''
        : '');

    const syncFromAdmin = async ({ force = false } = {}) => {
      try {
        const slugToFetch = targetSlug || getConfiguredDefaultSlug();
        if (!force) {
          const meta = await fetchStoreStateMetaRemote(slugToFetch);
          if (meta?.updated_at && meta.updated_at === catalogWatermarkRef.current) {
            return;
          }
        }

        let parsed = null;
        let remoteUpdatedAt = null;
        try {
          const remote = await fetchStoreStateRemote(slugToFetch);
          if (remote?.data) {
            parsed = remote.data;
            remoteUpdatedAt = remote.updated_at ?? null;
          }
        } catch {
          /* mantém snapshot em memória */
        }

        if (!parsed) {
          parsed = storeSnapshotRef.current;
        } else {
          catalogWatermarkRef.current = remoteUpdatedAt;
        }
        storeSnapshotRef.current = parsed;

        let loja = parsed.loja;
        if (targetSlug) {
          try {
            const empresa = await fetchPublicEmpresaCardapio(targetSlug);
            loja = mergeEmpresaIntoLoja(loja, empresa);
          } catch {
            /* mantém loja do estado remoto/local */
          }
        }

        const catalog = buildCardapioCatalog(parsed);
        setDynamicProducts(catalog.products);
        setPromoCarouselProducts(catalog.promoCarouselProducts || []);
        setDynamicCategories(catalog.categories);
        setCategoryIconsByName(catalog.categoryIconsByName);
        setAvailableCupons(catalog.cupons);
        const lojaWithAddress = applyScheduleOpenStatus({
          ...loja,
          endereco: formatStoreAddress(loja),
        });
        setStoreConfig(lojaWithAddress);
        applyBrandColor(lojaWithAddress.corMarca);
      } catch {
      } finally {
        setStoreReady(true);
        void hydratePublicOrders();
      }
    };
    syncFromAdmin({ force: true });
    const interval = window.setInterval(() => syncFromAdmin(), STORE_SYNC_MS);
    const onFocus = () => syncFromAdmin();
    const onStorage = () => syncFromAdmin({ force: true });
    const onAdminUpdated = () => syncFromAdmin({ force: true });
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin-data-updated', onAdminUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin-data-updated', onAdminUpdated);
    };
  }, [effectiveSlug, hydratePublicOrders]);

  useEffect(() => {
    if (!storeReady) return undefined;
    const tick = () => {
      setStoreConfig((prev) => applyScheduleOpenStatus(prev));
    };
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [storeReady, storeConfig.horarios, storeConfig.fechadaManual]);

  useEffect(() => {
    if (!storeReady) return undefined;
    const timer = window.setTimeout(() => setSplashVisible(false), 800);
    return () => window.clearTimeout(timer);
  }, [storeReady]);

  useEffect(() => {
    if (!storeReady) return undefined;

    void hydratePublicOrders({ force: true });
    const interval = window.setInterval(() => {
      void hydratePublicOrders();
    }, ORDERS_SYNC_MS);
    const onFocus = () => void hydratePublicOrders({ force: true });
    const onOrdersUpdated = () => void hydratePublicOrders({ force: true });

    window.addEventListener('focus', onFocus);
    window.addEventListener('admin-data-updated', onOrdersUpdated);
    window.addEventListener('cardapio-public-orders-updated', onOrdersUpdated);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('admin-data-updated', onOrdersUpdated);
      window.removeEventListener('cardapio-public-orders-updated', onOrdersUpdated);
    };
  }, [hydratePublicOrders, storeReady]);

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
    const cupomOff = calculateCupomDiscount(appliedCupom, sub);
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
    void hydratePublicOrders({ force: true });
  }, [hydratePublicOrders]);

  const showProfile = useCallback(() => {
    setProfileName((value) => value || (profileDisplayName === 'Seu nome' ? '' : profileDisplayName));
    setProfilePhone((value) => value || (profileDisplayPhone === '(00) 00000-0000' ? '' : profileDisplayPhone));
    setPage('profile');
    setNavActive('navPerfil');
    setMobileNavActive('mNavPerfil');
  }, [profileDisplayName, profileDisplayPhone]);

  const setMobileNav = useCallback((id) => {
    setMobileNavActive(id);
  }, []);

  const saveProfile = useCallback(async () => {
    const name = profileName.trim();
    const phoneRaw = profilePhone.trim();
    if (!name) {
      await showAlert('Informe seu nome completo.');
      return;
    }
    if (!isCompleteMobilePhoneBr(phoneRaw)) {
      await showAlert(mobilePhoneIncompleteMessage());
      return;
    }
    const phone = formatPhoneBr(phoneRaw);
    setProfileDisplayName(name);
    setProfileDisplayPhone(phone);
    setProfilePhone(phone);
    try {
      window.localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ name, phone, image: profileImage, address: profileAddress })
      );
    } catch {}
    void persistClientSnapshot({
      name,
      phone,
      address: profileAddress?.rua ? profileAddress : null,
    });
    showMainPage();
  }, [profileName, profilePhone, profileImage, profileAddress, showMainPage, persistClientSnapshot, showAlert]);

  const productMatchesSearch = useCallback(
    (p) =>
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase()),
    [searchQuery]
  );

  const promoProducts = useMemo(() => {
    return promoCarouselProducts.filter((p) => productMatchesSearch(p));
  }, [promoCarouselProducts, productMatchesSearch]);

  const filteredProducts = useMemo(() => {
    const cats =
      selectedCategory === 'Todos'
        ? dynamicCategories.filter((cat) => cat !== 'Todos' && cat !== PROMO_CATEGORY_NAME)
        : [selectedCategory];
    const sections = [];
    cats.forEach((cat) => {
      if (cat === PROMO_CATEGORY_NAME) return;
      const items = dynamicProducts.filter(
        (p) => p.category === cat && productMatchesSearch(p)
      );
      if (items.length > 0) {
        const isMarmitaSection = items.every((p) => p.type === 'marmita');
        sections.push({
          category: cat,
          items,
          categoryIcon: categoryIconsByName[cat] || 'burger',
          isMarmitaSection,
        });
      }
    });
    return sections;
  }, [
    searchQuery,
    selectedCategory,
    dynamicProducts,
    dynamicCategories,
    categoryIconsByName,
    productMatchesSearch,
  ]);

  const relatedItems = useMemo(() => {
    const cartIds = new Set(cart.map((item) => item.productId));
    const configuredIds = [];

    cart.forEach((cartItem) => {
      const source = dynamicProducts.find((p) => p.id === cartItem.productId);
      (source?.relatedProductIds || []).forEach((id) => {
        if (!id || cartIds.has(id) || configuredIds.includes(id)) return;
        configuredIds.push(id);
      });
    });

    if (configuredIds.length) {
      return configuredIds
        .slice(0, MAX_PECA_TAMBEM)
        .map((id) => dynamicProducts.find((p) => p.id === id))
        .filter((p) => p && !cartIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl || '',
        }));
    }

    const priority = ['bebidas', 'porções', 'porcoes', 'sobremesas'];
    const priorityIndex = (category) => {
      const normalized = String(category || '').toLowerCase();
      const idx = priority.findIndex((name) => normalized.includes(name));
      return idx === -1 ? 99 : idx;
    };
    const seenPoolIds = new Set();
    const pool = dynamicProducts
      .filter((p) => {
        if (cartIds.has(p.id) || seenPoolIds.has(p.id)) return false;
        seenPoolIds.add(p.id);
        return true;
      })
      .sort((a, b) => priorityIndex(a.category) - priorityIndex(b.category));
    return pool.slice(0, MAX_PECA_TAMBEM).map((p) => ({
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
        setAddressFlowContext('header');
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
    const profileCep = profileAddress?.cep?.replace(/\D/g, '') || '';
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
          void showAlert('CEP não encontrado. Preencha o endereço manualmente.');
        }
      } catch {
        setAddrForm((f) => ({ ...f, cep: maskCep(cepValue) }));
        void showAlert('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
      }
    } else if (profileCep.length === 8 && !cepDigits.length) {
      setAddrForm((f) => ({
        ...f,
        cep: profileAddress.cep || f.cep,
        rua: profileAddress.rua || f.rua,
        num: profileAddress.num || f.num,
        bairro: profileAddress.bairro || f.bairro,
        comp: profileAddress.comp || f.comp,
        ref: profileAddress.ref || f.ref,
        cidade: profileAddress.cidade || f.cidade,
        estado: profileAddress.estado || f.estado,
      }));
    } else {
      setAddrForm((f) => ({ ...f, cep: maskCep(cepValue) }));
    }
    setAddressOpen(true);
  }, [cepValue, maskCep, profileAddress]);

  const closeAddressPopup = useCallback(() => {
    setAddressOpen(false);
    if (!savedAddress) {
      setCurrentDeliveryMode('retirar');
    }
  }, [savedAddress]);

  const confirmAddress = useCallback(async () => {
    const { rua, num, bairro, cidade, estado, cep, comp, ref } = addrForm;
    if (!rua.trim() || !bairro.trim()) {
      void showAlert('Preencha pelo menos a rua e o bairro.');
      return;
    }

    const storeSlug = normalizeSlug(storeConfig.slug || effectiveSlug || slug);
    if (!storeSlug) {
      void showAlert('Cardápio sem slug configurado. Contate a loja.');
      return;
    }

    let fee = 0;
    let meta = null;
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
      if (res.ok) {
        fee = Number(json.taxaEntrega) || 0;
        meta = {
          distanciaKm: json.distanciaKm,
          zonaNome: json.zonaNome,
          latitude: json.latitude,
          longitude: json.longitude,
        };
      } else if (res.status !== 503) {
        void showAlert(json.error || 'Não foi possível calcular a entrega para este endereço.');
        return;
      }
    } catch {
      /* MVP: permite entrega com taxa zero se API indisponível */
    }

    const nextAddress = {
      rua: rua.trim(),
      num: num.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado: estado.trim(),
      cep: cep.trim(),
      comp: comp.trim(),
      ref: ref.trim(),
    };
    setDeliveryFee(fee);
    setDeliveryMeta(meta);
    setSavedAddress(nextAddress);
    setProfileAddress(nextAddress);
    if (addressFlowContext === 'checkout') {
      setCheckoutAddressConfirmed(true);
    }
    try {
      window.localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          name: profileDisplayName,
          phone: profileDisplayPhone,
          image: profileImage,
          address: nextAddress,
        })
      );
    } catch {}
    if (profileDisplayName !== 'Seu nome' && profileDisplayPhone !== '(00) 00000-0000') {
      void persistClientSnapshot({
        name: profileDisplayName,
        phone: profileDisplayPhone,
        address: nextAddress,
      });
    }
    setAddressOpen(false);
    setCurrentDeliveryMode('entregar');
  }, [
    addrForm,
    storeConfig.slug,
    effectiveSlug,
    slug,
    profileDisplayName,
    profileDisplayPhone,
    profileImage,
    addressFlowContext,
  ]);

  const openCupomPopup = useCallback(() => {
    setCupomValue('');
    setCupomOpen(true);
  }, []);

  const closeCupomPopup = useCallback(() => setCupomOpen(false), []);

  const clearAppliedCupom = useCallback(() => setAppliedCupom(null), []);

  const aplicarCupom = useCallback(() => {
    const code = cupomValue.trim();
    if (!code) {
      void showAlert('Digite um código de cupom.');
      return;
    }
    const found = findCupomByCode(availableCupons, code);
    if (!found) {
      void showAlert('Cupom inválido ou indisponível.');
      return;
    }
    setAppliedCupom(found);
    closeCupomPopup();
  }, [cupomValue, availableCupons, closeCupomPopup]);

  const openProduct = useCallback(
    (id) => {
      const product =
        dynamicProducts.find((p) => p.id === id) ||
        promoCarouselProducts.find((p) => p.id === id);
      if (!product) return;
      setCurrentProduct({
        ...product,
        addons: Array.isArray(product.addons) ? product.addons : [],
      });
      setCurrentQty(1);
      setSelectedAddons({});
      setAddonExtras(0);
      setPopupHeaderCompact(false);
      setProductOpen(true);
    },
    [dynamicProducts, promoCarouselProducts]
  );

  const closeProductPopup = useCallback(() => {
    setProductOpen(false);
    setPopupHeaderCompact(false);
    setCurrentProduct(null);
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
    for (let si = 0; si < currentProduct.addons.length; si += 1) {
      const sec = currentProduct.addons[si];
      const sel = selectedAddons[si] || [];
      const minRequired = sec.required ? Math.max(1, Number(sec.min || 1)) : Number(sec.min || 0);
      if (sel.length < minRequired) {
        void showAlert(
          minRequired > 1
            ? `Selecione pelo menos ${minRequired} opções em "${sec.section}".`
            : `Selecione uma opção em "${sec.section}".`
        );
        return;
      }
    }
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
    closeProductPopup();
    trackMetaEvent('AddToCart', {
      content_ids: [String(currentProduct.id)],
      content_name: currentProduct.name,
      content_type: 'product',
      value: unitPrice * currentQty,
      currency: 'BRL',
      num_items: currentQty,
    });
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
      closeProductPopup();
      trackMetaEvent('AddToCart', {
        content_ids: [String(product.id)],
        content_name: product.name,
        content_type: 'product',
        value: unitPrice * qty,
        currency: 'BRL',
        num_items: qty,
      });
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
      setCartReviewOpen(false);
      setCart((prev) => prev.filter((i) => i.id !== id));
      openProduct(item.productId);
    },
    [cart, openProduct]
  );

  const openCartReview = useCallback(() => {
    if (cart.length === 0) return;
    setCartReviewOpen(true);
  }, [cart.length]);

  const closeCartReview = useCallback(() => {
    setCartReviewOpen(false);
  }, []);

  const getDeliveryEstimateMinutes = useCallback(
    (tipo) =>
      getEstimateMinutesForOrderTipo(
        storeConfig,
        tipo ?? (checkoutData.delivery === 'entregar' ? 'delivery' : 'retirada')
      ),
    [storeConfig, checkoutData.delivery]
  );

  const openCheckout = useCallback(() => {
    if (cart.length === 0 || !storeConfig.aberta) return;
    const minOrder = Number(storeConfig.pedidoMinimo || 0);
    if (minOrder > 0 && cartSubtotal() < minOrder) {
      void showAlert(`Pedido mínimo de ${formatPrice(minOrder)}. Adicione mais itens para continuar.`);
      return;
    }
    const knownName = profileDisplayName === 'Seu nome' ? '' : profileDisplayName;
    const knownPhone = profileDisplayPhone === '(00) 00000-0000' ? '' : profileDisplayPhone;
    setCheckoutStep(1);
    setCheckoutSuccess(false);
    setCheckoutAddressConfirmed(false);
    setCheckoutData({
      name: knownName,
      phone: knownPhone,
      delivery: 'retirar',
      payment: '',
      trocoAnswer: '',
      trocoValue: '',
    });
    setCheckoutName(knownName);
    setCheckoutPhone(knownPhone);
    setCheckoutOrderNumber('');
    setCheckoutOpen(true);
    trackMetaEvent('InitiateCheckout', {
      content_ids: cart.map((item) => String(item.productId)),
      content_type: 'product',
      value: cartTotal(),
      currency: 'BRL',
      num_items: cart.reduce((sum, item) => sum + item.qty, 0),
    });
  }, [cart.length, cartSubtotal, cartTotal, profileDisplayName, profileDisplayPhone, storeConfig.aberta, storeConfig.pedidoMinimo, formatPrice]);

  const finalizeFromCartReview = useCallback(() => {
    setCartReviewOpen(false);
    openCheckout();
  }, [openCheckout]);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
    setCheckoutSuccess(false);
    setCheckoutSuccessSnapshot(null);
    setCheckoutOrderNumber('');
    setCheckoutAddressConfirmed(false);
  }, []);

  const selectDelivery = useCallback(
    (opt) => {
      setCheckoutData((d) => ({ ...d, delivery: opt }));
      if (opt === 'retirar') {
        setCheckoutAddressConfirmed(false);
        return;
      }
      if (opt === 'entregar') {
        setCheckoutAddressConfirmed(false);
        setAddressFlowContext('checkout');
        const prefillCep = savedAddress?.cep || profileAddress?.cep || '';
        setCepValue(prefillCep);
        setCepOpen(true);
      }
    },
    [savedAddress, profileAddress]
  );

  const openCheckoutAddressFlow = useCallback(() => {
    setAddressFlowContext('checkout');
    setCheckoutAddressConfirmed(false);
    setCepValue(savedAddress?.cep || profileAddress?.cep || '');
    setCepOpen(true);
  }, [savedAddress, profileAddress]);

  const selectPayment = useCallback((id) => {
    setCheckoutData((d) => ({
      ...d,
      payment: id,
      trocoAnswer: id === 'dinheiro' ? d.trocoAnswer : '',
      trocoValue: id === 'dinheiro' ? d.trocoValue : '',
    }));
  }, []);

  const setCheckoutTrocoAnswer = useCallback((answer) => {
    setCheckoutData((d) => ({
      ...d,
      trocoAnswer: answer,
      trocoValue: answer === 'sim' ? d.trocoValue : '',
    }));
  }, []);

  const setCheckoutTrocoValue = useCallback((value) => {
    setCheckoutData((d) => ({ ...d, trocoValue: formatMoneyBrInput(value) }));
  }, []);

  const persistCompletedOrder = useCallback(
    async ({ orderNumber, customerName, customerPhone }) => {
      const createdAt = new Date().toISOString();
      const orderTipo = checkoutData.delivery === 'entregar' ? 'delivery' : 'retirada';
      const eta = getEtaFromConfirmedAt(createdAt, storeConfig, orderTipo);
      const subtotal = cartSubtotal();
      const taxaEntrega = checkoutData.delivery === 'entregar' ? Number(deliveryFee) || 0 : 0;
      const cupomOff = calculateCupomDiscount(appliedCupom, subtotal);
      const total = Math.max(0, subtotal + taxaEntrega - cupomOff);
      const formattedPhone = formatPhoneBr(customerPhone);
      const phoneDigits = normalizePhone(customerPhone);
      const addressSnapshot =
        checkoutData.delivery === 'entregar' && savedAddress && checkoutAddressConfirmed
          ? { ...savedAddress }
          : null;
      const addressText = addressSnapshot
        ? `${addressSnapshot.rua}${addressSnapshot.num ? `, ${addressSnapshot.num}` : ''} - ${addressSnapshot.bairro} - ${addressSnapshot.cidade || ''}`
        : formatStoreAddress(storeConfig);
      let observacao = '';
      if (checkoutData.payment === 'dinheiro' && checkoutData.trocoAnswer === 'sim') {
        const trocoAmount = parseMoneyBrInput(checkoutData.trocoValue);
        observacao = `Precisa de troco para ${formatPrice(trocoAmount)}`;
      }
      const localCustomerId = `cliente-${phoneDigits || Date.now()}`;
      const adminOrder = {
        id: orderNumber,
        status: 'novo',
        tipo: checkoutData.delivery === 'entregar' ? 'delivery' : 'retirada',
        clienteNome: customerName,
        clienteTelefone: formattedPhone,
        customer_id: localCustomerId,
        createdAt,
        prazo: formatTime(eta),
        entregarAte: eta.toISOString(),
        endereco: addressSnapshot
          ? {
              cep: addressSnapshot.cep,
              logradouro: addressSnapshot.rua,
              numero: addressSnapshot.num,
              bairro: addressSnapshot.bairro,
              cidade: addressSnapshot.cidade,
              estado: addressSnapshot.estado,
              complemento: addressSnapshot.comp,
              referencia: addressSnapshot.ref,
            }
          : null,
        enderecoTexto: addressText,
        observacao,
        itens: cart.map((item) => ({
          nome: item.name,
          qtd: item.qty,
          precoUnit: item.price,
          subtotal: item.price * item.qty,
          obs: item.opts?.length ? item.opts.join(', ') : '',
          produtoId: item.productId,
        })),
        subtotal,
        frete: taxaEntrega,
        acrescimo: 0,
        desconto: cupomOff,
        cupomCodigo: appliedCupom?.codigo || '',
        total,
        historico: [{ status: 'novo', at: createdAt }],
        pagamento: { metodo: checkoutData.payment, recebido: total, troco: 0 },
        autoImported: true,
      };
      const publicOrder = {
        id: orderNumber,
        status: 'novo',
        tipo: adminOrder.tipo,
        createdAt,
        prazo: adminOrder.prazo,
        entregarAte: adminOrder.entregarAte,
        clienteNome: customerName,
        clienteTelefone: formattedPhone,
        enderecoTexto: addressText,
        pagamento: PAY_LABELS[checkoutData.payment] || checkoutData.payment,
        itens: adminOrder.itens,
        subtotal,
        frete: taxaEntrega,
        desconto: cupomOff,
        cupomCodigo: adminOrder.cupomCodigo,
        total,
      };

      const adminState = storeSnapshotRef.current;
      const previousCustomer = (adminState.clientes || []).find(
        (customer) => normalizePhone(customer.phone) === phoneDigits
      );
      const nextAddress = addressSnapshot
        ? {
            id: previousCustomer?.addresses?.[0]?.id || `end-${Date.now()}`,
            cep: addressSnapshot.cep,
            street: addressSnapshot.rua,
            number: addressSnapshot.num,
            district: addressSnapshot.bairro,
            city: addressSnapshot.cidade,
            state: addressSnapshot.estado,
            complement: addressSnapshot.comp,
            referencia: addressSnapshot.ref,
            principal: true,
          }
        : null;
      const nextCustomer = {
        ...(previousCustomer || {}),
        id: previousCustomer?.id || localCustomerId,
        name: customerName,
        phone: phoneDigits,
        total_orders: Number(previousCustomer?.total_orders || 0) + 1,
        total_spent: Number(previousCustomer?.total_spent || 0) + total,
        last_order_at: createdAt,
        updated_at: createdAt,
        created_at: previousCustomer?.created_at || createdAt,
        addresses: nextAddress
          ? [nextAddress, ...(previousCustomer?.addresses || []).filter((address) => address.id !== nextAddress.id)]
          : previousCustomer?.addresses || [],
      };
      const nextState = withDerivedData({
        ...adminState,
        clientes: [
          nextCustomer,
          ...(adminState.clientes || []).filter((customer) => customer.id !== nextCustomer.id),
        ],
        pedidos: [],
      });

      const safeSlug = normalizeSlug(storeConfig.slug || effectiveSlug || slug || nextState.loja?.slug);
      const apiRes = await fetch('/api/public-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: safeSlug, order: adminOrder, customer: nextCustomer }),
      });
      const apiJson = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok || !apiJson.ok) {
        throw new Error(apiJson.error || 'Não foi possível registrar o pedido.');
      }

      storeSnapshotRef.current = nextState;
      window.dispatchEvent(new CustomEvent('admin-data-updated', { detail: nextState }));
      window.dispatchEvent(new CustomEvent('cardapio-public-orders-updated'));
      await hydratePublicOrders({ force: true });

      return publicOrder;
    },
    [PAY_LABELS, appliedCupom, cart, cartSubtotal, checkoutAddressConfirmed, checkoutData, deliveryFee, effectiveSlug, hydratePublicOrders, persistStoreSnapshot, savedAddress, slug, storeConfig]
  );

  const checkoutNext = useCallback(async () => {
    if (checkoutStep === 1) {
      const name = checkoutName.trim();
      const phone = checkoutPhone.trim();
      if (!name) {
        void showAlert('Preencha seu nome.');
        return;
      }
      if (!isCompleteMobilePhoneBr(phone)) {
        void showAlert(mobilePhoneIncompleteMessage());
        return;
      }
      const formattedPhone = formatPhoneBr(phone);
      setProfileDisplayName(name);
      setProfileDisplayPhone(formattedPhone);
      setProfileName(name);
      setProfilePhone(formattedPhone);
      try {
        window.localStorage.setItem(
          PROFILE_STORAGE_KEY,
          JSON.stringify({ name, phone: formattedPhone, image: profileImage, address: profileAddress })
        );
      } catch {}
      void persistClientSnapshot({ name, phone: formattedPhone });
      setCheckoutData((d) => ({ ...d, name, phone: formattedPhone }));
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      if (checkoutData.delivery === 'entregar' && !checkoutAddressConfirmed) {
        setAddressFlowContext('checkout');
        setCepValue(savedAddress?.cep || profileAddress?.cep || '');
        setCepOpen(true);
        return;
      }
      setCheckoutStep(3);
    } else if (checkoutStep === 3) {
      if (!checkoutData.payment) {
        void showAlert('Selecione uma forma de pagamento.');
        return;
      }
      if (checkoutData.payment === 'dinheiro') {
        if (!checkoutData.trocoAnswer) {
          void showAlert('Informe se precisa de troco.');
          return;
        }
        if (checkoutData.trocoAnswer === 'sim' && !hasMoneyBrValue(checkoutData.trocoValue)) {
          void showAlert('Informe o valor para o troco.');
          return;
        }
      }
      setCheckoutStep(4);
    } else if (checkoutStep === 4) {
      if (checkoutSubmittingRef.current) return;
      checkoutSubmittingRef.current = true;
      const orderNumber = String(Date.now()).slice(-10);
      try {
        await persistCompletedOrder({
          orderNumber,
          customerName: checkoutData.name,
          customerPhone: checkoutData.phone,
        });
        trackMetaEvent('Purchase', {
          content_ids: cart.map((item) => String(item.productId)),
          content_type: 'product',
          value: cartTotal(),
          currency: 'BRL',
          num_items: cart.reduce((sum, item) => sum + item.qty, 0),
          order_id: orderNumber,
        });
        const subtotal = cartSubtotal();
        const taxaEntrega = checkoutData.delivery === 'entregar' ? Number(deliveryFee) || 0 : 0;
        const cupomOff = calculateCupomDiscount(appliedCupom, subtotal);
        const total = Math.max(0, subtotal + taxaEntrega - cupomOff);
        const addressText =
          checkoutData.delivery === 'entregar' && savedAddress && checkoutAddressConfirmed
            ? `${savedAddress.rua}${savedAddress.num ? `, ${savedAddress.num}` : ''} — ${savedAddress.bairro}`
            : '';
        setCheckoutSuccessSnapshot({
          orderNumber,
          customerName: checkoutData.name,
          customerPhone: checkoutData.phone,
          payment: checkoutData.payment,
          delivery: checkoutData.delivery,
          addressText,
          items: cart.map((item) => ({
            name: item.name,
            qty: item.qty,
            opts: item.opts || [],
            lineTotal: formatPrice(item.price * item.qty),
          })),
          subtotal,
          taxaEntrega,
          cupomOff,
          total,
        });
        setCheckoutOrderNumber(orderNumber);
        setCart([]);
        setAppliedCupom(null);
        setCheckoutSuccess(true);
      } catch (error) {
        void showAlert(error?.message || 'Não foi possível enviar o pedido. Tente novamente.');
      } finally {
        checkoutSubmittingRef.current = false;
      }
    }
  }, [
    checkoutStep,
    checkoutName,
    checkoutPhone,
    checkoutData,
    checkoutAddressConfirmed,
    savedAddress,
    profileAddress,
    profileImage,
    cart,
    cartTotal,
    persistCompletedOrder,
    persistClientSnapshot,
    showAlert,
    cartSubtotal,
    deliveryFee,
    savedAddress,
    checkoutAddressConfirmed,
    appliedCupom,
    formatPrice,
  ]);

  const checkoutBack = useCallback(() => {
    if (checkoutStep > 1 && !checkoutSuccess) {
      setCheckoutStep((s) => s - 1);
    }
  }, [checkoutStep, checkoutSuccess]);

  const dismissCheckoutSuccess = useCallback(() => {
    setCheckoutSuccess(false);
    setCheckoutSuccessSnapshot(null);
    setCheckoutOrderNumber('');
    setCheckoutStep(1);
    closeCheckout();
    showMainPage();
  }, [closeCheckout, showMainPage]);

  const clearPublicOrderHistory = useCallback(() => {
    const slugToUse = normalizeSlug(
      effectiveSlug || storeConfig.slug || slug || storeSnapshotRef.current?.loja?.slug || getConfiguredDefaultSlug()
    );
    const historyIds = publicOrders
      .filter((order) => ['concluido', 'cancelado'].includes(order.status))
      .map((order) => order.id);
    addHiddenHistoryOrderIds(slugToUse, historyIds);
    const activeOnly = clearClientOrderHistory(publicOrders);
    writeCachedOrders(slugToUse, activeOnly);
    setPublicOrders(activeOnly);
  }, [publicOrders, effectiveSlug, storeConfig.slug, slug]);

  const handlePromoNav = useCallback(() => {
    const promoCategory =
      dynamicCategories.find((cat) => cat.toLowerCase().includes('promo')) || 'Combos com Promoção!';
    setPage('main');
    setSelectedCategory(promoCategory);
    setCategoryMenuOpen(false);
    setNavActive('navPromo');
    setMobileNavActive('mNavPromo');
  }, [dynamicCategories]);

  const pickupDurationLabel = useMemo(
    () => formatDurationMinutes(getEstimateMinutesForOrderTipo(storeConfig, 'retirada')),
    [storeConfig]
  );

  const deliveryDurationLabel = useMemo(
    () => formatDurationMinutes(getEstimateMinutesForOrderTipo(storeConfig, 'delivery')),
    [storeConfig]
  );

  const locStrong =
    currentDeliveryMode === 'retirar'
      ? 'Retirar no estabelecimento'
      : 'Entregar no endereço';

  const locSub =
    currentDeliveryMode === 'retirar'
      ? `Pronto em ~${pickupDurationLabel}`
      : `Entrega em ~${deliveryDurationLabel}`;

  const adicionarTotal = currentProduct
    ? (currentProduct.price + addonExtras) * currentQty
    : 0;

  const catalogValue = useMemo(
    () => ({
      storeConfig,
      storeReady,
      splashVisible,
      CATEGORIES: dynamicCategories,
      relatedItems,
      filteredProducts,
      promoProducts,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      categoryMenuOpen,
      setCategoryMenuOpen,
      infoOpen,
      selectCategory,
      toggleInfo,
      openProduct,
      formatPrice,
      handlePromoNav,
      isStoreOpen: Boolean(storeConfig.aberta),
      formatStoreAddress,
      STORE_ADDRESS,
      pickupDurationLabel,
      deliveryDurationLabel,
    }),
    [
      storeConfig,
      storeReady,
      splashVisible,
      dynamicCategories,
      relatedItems,
      filteredProducts,
      promoProducts,
      searchQuery,
      selectedCategory,
      categoryMenuOpen,
      infoOpen,
      selectCategory,
      toggleInfo,
      openProduct,
      formatPrice,
      handlePromoNav,
      pickupDurationLabel,
      deliveryDurationLabel,
    ]
  );

  const cartValue = useMemo(
    () => ({
      cart,
      productOpen,
      currentProduct,
      currentQty,
      selectedAddons,
      addonExtras,
      popupHeaderCompact,
      setPopupHeaderCompact,
      popupDetailsRef,
      toggleAddon,
      changeQty,
      addToCart,
      addToCartCustom,
      clearCart,
      removeCartItem,
      editCartItem,
      closeProductPopup,
      adicionarTotal,
      cartSubtotal,
      cartTotal,
      cartCount,
      cartReviewOpen,
      openCartReview,
      closeCartReview,
      finalizeFromCartReview,
    }),
    [
      cart,
      cartReviewOpen,
      openCartReview,
      closeCartReview,
      finalizeFromCartReview,
      productOpen,
      currentProduct,
      currentQty,
      selectedAddons,
      addonExtras,
      popupHeaderCompact,
      toggleAddon,
      changeQty,
      addToCart,
      addToCartCustom,
      clearCart,
      removeCartItem,
      editCartItem,
      closeProductPopup,
      adicionarTotal,
      cartSubtotal,
      cartTotal,
      cartCount,
    ]
  );

  const checkoutValue = useMemo(
    () => ({
      checkoutOpen,
      checkoutStep,
      checkoutData,
      checkoutSuccess,
      checkoutSuccessSnapshot,
      checkoutOrderNumber,
      checkoutName,
      setCheckoutName,
      checkoutPhone,
      setCheckoutPhone,
      checkoutAddressConfirmed,
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
      availableCupons,
      currentDeliveryMode,
      deliveryMiniOpen,
      savedAddress,
      deliveryFee,
      deliveryMeta,
      locStrong,
      locSub,
      STEP_LABELS,
      PAYMENT_METHODS,
      PAY_LABELS,
      openCheckout,
      closeCheckout,
      openCheckoutAddressFlow,
      selectDelivery,
      selectPayment,
      setCheckoutTrocoAnswer,
      setCheckoutTrocoValue,
      checkoutNext,
      checkoutBack,
      dismissCheckoutSuccess,
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
      getDeliveryEstimateMinutes,
      formatTime,
      cepInputRef,
      cupomInputRef,
    }),
    [
      checkoutOpen,
      checkoutStep,
      checkoutData,
      checkoutSuccess,
      checkoutSuccessSnapshot,
      checkoutOrderNumber,
      checkoutName,
      checkoutPhone,
      checkoutAddressConfirmed,
      cepOpen,
      addressOpen,
      cupomOpen,
      cepValue,
      addrForm,
      cupomValue,
      appliedCupom,
      clearAppliedCupom,
      availableCupons,
      currentDeliveryMode,
      deliveryMiniOpen,
      savedAddress,
      deliveryFee,
      deliveryMeta,
      locStrong,
      locSub,
      openCheckout,
      closeCheckout,
      openCheckoutAddressFlow,
      selectDelivery,
      selectPayment,
      setCheckoutTrocoAnswer,
      setCheckoutTrocoValue,
      checkoutNext,
      checkoutBack,
      dismissCheckoutSuccess,
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
      getDeliveryEstimateMinutes,
      formatTime,
    ]
  );

  const uiValue = useMemo(
    () => ({
      page,
      navActive,
      mobileNavActive,
      showMobileSacola,
      profileName,
      setProfileName,
      profilePhone,
      setProfilePhone,
      profileDisplayName,
      profileDisplayPhone,
      profileImage,
      setProfileImage,
      profileAddress,
      setProfileAddress,
      publicOrders,
      clearPublicOrderHistory,
      showMainPage,
      showProfile,
      showOrdersPage,
      setMobileNav,
      saveProfile,
      setNavActive,
    }),
    [
      page,
      navActive,
      mobileNavActive,
      showMobileSacola,
      profileName,
      profilePhone,
      profileDisplayName,
      profileDisplayPhone,
      profileImage,
      profileAddress,
      publicOrders,
      clearPublicOrderHistory,
      showMainPage,
      showProfile,
      showOrdersPage,
      setMobileNav,
      saveProfile,
      setNavActive,
    ]
  );

  const value = useMemo(
    () => ({
      ...catalogValue,
      ...cartValue,
      ...checkoutValue,
      ...uiValue,
    }),
    [catalogValue, cartValue, checkoutValue, uiValue]
  );

  return (
    <CardapioCatalogContext.Provider value={catalogValue}>
      <CardapioCartContext.Provider value={cartValue}>
        <CardapioCheckoutContext.Provider value={checkoutValue}>
          <CardapioContext.Provider value={value}>
            {children}
            {dialog ? (
              <div className="generic-overlay open" role="presentation">
                <div className="modal-card app-dialog-card" role="dialog" aria-modal="true">
                  <div className="modal-topbar">
                    <div style={{ width: 30 }} />
                    <div className="modal-topbar-title">{dialog.title}</div>
                    <button type="button" className="modal-close" onClick={dialog.onConfirm} aria-label="Fechar">
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <p className="app-dialog-message">{dialog.message}</p>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-modal-confirm" onClick={dialog.onConfirm}>
                      OK
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </CardapioContext.Provider>
        </CardapioCheckoutContext.Provider>
      </CardapioCartContext.Provider>
    </CardapioCatalogContext.Provider>
  );
}

export function useCardapioCatalog() {
  const ctx = useContext(CardapioCatalogContext);
  if (!ctx) throw new Error('useCardapioCatalog must be used within CardapioProvider');
  return ctx;
}

export function useCardapioCart() {
  const ctx = useContext(CardapioCartContext);
  if (!ctx) throw new Error('useCardapioCart must be used within CardapioProvider');
  return ctx;
}

export function useCardapioCheckout() {
  const ctx = useContext(CardapioCheckoutContext);
  if (!ctx) throw new Error('useCardapioCheckout must be used within CardapioProvider');
  return ctx;
}

export function useCardapio() {
  const ctx = useContext(CardapioContext);
  if (!ctx) throw new Error('useCardapio must be used within CardapioProvider');
  return ctx;
}
