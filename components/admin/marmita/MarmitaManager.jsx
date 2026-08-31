'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminFaixaModal from '@/components/admin/AdminFaixaModal';
import AdminIcon from '@/components/admin/AdminIcon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminGroupedSortablePanel, { ADMIN_UNGROUPED_ID } from '@/components/admin/AdminGroupedSortablePanel';
import ProductAddonPassoModal from '@/components/admin/ProductAddonPassoModal';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { DraggableReorderList } from '@/components/lightswind/draggable-reorder-list';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { isJsonDirty } from '@/lib/admin/isFormDirty';
import { getAdminPortalRoot } from '@/lib/admin/portalRoot';
import { mergeBrowseItemChanges } from '@/lib/admin/mergeBrowseItemChanges';
import { formatMoneyBrInput, hasMoneyBrValue, parseMoneyBrInput } from '@/lib/moneyMask';
import { buildMarmitaProductId } from '@/lib/marmita/marmitaIds';
import {
  getMarmitaWeekdayLabel,
  MARMITA_DAY_OPTIONS,
  MARMITA_WEEKDAYS,
} from '@/lib/marmita/marmitaWeekdays';
import MarmitaGrupoEditorModal from '@/components/admin/marmita/MarmitaGrupoEditorModal';
import { CATEGORY_LAYOUT_DEFAULT } from '@/lib/cardapio/categoryLayouts';
import { applyMarmitaGrupoToggle, isMarmitaItemUnavailable } from '@/lib/catalog/groupAvailability';
import {
  createFaixaFromMembers,
  findFaixaForMember,
  removeFaixaExibicao,
  removeMemberFromFaixas,
  sanitizeFaixasExibicao,
  updateFaixaExibicao,
} from '@/lib/cardapio/faixasExibicao';
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
import { normalizeAddonPasso } from '@/lib/productAddonPassos';

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
  const [grupoModal, setGrupoModal] = useState(null);
  const [grupoMenuId, setGrupoMenuId] = useState('');
  const [faixaModal, setFaixaModal] = useState(null);
  const [passoModalOpen, setPassoModalOpen] = useState(false);
  const [editingPassoId, setEditingPassoId] = useState('');
  const [removingPassoId, setRemovingPassoId] = useState('');
  const [descricaoEditing, setDescricaoEditing] = useState(false);
  const [descricaoDraft, setDescricaoDraft] = useState('');
  const [editingTamanhoId, setEditingTamanhoId] = useState('');
  const savedCardapio = useMemo(
    () => normalizeMarmitaCardapio(data.marmitaCardapio),
    [data.marmitaCardapio]
  );
  const faixasExibicao = useMemo(
    () =>
      sanitizeFaixasExibicao(
        savedCardapio.faixasExibicao,
        marmitaGrupos.map((grupo) => grupo.id)
      ),
    [savedCardapio.faixasExibicao, marmitaGrupos]
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
  const gruposById = useMemo(
    () => new Map(grupos.map((grupo) => [grupo.id, grupo])),
    [grupos]
  );

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
    setDescricaoEditing(false);
    setDescricaoDraft('');
    setEditingTamanhoId('');
    setPassoModalOpen(false);
    setEditingPassoId('');
    setRemovingPassoId('');
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

  function openNewGrupoModal() {
    setGrupoModal({
      isNew: true,
      ...emptyMarmitaGrupo(),
      ordem: grupos.length,
    });
  }

  function addGrupo() {
    const nome = String(grupoModal?.nome || '').trim();
    if (!nome || !grupoModal?.isNew) return;
    saveData((prev) => ({
      ...prev,
      marmitaGrupos: [
        ...(prev.marmitaGrupos || []),
        {
          ...emptyMarmitaGrupo(),
          id: grupoModal.id,
          nome,
          icone: 'marmita',
          ordem: (prev.marmitaGrupos || []).length,
          permitirDiasDuplicados: grupoModal.permitirDiasDuplicados === true,
          exibicaoCardapio: grupoModal.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT,
        },
      ],
    }));
    setGrupoModal(null);
    toast.success('Grupo criado.');
  }

  function openEditGrupo(grupo) {
    setGrupoModal({
      isNew: false,
      id: grupo.id,
      nome: grupo.nome,
      icone: 'marmita',
      permitirDiasDuplicados: grupo.permitirDiasDuplicados === true,
      exibicaoCardapio: grupo.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT,
    });
    setGrupoMenuId('');
  }

  async function saveGrupoModal() {
    const nome = String(grupoModal?.nome || '').trim();
    if (!nome) {
      toast.error('Informe o nome do grupo.');
      return;
    }
    if (grupoModal.isNew) {
      addGrupo();
      return;
    }

    const previous = marmitaGrupos.find((row) => row.id === grupoModal.id);
    const permitirDiasDuplicados = grupoModal.permitirDiasDuplicados === true;
    const exibicaoCardapio = grupoModal.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT;
    const icone = 'marmita';
    const disablingDuplicates =
      previous?.permitirDiasDuplicados === true && !permitirDiasDuplicados;

    await saveData((prev) => {
      let nextMarmitas = prev.marmitas || [];
      if (disablingDuplicates) {
        nextMarmitas = enforceSingleActiveMarmitaPerGrupo(nextMarmitas, grupoModal.id);
      }
      return {
        ...prev,
        marmitaGrupos: (prev.marmitaGrupos || []).map((row) =>
          row.id === grupoModal.id
            ? { ...row, nome, icone, permitirDiasDuplicados, exibicaoCardapio }
            : row
        ),
        marmitas: nextMarmitas,
      };
    });

    setGrupoModal(null);
    toast.success(
      disablingDuplicates
        ? 'Grupo atualizado. Mantivemos apenas a primeira marmita ativa neste grupo.'
        : 'Grupo atualizado.'
    );
  }

  async function toggleGrupoAtivo(grupo) {
    if (grupo.id === '__sem_grupo__' || grupo.id === '__all__') return;
    const nextActive = grupo.ativo === false;
    await saveData((prev) => applyMarmitaGrupoToggle(prev, grupo.id, nextActive));
  }

  async function removeGrupo(grupo) {
    if (grupo.id === '__sem_grupo__' || grupo.id === '__all__') return;
    const confirmed = window.confirm(`Remover o grupo "${grupo.nome}"? As marmitas ficarão sem grupo.`);
    if (!confirmed) return;
    await saveData((prev) => {
      const cardapio = normalizeMarmitaCardapio(prev.marmitaCardapio);
      return {
        ...prev,
        marmitaGrupos: (prev.marmitaGrupos || []).filter((row) => row.id !== grupo.id),
        marmitas: (prev.marmitas || []).map((row) =>
          row.grupoId === grupo.id ? { ...row, grupoId: '' } : row
        ),
        marmitaCardapio: {
          ...cardapio,
          faixasExibicao: removeMemberFromFaixas(cardapio.faixasExibicao, grupo.id),
        },
      };
    });
    setGrupoMenuId('');
  }

  function openCreateFaixaModal() {
    if (grupos.length < 2) {
      toast.error('Cadastre ao menos dois grupos para agrupar.');
      return;
    }
    setFaixaModal({
      mode: 'create',
      faixaId: null,
      membroIds: [],
      nome: '',
      layout: CATEGORY_LAYOUT_DEFAULT,
    });
  }

  function openEditFaixaModal(faixa) {
    setFaixaModal({
      mode: 'edit',
      faixaId: faixa.id,
      membroIds: [...(faixa.membroIds || [])],
      nome: faixa.nome,
      layout: faixa.layout,
    });
  }

  function confirmFaixaModal({ nome, layout, membroIds }) {
    if (!faixaModal) return;
    const ids = Array.isArray(membroIds) ? membroIds : [];
    saveData((prev) => {
      const cardapio = normalizeMarmitaCardapio(prev.marmitaCardapio);
      const current = sanitizeFaixasExibicao(
        cardapio.faixasExibicao,
        (prev.marmitaGrupos || []).map((grupo) => grupo.id)
      );
      const cleaned = current.map((faixa) => {
        if (faixaModal.mode === 'edit' && faixa.id === faixaModal.faixaId) return faixa;
        return {
          ...faixa,
          membroIds: faixa.membroIds.filter((id) => !ids.includes(id)),
        };
      });
      const nextFaixas =
        faixaModal.mode === 'edit' && faixaModal.faixaId
          ? updateFaixaExibicao(cleaned, faixaModal.faixaId, {
              nome,
              layout,
              membroIds: ids,
            })
          : createFaixaFromMembers({
              nome,
              layout,
              membroIds: ids,
              existing: cleaned,
            });
      return {
        ...prev,
        marmitaCardapio: { ...cardapio, faixasExibicao: nextFaixas },
      };
    });
    setFaixaModal(null);
    toast.success(
      faixaModal.mode === 'edit' ? 'Seção do cardápio atualizada.' : 'Grupos agrupados no cardápio.'
    );
  }

  function patchFaixas(updater, successMsg) {
    saveData((prev) => {
      const cardapio = normalizeMarmitaCardapio(prev.marmitaCardapio);
      const current = sanitizeFaixasExibicao(
        cardapio.faixasExibicao,
        (prev.marmitaGrupos || []).map((grupo) => grupo.id)
      );
      return {
        ...prev,
        marmitaCardapio: {
          ...cardapio,
          faixasExibicao: updater(current),
        },
      };
    }).then(() => {
      if (successMsg) toast.success(successMsg);
    });
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
    const payload = normalizeMarmitaCardapio({
      ...cardapioDraft,
      faixasExibicao: savedCardapio.faixasExibicao,
    });
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
    const isUnavailable = isMarmitaItemUnavailable(item, gruposById);
    return (
      <div className={`admin-catalog-item-row admin-marmita-item-row admin-grouped-sort-browse-item${isUnavailable ? ' is-unavailable' : ''}`}>
        <div className="admin-catalog-item-media">
          <button
            type="button"
            className="admin-marmita-item-media-btn"
            onClick={() => openEdit(item)}
            aria-label={`Editar ${item.tagAdmin || item.nomePublico}`}
          >
            {item.imagemUrl ? (
              <img className="admin-catalog-item-img" src={item.imagemUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <ImagePlaceholder size={112} />
            )}
          </button>
        </div>
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
        <div className="admin-catalog-item-controls">
          <div className="admin-availability-cell admin-catalog-item-toggle">
            <span className="admin-availability-label">Disponível</span>
            <Switch
              checked={item.ativo !== false}
              label={`Alterar disponibilidade de ${item.tagAdmin || item.nomePublico}`}
              onChange={(checked) => setAtivo(item, checked)}
            />
          </div>
          <div className="admin-item-icon-actions">
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm admin-item-action-icon admin-item-action-edit"
              onClick={() => openEdit(item)}
              title="Editar"
              aria-label={`Editar ${item.tagAdmin || item.nomePublico}`}
            >
              <i className="ph ph-pencil-simple" aria-hidden="true" />
              <span className="admin-item-action-label">Editar</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm admin-item-action-icon admin-item-action-dup"
              onClick={() => handleDuplicate(item)}
              title="Duplicar"
              aria-label={`Duplicar ${item.tagAdmin || item.nomePublico}`}
            >
              <i className="ph ph-copy" aria-hidden="true" />
              <span className="admin-item-action-label">Duplicar</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm admin-item-action-icon admin-item-action-danger"
              onClick={() => handleDelete(item)}
              title="Remover"
              aria-label={`Remover ${item.tagAdmin || item.nomePublico}`}
            >
              <i className="ph ph-trash" aria-hidden="true" />
              <span className="admin-item-action-label">Remover</span>
            </button>
          </div>
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
    setDescricaoEditing(false);
    setDescricaoDraft('');
    setEditingTamanhoId('');
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
    setDescricaoEditing(false);
    setDescricaoDraft('');
    setEditingTamanhoId('');
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

  const editingPasso = useMemo(
    () => (form.passos || []).find((passo) => passo.id === editingPassoId) || null,
    [form.passos, editingPassoId]
  );

  function toMarmitaPasso(passo, ordem) {
    const normalized = normalizeAddonPasso(passo, ordem);
    return {
      id: normalized.id,
      titulo: normalized.titulo,
      categoriaAdicionalId: normalized.categoriaAdicionalId,
      itemIds: normalized.itemIds,
      obrigatorio: normalized.obrigatorio,
      min: normalized.min,
      max: normalized.max,
      tipoSelecao: normalized.tipoSelecao,
      ordem: Number.isFinite(ordem) ? ordem : normalized.ordem,
    };
  }

  function addPasso() {
    setEditingPassoId('');
    setPassoModalOpen(true);
  }

  function removePassoById(passoId) {
    setForm((prev) => ({
      ...prev,
      passos: prev.passos
        .filter((passo) => passo.id !== passoId)
        .map((passo, ordem) => ({ ...passo, ordem })),
    }));
  }

  function updateTamanho(index, patch) {
    setForm((prev) => ({
      ...prev,
      tamanhos: prev.tamanhos.map((tam, idx) => (idx === index ? { ...tam, ...patch } : tam)),
    }));
  }

  function removeTamanho(index) {
    setForm((prev) => {
      if (prev.tamanhos.length <= 1) return prev;
      return {
        ...prev,
        tamanhos: prev.tamanhos
          .filter((_, idx) => idx !== index)
          .map((tam, ordem) => ({ ...tam, ordem })),
      };
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaveError('');

    const tagAdmin = String(form.tagAdmin || '').trim();
    const nomePublico = String(form.nomePublico || '').trim();

    if (!tagAdmin) {
      setSaveError('Informe o nome interno (ex.: Segunda-feira).');
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

  function handleMarmitasReorder(nextBrowse) {
    const prevGrupoById = new Map(
      marmitas.map((item) => [item.id, item.grupoId || ''])
    );
    const updatedVisible = nextBrowse.map((item) => {
      const prevGrupo = prevGrupoById.get(item.id) || '';
      const nextGrupo = item.grupoId || '';
      if (prevGrupo !== nextGrupo) {
        return { ...item, ativo: false };
      }
      return item;
    });
    saveData((prev) => ({
      ...prev,
      marmitas: mergeBrowseItemChanges(prev.marmitas, updatedVisible),
    }));
  }

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-marmita-page">
      <AdminPageHeader
        title="Marmitas"
        icon="products"
        actions={
          <div className="admin-marmita-header-actions">
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
          {grupos.length >= 2 ? (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={openCreateFaixaModal}>
              Agrupar categorias
            </button>
          ) : null}
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={openNewGrupoModal}
          >
            <AdminIcon name="plus" />
            Novo grupo
          </button>
        </div>
      </div>

      {!grupos.length && !filteredMarmitas.length ? (
        <div className="admin-card admin-empty-catalog">Nenhuma marmita cadastrada.</div>
      ) : (
        <AdminGroupedSortablePanel
          browseMode
          defaultExpandAll
          groups={grupos}
          items={filteredMarmitas}
          groupIdKey="grupoId"
          includeUngroupedSection={grupos.length > 0 && filteredMarmitas.some((item) => !item.grupoId)}
          ungroupedLabel="Sem grupo"
          onGroupsReorder={(next) => saveData((prev) => ({ ...prev, marmitaGrupos: next }))}
          onItemsChange={handleMarmitasReorder}
          renderGroupHeader={(grupo, { isExpanded, onToggle }) => {
            const isRealGrupo =
              grupo.id !== ADMIN_UNGROUPED_ID && grupo.id !== '__sem_grupo__' && grupo.id !== '__all__';
            const faixa = isRealGrupo ? findFaixaForMember(faixasExibicao, grupo.id) : null;
            return (
            <div className={`admin-catalog-title-row admin-grouped-sort-title-row${faixa ? ' is-in-faixa' : ''}`}>
              <button
                type="button"
                className="admin-catalog-collapse-btn"
                onClick={onToggle}
                aria-expanded={isExpanded}
              >
                <span className={`admin-collapse-chevron ${isExpanded ? '' : 'is-collapsed'}`} aria-hidden>
                  ›
                </span>
                <h3>{grupo.id === ADMIN_UNGROUPED_ID ? 'Sem grupo' : grupo.nome}</h3>
              </button>
              {faixa ? (
                <button
                  type="button"
                  className="admin-faixa-badge"
                  onClick={() => openEditFaixaModal(faixa)}
                >
                  Seção: {faixa.nome}
                </button>
              ) : null}
              {isRealGrupo ? (
                <div className="admin-availability-cell admin-catalog-group-toggle">
                  <Switch
                    checked={grupo.ativo !== false}
                    label={`Alterar disponibilidade do grupo ${grupo.nome}`}
                    onChange={() => toggleGrupoAtivo(grupo)}
                  />
                </div>
              ) : null}
            </div>
            );
          }}
          renderGroupActions={(grupo) => {
            const isRealGrupo =
              grupo.id !== ADMIN_UNGROUPED_ID && grupo.id !== '__sem_grupo__' && grupo.id !== '__all__';
            if (!isRealGrupo) return null;
            const faixa = findFaixaForMember(faixasExibicao, grupo.id);
            return (
              <div className="admin-category-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-category-new-item-btn"
                  onClick={() => openNew(grupo.id)}
                  aria-label={`Novo item em ${grupo.nome}`}
                  title="Novo item"
                >
                  <AdminIcon name="plus" />
                  <span className="admin-category-new-item-label">Novo item</span>
                </button>
                <button
                  type="button"
                  className="admin-kebab-btn"
                  aria-label={`Opções do grupo ${grupo.nome}`}
                  aria-expanded={grupoMenuId === grupo.id}
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
                    {faixa ? (
                      <button
                        type="button"
                        onClick={() => {
                          openEditFaixaModal(faixa);
                          setGrupoMenuId('');
                        }}
                      >
                        Editar seção do cardápio
                      </button>
                    ) : null}
                    {faixa ? (
                      <button
                        type="button"
                        onClick={() => {
                          patchFaixas(
                            (current) => removeMemberFromFaixas(current, grupo.id),
                            'Grupo removido da seção.'
                          );
                          setGrupoMenuId('');
                        }}
                      >
                        Remover da seção
                      </button>
                    ) : null}
                    {faixa ? (
                      <button
                        type="button"
                        onClick={() => {
                          patchFaixas(
                            (current) => removeFaixaExibicao(current, faixa.id),
                            'Seção desagrupada.'
                          );
                          setGrupoMenuId('');
                        }}
                      >
                        Desagrupar seção
                      </button>
                    ) : null}
                    <button type="button" onClick={() => duplicateGrupo(grupo)}>
                      Duplicar com marmitas
                    </button>
                    <button type="button" className="danger" onClick={() => removeGrupo(grupo)}>
                      Remover grupo
                    </button>
                  </div>
                ) : null}
              </div>
            );
          }}
          renderItemPreview={(item) => renderMarmitaRow(item)}
        />
      )}

      <AdminFaixaModal
        open={Boolean(faixaModal)}
        mode={faixaModal?.mode || 'create'}
        title={faixaModal?.mode === 'edit' ? 'Editar seção do cardápio' : 'Agrupar categorias'}
        initialNome={faixaModal?.nome || ''}
        initialLayout={faixaModal?.layout || CATEGORY_LAYOUT_DEFAULT}
        initialMemberIds={faixaModal?.membroIds || []}
        categories={grupos}
        getCategoryId={(grupo) => grupo.id}
        getCategoryLabel={(grupo) => grupo.nome}
        confirmLabel={faixaModal?.mode === 'edit' ? 'Salvar seção' : 'Agrupar'}
        onClose={() => setFaixaModal(null)}
        onConfirm={confirmFaixaModal}
      />

      {modalOpen && getAdminPortalRoot()
        ? createPortal(
            <>
        <div
          className="overlay open admin-item-overlay"
          role="presentation"
          onPointerDown={overlayPointerDown}
          onClick={overlayClick}
        >
          <div className="product-popup admin-product-popup admin-marmita-popup" onClick={(e) => e.stopPropagation()}>
            <div className="admin-product-popup-main">
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
                      Nomes interno e externo no cardápio.
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

              <form id="admin-marmita-item-form" className="popup-body admin-item-popup-body" onSubmit={handleSave}>
                {saveError ? <div className="admin-error">{saveError}</div> : null}

                <div className="admin-catalog-form-grid">
                  <div className="admin-form-group">
                    <label className="admin-label">
                      Nome interno <span className="admin-label-hint">(só pra você)</span>
                    </label>
                    <input
                      className="admin-input"
                      value={form.tagAdmin}
                      onChange={(e) => updateForm({ tagAdmin: e.target.value })}
                      placeholder="Ex.: Segunda-feira"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">
                      Nome externo{' '}
                      <span className="admin-label-hint">(como aparece para o cliente)</span>
                    </label>
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
                    <label className="admin-label">
                      Grupos <span className="admin-label-hint">(só pra você)</span>
                    </label>
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
                </div>

                <div className="admin-form-group admin-form-full admin-product-descricao-block">
                  <div className="admin-order-collapsed-head">
                    <label className="admin-label">Descrição</label>
                    {!descricaoEditing ? (
                      <button
                        type="button"
                        className="admin-link-btn"
                        onClick={() => {
                          setDescricaoDraft(form.descricao || '');
                          setDescricaoEditing(true);
                        }}
                      >
                        {form.descricao?.trim() ? 'Editar' : 'Adicionar'}
                      </button>
                    ) : null}
                  </div>
                  {descricaoEditing ? (
                    <div className="admin-product-descricao-editor">
                      <textarea
                        className="admin-input admin-product-descricao-textarea"
                        maxLength={400}
                        value={descricaoDraft}
                        onChange={(e) => setDescricaoDraft(e.target.value)}
                        placeholder="Texto exibido em todos os tamanhos. (Opcional)"
                        rows={7}
                      />
                      <div className="admin-product-descricao-editor-actions">
                        <span className="admin-help-text">{descricaoDraft.length}/400</span>
                        <div className="admin-product-descricao-editor-btns">
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            onClick={() => {
                              setDescricaoEditing(false);
                              setDescricaoDraft('');
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            onClick={() => {
                              updateForm({ descricao: descricaoDraft });
                              setDescricaoEditing(false);
                            }}
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={
                        form.descricao?.trim()
                          ? 'admin-order-collapsed-summary'
                          : 'admin-order-collapsed-empty'
                      }
                    >
                      {form.descricao?.trim() || 'Nenhuma descrição cadastrada.'}
                    </p>
                  )}
                </div>

                <section className="admin-marmita-form-section">
                  <div className="admin-marmita-section-head">
                    <h4>Tamanhos</h4>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => {
                        const id = marmitaUid('tam');
                        updateForm({
                          tamanhos: [
                            ...form.tamanhos,
                            {
                              id,
                              nome: 'Novo',
                              preco: '',
                              ativo: true,
                              ordem: form.tamanhos.length,
                            },
                          ],
                        });
                        setEditingTamanhoId(id);
                      }}
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="admin-marmita-size-tile-grid">
                    {form.tamanhos.map((tam, index) => {
                      const isActive = tam.ativo !== false;
                      const isEditing = editingTamanhoId === tam.id;
                      return (
                        <div
                          key={tam.id}
                          role="button"
                          tabIndex={0}
                          className={`admin-marmita-size-tile${isActive ? ' is-active' : ''}${isEditing ? ' is-editing' : ''}`}
                          aria-pressed={isActive}
                          onClick={() => {
                            if (isEditing) return;
                            updateTamanho(index, { ativo: !isActive });
                          }}
                          onKeyDown={(event) => {
                            if (isEditing) return;
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            updateTamanho(index, { ativo: !isActive });
                          }}
                        >
                          {isEditing ? (
                            <div
                              className="admin-marmita-size-tile-fields"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <input
                                className="admin-input admin-marmita-size-tile-input"
                                value={tam.nome}
                                onChange={(e) => updateTamanho(index, { nome: e.target.value })}
                                placeholder="Nome"
                                aria-label="Nome do tamanho"
                              />
                              <input
                                className="admin-input admin-marmita-size-tile-input"
                                value={precoToFormInput(tam.preco)}
                                onChange={(e) =>
                                  updateTamanho(index, { preco: formatMoneyBrInput(e.target.value) })
                                }
                                placeholder="R$ 0,00"
                                inputMode="decimal"
                                aria-label="Preço do tamanho"
                              />
                            </div>
                          ) : (
                            <div className="admin-marmita-size-tile-main">
                              <span className="admin-marmita-size-tile-name">{tam.nome || 'Sem nome'}</span>
                              <span className="admin-marmita-size-tile-price">
                                {precoToFormInput(tam.preco) || 'R$ 0,00'}
                              </span>
                            </div>
                          )}
                          <div className="admin-marmita-size-tile-actions">
                            <button
                              type="button"
                              className="admin-marmita-size-tile-action"
                              title={isEditing ? 'Concluir edição' : 'Editar tamanho'}
                              aria-label={isEditing ? 'Concluir edição' : `Editar ${tam.nome || 'tamanho'}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingTamanhoId(isEditing ? '' : tam.id);
                              }}
                            >
                              <AdminIcon name={isEditing ? 'check' : 'edit'} />
                            </button>
                            <button
                              type="button"
                              className="admin-marmita-size-tile-action is-danger"
                              title={
                                form.tamanhos.length <= 1
                                  ? 'É necessário manter pelo menos um tamanho'
                                  : `Remover tamanho ${tam.nome || index + 1}`
                              }
                              aria-label={`Remover tamanho ${tam.nome || index + 1}`}
                              disabled={form.tamanhos.length <= 1}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (editingTamanhoId === tam.id) setEditingTamanhoId('');
                                removeTamanho(index);
                              }}
                            >
                              <AdminIcon name="close" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </form>
            </div>
            <div className="popup-details-col admin-preview-col admin-marmita-preview-col">
              <div className="admin-editor-photo-block">
                <div className="popup-header admin-preview-header">
                  <div className="popup-header-title">Foto</div>
                </div>
                <div className="admin-editor-photo-body admin-marmita-preview-body">
                  <label className="admin-upload-box admin-marmita-upload-box">
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
                    <span className="admin-upload-caption">Adicione uma foto</span>
                    <small className="admin-upload-caption-hint">JPEG, PNG até 3MB</small>
                  </label>
                </div>
              </div>
              <div className="admin-editor-options-block">
              <div className="popup-body admin-marmita-preview-body">
                <section className="admin-product-side-section admin-marmita-passos-side">
                  <div className="admin-product-config-copy">
                    <strong>Passos de montagem</strong>
                    <p>Cada passo vira uma pergunta no cardápio.</p>
                  </div>

                  <DraggableReorderList
                    items={form.passos}
                    emptyLabel="Nenhum passo ainda."
                    onReorder={(next) =>
                      setForm((prev) => ({
                        ...prev,
                        passos: next.map((passo, index) => ({ ...passo, ordem: index })),
                      }))
                    }
                    renderItem={(passo) => {
                      const cat = addonCategories.find((row) => row.id === passo.categoriaAdicionalId);
                      const totalInCat = addonItems.filter(
                        (item) =>
                          item.categoriaId === passo.categoriaAdicionalId && item.ativo !== false
                      ).length;
                      const selectedCount = (passo.itemIds || []).length;
                      return (
                        <div className="admin-addon-passo-summary">
                          <button
                            type="button"
                            className="admin-addon-passo-summary-main"
                            onClick={() => {
                              setEditingPassoId(passo.id);
                              setPassoModalOpen(true);
                            }}
                          >
                            <strong>{passo.titulo || cat?.nome || 'Passo sem título'}</strong>
                            <span>
                              {cat?.nome || 'Sem categoria'}
                              {' · '}
                              {passo.tipoSelecao === 'simples' ? 'Uma opção' : 'Várias opções'}
                              {' · '}
                              {selectedCount}/{totalInCat || selectedCount} itens
                            </span>
                          </button>
                          <button
                            type="button"
                            className="admin-addon-passo-summary-remove"
                            aria-label="Remover passo"
                            onClick={() => setRemovingPassoId(passo.id)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    }}
                  />

                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-addon-passo-add"
                    onClick={addPasso}
                  >
                    Adicionar passo
                  </button>
                </section>
              </div>
              </div>
            </div>
            </div>
            <div className="popup-footer admin-product-popup-footer">
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-cancel" onClick={requestCloseItemModal}>
                Cancelar
              </button>
              <button type="submit" form="admin-marmita-item-form" className="admin-btn admin-btn-primary">
                Salvar marmita
              </button>
            </div>
          </div>
        </div>
        <AdminDiscardDialog
          open={itemDiscardOpen}
          onConfirm={confirmDiscardItemModal}
          onCancel={cancelDiscardItemModal}
        />
        </>
          ,
            getAdminPortalRoot()
          )
        : null}

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

      <MarmitaGrupoEditorModal
        draft={grupoModal}
        onChange={setGrupoModal}
        onSave={saveGrupoModal}
        onCancel={() => setGrupoModal(null)}
        title={grupoModal?.isNew ? 'Novo grupo' : 'Editar grupo'}
        subtitle={
          grupoModal?.isNew
            ? 'Defina nome, ícone e exibição no cardápio. Sugestão rápida por dia da semana abaixo.'
            : 'Altere nome, ícone, regras e exibição deste grupo no cardápio.'
        }
        weekdayOptions={grupoModal?.isNew ? MARMITA_WEEKDAYS : null}
      />

      <AdminDiscardDialog
        open={cardapioDiscardOpen}
        onConfirm={confirmDiscardCardapioModal}
        onCancel={cancelDiscardCardapioModal}
      />

      <ProductAddonPassoModal
        open={passoModalOpen}
        passo={editingPasso}
        categories={addonCategories}
        items={addonItems}
        showExibirFotos={false}
        onClose={() => {
          setPassoModalOpen(false);
          setEditingPassoId('');
        }}
        onSave={(passo) => {
          setForm((prev) => {
            const current = prev.passos || [];
            const exists = current.some((row) => row.id === passo.id);
            const next = exists
              ? current.map((row) =>
                  row.id === passo.id ? toMarmitaPasso(passo, row.ordem) : row
                )
              : [...current, toMarmitaPasso(passo, current.length)];
            return {
              ...prev,
              passos: next.map((row, ordem) => ({ ...row, ordem })),
            };
          });
          setPassoModalOpen(false);
          setEditingPassoId('');
        }}
      />

      <AdminConfirmDialog
        open={Boolean(removingPassoId)}
        title="Remover passo?"
        message="Esse passo de montagem será removido desta marmita."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setRemovingPassoId('')}
        onConfirm={() => {
          removePassoById(removingPassoId);
          setRemovingPassoId('');
        }}
      />
    </div>
  );
}
