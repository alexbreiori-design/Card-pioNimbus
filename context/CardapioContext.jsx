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
import { formatMarmitaCartObs } from '@/lib/marmita/marmitaWizard';
import { formatPrice } from '@/lib/utils/format';
import { fetchViaCep } from '@/lib/cep/viacep';
import { calculateCupomDiscount, findCupomByCode } from '@/lib/cupons';
import { applyBrandThemeTargets } from '@/lib/brandTheme';
import { buildCardapioBootState, resolveStoreSlugFromBrowser } from '@/lib/cardapioBoot';
import { resolveCardapioFromPublicPayload } from '@/lib/catalogPublic';
import { createEmptyStoreSeed, getConfiguredDefaultSlug } from '@/lib/storeBoot';
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
import { CATEGORY_LAYOUT_DEFAULT, resolveMarmitaSectionLayout } from '@/lib/cardapio/categoryLayouts';
import { fetchPublicEmpresaCardapio } from '@/lib/supabase/publicEmpresa';
import { initMetaPixel, sanitizeMetaPixelId, trackMetaEvent } from '@/lib/meta/pixel';
import {
  initGoogleAnalytics,
  sanitizeGa4MeasurementId,
  sanitizeGtmContainerId,
  trackGoogleAddToCart,
  trackGoogleBeginCheckout,
  trackGooglePurchase,
} from '@/lib/analytics/googleTags';
import { normalizeProductDeepLinkId, syncProductQueryParam } from '@/lib/productDeepLink';
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

const PUBLIC_PAYMENT_METHODS_BASE = [
  { id: 'pix', label: 'Pix (enviar comprovante)', group: 'Pagar na entrega' },
  { id: 'dinheiro', label: 'Dinheiro', group: 'Pagar na entrega' },
  { id: 'credito', label: 'Cartão de crédito', group: 'Pagar na entrega' },
  { id: 'debito', label: 'Cartão de débito', group: 'Pagar na entrega' },
];

function buildPublicPaymentMethods(exibirPixCardapio = true, onlineAccount = null) {
  const offline = exibirPixCardapio === false
    ? PUBLIC_PAYMENT_METHODS_BASE.filter((method) => method.id !== 'pix')
    : PUBLIC_PAYMENT_METHODS_BASE;
  if (!onlineAccount) return offline;
  const online = [];
  if (onlineAccount.methods?.pix !== false) {
    online.push({ id: 'pix_online', label: 'Pix online', group: 'Pagar agora' });
  }
  if (onlineAccount.methods?.credit_card !== false && onlineAccount.publicKey) {
    online.push({ id: 'credito_online', label: 'Cartão online', group: 'Pagar agora' });
  }
  return [...online, ...offline];
}

const PAY_LABELS = {
  pix: 'Pix',
  pix_online: 'Pix online',
  dinheiro: 'Dinheiro',
  credito: 'Cartão de crédito',
  credito_online: 'Cartão online',
  debito: 'Cartão de débito',
};
const PROFILE_STORAGE_KEY = 'cardapio_profile_v1';
const STORE_SYNC_MS = 30000;
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

/** Aplica cor de destaque no cardápio público (v1, v2 e diálogos). */
function applyBrandColor(hex) {
  const targets = [document.documentElement];
  const themeRoot = document.querySelector('.cardapio-theme-root');
  const v2Root = document.querySelector('.cardapio-v2-root');
  if (themeRoot) targets.push(themeRoot);
  if (v2Root) targets.push(v2Root);
  applyBrandThemeTargets(targets, hex);
}

function arraysShallowEqualById(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((item, index) => item?.id === b[index]?.id);
}

function publicOrdersEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every(
    (order, index) =>
      order?.id === b[index]?.id &&
      order?.status === b[index]?.status &&
      order?.total === b[index]?.total
  );
}

function stringifyScheduleKey(horarios, fechadaManual) {
  return `${Boolean(fechadaManual)}:${JSON.stringify(horarios ?? null)}`;
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

export function CardapioProvider({
  children,
  slug = '',
  initialPublicPayload = null,
  initialEmpresa = null,
  initialProductId = '',
}) {
  const bootRef = useRef(undefined);
  if (bootRef.current === undefined) {
    bootRef.current = buildCardapioBootState(initialPublicPayload, initialEmpresa, slug);
  }
  const boot = bootRef.current;
  const pendingProductIdRef = useRef(normalizeProductDeepLinkId(initialProductId));

  const [effectiveSlug, setEffectiveSlug] = useState(() => normalizeSlug(slug));
  const [storeConfig, setStoreConfig] = useState(() => boot?.loja ?? DEFAULT_ADMIN_DATA.loja);
  const [dynamicProducts, setDynamicProducts] = useState(() => boot?.resolved?.products ?? []);
  const [promoCarouselProducts, setPromoCarouselProducts] = useState(
    () => boot?.resolved?.promoCarouselProducts ?? []
  );
  const [dynamicCategories, setDynamicCategories] = useState(
    () => boot?.resolved?.categories ?? ['Todos']
  );
  const [storeReady, setStoreReady] = useState(() => Boolean(boot?.loja));
  const [splashVisible, setSplashVisible] = useState(() => !boot?.loja);
  const [categoryIconsByName, setCategoryIconsByName] = useState(
    () => boot?.resolved?.categoryIconsByName ?? {}
  );
  const [categoryLayoutsByName, setCategoryLayoutsByName] = useState(
    () => boot?.resolved?.categoryLayoutsByName ?? {}
  );
  const [marmitaGrupoLayoutsById, setMarmitaGrupoLayoutsById] = useState(
    () => boot?.resolved?.marmitaGrupoLayoutsById ?? {}
  );
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
    email: '',
    delivery: '',
    payment: '',
    trocoAnswer: '',
    trocoValue: '',
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutSuccessSnapshot, setCheckoutSuccessSnapshot] = useState(null);
  const [checkoutOrderNumber, setCheckoutOrderNumber] = useState('');
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutAddressConfirmed, setCheckoutAddressConfirmed] = useState(false);
  const [onlinePaymentConfig, setOnlinePaymentConfig] = useState(null);
  const [onlinePayment, setOnlinePayment] = useState(null);
  const [addressFlowContext, setAddressFlowContext] = useState('header');
  const checkoutCustomerLookupRef = useRef({ phone: '', inflight: false });

  const [cepOpen, setCepOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [deliveryCheckNumberOpen, setDeliveryCheckNumberOpen] = useState(false);
  const [deliveryCheckResultOpen, setDeliveryCheckResultOpen] = useState(false);
  const [deliveryCheckResult, setDeliveryCheckResult] = useState(null);
  const [deliveryAvailability, setDeliveryAvailability] = useState(null);
  const [storeClosedNoticeOpen, setStoreClosedNoticeOpen] = useState(false);
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
  const [availableCupons, setAvailableCupons] = useState(() => boot?.resolved?.cupons ?? []);
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
  const storeSnapshotRef = useRef(
    boot?.snapshot ??
      withDerivedData(createEmptyStoreSeed(normalizeSlug(slug) || getConfiguredDefaultSlug()))
  );
  const catalogWatermarkRef = useRef(null);
  const ordersWatermarkRef = useRef(null);
  const appliedBrandColorRef = useRef('');
  const effectiveSlugRef = useRef(effectiveSlug);
  effectiveSlugRef.current = effectiveSlug;
  const checkoutSubmittingRef = useRef(false);
  const storeClosedNoticeShownRef = useRef(false);
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

  const paymentMethods = useMemo(
    () => buildPublicPaymentMethods(storeConfig.exibirPixCardapio, onlinePaymentConfig),
    [storeConfig.exibirPixCardapio, onlinePaymentConfig]
  );

  useEffect(() => {
    const storeSlug = normalizeSlug(storeConfig.slug || effectiveSlug || slug);
    if (!storeSlug) return;
    let cancelled = false;
    fetch(`/api/pagamentos/config?slug=${encodeURIComponent(storeSlug)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setOnlinePaymentConfig(json?.ok ? json.account : null);
      })
      .catch(() => {
        if (!cancelled) setOnlinePaymentConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveSlug, slug, storeConfig.slug]);

  useEffect(() => {
    if (storeConfig.exibirPixCardapio === false && checkoutData.payment === 'pix') {
      setCheckoutData((current) => ({ ...current, payment: '' }));
    }
  }, [storeConfig.exibirPixCardapio, checkoutData.payment]);

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
      if (cachedOrders.length) {
        setPublicOrders((prev) => (publicOrdersEqual(prev, cachedOrders) ? prev : cachedOrders));
      }
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

    setPublicOrders((prev) => (publicOrdersEqual(prev, merged) ? prev : merged));
    writeCachedOrders(slugToUse, merged);
  }, [
    checkoutData.phone,
    effectiveSlug,
    profileDisplayPhone,
    profilePhone,
    slug,
    storeConfig.slug,
  ]);

  const hydratePublicOrdersRef = useRef(hydratePublicOrders);
  hydratePublicOrdersRef.current = hydratePublicOrders;

  const modalOpen =
    productOpen || cartReviewOpen || checkoutOpen || cepOpen || addressOpen || cupomOpen;

  useEffect(() => {
    const brand = boot?.loja?.corMarca;
    if (!brand || brand === appliedBrandColorRef.current) return;
    appliedBrandColorRef.current = brand;
    applyBrandColor(brand);
  }, [boot]);

  useEffect(() => {
    if (slug) {
      setEffectiveSlug(normalizeSlug(slug));
      return;
    }
    if (storeSnapshotRef.current?.loja?.slug) {
      setEffectiveSlug(normalizeSlug(storeSnapshotRef.current.loja.slug));
    } else {
      setEffectiveSlug(resolveStoreSlugFromBrowser(getConfiguredDefaultSlug()));
    }
  }, [slug]);

  useEffect(() => {
    const syncFromAdmin = async ({ force = false } = {}) => {
      try {
        const slugToFetch =
          normalizeSlug(slug) ||
          normalizeSlug(effectiveSlugRef.current) ||
          resolveStoreSlugFromBrowser() ||
          getConfiguredDefaultSlug();
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
        }

        const catalogChanged =
          force ||
          (remoteUpdatedAt != null && remoteUpdatedAt !== catalogWatermarkRef.current);

        if (catalogChanged && remoteUpdatedAt != null) {
          catalogWatermarkRef.current = remoteUpdatedAt;
        }

        storeSnapshotRef.current = parsed;

        let loja = parsed?.loja;
        if (!loja) {
          if (boot?.loja) {
            loja = boot.loja;
          } else {
            return;
          }
        }

        if (slugToFetch) {
          try {
            const empresa = await fetchPublicEmpresaCardapio(slugToFetch);
            loja = mergeEmpresaIntoLoja(loja, empresa);
          } catch {
            /* mantém loja do estado remoto/local */
          }
        }

        const resolvedPixelId =
          sanitizeMetaPixelId(loja?.metaPixelId) ||
          sanitizeMetaPixelId(parsed?.loja?.metaPixelId) ||
          '';
        if (resolvedPixelId) {
          loja = { ...loja, metaPixelId: resolvedPixelId };
          initMetaPixel(resolvedPixelId);
        }

        const resolvedGa4Id =
          sanitizeGa4MeasurementId(loja?.ga4MeasurementId) ||
          sanitizeGa4MeasurementId(parsed?.loja?.ga4MeasurementId) ||
          '';
        const resolvedGtmId =
          sanitizeGtmContainerId(loja?.gtmContainerId) ||
          sanitizeGtmContainerId(parsed?.loja?.gtmContainerId) ||
          '';
        if (resolvedGa4Id || resolvedGtmId) {
          loja = {
            ...loja,
            ...(resolvedGa4Id ? { ga4MeasurementId: resolvedGa4Id } : {}),
            ...(resolvedGtmId ? { gtmContainerId: resolvedGtmId } : {}),
          };
          initGoogleAnalytics({
            ga4MeasurementId: resolvedGa4Id,
            gtmContainerId: resolvedGtmId,
          });
        }

        const resolved = resolveCardapioFromPublicPayload(parsed);
        if (resolved && catalogChanged) {
          setDynamicProducts((prev) =>
            arraysShallowEqualById(prev, resolved.products) ? prev : resolved.products
          );
          setPromoCarouselProducts((prev) =>
            arraysShallowEqualById(prev, resolved.promoCarouselProducts || [])
              ? prev
              : resolved.promoCarouselProducts || []
          );
          setDynamicCategories((prev) => {
            const next = resolved.categories;
            if (
              prev.length === next.length &&
              prev.every((cat, index) => cat === next[index])
            ) {
              return prev;
            }
            return next;
          });
          setCategoryIconsByName((prev) => {
            const next = resolved.categoryIconsByName;
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
          });
          setCategoryLayoutsByName((prev) => {
            const next = resolved.categoryLayoutsByName || {};
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
          });
          setMarmitaGrupoLayoutsById((prev) => {
            const next = resolved.marmitaGrupoLayoutsById || {};
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
          });
          setAvailableCupons((prev) =>
            arraysShallowEqualById(prev, resolved.cupons) ? prev : resolved.cupons
          );
        }

        const lojaWithAddress = applyScheduleOpenStatus({
          ...loja,
          endereco: formatStoreAddress(loja),
        });
        setStoreConfig((prev) => {
          if (
            prev.aberta === lojaWithAddress.aberta &&
            prev.corMarca === lojaWithAddress.corMarca &&
            prev.endereco === lojaWithAddress.endereco &&
            prev.fechadaManual === lojaWithAddress.fechadaManual &&
            prev.nome === lojaWithAddress.nome &&
            prev.slug === lojaWithAddress.slug
          ) {
            return prev;
          }
          return lojaWithAddress;
        });

        const nextBrand = lojaWithAddress.corMarca || '';
        if (nextBrand && nextBrand !== appliedBrandColorRef.current) {
          appliedBrandColorRef.current = nextBrand;
          applyBrandColor(nextBrand);
        }
      } catch {
        /* noop */
      } finally {
        setStoreReady(true);
      }
    };
    syncFromAdmin({ force: true });
    const interval = window.setInterval(() => syncFromAdmin(), STORE_SYNC_MS);
    const onFocus = () => syncFromAdmin();
    const onStorage = () => syncFromAdmin({ force: true });
    const onAdminUpdated = (event) => {
      if (event?.detail === storeSnapshotRef.current) return;
      catalogWatermarkRef.current = null;
      void syncFromAdmin({ force: true });
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin-data-updated', onAdminUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin-data-updated', onAdminUpdated);
    };
  }, [boot, slug]);

  const scheduleSyncKey = useMemo(
    () => stringifyScheduleKey(storeConfig.horarios, storeConfig.fechadaManual),
    [storeConfig.horarios, storeConfig.fechadaManual]
  );

  useEffect(() => {
    if (!storeReady || !storeConfig?.corMarca) return;
    const nextBrand = storeConfig.corMarca;
    if (nextBrand === appliedBrandColorRef.current) return;
    appliedBrandColorRef.current = nextBrand;
    applyBrandColor(nextBrand);
  }, [storeReady, storeConfig.corMarca]);

  useEffect(() => {
    if (!storeReady) return undefined;
    const tick = () => {
      setStoreConfig((prev) => {
        const next = applyScheduleOpenStatus(prev);
        return next.aberta === prev.aberta ? prev : next;
      });
    };
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [storeReady, scheduleSyncKey]);

  useEffect(() => {
    if (!storeReady) return undefined;
    const timer = window.setTimeout(() => setSplashVisible(false), 800);
    return () => window.clearTimeout(timer);
  }, [storeReady]);

  useEffect(() => {
    if (!storeReady) return undefined;

    void hydratePublicOrdersRef.current({ force: true });
    const interval = window.setInterval(() => {
      void hydratePublicOrdersRef.current();
    }, ORDERS_SYNC_MS);
    const onFocus = () => void hydratePublicOrdersRef.current({ force: true });
    const onOrdersUpdated = (event) => {
      if (event?.detail === storeSnapshotRef.current) return;
      void hydratePublicOrdersRef.current({ force: true });
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('admin-data-updated', onOrdersUpdated);
    window.addEventListener('cardapio-public-orders-updated', onOrdersUpdated);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('admin-data-updated', onOrdersUpdated);
      window.removeEventListener('cardapio-public-orders-updated', onOrdersUpdated);
    };
  }, [storeReady]);

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
      const isV2 = Boolean(document.querySelector('.cardapio-v2-root'));
      const mobileBreakpoint = isV2 ? 1100 : 768;
      setShowMobileSacola(window.innerWidth < mobileBreakpoint);
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
        const categoryLayout = isMarmitaSection
          ? resolveMarmitaSectionLayout(cat, items, {
              categoryLayoutsByName,
              marmitaGrupoLayoutsById,
            })
          : categoryLayoutsByName[cat] || CATEGORY_LAYOUT_DEFAULT;
        sections.push({
          category: cat,
          items,
          categoryIcon: categoryIconsByName[cat] || 'burger',
          categoryLayout,
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
    categoryLayoutsByName,
    marmitaGrupoLayoutsById,
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

  const toggleDeliveryCard = useCallback(() => {
    setAddressFlowContext('deliveryCheck');
    setDeliveryMiniOpen(false);
    const cepDigits = savedAddress?.cep?.replace(/\D/g, '') || '';
    if (cepDigits.length === 8) {
      setCepValue(`${cepDigits.slice(0, 5)}-${cepDigits.slice(5, 8)}`);
    } else {
      setCepValue(savedAddress?.cep || '');
    }
    setCepOpen(true);
  }, [savedAddress]);

  const openDeliveryCheckCep = useCallback(() => {
    setAddressFlowContext('deliveryCheck');
    setCepOpen(true);
  }, []);

  const closeDeliveryCheckNumber = useCallback(() => {
    setDeliveryCheckNumberOpen(false);
  }, []);

  const closeDeliveryCheckResult = useCallback(() => {
    setDeliveryCheckResultOpen(false);
    setDeliveryCheckResult(null);
  }, []);

  const closeStoreClosedNotice = useCallback(() => {
    setStoreClosedNoticeOpen(false);
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
    if (addressFlowContext === 'header' && !savedAddress) {
      setCurrentDeliveryMode('retirar');
    }
  }, [savedAddress, addressFlowContext]);

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
          if (addressFlowContext === 'deliveryCheck') {
            setCepOpen(true);
            return;
          }
        }
      } catch {
        setAddrForm((f) => ({ ...f, cep: maskCep(cepValue) }));
        void showAlert('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
        if (addressFlowContext === 'deliveryCheck') {
          setCepOpen(true);
          return;
        }
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
    if (addressFlowContext === 'deliveryCheck') {
      setDeliveryCheckNumberOpen(true);
    } else {
      setAddressOpen(true);
    }
  }, [cepValue, maskCep, profileAddress, addressFlowContext]);

  const closeAddressPopup = useCallback(() => {
    setAddressOpen(false);
    if (!savedAddress) {
      setCurrentDeliveryMode('retirar');
    }
  }, [savedAddress]);

  const confirmDeliveryCheckNumber = useCallback(async () => {
    const { rua, num, bairro, cidade, estado, cep } = addrForm;
    if (!num.trim()) {
      void showAlert('Informe o número do endereço.');
      return;
    }
    if (!rua.trim() || !bairro.trim()) {
      void showAlert('Endereço incompleto. Volte e informe um CEP válido.');
      return;
    }

    const storeSlug = normalizeSlug(storeConfig.slug || effectiveSlug || slug);
    if (!storeSlug) {
      void showAlert('Cardápio sem slug configurado. Contate a loja.');
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

      if (res.ok && json.ok !== false) {
        const fee = Number(json.taxaEntrega) || 0;
        const nextAddress = {
          rua: rua.trim(),
          num: num.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.trim(),
          cep: cep.trim(),
          comp: addrForm.comp?.trim() || '',
          ref: addrForm.ref?.trim() || '',
        };
        setDeliveryFee(fee);
        setDeliveryMeta({
          distanciaKm: json.distanciaKm,
          zonaNome: json.zonaNome,
          latitude: json.latitude,
          longitude: json.longitude,
        });
        setSavedAddress(nextAddress);
        setProfileAddress(nextAddress);
        setDeliveryAvailability({ available: true, fee });
        setDeliveryCheckResult({ available: true, fee });
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
      } else if (res.status === 503) {
        setDeliveryAvailability(null);
        setDeliveryCheckResult({ available: false, serviceUnavailable: true });
      } else {
        setDeliveryFee(0);
        setDeliveryMeta(null);
        setDeliveryAvailability({ available: false, fee: 0 });
        setDeliveryCheckResult({ available: false, fee: 0 });
      }
    } catch {
      setDeliveryAvailability(null);
      setDeliveryCheckResult({ available: false, serviceUnavailable: true });
    }

    setDeliveryCheckNumberOpen(false);
    setDeliveryCheckResultOpen(true);
  }, [
    addrForm,
    storeConfig.slug,
    effectiveSlug,
    slug,
    profileDisplayName,
    profileDisplayPhone,
    profileImage,
    showAlert,
  ]);

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
      if (!storeConfig.aberta && !storeClosedNoticeShownRef.current) {
        storeClosedNoticeShownRef.current = true;
        setStoreClosedNoticeOpen(true);
      }

      const promoEntry = promoCarouselProducts.find((p) => p.id === id);
      if (promoEntry?.type === 'pizza_sabor_promo' && promoEntry.promoPreset) {
        const basePizza = dynamicProducts.find(
          (p) =>
            p.type === 'pizza' &&
            p.pizzaConfig?.saboresSelecionados?.includes(promoEntry.promoPreset.saborId)
        );

        if (!basePizza) return;

        setCurrentProduct({
          ...basePizza,
          name: promoEntry.name,
          desc: promoEntry.desc,
          imageUrl: promoEntry.imageUrl || basePizza.imageUrl,
          price: promoEntry.price,
          promoOriginalPrice: promoEntry.promoOriginalPrice,
          isPromocao: true,
          pizzaPromoShortcut: {
            ...promoEntry.promoPreset,
            promoPrice: promoEntry.price,
            carouselId: promoEntry.id,
          },
        });
        setCurrentQty(1);
        setSelectedAddons({});
        setAddonExtras(0);
        setPopupHeaderCompact(false);
        setProductOpen(true);
        return;
      }

      const product =
        dynamicProducts.find((p) => p.id === id) || promoEntry;
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
    [dynamicProducts, promoCarouselProducts, storeConfig.aberta]
  );

  useEffect(() => {
    if (!storeReady || !pendingProductIdRef.current) return;
    const productId = pendingProductIdRef.current;
    pendingProductIdRef.current = '';
    openProduct(productId);
  }, [storeReady, openProduct, dynamicProducts.length, promoCarouselProducts.length]);

  useEffect(() => {
    if (!productOpen || !currentProduct?.id) {
      syncProductQueryParam('');
      return;
    }
    syncProductQueryParam(currentProduct.id);
  }, [productOpen, currentProduct?.id]);

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
    trackGoogleAddToCart({
      currency: 'BRL',
      value: unitPrice * currentQty,
      items: [
        {
          item_id: String(currentProduct.id),
          item_name: currentProduct.name,
          quantity: currentQty,
          price: unitPrice,
        },
      ],
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
      trackGoogleAddToCart({
        currency: 'BRL',
        value: unitPrice * qty,
        items: [
          {
            item_id: String(product.id),
            item_name: product.name,
            quantity: qty,
            price: unitPrice,
          },
        ],
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

  const changeCartItemQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const qty = item.qty + delta;
          if (qty <= 0) return null;
          return { ...item, qty };
        })
        .filter(Boolean)
    );
  }, []);

  const addProductFromCard = useCallback(
    (id) => {
      const promoEntry = promoCarouselProducts.find((p) => p.id === id);
      const product = dynamicProducts.find((p) => p.id === id) || promoEntry;
      if (!product) return;

      if (!storeConfig.aberta && !storeClosedNoticeShownRef.current) {
        storeClosedNoticeShownRef.current = true;
        setStoreClosedNoticeOpen(true);
      }

      openProduct(id);
    },
    [dynamicProducts, promoCarouselProducts, storeConfig.aberta, openProduct]
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
      email: '',
      delivery: '',
      payment: '',
      trocoAnswer: '',
      trocoValue: '',
    });
    setCheckoutName(knownName);
    setCheckoutPhone(knownPhone);
    setCheckoutEmail('');
    checkoutCustomerLookupRef.current = { phone: '', inflight: false };
    setOnlinePayment(null);
    setCheckoutOrderNumber('');
    setCheckoutOpen(true);
    trackMetaEvent('InitiateCheckout', {
      content_ids: cart.map((item) => String(item.productId)),
      content_type: 'product',
      value: cartTotal(),
      currency: 'BRL',
      num_items: cart.reduce((sum, item) => sum + item.qty, 0),
    });
    trackGoogleBeginCheckout({
      currency: 'BRL',
      value: cartTotal(),
      items: cart.map((item) => ({
        item_id: String(item.productId),
        item_name: item.name,
        quantity: item.qty,
        price: item.price,
      })),
    });
  }, [cart.length, cartSubtotal, cartTotal, profileDisplayName, profileDisplayPhone, storeConfig.aberta, storeConfig.pedidoMinimo, formatPrice]);

  const finalizeFromCartReview = useCallback(() => {
    setCartReviewOpen(false);
    openCheckout();
  }, [openCheckout]);

  const closeCheckout = useCallback(() => {
    if (onlinePayment?.payment?.id) {
      void showAlert('Aguarde a confirmação do pagamento antes de fechar esta tela.');
      return;
    }
    setCheckoutOpen(false);
    setCheckoutSuccess(false);
    setCheckoutSuccessSnapshot(null);
    setCheckoutOrderNumber('');
    setCheckoutAddressConfirmed(false);
    setOnlinePayment(null);
  }, [onlinePayment?.payment?.id, showAlert]);

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

  const lookupCheckoutCustomerByPhone = useCallback(
    async (phoneValue, { overwriteName = false } = {}) => {
      const phone = String(phoneValue || '').trim();
      if (!isCompleteMobilePhoneBr(phone)) {
        checkoutCustomerLookupRef.current = { phone: '', inflight: false };
        return null;
      }
      const digits = normalizePhone(phone);
      if (
        checkoutCustomerLookupRef.current.phone === digits ||
        checkoutCustomerLookupRef.current.inflight
      ) {
        return null;
      }

      const storeSlug = normalizeSlug(storeConfig.slug || effectiveSlug || slug);
      if (!storeSlug) return null;

      checkoutCustomerLookupRef.current = { phone: digits, inflight: true };
      try {
        const res = await fetch(
          `/api/public-customer?slug=${encodeURIComponent(storeSlug)}&phone=${encodeURIComponent(digits)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok || !json.customer) return null;

        if (json.customer.name) {
          const name = String(json.customer.name).trim();
          if (name) {
            if (overwriteName) setCheckoutName(name);
            else setCheckoutName((current) => (String(current || '').trim() ? current : name));
          }
        }
        if (json.customer.address?.rua) {
          const nextProfileAddress = {
            rua: json.customer.address.rua || '',
            num: json.customer.address.num || '',
            bairro: json.customer.address.bairro || '',
            cidade: json.customer.address.cidade || '',
            estado: json.customer.address.estado || '',
            cep: json.customer.address.cep || '',
            comp: json.customer.address.comp || '',
            ref: json.customer.address.ref || '',
          };
          setProfileAddress(nextProfileAddress);
          setAddrForm((current) => ({ ...current, ...nextProfileAddress }));
          setCepValue(nextProfileAddress.cep || '');
          setSavedAddress(null);
          setCheckoutAddressConfirmed(false);
        }
        return json.customer;
      } catch {
        checkoutCustomerLookupRef.current = { phone: '', inflight: false };
        return null;
      } finally {
        if (checkoutCustomerLookupRef.current.phone === digits) {
          checkoutCustomerLookupRef.current.inflight = false;
        }
      }
    },
    [effectiveSlug, slug, storeConfig.slug]
  );

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
    async ({ customerName, customerPhone, cardData = null }) => {
      const createdAt = new Date().toISOString();
      const isOnlinePayment = ['pix_online', 'credito_online'].includes(checkoutData.payment);
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
        id: '',
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
        enderecoLatitude:
          checkoutData.delivery === 'entregar' && deliveryMeta?.latitude != null
            ? Number(deliveryMeta.latitude)
            : null,
        enderecoLongitude:
          checkoutData.delivery === 'entregar' && deliveryMeta?.longitude != null
            ? Number(deliveryMeta.longitude)
            : null,
        distanciaKm:
          checkoutData.delivery === 'entregar' && deliveryMeta?.distanciaKm != null
            ? Number(deliveryMeta.distanciaKm)
            : null,
        observacao,
        itens: cart.map((item) => ({
          nome: item.name,
          qtd: item.qty,
          precoUnit: item.price,
          subtotal: item.price * item.qty,
          obs: item.opts?.length ? formatMarmitaCartObs(item.opts) : '',
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
        id: '',
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
        email: checkoutData.email || '',
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
      const apiRes = await fetch(
        isOnlinePayment ? '/api/pagamentos/criar' : '/api/public-order',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: safeSlug,
            order: adminOrder,
            customer: nextCustomer,
            ...(isOnlinePayment
              ? {
                  method: checkoutData.payment === 'pix_online' ? 'pix' : 'credit_card',
                  email: checkoutData.email,
                  cardData,
                }
              : {}),
          }),
        }
      );
      const apiJson = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok || !apiJson.ok) {
        throw new Error(apiJson.error || 'Não foi possível registrar o pedido.');
      }
      const orderResult = isOnlinePayment ? apiJson.order : apiJson;
      if (isOnlinePayment && !orderResult) {
        if (['recusado', 'cancelado', 'expirado', 'erro'].includes(apiJson.payment?.status)) {
          throw new Error(
            apiJson.payment?.statusDetail ||
              'O pagamento não foi aprovado. Revise os dados e tente novamente.'
          );
        }
        return {
          pending: true,
          payment: apiJson.payment,
          publicOrder,
        };
      }
      if (!orderResult?.codigo) {
        throw new Error('O pedido foi salvo, mas não recebeu um número operacional.');
      }

      adminOrder.id = orderResult.codigo;
      adminOrder.dbId = orderResult.pedidoId || orderResult.id;
      publicOrder.id = orderResult.codigo;
      publicOrder.dbId = orderResult.pedidoId || orderResult.id;

      storeSnapshotRef.current = nextState;
      window.dispatchEvent(new CustomEvent('admin-data-updated', { detail: nextState }));
      window.dispatchEvent(new CustomEvent('cardapio-public-orders-updated'));
      await hydratePublicOrders({ force: true });

      return { ...publicOrder, payment: apiJson.payment || null };
    },
    [PAY_LABELS, appliedCupom, cart, cartSubtotal, checkoutAddressConfirmed, checkoutData, deliveryFee, deliveryMeta, effectiveSlug, hydratePublicOrders, persistStoreSnapshot, savedAddress, slug, storeConfig]
  );

  const completeCheckoutOrder = useCallback(
    async (completedOrder) => {
      const orderNumber = completedOrder.id;
      trackMetaEvent('Purchase', {
        content_ids: cart.map((item) => String(item.productId)),
        content_type: 'product',
        value: cartTotal(),
        currency: 'BRL',
        num_items: cart.reduce((sum, item) => sum + item.qty, 0),
        order_id: orderNumber,
      });
      trackGooglePurchase({
        transaction_id: orderNumber,
        currency: 'BRL',
        value: cartTotal(),
        items: cart.map((item) => ({
          item_id: String(item.productId),
          item_name: item.name,
          quantity: item.qty,
          price: item.price,
        })),
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
        mpOrderId: completedOrder.mpOrderId || completedOrder.payment?.providerOrderId || null,
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
      setOnlinePayment(null);
      setCheckoutSuccess(true);
      await hydratePublicOrders({ force: true });
    },
    [
      appliedCupom,
      cart,
      cartSubtotal,
      cartTotal,
      checkoutAddressConfirmed,
      checkoutData,
      deliveryFee,
      formatPrice,
      hydratePublicOrders,
      savedAddress,
    ]
  );

  const submitOnlinePayment = useCallback(
    async (cardData = null) => {
      if (onlinePayment?.loading || onlinePayment?.payment) return;
      setOnlinePayment({ loading: true, error: '', payment: null, publicOrder: null });
      try {
        const result = await persistCompletedOrder({
          customerName: checkoutData.name,
          customerPhone: checkoutData.phone,
          cardData,
        });
        if (result.pending) {
          setOnlinePayment({
            loading: false,
            error: '',
            payment: result.payment,
            publicOrder: result.publicOrder,
          });
          return;
        }
        await completeCheckoutOrder({
          ...result,
          mpOrderId: result.payment?.providerOrderId || result.mpOrderId || null,
        });
      } catch (error) {
        setOnlinePayment({
          loading: false,
          error: error?.message || 'Não foi possível iniciar o pagamento.',
          payment: null,
          publicOrder: null,
        });
        throw error;
      }
    },
    [checkoutData.name, checkoutData.phone, completeCheckoutOrder, onlinePayment, persistCompletedOrder]
  );

  useEffect(() => {
    const payment = onlinePayment?.payment;
    if (!payment?.id || !payment?.token || !['pendente', 'processando'].includes(payment.status)) {
      return undefined;
    }
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/pagamentos/${encodeURIComponent(payment.id)}/status?token=${encodeURIComponent(payment.token)}`,
          { cache: 'no-store' }
        );
        const json = await response.json().catch(() => ({}));
        if (cancelled || !response.ok || !json.ok) return;
        if (json.payment?.status === 'aprovado' && json.order?.codigo) {
          const completed = {
            ...(onlinePayment.publicOrder || {}),
            id: json.order.codigo,
            dbId: json.order.id,
            mpOrderId: json.payment?.providerOrderId || onlinePayment.payment?.providerOrderId || null,
            payment: {
              ...(onlinePayment.payment || {}),
              ...(json.payment || {}),
            },
          };
          setOnlinePayment(null);
          await completeCheckoutOrder(completed);
          return;
        }
        if (['recusado', 'cancelado', 'expirado', 'erro'].includes(json.payment?.status)) {
          setOnlinePayment({
            loading: false,
            error: 'O pagamento não foi aprovado. Revise os dados e tente novamente.',
            payment: null,
            publicOrder: null,
          });
        }
      } catch {
        // O webhook continua processando; a próxima consulta tenta novamente.
      }
    };
    void checkStatus();
    const interval = window.setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [completeCheckoutOrder, onlinePayment]);

  const checkoutNext = useCallback(async () => {
    if (checkoutStep === 1) {
      const phone = checkoutPhone.trim();
      if (!isCompleteMobilePhoneBr(phone)) {
        void showAlert(mobilePhoneIncompleteMessage());
        return;
      }

      const formattedPhone = formatPhoneBr(phone);
      let name = checkoutName.trim();
      let nextProfileAddress = profileAddress;

      const storeSlug = normalizeSlug(storeConfig.slug || effectiveSlug || slug);
      if (storeSlug) {
        try {
          const digits = normalizePhone(phone);
          const res = await fetch(
            `/api/public-customer?slug=${encodeURIComponent(storeSlug)}&phone=${encodeURIComponent(digits)}`
          );
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.ok && json.customer) {
            checkoutCustomerLookupRef.current = { phone: digits, inflight: false };
            if (json.customer.name) {
              const customerName = String(json.customer.name).trim();
              if (customerName && !name) {
                name = customerName;
                setCheckoutName(customerName);
              }
            }
            if (json.customer.address?.rua) {
              nextProfileAddress = {
                rua: json.customer.address.rua || '',
                num: json.customer.address.num || '',
                bairro: json.customer.address.bairro || '',
                cidade: json.customer.address.cidade || '',
                estado: json.customer.address.estado || '',
                cep: json.customer.address.cep || '',
                comp: json.customer.address.comp || '',
                ref: json.customer.address.ref || '',
              };
              setProfileAddress(nextProfileAddress);
              setAddrForm((current) => ({ ...current, ...nextProfileAddress }));
              setCepValue(nextProfileAddress.cep || '');
              setSavedAddress(null);
              setCheckoutAddressConfirmed(false);
            }
          }
        } catch {
          /* segue com dados digitados manualmente */
        }
      }

      if (!name) {
        void showAlert('Preencha seu nome.');
        return;
      }

      setProfileDisplayName(name);
      setProfileDisplayPhone(formattedPhone);
      setProfileName(name);
      setProfilePhone(formattedPhone);
      try {
        window.localStorage.setItem(
          PROFILE_STORAGE_KEY,
          JSON.stringify({
            name,
            phone: formattedPhone,
            image: profileImage,
            address: nextProfileAddress?.rua ? nextProfileAddress : profileAddress,
          })
        );
      } catch {}
      void persistClientSnapshot({ name, phone: formattedPhone });
      setCheckoutData((d) => ({ ...d, name, phone: formattedPhone }));
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      if (!checkoutData.delivery) {
        void showAlert('Selecione se deseja receber ou retirar o pedido.');
        return;
      }
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
      const onlineEmail = String(checkoutEmail || checkoutData.email || '').trim();
      if (['pix_online', 'credito_online'].includes(checkoutData.payment)) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(onlineEmail)) {
          void showAlert('Informe um e-mail válido para pagar online.');
          return;
        }
        setCheckoutData((d) => ({ ...d, email: onlineEmail }));
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
      setOnlinePayment(null);
      setCheckoutStep(4);
    } else if (checkoutStep === 4) {
      if (['pix_online', 'credito_online'].includes(checkoutData.payment)) return;
      if (checkoutSubmittingRef.current) return;
      checkoutSubmittingRef.current = true;
      try {
        const completedOrder = await persistCompletedOrder({
          customerName: checkoutData.name,
          customerPhone: checkoutData.phone,
        });
        await completeCheckoutOrder(completedOrder);
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
    checkoutEmail,
    checkoutData,
    checkoutAddressConfirmed,
    savedAddress,
    profileAddress,
    profileImage,
    cart,
    cartTotal,
    persistCompletedOrder,
    completeCheckoutOrder,
    persistClientSnapshot,
    showAlert,
    cartSubtotal,
    deliveryFee,
    appliedCupom,
    formatPrice,
    effectiveSlug,
    slug,
    storeConfig,
  ]);

  const checkoutBack = useCallback(() => {
    if (checkoutStep > 1 && !checkoutSuccess) {
      if (checkoutStep === 4) setOnlinePayment(null);
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

  const locStrong = useMemo(() => {
    if (deliveryAvailability?.available === true) return 'Entregamos na sua região!';
    if (deliveryAvailability?.available === false) return 'Não entregamos na sua região';
    return 'Verifique a disponibilidade de entrega na sua região';
  }, [deliveryAvailability]);

  const locSub = useMemo(() => {
    if (deliveryAvailability?.available === true) {
      const fee = Number(deliveryAvailability.fee || 0);
      if (fee <= 0) return 'Taxa de entrega grátis! Toque para verificar outro CEP';
      return `Taxa de ${formatPrice(fee)} · toque para verificar outro CEP`;
    }
    if (deliveryAvailability?.available === false) {
      return 'Toque para tentar outro endereço';
    }
    return 'Toque para informar seu CEP';
  }, [deliveryAvailability]);

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
      categoryLayoutsByName,
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
      categoryLayoutsByName,
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
      changeCartItemQty,
      addProductFromCard,
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
      changeCartItemQty,
      addProductFromCard,
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
      checkoutEmail,
      setCheckoutEmail,
      lookupCheckoutCustomerByPhone,
      onlinePaymentConfig,
      onlinePayment,
      submitOnlinePayment,
      checkoutAddressConfirmed,
      addressFlowContext,
      cepOpen,
      addressOpen,
      deliveryCheckNumberOpen,
      deliveryCheckResultOpen,
      deliveryCheckResult,
      deliveryAvailability,
      storeClosedNoticeOpen,
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
      PAYMENT_METHODS: paymentMethods,
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
      openDeliveryCheckCep,
      closeDeliveryCheckNumber,
      closeDeliveryCheckResult,
      closeStoreClosedNotice,
      selectDeliveryMode,
      openCepPopup,
      closeCepPopup,
      maskCep,
      goToAddress,
      closeAddressPopup,
      confirmAddress,
      confirmDeliveryCheckNumber,
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
      checkoutEmail,
      lookupCheckoutCustomerByPhone,
      onlinePaymentConfig,
      onlinePayment,
      submitOnlinePayment,
      checkoutAddressConfirmed,
      addressFlowContext,
      cepOpen,
      addressOpen,
      deliveryCheckNumberOpen,
      deliveryCheckResultOpen,
      deliveryCheckResult,
      deliveryAvailability,
      storeClosedNoticeOpen,
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
      paymentMethods,
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
      openDeliveryCheckCep,
      closeDeliveryCheckNumber,
      closeDeliveryCheckResult,
      closeStoreClosedNotice,
      selectDeliveryMode,
      openCepPopup,
      closeCepPopup,
      maskCep,
      goToAddress,
      closeAddressPopup,
      confirmAddress,
      confirmDeliveryCheckNumber,
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
