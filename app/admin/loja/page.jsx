'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { isModeloSegment, MODELO_SEGMENTO_ID, getSegmentoLabel } from '@/lib/empresaSegmentos';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { getStorePublicHost, getStorePublicUrl } from '@/lib/siteUrl';
import ColorPalettePicker, { extractPaletteFromLogoUrl } from '@/components/admin/ColorPalettePicker';
import CoverImageAdjustModal from '@/components/admin/CoverImageAdjustModal';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import SegmentCombobox from '@/components/admin/SegmentCombobox';
import StoreSectionHead from '@/components/admin/StoreSectionHead';
import {
  AdminContentReveal,
  AdminLojaSkeleton,
} from '@/components/admin/AdminSkeleton';
import { formatCep } from '@/lib/cep/viacep';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import { applyScheduleOpenStatus } from '@/lib/storeHours';
import {
  formatHHMMInput,
  parseHHMMToMinutes,
  resolveLojaDurations,
} from '@/lib/deliveryDuration';
import {
  getEmpresaBySlug,
  lojaPatchToEmpresa,
  mergeEmpresaIntoLoja,
  updateEmpresaBySlug,
} from '@/lib/supabase/empresa';
import {
  getOrderTicketWidthMm,
  ORDER_TICKET_WIDTH_OPTIONS,
  ORDER_PRINT_MODE_OPTIONS,
  getOrderPrintMode,
  setOrderPrintMode,
  setOrderTicketWidthMm,
} from '@/lib/orderTicketPrefs';
import OrderTicketPreviewModal from '@/components/admin/orders/OrderTicketPreviewModal';
import { ORDER_TICKET_SAMPLE_ORDER } from '@/lib/orderTicketSample';
import { useOrderPrint } from '@/context/OrderPrintContext';
import { useAdminToast } from '@/context/AdminToastContext';

const DESCRICAO_MAX = 120;
const MENSAGEM_FECHADA_MAX = 280;
const SAVE_SKELETON_MIN_MS = 480;

const DAYS = [
  ['segunda', 'Segunda'],
  ['terca', 'Terça'],
  ['quarta', 'Quarta'],
  ['quinta', 'Quinta'],
  ['sexta', 'Sexta'],
  ['sabado', 'Sábado'],
  ['domingo', 'Domingo'],
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function moneyToInput(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace('.', ',');
}

function moneyToDisplay(value) {
  if (value === undefined || value === null || value === '') return 'R$ 0,00';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function inputToMoney(value) {
  const parsed = Number(String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPhoneBr(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  const ddd = digits.slice(0, 2);
  const ninth = digits.slice(2, 3);
  const part1 = digits.slice(3, 7);
  const part2 = digits.slice(7, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 3) return `(${ddd}) ${ninth}`;
  if (digits.length <= 7) return `(${ddd}) ${ninth} ${digits.slice(3)}`;
  if (digits.length <= 11) return `(${ddd}) ${ninth} ${part1}${part2 ? `-${part2}` : ''}`;
  return `(${ddd}) ${ninth} ${part1}-${part2}`;
}

function formatCpfCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);
    return [p1, p2, p3].filter(Boolean).join('.') + (p4 ? `-${p4}` : '');
  }
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 5);
  const c = digits.slice(5, 8);
  const d = digits.slice(8, 12);
  const e = digits.slice(12, 14);
  return `${a}${b ? `.${b}` : ''}${c ? `.${c}` : ''}${d ? `/${d}` : ''}${e ? `-${e}` : ''}`;
}

function formatMoneyMask(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const cents = digits.padStart(3, '0');
  const intPart = cents.slice(0, -2).replace(/^0+(?=\d)/, '');
  const dec = cents.slice(-2);
  return `R$ ${intPart || '0'},${dec}`;
}

export default function MinhaLojaPage() {
  const { data, saveData, ready } = useAdminData();
  const { slug } = useEmpresa();
  const { lookup: lookupCep, loading: cepLoading, clearError: clearCepError } = useCepLookup();
  const logoInputRef = useRef(null);
  const comandaLogoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const { printOrder } = useOrderPrint();
  const [draft, setDraft] = useState(null);
  const [pedidoMinimo, setPedidoMinimo] = useState('');
  const toast = useAdminToast();
  const [saving, setSaving] = useState(false);
  const [coverAdjustSrc, setCoverAdjustSrc] = useState('');
  const [coverAdjustIsNew, setCoverAdjustIsNew] = useState(false);
  const [coverImageReady, setCoverImageReady] = useState(true);
  const [ticketWidthMm, setTicketWidthMm] = useState(80);
  const [printMode, setPrintMode] = useState('ask_prep');
  const [ticketPreviewOpen, setTicketPreviewOpen] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const segmentBeforeModeloRef = useRef('restaurante');

  useEffect(() => {
    setTicketWidthMm(getOrderTicketWidthMm());
    setPrintMode(getOrderPrintMode());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/super-admin/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setSuperAdmin(Boolean(payload?.superAdmin));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const descricaoLength = String(draft?.descricao || '').length;

  const lojaSyncKey = useMemo(
    () =>
      ready
        ? JSON.stringify({
            nome: data.loja.nome,
            slug: data.loja.slug,
            segmento: data.loja.segmento,
            whatsapp: data.loja.whatsapp,
            documentoFiscal: data.loja.documentoFiscal,
            pedidoMinimo: data.loja.pedidoMinimo,
            descricao: data.loja.descricao,
            logoUrl: data.loja.logoUrl,
            logoComandaUrl: data.loja.logoComandaUrl,
            capaUrl: data.loja.capaUrl,
            capaOriginalUrl: data.loja.capaOriginalUrl,
            capaMobileUrl: data.loja.capaMobileUrl,
            corMarca: data.loja.corMarca,
            paletteColors: data.loja.paletteColors,
            paletteLogoUrl: data.loja.paletteLogoUrl,
            chavePix: data.loja.chavePix,
            descricaoChavePix: data.loja.descricaoChavePix,
            exibirPixCardapio: data.loja.exibirPixCardapio !== false,
            tempoEntregaDelivery: data.loja.tempoEntregaDelivery,
            tempoEntregaDeliveryMin: data.loja.tempoEntregaDeliveryMin,
            tempoEntregaRetirada: data.loja.tempoEntregaRetirada,
            tempoEntregaRetiradaMin: data.loja.tempoEntregaRetiradaMin,
            enderecoCep: data.loja.enderecoCep,
            enderecoLogradouro: data.loja.enderecoLogradouro,
            enderecoNumero: data.loja.enderecoNumero,
            enderecoBairro: data.loja.enderecoBairro,
            enderecoCidade: data.loja.enderecoCidade,
            enderecoEstado: data.loja.enderecoEstado,
            horarios: data.loja.horarios,
            mensagemLojaFechada: data.loja.mensagemLojaFechada,
          })
        : '',
    [ready, data.loja]
  );

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      let loja = { ...data.loja };
      if (slug) {
        try {
          const empresa = await getEmpresaBySlug(slug);
          loja = mergeEmpresaIntoLoja(loja, empresa);
        } catch {
          /* mantém dados locais */
        }
      }
      if (!cancelled) {
        const durations = resolveLojaDurations(loja);
        setDraft({ ...loja, ...durations });
        setPedidoMinimo(moneyToDisplay(loja.pedidoMinimo));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, slug, lojaSyncKey]);

  useEffect(() => {
    const capaUrl = draft?.capaUrl;
    if (!capaUrl) {
      setCoverImageReady(true);
      return undefined;
    }
    let cancelled = false;
    setCoverImageReady(false);
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setCoverImageReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setCoverImageReady(true);
    };
    img.src = capaUrl;
    if (img.complete) setCoverImageReady(true);
    return () => {
      cancelled = true;
    };
  }, [draft?.capaUrl]);

  if (!ready || !draft || saving) {
    return (
      <div className="admin-content admin-content-pedidos admin-store-page admin-store-page-v2">
        <AdminLojaSkeleton />
      </div>
    );
  }

  const storeSlug = slug || draft.slug || data.loja?.slug || '';
  const canEditSegment = isModelStoreSlug(storeSlug);
  const cardapioUrl = storeSlug ? getStorePublicUrl(storeSlug) : '';
  const cardapioHost = storeSlug ? getStorePublicHost(storeSlug) : '';

  function setLojaField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleModeloToggle(enabled) {
    if (enabled) {
      if (!isModeloSegment(draft.segmento)) {
        segmentBeforeModeloRef.current = draft.segmento || 'restaurante';
      }
      setLojaField('segmento', MODELO_SEGMENTO_ID);
      return;
    }
    setLojaField('segmento', segmentBeforeModeloRef.current || 'restaurante');
  }

  function setHorario(day, patch) {
    setDraft((prev) => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [day]: { ...prev.horarios[day], ...patch },
      },
    }));
  }

  async function runPaletteExtract(logoUrl) {
    try {
      const extracted = await extractPaletteFromLogoUrl(logoUrl);
      if (!extracted.length) return;
      setDraft((prev) => ({
        ...prev,
        paletteColors: extracted,
        paletteLogoUrl: logoUrl,
        corMarca: extracted[0] || prev.corMarca,
      }));
    } catch {
      toast.error('Não foi possível extrair cores da logo.');
    }
  }

  function onComandaLogoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    const isPng = file.type === 'image/png' || name.endsWith('.png');
    const isSvg = file.type === 'image/svg+xml' || name.endsWith('.svg');
    if (!isPng && !isSvg) {
      toast.error('Logo da comanda: envie PNG ou SVG em preto com fundo transparente.');
      e.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Logo da comanda: máximo 1 MB.');
      e.target.value = '';
      return;
    }
    readFileAsDataUrl(file)
      .then((dataUrl) => setLojaField('logoComandaUrl', dataUrl))
      .catch(() => toast.error('Não foi possível processar esse arquivo.'));
    e.target.value = '';
  }

  function onImageSelect(field, maxMb) {
    return async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > maxMb * 1024 * 1024) {
        toast.error(`Arquivo excede ${maxMb}MB.`);
        e.target.value = '';
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (field === 'capaUrl') {
          setCoverAdjustIsNew(true);
          setCoverAdjustSrc(dataUrl);
          e.target.value = '';
          return;
        }
        setLojaField(field, dataUrl);
        if (field === 'logoUrl') await runPaletteExtract(dataUrl);
      } catch {
        toast.error('Não foi possível processar essa imagem. Tente outro arquivo.');
      }
      e.target.value = '';
    };
  }

  function applyCoverImage({ desktop, mobile }) {
    const isNew = coverAdjustIsNew;
    const originalSrc = coverAdjustSrc;
    setDraft((prev) => ({
      ...prev,
      capaUrl: desktop,
      capaMobileUrl: mobile,
      ...(isNew ? { capaOriginalUrl: originalSrc } : {}),
    }));
    setCoverAdjustSrc('');
    setCoverAdjustIsNew(false);
  }

  function openCoverAdjust() {
    const source = draft?.capaOriginalUrl || draft?.capaUrl;
    if (!source) return;
    setCoverAdjustIsNew(false);
    setCoverAdjustSrc(source);
  }

  function cancelCoverAdjust() {
    setCoverAdjustSrc('');
    setCoverAdjustIsNew(false);
  }

  function selectBrandColor(hex) {
    setLojaField('corMarca', hex);
  }

  async function handleCepSearch() {
    clearCepError();
    const result = await lookupCep(draft.enderecoCep);
    if (!result) return;
    setDraft((prev) => ({
      ...prev,
      enderecoLogradouro: result.logradouro || prev.enderecoLogradouro,
      enderecoBairro: result.bairro || prev.enderecoBairro,
      enderecoCidade: result.cidade || prev.enderecoCidade,
      enderecoEstado: result.estado || prev.enderecoEstado,
    }));
  }

  async function save() {
    const durations = resolveLojaDurations(draft);
    if (!parseHHMMToMinutes(durations.tempoEntregaDelivery) || !parseHHMMToMinutes(durations.tempoEntregaRetirada)) {
      toast.error('Informe tempos válidos no formato HH:MM (ex: 00:45 para 45 minutos).');
      return;
    }
    setSaving(true);
    const startedAt = Date.now();
    const nextLoja = applyScheduleOpenStatus({
      ...draft,
      ...durations,
      pedidoMinimo: inputToMoney(pedidoMinimo),
      descricao: String(draft.descricao || '').slice(0, DESCRICAO_MAX),
      mensagemLojaFechada: String(draft.mensagemLojaFechada || '')
        .trim()
        .slice(0, MENSAGEM_FECHADA_MAX),
      telefone: String(draft.whatsapp || draft.telefone || '').trim(),
    });
    let storeSaved = false;
    try {
      const enderecoText = [
        nextLoja.enderecoLogradouro,
        nextLoja.enderecoNumero ? `, ${nextLoja.enderecoNumero}` : '',
        nextLoja.enderecoBairro ? ` - ${nextLoja.enderecoBairro}` : '',
        nextLoja.enderecoCidade ? ` - ${nextLoja.enderecoCidade}` : '',
        nextLoja.enderecoEstado ? `/${nextLoja.enderecoEstado}` : '',
      ]
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

      await saveData((prev) => ({
        ...prev,
        loja: {
          ...prev.loja,
          ...nextLoja,
          slug: storeSlug || prev.loja.slug,
          segmento: canEditSegment ? nextLoja.segmento : prev.loja.segmento,
          endereco: enderecoText || prev.loja.endereco,
        },
      }));
      storeSaved = true;
    } catch {
      /* Erro exibido pelo AdminSaveFeedback. */
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < SAVE_SKELETON_MIN_MS) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, SAVE_SKELETON_MIN_MS - elapsed);
        });
      }
      setSaving(false);
    }

    if (!storeSaved) return;

    try {
      if (slug) {
        const empresaPatch = lojaPatchToEmpresa(nextLoja);
        if (!canEditSegment) {
          delete empresaPatch.segmento;
        }
        await updateEmpresaBySlug(slug, empresaPatch);
        try {
          const geoRes = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug,
              persist: true,
              logradouro: nextLoja.enderecoLogradouro,
              numero: nextLoja.enderecoNumero,
              bairro: nextLoja.enderecoBairro,
              cidade: nextLoja.enderecoCidade,
              estado: nextLoja.enderecoEstado,
              cep: nextLoja.enderecoCep,
            }),
          });
          if (!geoRes.ok) {
            const geoJson = await geoRes.json().catch(() => ({}));
            console.warn('Geocoding da loja:', geoJson.error || geoRes.status);
          }
        } catch {
          /* geocoding opcional */
        }
      }
      toast.success('Alterações salvas com sucesso.');
      setPedidoMinimo(moneyToDisplay(nextLoja.pedidoMinimo));
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  return (
    <div className="admin-content admin-content-pedidos admin-store-page admin-store-page-v2">

      <div className="admin-store-actions-row admin-store-actions-sticky">
        <div />
        <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>
          Salvar alterações
        </button>
      </div>

      <AdminContentReveal ready>
      <div className="admin-card admin-store-section-card admin-store-personalizacao-card">
        <StoreSectionHead
          iconNode={<i className="ph ph-paint-brush admin-kanban-phosphor-icon" aria-hidden="true" />}
          title="Personalização"
          hint="Logo, capa e cor da marca no cardápio público."
        />
        <div className="admin-store-section-body">
          <div className="admin-store-personalizacao-row">
            <div className="admin-store-personalizacao-stage">
              <div className="admin-store-personalizacao-brand">
                <button type="button" className="admin-store-logo-picker" onClick={() => logoInputRef.current?.click()}>
                  <span className="admin-store-logo-frame">
                    <span className="admin-store-logo-frame-inner">
                      {draft.logoUrl ? (
                        <img src={draft.logoUrl} alt="Logo da loja" />
                      ) : (
                        <ImagePlaceholder size={160} />
                      )}
                    </span>
                  </span>
                  <span className="admin-store-logo-label">Alterar logo</span>
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="admin-store-hidden-file"
                  onChange={onImageSelect('logoUrl', 2)}
                />
                <div className="admin-store-logo-palette">
                  <ColorPalettePicker
                    colors={draft.paletteColors || []}
                    activeColor={draft.corMarca}
                    onColorsChange={(paletteColors) => setLojaField('paletteColors', paletteColors)}
                    onSelectColor={selectBrandColor}
                    showHint={Boolean(draft.logoUrl)}
                  />
                </div>
              </div>

              <div
                className={`admin-store-cover-preview${draft.capaUrl && !coverImageReady ? ' is-loading' : ''}`}
                style={draft.capaUrl ? { backgroundImage: `url(${draft.capaUrl})` } : undefined}
              >
                {!draft.capaUrl ? <span>Capa do cardápio</span> : null}
                <div className="admin-store-cover-actions">
                  {draft.capaUrl ? (
                    <button
                      type="button"
                      className="admin-store-cover-edit"
                      onClick={openCoverAdjust}
                      aria-label="Ajustar enquadramento"
                      title="Ajustar enquadramento"
                    >
                      <i className="ph ph-pencil-simple" aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="admin-store-cover-edit"
                    onClick={() => coverInputRef.current?.click()}
                    aria-label={draft.capaUrl ? 'Trocar imagem' : 'Adicionar capa'}
                    title={draft.capaUrl ? 'Trocar imagem' : 'Adicionar capa'}
                  >
                    <span className="admin-store-cover-icon-combo" aria-hidden="true">
                      <i className="ph ph-image" />
                      <i className="ph ph-plus" />
                    </span>
                  </button>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="admin-store-hidden-file"
                  onChange={onImageSelect('capaUrl', 5)}
                />
              </div>
            </div>
            <p className="admin-store-cover-hint">
              Desktop: 1145 × 366 px (5:1,6). Celular: 390 × 300 px. Ajuste os dois recortes no
              lápis.
            </p>
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-section-card">
        <StoreSectionHead icon="store" title="Dados da loja" />
        <div className="admin-store-section-body">
          <div className="admin-store-segment-row">
            <div className="admin-form-group admin-store-segment-field">
              <label className="admin-label">Segmento</label>
              {canEditSegment ? (
                <SegmentCombobox
                  value={draft.segmento || ''}
                  onChange={(segmento) => {
                    segmentBeforeModeloRef.current = segmento || 'restaurante';
                    setLojaField('segmento', segmento);
                  }}
                  disabled={saving}
                />
              ) : (
                <div className="admin-store-readonly-field">
                  {getSegmentoLabel(draft.segmento) || '—'}
                </div>
              )}
            </div>
            {superAdmin ? (
              <label
                className="admin-store-modelo-inline"
                title="Libera Pizzas e Marmitas para testar todos os módulos"
              >
                <span>Modo modelo</span>
                <span className="admin-switch">
                  <input
                    type="checkbox"
                    checked={isModeloSegment(draft.segmento)}
                    disabled={saving}
                    onChange={(event) => handleModeloToggle(event.target.checked)}
                    aria-label="Ativar modo modelo"
                  />
                  <span className="admin-switch-slider" />
                </span>
              </label>
            ) : null}
          </div>
          <div className="admin-store-dados-row-nome-link">
            <div className="admin-form-group">
              <label className="admin-label">Nome da loja</label>
              <input className="admin-input" value={draft.nome || ''} onChange={(e) => setLojaField('nome', e.target.value)} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Link do cardápio</label>
              {cardapioUrl ? (
                <a
                  href={cardapioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-store-cardapio-link"
                  title="Abrir cardápio público"
                >
                  {cardapioHost}
                </a>
              ) : (
                <div className="admin-store-readonly-field">—</div>
              )}
            </div>
          </div>
          <div className="admin-store-dados-row-2 admin-store-dados-row-2-v2">
            <div className="admin-form-group">
              <label className="admin-label">WhatsApp</label>
              <input
                className="admin-input"
                value={draft.whatsapp || ''}
                onChange={(e) => setLojaField('whatsapp', formatPhoneBr(e.target.value))}
                placeholder="(00) 0 0000-0000"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">CPF ou CNPJ</label>
              <input
                className="admin-input"
                value={formatCpfCnpj(draft.documentoFiscal || '')}
                onChange={(e) => setLojaField('documentoFiscal', e.target.value)}
                placeholder="Para notas e cupons fiscais"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Pedido mínimo</label>
              <input
                className="admin-input"
                value={pedidoMinimo}
                onChange={(e) => setPedidoMinimo(formatMoneyMask(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-section-card">
        <StoreSectionHead icon="location" title="Endereço da loja" />
        <div className="admin-store-section-body">
          <div className="admin-form-group admin-store-cep-field">
            <label className="admin-label">CEP</label>
            <div className="admin-input-icon-wrap">
              <input
                className="admin-input admin-input-with-icon"
                value={draft.enderecoCep || ''}
                onChange={(e) => setLojaField('enderecoCep', formatCep(e.target.value))}
                placeholder="00000-000"
              />
              <button
                type="button"
                className="admin-input-icon-btn"
                onClick={handleCepSearch}
                disabled={cepLoading}
                title="Buscar CEP"
                aria-label="Buscar CEP"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Logradouro</label>
            <input
              className="admin-input"
              value={draft.enderecoLogradouro || ''}
              onChange={(e) => setLojaField('enderecoLogradouro', e.target.value)}
            />
          </div>
          <div className="admin-store-address-grid">
            <div className="admin-form-group">
              <label className="admin-label">Número</label>
              <input
                className="admin-input"
                value={draft.enderecoNumero || ''}
                onChange={(e) => setLojaField('enderecoNumero', e.target.value)}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Bairro</label>
              <input
                className="admin-input"
                value={draft.enderecoBairro || ''}
                onChange={(e) => setLojaField('enderecoBairro', e.target.value)}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Cidade</label>
              <input
                className="admin-input"
                value={draft.enderecoCidade || ''}
                onChange={(e) => setLojaField('enderecoCidade', e.target.value)}
              />
            </div>
            <div className="admin-form-group admin-store-field-estado">
              <label className="admin-label">Estado</label>
              <input
                className="admin-input"
                value={draft.enderecoEstado || ''}
                onChange={(e) => setLojaField('enderecoEstado', e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                placeholder="SP"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-section-card">
        <StoreSectionHead icon="edit" title="Descrição curta" />
        <div className="admin-store-section-body">
          <div className="admin-form-group admin-store-field-descricao">
            <textarea
              className="admin-input admin-store-descricao-input"
              value={draft.descricao || ''}
              maxLength={DESCRICAO_MAX}
              onChange={(e) => setLojaField('descricao', e.target.value.slice(0, DESCRICAO_MAX))}
              placeholder="Descreva em poucas palavras o estilo da loja e seus principais produtos."
            />
            <span className="admin-store-descricao-counter">
              {descricaoLength}/{DESCRICAO_MAX}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-section-card admin-ticket-print-card">
        <StoreSectionHead
          icon="printer"
          title="Impressão de comanda"
          hint="Configura a impressora térmica da cozinha."
        />
        <div className="admin-store-section-body admin-ticket-print-settings">
          <section className="admin-ticket-print-block">
            <h3 className="admin-ticket-print-block-title">Aparência da comanda</h3>
            <div className="admin-ticket-appearance">
              <div className="admin-ticket-logo-upload">
                <div className="admin-ticket-logo-thumb" aria-hidden="true">
                  {draft.logoComandaUrl ? (
                    <img src={draft.logoComandaUrl} alt="" />
                  ) : (
                    <span className="admin-ticket-logo-thumb-empty">—</span>
                  )}
                </div>
                <div className="admin-ticket-logo-upload-meta">
                  <div className="admin-ticket-logo-upload-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => comandaLogoInputRef.current?.click()}
                    >
                      Enviar PNG/SVG
                    </button>
                    {draft.logoComandaUrl ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() => setLojaField('logoComandaUrl', '')}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                  <p className="admin-help-text admin-ticket-logo-help">
                    PNG ou SVG preto, fundo transparente. Máx. 1 MB — só para a térmica, separada da
                    logo colorida do cardápio.
                  </p>
                  <input
                    ref={comandaLogoInputRef}
                    type="file"
                    accept=".png,.svg,image/png,image/svg+xml"
                    hidden
                    onChange={onComandaLogoSelect}
                  />
                </div>
              </div>
              <div className="admin-ticket-print-preview-row">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  onClick={() => setTicketPreviewOpen(true)}
                >
                  Visualizar comanda teste
                </button>
                <span className="admin-help-text">
                  Pedido fictício para testar impressão sem criar pedido real.
                </span>
              </div>
            </div>
          </section>

          <section className="admin-ticket-print-block">
            <h3 className="admin-ticket-print-block-title">Largura da bobina</h3>
            <div className="admin-ticket-choice" role="radiogroup" aria-label="Largura da bobina">
              {ORDER_TICKET_WIDTH_OPTIONS.map((opt) => {
                const selected = ticketWidthMm === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`admin-ticket-choice-btn${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setTicketWidthMm(opt.value);
                      setOrderTicketWidthMm(opt.value);
                    }}
                  >
                    <span className="admin-ticket-choice-label">{opt.label}</span>
                    {opt.hint ? <span className="admin-ticket-choice-hint">{opt.hint}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="admin-ticket-print-block">
            <h3 className="admin-ticket-print-block-title">Quando imprimir</h3>
            <div
              className="admin-ticket-choice admin-ticket-choice--row"
              role="radiogroup"
              aria-label="Quando imprimir"
            >
              {ORDER_PRINT_MODE_OPTIONS.map((opt) => {
                const selected = printMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`admin-ticket-choice-btn${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setPrintMode(opt.value);
                      setOrderPrintMode(opt.value);
                    }}
                  >
                    <span className="admin-ticket-choice-label">{opt.label}</span>
                    {opt.hint ? <span className="admin-ticket-choice-hint">{opt.hint}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <p className="admin-help-text admin-ticket-print-footnote">
            A impressão automática só funciona de forma silenciosa no modo quiosque da cozinha. No
            navegador comum, o Windows ainda pede confirmação — ou a automação pode ser bloqueada.
          </p>
        </div>
      </div>

      <OrderTicketPreviewModal
        open={ticketPreviewOpen}
        store={draft}
        widthMm={ticketWidthMm}
        onClose={() => setTicketPreviewOpen(false)}
        onPrintTest={() => {
          printOrder(ORDER_TICKET_SAMPLE_ORDER, draft);
        }}
      />

      <div className="admin-card admin-store-section-card admin-store-hours-card">
        <StoreSectionHead
          icon="clock"
          title="Horários de funcionamento"
          hint="Definem quando a loja abre e fecha automaticamente no cardápio e no painel."
        />
        <div className="admin-store-section-body admin-store-hours-body">
          <div className="admin-hours-list admin-hours-list-v2">
            {DAYS.map(([key, label]) => {
              const day = draft.horarios[key];
              return (
                <div key={key} className="admin-hours-row admin-hours-row-v2">
                  <strong>{label}</strong>
                  <button
                    type="button"
                    className={`admin-hours-open ${!day.fechado ? 'open' : ''}`}
                    onClick={() => setHorario(key, { fechado: !day.fechado })}
                  >
                    {!day.fechado ? 'Aberto' : 'Fechado'}
                  </button>
                  <input
                    className="admin-input admin-hours-time-input"
                    type="time"
                    disabled={day.fechado}
                    value={day.abertura}
                    onChange={(e) => setHorario(key, { abertura: e.target.value })}
                  />
                  <input
                    className="admin-input admin-hours-time-input"
                    type="time"
                    disabled={day.fechado}
                    value={day.fechamento}
                    onChange={(e) => setHorario(key, { fechamento: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
          <div className="admin-store-closed-message">
            <label className="admin-label" htmlFor="mensagem-loja-fechada">
              Aviso quando a loja estiver fechada
            </label>
            <p className="admin-store-closed-message-hint">
              Aparece no cardápio ao tocar em um produto com a loja fechada. Deixe em branco para usar a
              mensagem padrão.
            </p>
            <textarea
              id="mensagem-loja-fechada"
              className="admin-input admin-store-closed-message-input"
              rows={5}
              maxLength={MENSAGEM_FECHADA_MAX}
              placeholder="Ex.: Estamos de férias até 15/08. Pedidos voltam no dia 16!"
              value={draft.mensagemLojaFechada || ''}
              onChange={(e) =>
                setLojaField('mensagemLojaFechada', e.target.value.slice(0, MENSAGEM_FECHADA_MAX))
              }
            />
            <div className="admin-store-closed-message-count">
              {String(draft.mensagemLojaFechada || '').length}/{MENSAGEM_FECHADA_MAX}
            </div>
          </div>
        </div>
      </div>

      {coverAdjustSrc ? (
        <CoverImageAdjustModal
          src={coverAdjustSrc}
          onConfirm={applyCoverImage}
          onCancel={cancelCoverAdjust}
        />
      ) : null}
      </AdminContentReveal>
    </div>
  );
}
