'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { isModeloSegment, MODELO_SEGMENTO_ID } from '@/lib/empresaSegmentos';
import ColorPalettePicker, { extractPaletteFromLogoUrl } from '@/components/admin/ColorPalettePicker';
import CoverImageAdjustModal from '@/components/admin/CoverImageAdjustModal';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import SegmentCombobox from '@/components/admin/SegmentCombobox';
import StoreSectionHead from '@/components/admin/StoreSectionHead';
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
  setOrderTicketWidthMm,
} from '@/lib/orderTicketPrefs';
import OrderTicketPreviewModal from '@/components/admin/orders/OrderTicketPreviewModal';
import { ORDER_TICKET_SAMPLE_ORDER } from '@/lib/orderTicketSample';
import { useOrderPrint } from '@/context/OrderPrintContext';
import { useAdminToast } from '@/context/AdminToastContext';

const DESCRICAO_MAX = 120;

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
  const [ticketWidthMm, setTicketWidthMm] = useState(80);
  const [ticketPreviewOpen, setTicketPreviewOpen] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const segmentBeforeModeloRef = useRef('restaurante');

  useEffect(() => {
    setTicketWidthMm(getOrderTicketWidthMm());
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
            corMarca: data.loja.corMarca,
            paletteColors: data.loja.paletteColors,
            paletteLogoUrl: data.loja.paletteLogoUrl,
            chavePix: data.loja.chavePix,
            descricaoChavePix: data.loja.descricaoChavePix,
            exibirPixCardapio: data.loja.exibirPixCardapio !== false,
            tempoEntregaDelivery: data.loja.tempoEntregaDelivery,
            tempoEntregaRetirada: data.loja.tempoEntregaRetirada,
            enderecoCep: data.loja.enderecoCep,
            enderecoLogradouro: data.loja.enderecoLogradouro,
            enderecoNumero: data.loja.enderecoNumero,
            enderecoBairro: data.loja.enderecoBairro,
            enderecoCidade: data.loja.enderecoCidade,
            enderecoEstado: data.loja.enderecoEstado,
            horarios: data.loja.horarios,
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

  if (!ready || !draft) return null;

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

  function applyCoverImage(dataUrl) {
    const isNew = coverAdjustIsNew;
    const originalSrc = coverAdjustSrc;
    setDraft((prev) => ({
      ...prev,
      capaUrl: dataUrl,
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

  async function copyPixKey() {
    const key = String(draft.chavePix || '').trim();
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      toast.success('Chave Pix copiada.');
    } catch {
      toast.error('Não foi possível copiar a chave Pix.');
    }
  }

  function setDurationField(field, raw) {
    setLojaField(field, formatHHMMInput(raw));
  }

  function blurDurationField(field) {
    setDraft((prev) => {
      const durations = resolveLojaDurations({ ...prev, [field]: prev[field] });
      return { ...prev, ...durations };
    });
  }

  async function save() {
    setSaving(true);
    const durations = resolveLojaDurations(draft);
    if (!parseHHMMToMinutes(durations.tempoEntregaDelivery) || !parseHHMMToMinutes(durations.tempoEntregaRetirada)) {
      toast.error('Informe tempos válidos no formato HH:MM (ex: 00:45 para 45 minutos).');
      setSaving(false);
      return;
    }
    const nextLoja = applyScheduleOpenStatus({
      ...draft,
      ...durations,
      pedidoMinimo: inputToMoney(pedidoMinimo),
      descricao: String(draft.descricao || '').slice(0, DESCRICAO_MAX),
    });
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
        loja: { ...prev.loja, ...nextLoja, endereco: enderecoText || prev.loja.endereco },
      }));
      if (slug) {
        await updateEmpresaBySlug(slug, lojaPatchToEmpresa(nextLoja));
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
    } finally {
      setSaving(false);
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

      <div className="admin-card admin-store-profile-card">
        <div className="admin-store-cover-block">
          <div
            className="admin-store-cover-preview"
            style={draft.capaUrl ? { backgroundImage: `url(${draft.capaUrl})` } : undefined}
          >
            {!draft.capaUrl ? <span>Capa do cardápio</span> : null}
            <div className="admin-store-cover-actions">
              {draft.capaUrl ? (
                <button type="button" className="admin-store-cover-edit" onClick={openCoverAdjust}>
                  Ajustar enquadramento
                </button>
              ) : null}
              <button type="button" className="admin-store-cover-edit" onClick={() => coverInputRef.current?.click()}>
                {draft.capaUrl ? 'Trocar imagem' : 'Alterar capa'}
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
          <div className="admin-store-cover-footer">
            <p className="admin-store-cover-hint">Tamanho ideal: 1145 × 366 px (proporção 5:1,6)</p>
          </div>
        </div>

        <div className="admin-store-logo-area">
          <button type="button" className="admin-store-logo-picker" onClick={() => logoInputRef.current?.click()}>
            {draft.logoUrl ? <img src={draft.logoUrl} alt="Logo da loja" /> : <ImagePlaceholder size={118} />}
            <span>Alterar logo</span>
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
      </div>

      <div className="admin-card admin-store-section-card">
        <StoreSectionHead icon="store" title="Dados da loja" />
        <div className="admin-store-section-body">
          <div className="admin-store-segment-row">
            <div className="admin-form-group admin-store-segment-field">
              <label className="admin-label">Segmento</label>
              {superAdmin && isModeloSegment(draft.segmento) ? (
                <div className="admin-store-modelo-active">Modelo (testes Nimbus)</div>
              ) : (
                <SegmentCombobox
                  value={draft.segmento || ''}
                  onChange={(segmento) => {
                    segmentBeforeModeloRef.current = segmento || 'restaurante';
                    setLojaField('segmento', segmento);
                  }}
                  disabled={saving}
                />
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
              <input
                className="admin-input"
                value={draft.slug || ''}
                onChange={(e) => setLojaField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
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

      <div className="admin-card admin-store-section-card">
        <StoreSectionHead
          icon="pix"
          title="Pagamento Pix (checkout)"
          hint="Exibido no cardápio online somente quando o cliente escolher Pix."
        />
        <div className="admin-store-section-body">
          <div className="admin-form-group admin-store-pix-toggle-row">
            <div>
              <label className="admin-label" htmlFor="exibir-pix-cardapio">
                Exibir Pix no cardápio online
              </label>
              <p className="admin-help-text" style={{ margin: '4px 0 0' }}>
                Desmarcado, o checkout mostra apenas pagamento na entrega (dinheiro e cartão).
              </p>
            </div>
            <label className="admin-switch" htmlFor="exibir-pix-cardapio">
              <input
                id="exibir-pix-cardapio"
                type="checkbox"
                checked={draft.exibirPixCardapio !== false}
                onChange={(e) => setLojaField('exibirPixCardapio', e.target.checked)}
              />
              <span className="admin-switch-slider" />
            </label>
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Chave Pix</label>
            <div className="admin-input-icon-wrap">
              <input
                className="admin-input admin-input-with-icon"
                value={draft.chavePix || ''}
                onChange={(e) => setLojaField('chavePix', e.target.value)}
                placeholder="E-mail, CPF, CNPJ ou telefone"
              />
              <button
                type="button"
                className="admin-input-icon-btn admin-input-icon-btn-brand"
                onClick={copyPixKey}
                disabled={!draft.chavePix}
                title="Copiar chave Pix"
                aria-label="Copiar chave Pix"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Descrição da chave Pix</label>
            <input
              className="admin-input"
              value={draft.descricaoChavePix || ''}
              onChange={(e) => setLojaField('descricaoChavePix', e.target.value)}
              placeholder="Ex: Pix CPF — Razão social"
            />
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-section-card">
        <StoreSectionHead
          iconNode={<i className="ph-fill ph-motorcycle admin-kanban-phosphor-icon" aria-hidden="true" />}
          title="Tempo estimado de entrega"
          hint="Duração em horas e minutos (HH:MM). O horário «até …» nos pedidos é calculado a partir da confirmação."
        />
        <div className="admin-store-section-body">
          <div className="admin-store-delivery-time-row admin-store-delivery-duration-row">
            <div className="admin-form-group">
              <label className="admin-label">Delivery</label>
              <p className="admin-help-text" style={{ margin: '0 0 8px' }}>
                Cliente escolhe «Receber em seu endereço».
              </p>
              <input
                className="admin-input"
                inputMode="numeric"
                maxLength={5}
                value={draft.tempoEntregaDelivery || ''}
                onChange={(e) => setDurationField('tempoEntregaDelivery', e.target.value)}
                onBlur={() => blurDurationField('tempoEntregaDelivery')}
                placeholder="00:45"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Retirada</label>
              <p className="admin-help-text" style={{ margin: '0 0 8px' }}>
                Cliente escolhe «Retirar no estabelecimento».
              </p>
              <input
                className="admin-input"
                inputMode="numeric"
                maxLength={5}
                value={draft.tempoEntregaRetirada || ''}
                onChange={(e) => setDurationField('tempoEntregaRetirada', e.target.value)}
                onBlur={() => blurDurationField('tempoEntregaRetirada')}
                placeholder="00:30"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-section-card admin-ticket-print-card">
        <StoreSectionHead
          icon="printer"
          title="Impressão de comanda"
          hint="Logo em preto (PNG ou SVG) só para impressora térmica — separada da logo colorida do cardápio."
        />
        <div className="admin-store-section-body admin-ticket-print-settings">
          <div className="admin-ticket-print-field">
            <span className="admin-label">Largura da bobina</span>
            <div className="admin-ticket-width-options">
              {ORDER_TICKET_WIDTH_OPTIONS.map((opt) => (
                <label key={opt.value} className="admin-ticket-width-option">
                  <input
                    type="radio"
                    name="ticketWidthMm"
                    value={opt.value}
                    checked={ticketWidthMm === opt.value}
                    onChange={() => {
                      setTicketWidthMm(opt.value);
                      setOrderTicketWidthMm(opt.value);
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="admin-ticket-print-field">
            <span className="admin-label">Logo da comanda</span>
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
                  Preto, fundo transparente. Máx. 1 MB.
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
          </div>

          <div className="admin-ticket-print-field admin-ticket-print-preview-row">
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={() => setTicketPreviewOpen(true)}
            >
              Visualizar comanda teste
            </button>
            <span className="admin-help-text">
              Abre um modelo com pedido fictício para testar impressão sem criar pedido real.
            </span>
          </div>
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
        <div className="admin-store-section-body">
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
        </div>
      </div>

      {coverAdjustSrc ? (
        <CoverImageAdjustModal
          src={coverAdjustSrc}
          onConfirm={applyCoverImage}
          onCancel={cancelCoverAdjust}
        />
      ) : null}
    </div>
  );
}
