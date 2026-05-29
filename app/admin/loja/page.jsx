'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import ColorPalettePicker, { extractPaletteFromLogoUrl } from '@/components/admin/ColorPalettePicker';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { formatCep } from '@/lib/cep/viacep';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import {
  getEmpresaBySlug,
  lojaPatchToEmpresa,
  mergeEmpresaIntoLoja,
  updateEmpresaBySlug,
} from '@/lib/supabase/empresa';

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
  const coverInputRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [pedidoMinimo, setPedidoMinimo] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const lojaSyncKey = useMemo(
    () =>
      ready
        ? JSON.stringify({
            nome: data.loja.nome,
            slug: data.loja.slug,
            whatsapp: data.loja.whatsapp,
            documentoFiscal: data.loja.documentoFiscal,
            pedidoMinimo: data.loja.pedidoMinimo,
            descricao: data.loja.descricao,
            logoUrl: data.loja.logoUrl,
            capaUrl: data.loja.capaUrl,
            corMarca: data.loja.corMarca,
            paletteColors: data.loja.paletteColors,
            paletteLogoUrl: data.loja.paletteLogoUrl,
            chavePix: data.loja.chavePix,
            descricaoChavePix: data.loja.descricaoChavePix,
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
        setDraft(loja);
        setPedidoMinimo(moneyToInput(loja.pedidoMinimo));
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
      setMsg('Não foi possível extrair cores da logo.');
    }
  }

  function onImageSelect(field, maxMb) {
    return async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setMsg('');
      if (file.size > maxMb * 1024 * 1024) {
        setMsg(`Arquivo excede ${maxMb}MB.`);
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setLojaField(field, dataUrl);
        if (field === 'logoUrl') await runPaletteExtract(dataUrl);
      } catch {
        setMsg('Não foi possível processar essa imagem. Tente outro arquivo.');
      }
    };
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
    setSaving(true);
    setMsg('');
    const nextLoja = {
      ...draft,
      pedidoMinimo: inputToMoney(pedidoMinimo),
    };
    try {
      // mantém o campo "endereco" (string) só como conveniência local
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

      saveData((prev) => ({
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
          /* geocoding opcional se API não configurada */
        }
      }
      setMsg('Alterações salvas com sucesso.');
    } catch (e) {
      setMsg(e?.message || 'Erro ao salvar. Dados locais foram atualizados.');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2800);
    }
  }

  return (
    <div className="admin-content admin-content-pedidos admin-store-page">
      {msg ? <div className="admin-card admin-store-message">{msg}</div> : null}

      <div className="admin-store-actions-row">
        <div />
        <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>
          Salvar alterações
        </button>
      </div>

      <div className="admin-card admin-store-profile-card">
        <div
          className="admin-store-cover-preview"
          style={draft.capaUrl ? { backgroundImage: `url(${draft.capaUrl})` } : undefined}
        >
          {!draft.capaUrl ? <span>Capa do cardápio</span> : null}
          <button type="button" className="admin-store-cover-edit" onClick={() => coverInputRef.current?.click()}>
            Alterar capa
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="admin-store-hidden-file"
            onChange={onImageSelect('capaUrl', 5)}
          />
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

        <div className="admin-store-fields-center admin-store-dados-block">
          <div className="admin-store-section-head">
            <h2>Dados da loja</h2>
          </div>
          <div className="admin-store-dados-row-1">
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
          <div className="admin-store-dados-row-2">
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

      <div className="admin-card admin-store-block-card">
        <div className="admin-store-fields-center">
          <div className="admin-store-section-head">
            <h2>Endereço da loja</h2>
          </div>
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

          <div className="admin-store-section-head admin-store-section-head-spaced">
            <h2>Descrição curta</h2>
          </div>
          <div className="admin-form-group admin-store-field-descricao">
            <textarea
              className="admin-input"
              value={draft.descricao || ''}
              onChange={(e) => setLojaField('descricao', e.target.value)}
              placeholder="Descreva em poucas palavras o estilo da loja e seus principais produtos."
            />
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-block-card">
        <div className="admin-store-section-head admin-store-fields-center">
          <h2>Pagamento Pix (checkout)</h2>
          <span>Exibido no cardápio online somente quando o cliente escolher Pix.</span>
        </div>
        <div className="admin-store-fields-center">
          <div className="admin-form-group">
            <label className="admin-label">Chave Pix</label>
            <input
              className="admin-input"
              value={draft.chavePix || ''}
              onChange={(e) => setLojaField('chavePix', e.target.value)}
              placeholder="E-mail, CPF, CNPJ ou telefone"
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Descrição da chave Pix</label>
            <input
              className="admin-input"
              value={draft.descricaoChavePix || ''}
              onChange={(e) => setLojaField('descricaoChavePix', e.target.value)}
              placeholder="Ex: Pix CNPJ — Razão social"
            />
          </div>
        </div>
      </div>

      <div className="admin-card admin-store-block-card">
        <div className="admin-store-section-head admin-store-fields-center">
          <h2>Horários de funcionamento</h2>
          <span>Esses horários aparecem no cardápio público.</span>
        </div>
        <div className="admin-hours-list admin-store-fields-center">
          {DAYS.map(([key, label]) => {
            const day = draft.horarios[key];
            return (
              <div key={key} className="admin-hours-row">
                <strong>{label}</strong>
                <button
                  type="button"
                  className={`admin-hours-open ${!day.fechado ? 'open' : ''}`}
                  onClick={() => setHorario(key, { fechado: !day.fechado })}
                >
                  {!day.fechado ? 'Aberto' : 'Fechado'}
                </button>
                <input
                  className="admin-input"
                  type="time"
                  disabled={day.fechado}
                  value={day.abertura}
                  onChange={(e) => setHorario(key, { abertura: e.target.value })}
                />
                <input
                  className="admin-input"
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
  );
}
