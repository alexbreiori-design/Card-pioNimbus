'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import AdminIcon from '@/components/admin/AdminIcon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminGroupedSortablePanel from '@/components/admin/AdminGroupedSortablePanel';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { isJsonDirty } from '@/lib/admin/isFormDirty';
import { formatMoneyBrInput, hasMoneyBrValue, parseMoneyBrInput } from '@/lib/moneyMask';
import { buildMarmitaProductId } from '@/lib/marmita/marmitaIds';
import {
  getMarmitaWeekdayLabel,
  MARMITA_DAY_OPTIONS,
  MARMITA_WEEKDAYS,
} from '@/lib/marmita/marmitaWeekdays';
import {
  defaultMarmitaCardapio,
  describeMarmitaCardapioForAdmin,
  normalizeMarmitaCardapio,
} from '@/lib/marmita/marmitaCardapio';
import {
  buildMarmitaAdminPreview,
  enforceSingleActiveMarmitaPerGrupo,
  findActiveMarmitaDayConflict,
  formatMarmitaDayConflictMessage,
  inferDiaSemanaFromGrupoNome,
} from '@/lib/marmita/marmitaPublic';
import { emptyMarmita, emptyMarmitaGrupo, marmitaUid, normalizeMarmita } from '@/lib/marmita/marmitaModel';
import { uploadMenuAssetIfNeeded } from '@/lib/upload/menuAsset';

const MAX_IMAGE_SIZE = 900;
const IMAGE_QUALITY = 0.72;
const MAX_STORED_IMAGE_LENGTH = 280000;

function sortByOrdem(list) {
  return [...list].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function precoToFormInput(value) {
  if (value === '' || value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (typeof value === 'string' && value.includes('R$')) return value;
  const asNum = Number(String(value).replace(',', '.'));
  if (Number.isFinite(asNum)) {
    return asNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return formatMoneyBrInput(value);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressImageDataUrl(dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) return dataUrl || '';

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.drawImage(image, 0, 0, width, height);

  let quality = IMAGE_QUALITY;
  let compressed = canvas.toDataURL('image/jpeg', quality);
  while (compressed.length > MAX_STORED_IMAGE_LENGTH && quality > 0.42) {
    quality -= 0.1;
    compressed = canvas.toDataURL('image/jpeg', quality);
  }
  return compressed;
}

async function compressImageFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return compressImageDataUrl(dataUrl);
}

async function persistImageUrl(slug, dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) return dataUrl || '';
  const compressed = await compressImageDataUrl(dataUrl);
  return uploadMenuAssetIfNeeded(slug, compressed, { folder: 'marmitas' });
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`admin-switch-button ${checked ? 'checked' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function MarmitaCheck({ checked, onChange, label }) {
  return (
    <label className="admin-marmita-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="admin-marmita-check-box" aria-hidden="true">
        {checked ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 8.2 6.4 11l6.1-6.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span>{label}</span>
    </label>
  );
}

export default function MarmitaManager() {
  const { data, saveData, activeSlug } = useAdminData();
  const marmitas = data.marmitas || [];
  const marmitaGrupos = data.marmitaGrupos || [];
  const categoriasCardapio = (data.categorias || []).filter((cat) => cat.ativo !== false);
  const addonCategories = (data.adicionaisCategorias || []).filter((cat) => cat.ativo !== false);
  const addonItems = (data.adicionaisItens || []).filter((item) => item.ativo !== false);

  const [search, setSearch] = useState('');
  const toast = useAdminToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyMarmita());
  const [formBaseline, setFormBaseline] = useState(null);
  const [formImage, setFormImage] = useState('');
  const [formImageBaseline, setFormImageBaseline] = useState('');
  const [saveError, setSaveError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [newGrupoDraft, setNewGrupoDraft] = useState(null);
  const [collapsedGrupos, setCollapsedGrupos] = useState(() => new Set());
  const [grupoMenuId, setGrupoMenuId] = useState('');
  const [editingGrupo, setEditingGrupo] = useState(null);
  const savedCardapio = useMemo(
    () => normalizeMarmitaCardapio(data.marmitaCardapio),
    [data.marmitaCardapio]
  );
  const [cardapioEditing, setCardapioEditing] = useState(false);
  const [cardapioDraft, setCardapioDraft] = useState(() => defaultMarmitaCardapio());
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [cardapioModalOpen, setCardapioModalOpen] = useState(false);
  const [vitrineModalOpen, setVitrineModalOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  const isCardapioDirty = useMemo(() => {
    if (!cardapioModalOpen || !cardapioEditing) return false;
    return isJsonDirty(cardapioDraft, savedCardapio);
  }, [cardapioModalOpen, cardapioEditing, cardapioDraft, savedCardapio]);

  const {
    overlayPointerDown: cardapioOverlayPointerDown,
    overlayClick: cardapioOverlayClick,
    requestClose: requestCloseCardapioModal,
    discardOpen: cardapioDiscardOpen,
    confirmDiscard: confirmDiscardCardapioModal,
    cancelDiscard: cancelDiscardCardapioModal,
  } = useAdminOverlayClose({
    onClose: () => {
      setCardapioModalOpen(false);
      setCardapioEditing(false);
    },
    isDirty: isCardapioDirty,
  });

  const { overlayPointerDown: vitrineOverlayPointerDown, overlayClick: vitrineOverlayClick } =
    useAdminOverlayClose({
      onClose: () => setVitrineModalOpen(false),
      isDirty: false,
    });

  useEffect(() => {
    if (!settingsMenuOpen) return undefined;
    const close = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [settingsMenuOpen]);

  const grupos = useMemo(() => sortByOrdem(marmitaGrupos), [marmitaGrupos]);

  const cardapioSummary = useMemo(
    () => describeMarmitaCardapioForAdmin(savedCardapio, categoriasCardapio),
    [savedCardapio, categoriasCardapio]
  );

  const publicPreview = useMemo(
    () =>
      buildMarmitaAdminPreview({
        marmitas,
        adicionaisItens: data.adicionaisItens || [],
        adicionaisCategorias: data.adicionaisCategorias || [],
      }),
    [data.adicionaisCategorias, data.adicionaisItens, marmitas]
  );

  function getActivationConflict(marmitaId, diaSemana, ativo, grupoId) {
    return findActiveMarmitaDayConflict(marmitas, {
      marmitaId,
      diaSemana,
      ativo,
      grupoId,
      marmitaGrupos,
    });
  }

  const filteredMarmitas = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sortByOrdem(marmitas.map(normalizeMarmita));
    if (!q) return list;
    return list.filter(
      (item) =>
        item.tagAdmin.toLowerCase().includes(q) ||
        item.nomePublico.toLowerCase().includes(q) ||
        getMarmitaWeekdayLabel(item.diaSemana).toLowerCase().includes(q)
    );
  }, [marmitas, search]);

  const groupedSections = useMemo(() => {
    const sections = grupos.map((grupo) => ({
      ...grupo,
      items: filteredMarmitas.filter((item) => item.grupoId === grupo.id),
    }));
    const ungrouped = filteredMarmitas.filter((item) => !item.grupoId);
    if (ungrouped.length) {
      sections.push({
        id: '__sem_grupo__',
        nome: 'Sem grupo',
        ativo: true,
        items: ungrouped,
      });
    }
    if (!grupos.length && filteredMarmitas.length) {
      return [{ id: '__all__', nome: 'Todas as marmitas', ativo: true, items: filteredMarmitas }];
    }
    return sections;
  }, [filteredMarmitas, grupos]);

  function resetForm() {
    setForm(emptyMarmita());
    setFormBaseline(null);
    setFormImage('');
    setFormImageBaseline('');
    setEditingId(null);
    setModalOpen(false);
    setSaveError('');
  }

  const isItemFormDirty = useMemo(() => {
    if (!modalOpen) return false;
    if (formImage !== formImageBaseline) return true;
    if (!formBaseline) return false;
    return isJsonDirty(form, formBaseline);
  }, [modalOpen, form, formBaseline, formImage, formImageBaseline]);

  const {
    overlayPointerDown,
    overlayClick,
    requestClose: requestCloseItemModal,
    discardOpen: itemDiscardOpen,
    confirmDiscard: confirmDiscardItemModal,
    cancelDiscard: cancelDiscardItemModal,
  } = useAdminOverlayClose({
    onClose: resetForm,
    isDirty: isItemFormDirty,
  });

  function toggleGrupoCollapse(grupoId) {
    setCollapsedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(grupoId)) next.delete(grupoId);
      else next.add(grupoId);
      return next;
    });
  }

  function addGrupo() {
    const nome = String(newGrupoDraft?.nome || '').trim();
    if (!nome) return;
    saveData((prev) => ({
      ...prev,
      marmitaGrupos: [
        ...(prev.marmitaGrupos || []),
        {
          ...emptyMarmitaGrupo(),
          nome,
          ordem: (prev.marmitaGrupos || []).length,
          permitirDiasDuplicados: newGrupoDraft?.permitirDiasDuplicados === true,
        },
      ],
    }));
    setNewGrupoDraft(null);
    toast.success('Grupo criado.');
  }

  async function toggleGrupoAtivo(grupo) {
    if (grupo.id === '__sem_grupo__' || grupo.id === '__all__') return;
    await saveData((prev) => ({
      ...prev,
      marmitaGrupos: (prev.marmitaGrupos || []).map((row) =>
        row.id === grupo.id ? { ...row, ativo: row.ativo === false } : row
      ),
    }));
  }

  async function removeGrupo(grupo) {
    if (grupo.id === '__sem_grupo__' || grupo.id === '__all__') return;
    const confirmed = window.confirm(`Remover o grupo "${grupo.nome}"? As marmitas ficarão sem grupo.`);
    if (!confirmed) return;
    await saveData((prev) => ({
      ...prev,
      marmitaGrupos: (prev.marmitaGrupos || []).filter((row) => row.id !== grupo.id),
      marmitas: (prev.marmitas || []).map((row) =>
        row.grupoId === grupo.id ? { ...row, grupoId: '' } : row
      ),
    }));
    setGrupoMenuId('');
  }

  function openEditGrupo(grupo) {
    setEditingGrupo({
      id: grupo.id,
      nome: grupo.nome,
      permitirDiasDuplicados: grupo.permitirDiasDuplicados === true,
    });
    setGrupoMenuId('');
  }

  async function saveGrupoEdit() {
    const nome = String(editingGrupo?.nome || '').trim();
    if (!nome || !editingGrupo?.id) return;

    const previous = marmitaGrupos.find((row) => row.id === editingGrupo.id);
    const permitirDiasDuplicados = editingGrupo?.permitirDiasDuplicados === true;
    const disablingDuplicates =
      previous?.permitirDiasDuplicados === true && !permitirDiasDuplicados;

    await saveData((prev) => {
      let nextMarmitas = prev.marmitas || [];
      if (disablingDuplicates) {
        nextMarmitas = enforceSingleActiveMarmitaPerGrupo(nextMarmitas, editingGrupo.id);
      }
      return {
        ...prev,
        marmitaGrupos: (prev.marmitaGrupos || []).map((row) =>
          row.id === editingGrupo.id ? { ...row, nome, permitirDiasDuplicados } : row
        ),
        marmitas: nextMarmitas,
      };
    });

    setEditingGrupo(null);
    toast.success(
      disablingDuplicates
        ? 'Grupo atualizado. Mantivemos apenas a primeira marmita ativa neste grupo.'
        : 'Grupo atualizado.'
    );
  }

  async function duplicateGrupo(grupo) {
    if (grupo.id === '__sem_grupo__' || grupo.id === '__all__') return;
    const newGrupoId = marmitaUid('mgr');
    const sourceItems = marmitas.filter((item) => item.grupoId === grupo.id);
    await saveData((prev) => ({
      ...prev,
      marmitaGrupos: [
        ...(prev.marmitaGrupos || []),
        {
          ...grupo,
          id: newGrupoId,
          nome: `${grupo.nome} (cópia)`,
          ordem: (prev.marmitaGrupos || []).length,
        },
      ],
      marmitas: [
        ...(prev.marmitas || []),
        ...sourceItems.map((item, index) => {
          const normalized = normalizeMarmita(item);
          return {
            ...normalized,
            id: marmitaUid('marm'),
            grupoId: newGrupoId,
            tagAdmin: normalized.tagAdmin ? `${normalized.tagAdmin} (cópia)` : 'Cópia',
            ordem: (prev.marmitas || []).length + index,
            tamanhos: normalized.tamanhos.map((tam) => ({ ...tam, id: marmitaUid('tam') })),
            passos: normalized.passos.map((passo) => ({ ...passo, id: marmitaUid('passo') })),
          };
        }),
      ],
    }));
    setGrupoMenuId('');
    toast.success('Grupo duplicado com suas marmitas.');
  }

  function openCardapioModal() {
    setCardapioDraft(savedCardapio);
    setCardapioEditing(false);
    setCardapioModalOpen(true);
  }

  function openCardapioEdit() {
    setCardapioDraft(savedCardapio);
    setCardapioEditing(true);
  }

  async function saveCardapioSettings() {
    const payload = normalizeMarmitaCardapio(cardapioDraft);
    if (
      payload.vincularHorario &&
      payload.continuarModo === 'depois' &&
      !payload.depoisCategoriaId
    ) {
      toast.error('Escolha a categoria para exibir as marmitas depois do horário.');
      return;
    }
    await saveData((prev) => ({ ...prev, marmitaCardapio: payload }));
    setCardapioEditing(false);
    setCardapioModalOpen(false);
    toast.success('Exibição de marmitas no cardápio salva.');
  }

  function renderCardapioSettingsPanel() {
    return (
      <div className="admin-marmita-cardapio-body">
        {cardapioEditing ? (
          <div className="admin-marmita-cardapio-form">
            <div className="admin-marmita-cardapio-row">
              <div className="admin-form-group admin-marmita-cardapio-field">
                <label className="admin-label">Vincular horário?</label>
                <select
                  className="admin-input"
                  value={cardapioDraft.vincularHorario ? 'sim' : 'nao'}
                  onChange={(e) => {
                    const vincularHorario = e.target.value === 'sim';
                    setCardapioDraft((prev) => ({
                      ...prev,
                      vincularHorario,
                      ...(vincularHorario ? {} : { continuarModo: 'nao', depoisCategoriaId: '' }),
                    }));
                  }}
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>

              {cardapioDraft.vincularHorario ? (
                <>
                  <div className="admin-form-group admin-marmita-cardapio-field-time">
                    <label className="admin-label">Início</label>
                    <div className="admin-time-field">
                      <input
                        type="time"
                        className="admin-input admin-time-input"
                        value={cardapioDraft.horarioInicio}
                        onChange={(e) =>
                          setCardapioDraft((prev) => ({ ...prev, horarioInicio: e.target.value }))
                        }
                      />
                      <span className="admin-time-icon" aria-hidden="true">
                        <AdminIcon name="clock" />
                      </span>
                    </div>
                  </div>
                  <div className="admin-form-group admin-marmita-cardapio-field-time">
                    <label className="admin-label">Fim</label>
                    <div className="admin-time-field">
                      <input
                        type="time"
                        className="admin-input admin-time-input"
                        value={cardapioDraft.horarioFim}
                        onChange={(e) =>
                          setCardapioDraft((prev) => ({ ...prev, horarioFim: e.target.value }))
                        }
                      />
                      <span className="admin-time-icon" aria-hidden="true">
                        <AdminIcon name="clock" />
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {cardapioDraft.vincularHorario ? (
              <div className="admin-marmita-cardapio-row">
                <div className="admin-form-group admin-marmita-cardapio-field">
                  <label className="admin-label">Continuar exibindo depois?</label>
                  <select
                    className="admin-input"
                    value={cardapioDraft.continuarModo === 'depois' ? 'depois' : 'nao'}
                    onChange={(e) => {
                      const depois = e.target.value === 'depois';
                      setCardapioDraft((prev) => ({
                        ...prev,
                        continuarModo: depois ? 'depois' : 'nao',
                        depoisCategoriaId: depois ? prev.depoisCategoriaId : '',
                      }));
                    }}
                  >
                    <option value="nao">Não</option>
                    <option value="depois">Depois de</option>
                  </select>
                </div>

                {cardapioDraft.continuarModo === 'depois' ? (
                  <div className="admin-form-group admin-marmita-cardapio-field admin-marmita-cardapio-field-wide">
                    <label className="admin-label">Categoria</label>
                    <select
                      className="admin-input"
                      value={cardapioDraft.depoisCategoriaId}
                      onChange={(e) =>
                        setCardapioDraft((prev) => ({ ...prev, depoisCategoriaId: e.target.value }))
                      }
                    >
                      <option value="">Selecione uma categoria</option>
                      {categoriasCardapio.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm admin-marmita-cardapio-save"
              onClick={saveCardapioSettings}
            >
              Salvar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="admin-marmita-cardapio-summary"
            onClick={openCardapioEdit}
            aria-label="Editar exibição no cardápio público"
          >
            <span className="admin-marmita-cardapio-summary-headline">{cardapioSummary.headline}</span>
            <span className="admin-marmita-cardapio-summary-detail">{cardapioSummary.detail}</span>
          </button>
        )}
      </div>
    );
  }

  function renderVitrinePreviewPanel() {
    return (
      <div className="admin-marmita-preview-body">
        {publicPreview.mode !== 'vitrine' ? (
          <p className="admin-marmita-preview-headline">{publicPreview.headline}</p>
        ) : null}
        <p className="admin-help-text admin-marmita-preview-detail">{publicPreview.detail}</p>

        {publicPreview.marmita ? (
          <div className="admin-marmita-preview-sizes">
            <p className="admin-label">{publicPreview.marmita.nomePublico || publicPreview.marmita.tagAdmin}</p>
            {publicPreview.sizes.map((tam) => (
              <span key={tam.id} className="admin-marmita-size-chip">
                {tam.nome}: {formatCurrency(tam.preco)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderMarmitaRow(item) {
    const activeSizes = item.tamanhos.filter((tam) => tam.ativo !== false);
    return (
      <div key={item.id} className="admin-catalog-item-row admin-marmita-item-row">
        <button
          type="button"
          className="admin-marmita-item-media-btn"
          onClick={() => openEdit(item)}
          aria-label={`Editar ${item.tagAdmin || item.nomePublico}`}
        >
          {item.imagemUrl ? (
            <img className="admin-catalog-item-img" src={item.imagemUrl} alt="" />
          ) : (
            <ImagePlaceholder size={112} />
          )}
        </button>
        <div className="admin-catalog-item-main">
          <button type="button" className="admin-marmita-item-title-btn" onClick={() => openEdit(item)}>
            <span className="admin-marmita-weekday">{getMarmitaWeekdayLabel(item.diaSemana)}</span>
            <span className="admin-marmita-title-sep">—</span>
            <span className="admin-item-title">{item.tagAdmin || 'Sem tag'}</span>
          </button>
          <div className="admin-item-desc">Cardápio público: {item.nomePublico || '—'}</div>
          <div className="admin-catalog-item-tags admin-marmita-size-preview">
            {activeSizes.map((tam) => (
              <span key={tam.id} className="admin-marmita-size-chip">
                {tam.nome}: {formatCurrency(tam.preco)}
              </span>
            ))}
          </div>
          {item.passos.length ? (
            <p className="admin-help-text admin-marmita-passos-count">
              {item.passos.length} passo(s) de montagem
            </p>
          ) : (
            <p className="admin-help-text admin-marmita-passos-count">Cardápio fixo, sem passos de montagem</p>
          )}
        </div>
        <div className="admin-item-actions-col">
          <div className="admin-availability-cell">
            <span>Ativa</span>
            <Switch
              checked={item.ativo !== false}
              label={`Alterar disponibilidade de ${item.tagAdmin || item.nomePublico}`}
              onChange={(checked) => setAtivo(item, checked)}
            />
          </div>
          <button type="button" className="admin-link-btn" onClick={() => openEdit(item)}>
            Editar
          </button>
          <button type="button" className="admin-link-btn" onClick={() => handleDuplicate(item)}>
            Duplicar
          </button>
          <button type="button" className="admin-link-btn admin-link-btn-danger" onClick={() => handleDelete(item)}>
            Remover
          </button>
        </div>
      </div>
    );
  }

  function openNew(grupoId = '') {
    const grupo = grupos.find((row) => row.id === grupoId);
    const suggestedDay = grupo ? inferDiaSemanaFromGrupoNome(grupo.nome) : '';
    const initial = {
      ...emptyMarmita(),
      grupoId: grupoId || '',
      diaSemana: suggestedDay || emptyMarmita().diaSemana,
    };
    setForm(initial);
    setFormBaseline(initial);
    setFormImage('');
    setFormImageBaseline('');
    setEditingId(null);
    setModalOpen(true);
    setSaveError('');
  }

  function openEdit(item) {
    const normalized = normalizeMarmita(item);
    const initial = {
      ...normalized,
      tamanhos: normalized.tamanhos.map((tam) => ({
        ...tam,
        preco: precoToFormInput(tam.preco),
      })),
    };
    setForm(initial);
    setFormBaseline(initial);
    const image = normalized.imagemUrl || '';
    setFormImage(image);
    setFormImageBaseline(image);
    setEditingId(item.id);
    setModalOpen(true);
    setSaveError('');
  }

  function updateForm(patch) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (editingId && 'grupoId' in patch && patch.grupoId !== prev.grupoId) {
        next.ativo = false;
      }
      return next;
    });
  }

  function updateTamanho(index, patch) {
    setForm((prev) => ({
      ...prev,
      tamanhos: prev.tamanhos.map((tam, idx) => (idx === index ? { ...tam, ...patch } : tam)),
    }));
  }

  function addPasso() {
    setForm((prev) => ({
      ...prev,
      passos: [
        ...prev.passos,
        {
          id: marmitaUid('passo'),
          titulo: '',
          categoriaAdicionalId: '',
          itemIds: [],
          obrigatorio: true,
          min: 1,
          max: 1,
          tipoSelecao: 'simples',
          ordem: prev.passos.length,
        },
      ],
    }));
  }

  function updatePasso(index, patch) {
    setForm((prev) => ({
      ...prev,
      passos: prev.passos.map((passo, idx) => (idx === index ? { ...passo, ...patch } : passo)),
    }));
  }

  function togglePassoItem(index, itemId) {
    setForm((prev) => ({
      ...prev,
      passos: prev.passos.map((passo, idx) => {
        if (idx !== index) return passo;
        const current = new Set(passo.itemIds || []);
        if (current.has(itemId)) current.delete(itemId);
        else current.add(itemId);
        return { ...passo, itemIds: [...current] };
      }),
    }));
  }

  function removePasso(index) {
    setForm((prev) => ({
      ...prev,
      passos: prev.passos
        .filter((_, idx) => idx !== index)
        .map((passo, ordem) => ({ ...passo, ordem })),
    }));
  }

  function movePasso(index, direction) {
    setForm((prev) => {
      const next = [...prev.passos];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, passos: next.map((passo, ordem) => ({ ...passo, ordem })) };
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaveError('');

    const tagAdmin = String(form.tagAdmin || '').trim();
    const nomePublico = String(form.nomePublico || '').trim();

    if (!tagAdmin) {
      setSaveError('Informe a tag de controle (ex.: Segunda-feira).');
      return;
    }
    if (!nomePublico) {
      setSaveError('Informe o nome exibido no cardápio público.');
      return;
    }
    if (!form.diaSemana) {
      setSaveError('Selecione o dia da semana desta marmita.');
      return;
    }

    const tamanhosAtivos = form.tamanhos.filter((tam) => tam.ativo !== false);
    if (!tamanhosAtivos.length) {
      setSaveError('Ative pelo menos um tamanho.');
      return;
    }

    for (const tam of tamanhosAtivos) {
      if (!hasMoneyBrValue(tam.preco)) {
        setSaveError(`Informe o preço do tamanho "${tam.nome}".`);
        return;
      }
    }

    for (const [index, passo] of form.passos.entries()) {
      if (!passo.categoriaAdicionalId) {
        setSaveError(`Selecione a categoria de adicionais do passo ${index + 1}.`);
        return;
      }
      if (passo.tipoSelecao === 'multipla') {
        const min = passo.obrigatorio ? Math.max(1, Number(passo.min || 1)) : Number(passo.min || 0);
        const max = Math.max(1, Number(passo.max || 1));
        if (min > max) {
          setSaveError(`No passo ${index + 1}, o mínimo não pode ser maior que o máximo.`);
          return;
        }
      }
    }

    const imagemUrl = await persistImageUrl(activeSlug || data.loja?.slug, formImage);

    if (form.ativo !== false) {
      const conflict = getActivationConflict(
        editingId || form.id,
        form.diaSemana,
        true,
        form.grupoId
      );
      if (conflict) {
        setSaveError(formatMarmitaDayConflictMessage(conflict, form.diaSemana));
        return;
      }
    }

    const payload = normalizeMarmita({
      ...form,
      tagAdmin,
      nomePublico,
      imagemUrl,
      tamanhos: form.tamanhos.map((tam, index) => ({
        ...tam,
        ordem: index,
        preco: parseMoneyBrInput(tam.preco),
      })),
      passos: form.passos.map((passo, index) => {
        const category = addonCategories.find((cat) => cat.id === passo.categoriaAdicionalId);
        return {
          ...passo,
          ordem: index,
          titulo:
            String(passo.titulo || '').trim() ||
            category?.nome ||
            `Passo ${index + 1}`,
          min: passo.obrigatorio ? Math.max(1, Number(passo.min || 1)) : Number(passo.min || 0),
          max: passo.tipoSelecao === 'simples' ? 1 : Math.max(1, Number(passo.max || 1)),
        };
      }),
      ordem: marmitas.find((item) => item.id === editingId)?.ordem ?? marmitas.length,
    });

    try {
      await saveData((prev) => {
        const list = [...(prev.marmitas || [])];
        const idx = list.findIndex((item) => item.id === payload.id);
        if (idx >= 0) list[idx] = payload;
        else list.push(payload);
        return { ...prev, marmitas: sortByOrdem(list) };
      });
      resetForm();
      toast.success('Marmita salva com sucesso.');
    } catch (error) {
      setSaveError(error?.message || 'Não foi possível salvar.');
    }
  }

  async function setAtivo(item, ativo) {
    if (ativo !== false) {
      const conflict = getActivationConflict(item.id, item.diaSemana, true, item.grupoId);
      if (conflict) {
        toast.error(formatMarmitaDayConflictMessage(conflict, item.diaSemana));
        return;
      }
    }
    await saveData((prev) => ({
      ...prev,
      marmitas: (prev.marmitas || []).map((row) => (row.id === item.id ? { ...row, ativo } : row)),
    }));
  }

  async function handleDuplicate(item) {
    const normalized = normalizeMarmita(item);
    const copy = normalizeMarmita({
      ...normalized,
      id: marmitaUid('marm'),
      tagAdmin: normalized.tagAdmin ? `${normalized.tagAdmin} (cópia)` : 'Cópia',
      ordem: marmitas.length,
      tamanhos: normalized.tamanhos.map((tam) => ({ ...tam, id: marmitaUid('tam') })),
      passos: normalized.passos.map((passo) => ({ ...passo, id: marmitaUid('passo') })),
    });
    await saveData((prev) => ({
      ...prev,
      marmitas: sortByOrdem([...(prev.marmitas || []), copy]),
    }));
    toast.success('Marmita duplicada.');
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Excluir "${item.tagAdmin || item.nomePublico}"? Os cards públicos desta marmita serão removidos.`
    );
    if (!confirmed) return;
    await saveData((prev) => ({
      ...prev,
      marmitas: (prev.marmitas || []).filter((row) => row.id !== item.id),
    }));
    if (editingId === item.id) resetForm();
  }

  function handleMarmitasReorder(next) {
    const prevGrupoById = new Map(
      marmitas.map((item) => [item.id, item.grupoId || ''])
    );
    const updated = next.map((item) => {
      const prevGrupo = prevGrupoById.get(item.id) || '';
      const nextGrupo = item.grupoId || '';
      if (prevGrupo !== nextGrupo) {
        return { ...item, ativo: false };
      }
      return item;
    });
    saveData((prev) => ({ ...prev, marmitas: updated }));
  }

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page">
      <AdminPageHeader
        title="Marmitas"
        icon="products"
        actions={
          <div className="admin-marmita-header-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => openNew()}>
              <AdminIcon name="plus" />
              Nova marmita
            </button>
            <div className="admin-marmita-settings-menu-wrap" ref={settingsMenuRef}>
              <button
                type="button"
                className="admin-marmita-settings-btn"
                onClick={() => setSettingsMenuOpen((open) => !open)}
                aria-label="Configurações de marmitas"
                aria-expanded={settingsMenuOpen}
              >
                <i className="ph ph-gear" aria-hidden="true" />
              </button>
              {settingsMenuOpen ? (
                <div className="admin-marmita-settings-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-marmita-settings-menu-item"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      openCardapioModal();
                    }}
                  >
                    Exibição no cardápio público
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-marmita-settings-menu-item"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setVitrineModalOpen(true);
                    }}
                  >
                    Vitrine de preços
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="admin-pedidos-search-row">
        <div className="admin-pedidos-search-wrap">
          <AdminIcon name="search" />
          <input
            className="admin-input admin-pedidos-search"
            placeholder="Buscar por tag, nome público ou dia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="admin-help-text admin-marmita-info-note">
        Organize marmitas em <strong>grupos</strong> e defina se cada grupo permite mais de uma opção ativa no mesmo dia.
        A categoria <strong>Marmitas</strong> aparece automaticamente no cardápio público. Use{' '}
        <strong>vitrine de preços</strong> para exibir referência nos dias sem cardápio do dia.
      </p>

      <div className="admin-catalog-top-row admin-marmita-top-row">
        <div className="admin-catalog-top-actions">
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={() =>
              setNewGrupoDraft((draft) =>
                draft ? null : { nome: '', permitirDiasDuplicados: false }
              )
            }
          >
            <AdminIcon name="plus" />
            Novo grupo
          </button>
          <button type="button" className="admin-catalog-order-btn" onClick={() => setOrdering((value) => !value)}>
            <AdminIcon name="sort" />
            {ordering ? 'Voltar' : 'Ordenar'}
          </button>
        </div>
      </div>

      {newGrupoDraft ? (
        <div className="admin-card admin-new-category-card admin-marmita-new-grupo-card">
          <p className="admin-help-text admin-marmita-grupo-suggest-label">
            Sugestão por dia (ou digite outro nome):
          </p>
          <div className="admin-marmita-grupo-suggest-row">
            {MARMITA_WEEKDAYS.map((day) => (
              <button
                key={day.id}
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => setNewGrupoDraft((prev) => ({ ...prev, nome: day.label }))}
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="admin-catalog-form-grid">
            <div className="admin-form-group">
              <label className="admin-label">Nome do grupo</label>
              <input
                className="admin-input"
                placeholder="Ex.: Segunda-feira"
                value={newGrupoDraft.nome}
                onChange={(e) =>
                  setNewGrupoDraft((prev) => ({ ...prev, nome: e.target.value }))
                }
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Permitir dias duplicados?</label>
              <select
                className="admin-input"
                value={newGrupoDraft.permitirDiasDuplicados ? 'sim' : 'nao'}
                onChange={(e) =>
                  setNewGrupoDraft((prev) => ({
                    ...prev,
                    permitirDiasDuplicados: e.target.value === 'sim',
                  }))
                }
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>
          </div>
          <p className="admin-help-text">
            Com <strong>Não</strong>, apenas uma marmita ativa por dia dentro deste grupo. Com <strong>Sim</strong>,
            várias marmitas podem rodar no mesmo dia (ex.: cardápio fixo + feijoada no sábado em grupos diferentes).
          </p>
          <div className="admin-marmita-grupo-form-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={addGrupo}>
              Salvar
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={() => setNewGrupoDraft(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {editingGrupo ? (
        <div className="admin-card admin-new-category-card admin-marmita-edit-grupo-card">
          <div className="admin-catalog-form-grid">
            <div className="admin-form-group">
              <label className="admin-label">Nome do grupo</label>
              <input
                className="admin-input"
                value={editingGrupo.nome}
                onChange={(e) => setEditingGrupo((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do grupo"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Permitir dias duplicados?</label>
              <select
                className="admin-input"
                value={editingGrupo.permitirDiasDuplicados ? 'sim' : 'nao'}
                onChange={(e) =>
                  setEditingGrupo((prev) => ({
                    ...prev,
                    permitirDiasDuplicados: e.target.value === 'sim',
                  }))
                }
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>
          </div>
          <div className="admin-marmita-grupo-form-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={saveGrupoEdit}>
              Salvar
            </button>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditingGrupo(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {ordering ? (
        <div className="admin-card admin-sortable-panel">
          <AdminGroupedSortablePanel
            groups={grupos}
            items={marmitas}
            groupIdKey="grupoId"
            includeUngroupedSection={grupos.length > 0 && filteredMarmitas.some((item) => !item.grupoId)}
            ungroupedLabel="Sem grupo"
            onGroupsReorder={(next) => saveData((prev) => ({ ...prev, marmitaGrupos: next }))}
            onItemsChange={handleMarmitasReorder}
            renderGroupHeader={(grupo, { isExpanded, itemCount }) => (
              <div className="admin-catalog-title-row admin-grouped-sort-title-row">
                <span className={`admin-collapse-chevron ${isExpanded ? '' : 'is-collapsed'}`} aria-hidden>
                  ›
                </span>
                <h3>{grupo.nome}</h3>
                <span className="admin-grouped-sort-count">{itemCount}</span>
              </div>
            )}
            renderItemPreview={(item) => (
              <div className="admin-grouped-sort-item-preview">
                {item.imagemUrl ? (
                  <img className="admin-grouped-sort-item-img" src={item.imagemUrl} alt="" />
                ) : (
                  <ImagePlaceholder size={48} />
                )}
                <span className="admin-item-title admin-marmita-order-item-title">
                  <span className="admin-marmita-weekday">{getMarmitaWeekdayLabel(item.diaSemana)}</span>
                  <span className="admin-marmita-title-sep">—</span>
                  <span>{item.tagAdmin || item.nomePublico}</span>
                </span>
              </div>
            )}
          />
        </div>
      ) : !grupos.length && !filteredMarmitas.length ? (
        <div className="admin-card admin-empty-catalog">Nenhuma marmita cadastrada.</div>
      ) : (
        groupedSections.map((grupo) => (
          <div key={grupo.id} className="admin-card admin-catalog-card admin-marmita-list-card">
            <div className="admin-catalog-header-bar">
              <div className="admin-catalog-title-row">
                <button
                  type="button"
                  className="admin-catalog-collapse-btn"
                  onClick={() => toggleGrupoCollapse(grupo.id)}
                  aria-expanded={!collapsedGrupos.has(grupo.id)}
                >
                  <span
                    className={`admin-collapse-chevron ${collapsedGrupos.has(grupo.id) ? 'is-collapsed' : ''}`}
                    aria-hidden
                  >
                    ›
                  </span>
                  <h3>{grupo.nome}</h3>
                </button>
                {grupo.id !== '__sem_grupo__' && grupo.id !== '__all__' ? (
                  <>
                    <span>Ativo</span>
                    <Switch
                      checked={grupo.ativo !== false}
                      label={`Alterar disponibilidade do grupo ${grupo.nome}`}
                      onChange={() => toggleGrupoAtivo(grupo)}
                    />
                  </>
                ) : null}
              </div>
              {grupo.id !== '__sem_grupo__' && grupo.id !== '__all__' ? (
                <div className="admin-category-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() => openNew(grupo.id)}
                  >
                    <AdminIcon name="plus" />
                    Novo item
                  </button>
                  <div className="admin-category-menu-wrap">
                    <button
                      type="button"
                      className="admin-kebab-btn"
                      aria-label={`Opções do grupo ${grupo.nome}`}
                      onClick={() => setGrupoMenuId((id) => (id === grupo.id ? '' : grupo.id))}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                    {grupoMenuId === grupo.id ? (
                      <div className="admin-floating-menu">
                        <button type="button" onClick={() => openEditGrupo(grupo)}>
                          Editar grupo
                        </button>
                        <button type="button" onClick={() => duplicateGrupo(grupo)}>
                          Duplicar com marmitas
                        </button>
                        <button type="button" className="danger" onClick={() => removeGrupo(grupo)}>
                          Remover grupo
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            {!collapsedGrupos.has(grupo.id) ? (
              grupo.items.length ? (
                grupo.items.map((item) => renderMarmitaRow(item))
              ) : (
                <div className="admin-empty-catalog">Nenhuma marmita neste grupo.</div>
              )
            ) : null}
          </div>
        ))
      )}

      {modalOpen ? (
        <>
        <div
          className="overlay open admin-item-overlay"
          role="presentation"
          onPointerDown={overlayPointerDown}
          onClick={overlayClick}
        >
          <div className="product-popup admin-product-popup admin-marmita-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-details-col admin-item-form-col">
              <div className="popup-header admin-item-popup-header">
                <div className="admin-modal-title-row">
                  <span className="admin-section-icon">
                    <AdminIcon name="category" />
                  </span>
                  <div>
                    <div className="popup-header-title">
                      {editingId ? 'Editando marmita' : 'Nova marmita'}
                    </div>
                    <div className="popup-header-desc">
                      Tag para organização interna e nome que o cliente vê no cardápio.
                    </div>
                  </div>
                </div>
                <div className="admin-inline-switch">
                  <span>Ativa no cardápio</span>
                  <Switch
                    checked={form.ativo !== false}
                    label="Marmita ativa"
                    onChange={(checked) => updateForm({ ativo: checked })}
                  />
                </div>
              </div>

              <form className="popup-body admin-item-popup-body" onSubmit={handleSave}>
                {saveError ? <div className="admin-error">{saveError}</div> : null}

                <div className="admin-catalog-form-grid">
                  <div className="admin-form-group">
                    <label className="admin-label">Tag (só no admin)</label>
                    <input
                      className="admin-input"
                      value={form.tagAdmin}
                      onChange={(e) => updateForm({ tagAdmin: e.target.value })}
                      placeholder="Ex.: Segunda-feira"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Nome no cardápio público</label>
                    <input
                      className="admin-input"
                      value={form.nomePublico}
                      onChange={(e) => updateForm({ nomePublico: e.target.value })}
                      placeholder="Ex.: Marmita do dia"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Dia da semana</label>
                    <select
                      className="admin-input"
                      value={form.diaSemana}
                      onChange={(e) => updateForm({ diaSemana: e.target.value })}
                    >
                      {MARMITA_DAY_OPTIONS.map((day) => (
                        <option key={day.id} value={day.id}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Grupo (só no admin)</label>
                    <select
                      className="admin-input"
                      value={form.grupoId}
                      onChange={(e) => updateForm({ grupoId: e.target.value })}
                    >
                      <option value="">Sem grupo</option>
                      {grupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group admin-marmita-vitrine-field">
                    <MarmitaCheck
                      checked={form.vitrine === true}
                      label="Vitrine de preços (exibir quando não houver cardápio do dia)"
                      onChange={(checked) => updateForm({ vitrine: checked })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Descrição</label>
                  <textarea
                    className="admin-input"
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => updateForm({ descricao: e.target.value })}
                    placeholder="Texto exibido em todos os tamanhos."
                  />
                </div>

                <section className="admin-marmita-form-section">
                  <h4>Tamanhos — viram cards no cardápio</h4>
                  <p className="admin-help-text">
                    Ex.: &quot;{form.nomePublico || 'Marmita do dia'} — Média&quot; com o preço abaixo.
                  </p>
                  <div className="admin-marmita-size-grid">
                    {form.tamanhos.map((tam, index) => (
                      <div key={tam.id} className="admin-marmita-size-card">
                        <input
                          className="admin-input admin-marmita-size-name"
                          value={tam.nome}
                          onChange={(e) => updateTamanho(index, { nome: e.target.value })}
                          placeholder="Mini"
                        />
                        <input
                          className="admin-input admin-marmita-size-price"
                          value={precoToFormInput(tam.preco)}
                          onChange={(e) =>
                            updateTamanho(index, { preco: formatMoneyBrInput(e.target.value) })
                          }
                          placeholder="R$ 0,00"
                          inputMode="decimal"
                        />
                        <MarmitaCheck
                          checked={tam.ativo !== false}
                          label="Ativo"
                          onChange={(checked) => updateTamanho(index, { ativo: checked })}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    onClick={() =>
                      updateForm({
                        tamanhos: [
                          ...form.tamanhos,
                          {
                            id: marmitaUid('tam'),
                            nome: 'Novo',
                            preco: '',
                            ativo: true,
                            ordem: form.tamanhos.length,
                          },
                        ],
                      })
                    }
                  >
                    + Adicionar tamanho
                  </button>
                </section>

                <section className="admin-marmita-form-section">
                  <div className="admin-marmita-section-head">
                    <h4>Passos de montagem</h4>
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addPasso}>
                      + Adicionar passo
                    </button>
                  </div>
                  <p className="admin-help-text admin-marmita-passos-note">
                    Ex.: categoria Feijão ou Arroz; em &quot;Várias opções&quot;, defina de quantos a quantos itens o cliente pode escolher.
                  </p>

                  {!form.passos.length ? (
                    <p className="admin-help-text">Nenhum passo configurado.</p>
                  ) : (
                    <div className="admin-marmita-passos-grid">
                      {form.passos.map((passo, index) => {
                        const categoryItems = addonItems.filter(
                          (item) => item.categoriaId === passo.categoriaAdicionalId
                        );
                        return (
                          <div key={passo.id} className="admin-marmita-passo-card">
                            <div className="admin-marmita-passo-toolbar">
                              <span className="admin-marmita-passo-index">Passo {index + 1}</span>
                              <div className="admin-marmita-passo-actions">
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-ghost admin-btn-sm"
                                  onClick={() => movePasso(index, -1)}
                                  disabled={index === 0}
                                  aria-label={`Subir passo ${index + 1}`}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-ghost admin-btn-sm"
                                  onClick={() => movePasso(index, 1)}
                                  disabled={index === form.passos.length - 1}
                                  aria-label={`Descer passo ${index + 1}`}
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-sm admin-marmita-passo-remove"
                                  onClick={() => removePasso(index)}
                                  aria-label={`Remover passo ${index + 1}`}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="admin-marmita-passo-row1">
                              <div className="admin-form-group admin-marmita-passo-field">
                                <label className="admin-label">Pergunta no cardápio</label>
                                <input
                                  className="admin-input"
                                  value={passo.titulo}
                                  onChange={(e) => updatePasso(index, { titulo: e.target.value })}
                                  placeholder="Ex.: Deseja feijão?"
                                />
                              </div>
                              <div className="admin-form-group admin-marmita-passo-field">
                                <label className="admin-label">Categoria de adicionais</label>
                                <select
                                  className="admin-input"
                                  value={passo.categoriaAdicionalId}
                                  onChange={(e) =>
                                    updatePasso(index, {
                                      categoriaAdicionalId: e.target.value,
                                      itemIds: [],
                                    })
                                  }
                                >
                                  <option value="">Selecione</option>
                                  {addonCategories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.nome}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="admin-form-group admin-marmita-passo-field">
                                <label className="admin-label">Seleção</label>
                                <select
                                  className="admin-input"
                                  value={passo.tipoSelecao}
                                  onChange={(e) => {
                                    const tipoSelecao = e.target.value;
                                    const itemCount = categoryItems.length || 99;
                                    updatePasso(index, {
                                      tipoSelecao,
                                      max:
                                        tipoSelecao === 'simples'
                                          ? 1
                                          : Math.min(Math.max(Number(passo.max || 2), 1), itemCount),
                                      min:
                                        tipoSelecao === 'simples'
                                          ? passo.obrigatorio
                                            ? 1
                                            : 0
                                          : Math.min(
                                              Number(passo.min ?? (passo.obrigatorio ? 1 : 0)),
                                              itemCount
                                            ),
                                    });
                                  }}
                                >
                                  <option value="simples">Uma opção</option>
                                  <option value="multipla">Várias opções</option>
                                </select>
                              </div>
                            </div>
                            <div className="admin-marmita-passo-row2">
                              {categoryItems.length ? (
                                <div className="admin-marmita-passo-items-inline">
                                  <span className="admin-label">Itens</span>
                                  <div className="admin-marmita-passo-item-list">
                                    {categoryItems.map((item) => (
                                      <MarmitaCheck
                                        key={item.id}
                                        checked={(passo.itemIds || []).includes(item.id)}
                                        label={item.nome}
                                        onChange={() => togglePassoItem(index, item.id)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="admin-help-text admin-marmita-passo-empty-items">
                                  Selecione uma categoria para filtrar itens.
                                </span>
                              )}
                              {passo.tipoSelecao === 'multipla' ? (
                                <div className="admin-marmita-passo-limits">
                                  <span className="admin-label">Escolher</span>
                                  <input
                                    type="number"
                                    className="admin-input admin-marmita-passo-limit-input"
                                    min={passo.obrigatorio ? 1 : 0}
                                    max={Math.max(1, Number(passo.max || 1))}
                                    value={Number(passo.min ?? (passo.obrigatorio ? 1 : 0))}
                                    onChange={(e) =>
                                      updatePasso(index, {
                                        min: Math.max(
                                          passo.obrigatorio ? 1 : 0,
                                          Number(e.target.value || 0)
                                        ),
                                      })
                                    }
                                  />
                                  <span className="admin-marmita-passo-limits-sep">a</span>
                                  <input
                                    type="number"
                                    className="admin-input admin-marmita-passo-limit-input"
                                    min={Math.max(passo.obrigatorio ? 1 : 0, Number(passo.min || 0))}
                                    max={categoryItems.length || 99}
                                    value={Number(passo.max || 1)}
                                    onChange={(e) =>
                                      updatePasso(index, {
                                        max: Math.max(
                                          Number(passo.min || 0),
                                          Number(e.target.value || 1)
                                        ),
                                      })
                                    }
                                  />
                                  <span className="admin-help-text admin-marmita-passo-limits-hint">itens</span>
                                </div>
                              ) : null}
                              <MarmitaCheck
                                checked={passo.obrigatorio === true}
                                label="Obrigatório"
                                onChange={(checked) =>
                                  updatePasso(index, {
                                    obrigatorio: checked,
                                    min: checked ? Math.max(1, Number(passo.min || 1)) : 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div className="popup-footer">
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={requestCloseItemModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="admin-btn admin-btn-primary">
                    Salvar marmita
                  </button>
                </div>
              </form>
            </div>
            <div className="popup-details-col admin-preview-col admin-marmita-preview-col">
              <div className="popup-header admin-preview-header">
                <div className="popup-header-title">Prévia</div>
              </div>
              <div className="popup-body admin-marmita-preview-body">
                <label className="admin-upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setFormImage(await compressImageFile(file));
                    }}
                  />
                  {formImage ? <img src={formImage} alt="Preview marmita" /> : <ImagePlaceholder size={90} />}
                  <span>Adicione uma foto</span>
                  <small>JPEG, PNG até 3MB</small>
                </label>
                <div className="admin-marmita-preview-meta">
                  <div className="admin-marmita-preview-public-name">
                    {form.nomePublico || 'Marmita do dia'}
                    {form.tagAdmin ? (
                      <span className="admin-marmita-preview-admin-tag"> ({form.tagAdmin})</span>
                    ) : null}
                  </div>
                  <div className="admin-marmita-preview-weekday">
                    {getMarmitaWeekdayLabel(form.diaSemana)}
                  </div>
                  <p className="admin-marmita-preview-desc">
                    {form.descricao?.trim() || 'Sem descrição cadastrada.'}
                  </p>
                  <div className="admin-marmita-preview-sizes">
                    {form.tamanhos
                      .filter((tam) => tam.ativo !== false)
                      .map((tam) => (
                        <span key={tam.id} className="admin-marmita-size-chip">
                          {tam.nome}: {precoToFormInput(tam.preco) || 'R$ 0,00'}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <AdminDiscardDialog
          open={itemDiscardOpen}
          onConfirm={confirmDiscardItemModal}
          onCancel={cancelDiscardItemModal}
        />
        </>
      ) : null}

      {cardapioModalOpen ? (
        <div
          className="admin-confirm-overlay admin-marmita-settings-overlay"
          role="presentation"
          onPointerDown={cardapioOverlayPointerDown}
          onClick={cardapioOverlayClick}
        >
          <div
            className="admin-confirm-modal admin-marmita-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-marmita-cardapio-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="admin-marmita-cardapio-modal-title">Exibição no cardápio público</h3>
            {renderCardapioSettingsPanel()}
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={requestCloseCardapioModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {vitrineModalOpen ? (
        <div
          className="admin-confirm-overlay admin-marmita-settings-overlay"
          role="presentation"
          onPointerDown={vitrineOverlayPointerDown}
          onClick={vitrineOverlayClick}
        >
          <div
            className="admin-confirm-modal admin-marmita-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-marmita-vitrine-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="admin-marmita-vitrine-modal-title">Vitrine de preços</h3>
            {renderVitrinePreviewPanel()}
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setVitrineModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminDiscardDialog
        open={cardapioDiscardOpen}
        onConfirm={confirmDiscardCardapioModal}
        onCancel={cancelDiscardCardapioModal}
      />
    </div>
  );
}
