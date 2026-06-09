'use client';

import { useMemo, useState } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import AdminSortableList from '@/components/admin/AdminSortableList';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { isJsonDirty } from '@/lib/admin/isFormDirty';
import { formatMoneyBrInput, hasMoneyBrValue } from '@/lib/moneyMask';
import { pizzaUid } from '@/lib/pizza/pizzaIds';
import {
  emptyPizzaSabor,
  getActivePizzaTamanhos,
  normalizePizzaCardapio,
  normalizePizzaSabor,
  normalizePizzaTamanho,
} from '@/lib/pizza/pizzaModel';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import { uploadMenuAssetIfNeeded } from '@/lib/upload/menuAsset';
import {
  PizzaCheckPill,
  PizzaEditorShell,
  PizzaPhotoField,
  Switch,
  compressImageFile,
  formatCurrency,
  parseMoney,
  savePizzaCardapio,
  sortByOrdem,
} from './pizzaAdminShared';

export default function PizzaSaboresPanel() {
  const { data, saveData, activeSlug } = useAdminData();
  const cardapio = useMemo(
    () => normalizePizzaCardapio(resolvePizzaCardapioFromStore(data)),
    [data]
  );
  const tamanhos = cardapio.tamanhos;
  const sabores = cardapio.sabores;

  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState(null);
  const [sizesDraft, setSizesDraft] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [ordering, setOrdering] = useState(false);
  const [draftBaseline, setDraftBaseline] = useState(null);
  const [sizesBaseline, setSizesBaseline] = useState(null);
  const toast = useAdminToast();

  const tamanhosAtivos = useMemo(() => getActivePizzaTamanhos(cardapio), [cardapio]);

  function persist(nextCardapio, successMsg) {
    const normalized = normalizePizzaCardapio(nextCardapio);
    savePizzaCardapio(saveData, () => normalized)
      .then(() => {
        if (successMsg) toast.success(successMsg);
      })
      .catch(() => toast.error('Não foi possível salvar.'));
  }

  function openSizesEditor() {
    const copy = tamanhos.map((item) => ({ ...item }));
    setSizesDraft(copy);
    setSizesBaseline(copy);
  }

  function updateSizesDraft(updater) {
    setSizesDraft((prev) => updater(prev || []));
  }

  function addTamanho() {
    updateSizesDraft((list) => [
      ...list,
      normalizePizzaTamanho({ id: pizzaUid('tam'), nome: '', descricaoFatias: '', ordem: list.length }),
    ]);
  }

  function removeTamanho(id) {
    updateSizesDraft((list) => list.filter((item) => item.id !== id));
  }

  function saveTamanhos() {
    const normalizedSizes = (sizesDraft || [])
      .map((item, index) => normalizePizzaTamanho({ ...item, ordem: index }, index))
      .filter((item) => String(item.nome || '').trim());
    if (!normalizedSizes.length) {
      toast.error('Cadastre ao menos um tamanho.');
      return;
    }
    const validSizeIds = new Set(normalizedSizes.map((item) => item.id));
    persist(
      {
        ...cardapio,
        tamanhos: normalizedSizes,
        sabores: cardapio.sabores.map((sabor) => ({
          ...sabor,
          tamanhoIds: (sabor.tamanhoIds || []).filter((id) => validSizeIds.has(id)),
          precos: Object.fromEntries(
            Object.entries(sabor.precos || {}).filter(([id]) => validSizeIds.has(id))
          ),
        })),
        categorias: cardapio.categorias.map((cat) => ({
          ...cat,
          tamanhoIds: (cat.tamanhoIds || []).filter((id) => validSizeIds.has(id)),
        })),
      },
      'Tamanhos atualizados.'
    );
    setSizesDraft(null);
    setSizesBaseline(null);
  }

  function toggleSaborAtivo(id, checked) {
    persist(
      {
        ...cardapio,
        sabores: cardapio.sabores.map((item) => (item.id === id ? { ...item, ativo: checked } : item)),
      },
      'Disponibilidade atualizada.'
    );
  }

  function removeSabor(id) {
    if (editingId === id) {
      setEditingId('');
      setDraft(null);
    }
    persist(
      {
        ...cardapio,
        sabores: cardapio.sabores.filter((item) => item.id !== id),
        categorias: cardapio.categorias.map((cat) => ({
          ...cat,
          saborIds: (cat.saborIds || []).filter((saborId) => saborId !== id),
        })),
      },
      'Sabor removido.'
    );
  }

  function openNewSabor() {
    const item = emptyPizzaSabor();
    item.ordem = sabores.length;
    item.tamanhoIds = tamanhosAtivos.map((tam) => tam.id);
    const normalized = normalizePizzaSabor(item);
    setDraft(normalized);
    setDraftBaseline(normalized);
    setEditingId(item.id);
  }

  function openEditSabor(item) {
    const normalized = normalizePizzaSabor(item);
    setDraft(normalized);
    setDraftBaseline(normalized);
    setEditingId(item.id);
  }

  function cancelEdit() {
    setEditingId('');
    setDraft(null);
    setDraftBaseline(null);
  }

  async function handleSaborImage(file) {
    if (!file || !draft) return;
    try {
      const compressed = await compressImageFile(file);
      const url = await uploadMenuAssetIfNeeded(activeSlug, compressed, { folder: 'pizza-sabores' });
      setDraft((prev) => ({ ...prev, imagemUrl: url || compressed }));
    } catch {
      toast.error('Falha ao enviar imagem.');
    }
  }

  function toggleDraftTamanho(tamanhoId) {
    setDraft((prev) => {
      if (!prev) return prev;
      const has = prev.tamanhoIds.includes(tamanhoId);
      const tamanhoIds = has
        ? prev.tamanhoIds.filter((id) => id !== tamanhoId)
        : [...prev.tamanhoIds, tamanhoId];
      const precos = { ...prev.precos };
      if (!has) precos[tamanhoId] = precos[tamanhoId] || '';
      return { ...prev, tamanhoIds, precos };
    });
  }

  function saveSabor() {
    if (!draft) return;
    const nome = String(draft.nome || '').trim();
    if (!nome) {
      toast.error('Informe o nome do sabor.');
      return;
    }
    const normalized = normalizePizzaSabor(draft, 0, tamanhos.map((tam) => tam.id));
    const hasPrice = normalized.tamanhoIds.some((tamId) => hasMoneyBrValue(normalized.precos?.[tamId]));
    if (!normalized.tamanhoIds.length || !hasPrice) {
      toast.error('Selecione ao menos um tamanho com preço.');
      return;
    }

    const list = [...sabores];
    const index = list.findIndex((item) => item.id === normalized.id);
    if (index >= 0) list[index] = { ...list[index], ...normalized };
    else list.push({ ...normalized, ordem: list.length });

    persist({ ...cardapio, sabores: sortByOrdem(list) }, 'Sabor salvo.');
    setEditingId('');
    setDraft(null);
  }

  function saborPriceSummary(sabor) {
    const parts = tamanhosAtivos
      .filter((tam) => sabor.tamanhoIds?.includes(tam.id))
      .map((tam) => {
        const label = tam.descricaoFatias ? `${tam.nome} (${tam.descricaoFatias})` : tam.nome;
        const price = parseMoney(sabor.precos?.[tam.id]);
        return `${label}: ${price > 0 ? formatCurrency(price) : '—'}`;
      });
    return parts.length ? parts.join(' · ') : 'Sem preços';
  }

  const sizeSummary = tamanhosAtivos.length
    ? tamanhosAtivos
        .map((tam) => (tam.descricaoFatias ? `${tam.nome} (${tam.descricaoFatias})` : tam.nome))
        .join(' · ')
    : 'Nenhum tamanho ativo';

  const orderedSabores = useMemo(() => sortByOrdem(sabores), [sabores]);
  const isDraftDirty = useMemo(() => {
    if (!draft || !draftBaseline) return false;
    return isJsonDirty(normalizePizzaSabor(draft), draftBaseline);
  }, [draft, draftBaseline]);
  const isSizesDirty = useMemo(() => {
    if (!sizesDraft || !sizesBaseline) return false;
    return isJsonDirty(sizesDraft, sizesBaseline);
  }, [sizesDraft, sizesBaseline]);

  const visibleSabores = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortByOrdem(sabores).filter((sabor) => {
      const matchesSearch =
        !q ||
        sabor.nome.toLowerCase().includes(q) ||
        String(sabor.descricao || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativos' && sabor.ativo !== false) ||
        (statusFilter === 'inativos' && sabor.ativo === false);
      return matchesSearch && matchesStatus;
    });
  }, [sabores, search, statusFilter]);

  return (
    <div className="admin-pizza-sabores-panel">
      <div className="admin-pedidos-search-row admin-pizza-search-row">
        <div className="admin-pedidos-search-wrap">
          <AdminIcon name="search" />
          <input
            className="admin-input admin-pedidos-search"
            placeholder="Pesquisar sabores por nome ou descrição..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="admin-catalog-top-row admin-pizza-list-toolbar">
        <div className="admin-catalog-cats">
          {[
            ['todos', 'Todos'],
            ['ativos', 'Disponíveis'],
            ['inativos', 'Indisponíveis'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-catalog-cat-pill ${statusFilter === id ? 'active' : ''}`}
              onClick={() => setStatusFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="admin-catalog-top-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={openNewSabor}>
            <AdminIcon name="plus" />
            Novo sabor
          </button>
          <button type="button" className="admin-catalog-order-btn" onClick={() => setOrdering((value) => !value)}>
            <AdminIcon name="sort" />
            {ordering ? 'Voltar' : 'Ordenar'}
          </button>
        </div>
      </div>

      <section className="admin-pizza-settings-card">
        <div>
          <span className="admin-pizza-eyebrow">Configuração da pizzaria</span>
          <h3>Tamanhos base</h3>
          <p>{sizeSummary}</p>
        </div>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={openSizesEditor}>
          Editar tamanhos
        </button>
      </section>

      {ordering ? (
        <div className="admin-card admin-sortable-panel">
          <p className="admin-help-text admin-sortable-panel-hint">Arraste os sabores para definir a ordem no cardápio.</p>
          {orderedSabores.length ? (
            <AdminSortableList
              items={orderedSabores}
              onReorder={(next) => persist({ ...cardapio, sabores: next }, 'Ordem atualizada.')}
              rowClassName="admin-sortable-row admin-catalog-item-row"
              renderItem={(sabor) => (
                <>
                  {sabor.imagemUrl ? (
                    <img className="admin-catalog-item-img" src={sabor.imagemUrl} alt="" />
                  ) : (
                    <ImagePlaceholder size={112} />
                  )}
                  <div className="admin-catalog-item-main">
                    <div className="admin-item-title">{sabor.nome || 'Sem nome'}</div>
                    <div className="admin-item-desc">{sabor.descricao || '—'}</div>
                  </div>
                </>
              )}
            />
          ) : (
            <div className="admin-empty-catalog">Nenhum sabor cadastrado.</div>
          )}
        </div>
      ) : (
        <div className="admin-card admin-catalog-card">
          <div className="admin-pizza-block-header">
            <div>
              <h3>Sabores</h3>
              <p className="admin-help-text">
                Cadastre cada sabor com foto, descrição e preço por tamanho. Depois vincule-os nas categorias.
              </p>
            </div>
          </div>

          {visibleSabores.length ? (
            visibleSabores.map((sabor) => (
              <div key={sabor.id} className="admin-catalog-item-row admin-pizza-sabor-row">
                {sabor.imagemUrl ? (
                  <img className="admin-catalog-item-img" src={sabor.imagemUrl} alt="" />
                ) : (
                  <ImagePlaceholder size={112} />
                )}
                <div className="admin-catalog-item-main">
                  <div className="admin-item-title">{sabor.nome || 'Sem nome'}</div>
                  <div className="admin-item-desc">{sabor.descricao || '—'}</div>
                  <div className="admin-pizza-sabor-prices">{saborPriceSummary(sabor)}</div>
                </div>
                <div className="admin-item-actions-col">
                  <div className="admin-availability-cell">
                    <span>Disponível</span>
                    <Switch
                      checked={sabor.ativo !== false}
                      label={`Alterar disponibilidade de ${sabor.nome}`}
                      onChange={(checked) => toggleSaborAtivo(sabor.id, checked)}
                    />
                  </div>
                  <button type="button" className="admin-link-btn" onClick={() => openEditSabor(sabor)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="admin-link-btn"
                    style={{ color: 'var(--admin-danger, #dc2626)' }}
                    onClick={() => removeSabor(sabor.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="admin-empty-catalog">Nenhum sabor cadastrado.</div>
          )}
        </div>
      )}

      {sizesDraft ? (
        <PizzaEditorShell
          title="Editar tamanhos"
          subtitle="Mantenha aqui apenas os tamanhos que a pizzaria realmente vende."
          onClose={() => {
            setSizesDraft(null);
            setSizesBaseline(null);
          }}
          isDirty={isSizesDirty}
          footer={({ requestClose }) => (
            <>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={requestClose}>
                Cancelar
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveTamanhos}>
                Salvar tamanhos
              </button>
            </>
          )}
        >
          <div className="admin-pizza-size-editor-list">
            {(sizesDraft || []).map((tam, index) => (
              <div key={tam.id} className="admin-pizza-size-editor-row">
                <div className="admin-form-group">
                  <label className="admin-label">Nome</label>
                  <input
                    className="admin-input"
                    value={tam.nome}
                    onChange={(event) =>
                      updateSizesDraft((list) =>
                        list.map((row, idx) => (idx === index ? { ...row, nome: event.target.value } : row))
                      )
                    }
                    placeholder="Ex.: Grande"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Fatias / medida</label>
                  <input
                    className="admin-input"
                    value={tam.descricaoFatias}
                    onChange={(event) =>
                      updateSizesDraft((list) =>
                        list.map((row, idx) =>
                          idx === index ? { ...row, descricaoFatias: event.target.value } : row
                        )
                      )
                    }
                    placeholder="Ex.: 8 fatias"
                  />
                </div>
                <div className="admin-pizza-size-row-actions">
                  <div className="admin-availability-cell">
                    <span>Ativo</span>
                    <Switch
                      checked={tam.ativo !== false}
                      label={`Tamanho ${tam.nome || index + 1}`}
                      onChange={(checked) =>
                        updateSizesDraft((list) =>
                          list.map((row, idx) => (idx === index ? { ...row, ativo: checked } : row))
                        )
                      }
                    />
                  </div>
                  <button type="button" className="admin-link-btn" onClick={() => removeTamanho(tam.id)}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={addTamanho}>
            + Adicionar tamanho
          </button>
        </PizzaEditorShell>
      ) : null}

      {draft ? (
        <PizzaEditorShell
          title={sabores.some((item) => item.id === draft.id) ? 'Editar sabor' : 'Novo sabor'}
          subtitle="Defina foto, descrição e preço por tamanho em um único lugar."
          active={draft.ativo !== false}
          onActiveChange={(checked) => setDraft((prev) => ({ ...prev, ativo: checked }))}
          onClose={cancelEdit}
          isDirty={isDraftDirty}
          footer={({ requestClose }) => (
            <>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={requestClose}>
                Cancelar
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveSabor}>
                Salvar sabor
              </button>
            </>
          )}
        >
          <div className="admin-pizza-editor-layout">
            <aside className="admin-pizza-editor-side">
              <PizzaPhotoField imageUrl={draft.imagemUrl} label="Foto do sabor" onFile={handleSaborImage} />
              <div className="admin-pizza-editor-tip">
                A imagem do sabor aparece na montagem da pizza quando disponível.
              </div>
            </aside>
            <div className="admin-pizza-editor-main">
              <div className="admin-catalog-form-grid">
                <div className="admin-form-group">
                  <label className="admin-label">Nome do sabor</label>
                  <input
                    className="admin-input"
                    value={draft.nome}
                    onChange={(event) => setDraft((prev) => ({ ...prev, nome: event.target.value }))}
                    placeholder="Ex.: Calabresa"
                  />
                </div>
                <div className="admin-form-group admin-form-full">
                  <label className="admin-label">Descrição</label>
                  <textarea
                    className="admin-input"
                    value={draft.descricao}
                    onChange={(event) => setDraft((prev) => ({ ...prev, descricao: event.target.value }))}
                    placeholder="Opcional"
                    rows={3}
                  />
                </div>
              </div>

              <div className="admin-pizza-editor-section">
                <div className="admin-pizza-section-heading">
                  <strong>Preços por tamanho</strong>
                  <span>Selecione os tamanhos disponíveis para este sabor e informe o preço final.</span>
                </div>
                <div className="admin-pizza-price-card-grid">
                  {tamanhosAtivos.map((tam) => {
                    const active = draft.tamanhoIds.includes(tam.id);
                    return (
                      <div key={tam.id} className={`admin-pizza-price-card ${active ? 'is-active' : ''}`}>
                        <PizzaCheckPill checked={active} onChange={() => toggleDraftTamanho(tam.id)}>
                          <strong>{tam.nome}</strong>
                          {tam.descricaoFatias ? <small>{tam.descricaoFatias}</small> : null}
                        </PizzaCheckPill>
                        <input
                          className="admin-input"
                          disabled={!active}
                          value={draft.precos?.[tam.id] || ''}
                          onChange={(event) =>
                            setDraft((prev) => ({
                              ...prev,
                              precos: { ...prev.precos, [tam.id]: formatMoneyBrInput(event.target.value) },
                            }))
                          }
                          placeholder="R$ 0,00"
                          inputMode="numeric"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </PizzaEditorShell>
      ) : null}
    </div>
  );
}
