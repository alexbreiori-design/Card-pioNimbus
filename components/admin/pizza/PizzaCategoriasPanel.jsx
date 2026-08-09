'use client';

import { useMemo, useState } from 'react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminIcon from '@/components/admin/AdminIcon';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import ProductAddonPassoModal from '@/components/admin/ProductAddonPassoModal';
import { DraggableReorderList } from '@/components/lightswind/draggable-reorder-list';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { isJsonDirty } from '@/lib/admin/isFormDirty';
import { computeCategoriaFromPrice } from '@/lib/pizza/pizzaPricing';
import {
  emptyPizzaCategoria,
  getActivePizzaSabores,
  getActivePizzaTamanhos,
  normalizePizzaCardapio,
  normalizePizzaCategoria,
} from '@/lib/pizza/pizzaModel';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import {
  normalizeAddonPassos,
  resolveProductAddonPassos,
  syncAddonPassosToSelection,
} from '@/lib/productAddonPassos';
import { normalizePecaTambemIds } from '@/lib/productSuggestions';
import CategoryLayoutPicker from '@/components/admin/CategoryLayoutPicker';
import { CATEGORY_LAYOUT_DEFAULT } from '@/lib/cardapio/categoryLayouts';
import { uploadMenuAssetIfNeeded } from '@/lib/upload/menuAsset';
import {
  PizzaCheckPill,
  PizzaEditorShell,
  PizzaPhotoField,
  Switch,
  compressImageFile,
  formatCurrency,
  savePizzaCardapio,
  sortByOrdem,
} from './pizzaAdminShared';
import PizzaPecaTambemPickerModal from './PizzaPecaTambemPickerModal';
import PizzaSaboresPickerModal from './PizzaSaboresPickerModal';

export default function PizzaCategoriasPanel() {
  const { data, saveData, activeSlug } = useAdminData();
  const cardapio = useMemo(
    () => normalizePizzaCardapio(resolvePizzaCardapioFromStore(data)),
    [data]
  );
  const categorias = cardapio.categorias;
  const saboresAtivos = useMemo(() => getActivePizzaSabores(cardapio), [cardapio]);
  const tamanhosAtivos = useMemo(() => getActivePizzaTamanhos(cardapio), [cardapio]);

  const addonCategories = useMemo(
    () => (data.adicionaisCategorias || []).filter((cat) => cat.ativo !== false),
    [data.adicionaisCategorias]
  );
  const addonItems = useMemo(() => data.adicionaisItens || [], [data.adicionaisItens]);
  const productCandidates = useMemo(
    () =>
      (data.produtos || []).filter(
        (item) =>
          item.ativo !== false &&
          item.tipo !== 'pizza' &&
          item.tipo !== 'tamanho_pizza' &&
          !item.tags?.includes('pizza')
      ),
    [data.produtos]
  );

  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [saborPickerOpen, setSaborPickerOpen] = useState(false);
  const [pecaPickerOpen, setPecaPickerOpen] = useState(false);
  const [addonPassoModalOpen, setAddonPassoModalOpen] = useState(false);
  const [editingAddonPassoId, setEditingAddonPassoId] = useState('');
  const [removingAddonPassoId, setRemovingAddonPassoId] = useState('');
  const [draftBaseline, setDraftBaseline] = useState(null);
  const toast = useAdminToast();

  const addonPassos = useMemo(
    () => normalizeAddonPassos(draft?.adicionaisPassos),
    [draft?.adicionaisPassos]
  );
  const editingAddonPasso = useMemo(
    () => addonPassos.find((passo) => passo.id === editingAddonPassoId) || null,
    [addonPassos, editingAddonPassoId]
  );

  function hydrateCategoriaDraft(item) {
    const normalized = normalizePizzaCategoria(item);
    const hadStoredPassos =
      Array.isArray(item?.adicionaisPassos) && item.adicionaisPassos.length > 0;
    let adicionaisPassos = resolveProductAddonPassos(normalized, {
      categories: addonCategories,
      items: addonItems,
    });
    if (!hadStoredPassos && normalized.exibirFotosAdicionais === false) {
      adicionaisPassos = adicionaisPassos.map((passo) => ({ ...passo, exibirFotos: false }));
    }
    return { ...normalized, adicionaisPassos };
  }

  function persist(nextCardapio, successMsg) {
    const normalized = normalizePizzaCardapio(nextCardapio);
    savePizzaCardapio(saveData, () => normalized)
      .then(() => {
        if (successMsg) toast.success(successMsg);
      })
      .catch(() => toast.error('Não foi possível salvar.'));
  }

  function toggleCategoriaAtivo(id, checked) {
    persist(
      {
        ...cardapio,
        categorias: cardapio.categorias.map((item) => (item.id === id ? { ...item, ativo: checked } : item)),
      },
      'Disponibilidade atualizada.'
    );
  }

  function removeCategoria(id) {
    if (editingId === id) {
      setEditingId('');
      setDraft(null);
    }
    persist(
      { ...cardapio, categorias: cardapio.categorias.filter((item) => item.id !== id) },
      'Categoria removida.'
    );
  }

  function openNewCategoria() {
    const item = emptyPizzaCategoria();
    item.ordem = categorias.length;
    item.saborIds = saboresAtivos.map((sabor) => sabor.id);
    item.tamanhoIds = tamanhosAtivos.map((tam) => tam.id);
    const normalized = hydrateCategoriaDraft(item);
    setDraft(normalized);
    setDraftBaseline(normalized);
    setEditingId(item.id);
  }

  function openEditCategoria(item) {
    const normalized = hydrateCategoriaDraft(item);
    setDraft(normalized);
    setDraftBaseline(normalized);
    setEditingId(item.id);
  }

  function cancelEdit() {
    setEditingId('');
    setDraft(null);
    setDraftBaseline(null);
    setSaborPickerOpen(false);
    setPecaPickerOpen(false);
    setAddonPassoModalOpen(false);
    setEditingAddonPassoId('');
    setRemovingAddonPassoId('');
  }

  async function handleCategoriaImage(file) {
    if (!file || !draft) return;
    try {
      const compressed = await compressImageFile(file);
      const url = await uploadMenuAssetIfNeeded(activeSlug, compressed, { folder: 'pizza-categorias' });
      setDraft((prev) => ({ ...prev, imagemUrl: url || compressed }));
    } catch {
      toast.error('Falha ao enviar imagem.');
    }
  }

  function toggleTamanhoId(tamanhoId) {
    setDraft((prev) => {
      if (!prev) return prev;
      const has = prev.tamanhoIds.includes(tamanhoId);
      return {
        ...prev,
        tamanhoIds: has ? prev.tamanhoIds.filter((id) => id !== tamanhoId) : [...prev.tamanhoIds, tamanhoId],
      };
    });
  }

  function saveCategoria() {
    if (!draft) return;
    const nomePublico = String(draft.nomePublico || '').trim();
    if (!nomePublico) {
      toast.error('Informe o nome público da categoria.');
      return;
    }
    if (!draft.saborIds.length) {
      toast.error('Selecione ao menos um sabor.');
      return;
    }
    if (!draft.tamanhoIds.length) {
      toast.error('Selecione ao menos um tamanho.');
      return;
    }

    const syncedAddons = syncAddonPassosToSelection(draft.adicionaisPassos, {
      items: addonItems,
    });
    for (const passo of syncedAddons.adicionaisPassos) {
      if (!passo.titulo?.trim()) {
        toast.error('Todo passo de adicionais precisa de uma pergunta.');
        return;
      }
      if (!passo.categoriaAdicionalId) {
        toast.error('Todo passo de adicionais precisa de uma categoria.');
        return;
      }
      if (!passo.itemIds?.length) {
        toast.error('Todo passo de adicionais precisa de ao menos um item.');
        return;
      }
      if (passo.tipoSelecao === 'multipla' && Number(passo.min || 0) > Number(passo.max || 0)) {
        toast.error('Em um passo, o mínimo não pode ser maior que o máximo.');
        return;
      }
      if (
        passo.tipoSelecao === 'multipla' &&
        Number(passo.min || 0) > Number(passo.itemIds.length || 0)
      ) {
        toast.error('Em um passo, o mínimo não pode ser maior que a quantidade de itens.');
        return;
      }
    }

    const normalized = normalizePizzaCategoria({
      ...draft,
      ...syncedAddons,
    });
    const list = [...categorias];
    const index = list.findIndex((item) => item.id === normalized.id);
    if (index >= 0) list[index] = { ...list[index], ...normalized };
    else list.push({ ...normalized, ordem: list.length });

    persist({ ...cardapio, categorias: sortByOrdem(list) }, 'Categoria salva.');
    setEditingId('');
    setDraft(null);
    setDraftBaseline(null);
  }

  const visibleCategorias = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortByOrdem(categorias).filter((cat) => {
      const matchesSearch =
        !q ||
        cat.nomePublico.toLowerCase().includes(q) ||
        String(cat.descricao || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativos' && cat.ativo !== false) ||
        (statusFilter === 'inativos' && cat.ativo === false);
      return matchesSearch && matchesStatus;
    });
  }, [categorias, search, statusFilter]);

  const isDraftDirty = useMemo(() => {
    if (!draft || !draftBaseline) return false;
    return isJsonDirty(normalizePizzaCategoria(draft), draftBaseline);
  }, [draft, draftBaseline]);

  const pecaTambemSelected = useMemo(() => {
    if (!draft) return [];
    return normalizePecaTambemIds(draft.pecaTambemIds)
      .map((id) => productCandidates.find((item) => item.id === id))
      .filter(Boolean);
  }, [draft, productCandidates]);

  return (
    <div className="admin-pizza-categorias-panel">
      <div className="admin-pedidos-search-row admin-pizza-search-row">
        <div className="admin-pedidos-search-wrap">
          <AdminIcon name="search" />
          <input
            className="admin-input admin-pedidos-search"
            placeholder="Pesquisar categorias por nome ou descrição..."
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
          <button type="button" className="admin-btn admin-btn-ghost" onClick={openNewCategoria}>
            <AdminIcon name="plus" />
            Nova categoria
          </button>
        </div>
      </div>

      <div className="admin-card admin-catalog-card">
        <div className="admin-pizza-block-header">
          <div>
            <h3>Categorias no cardápio</h3>
            <p className="admin-help-text">
              Cada categoria aparece como um item no cardápio público. Segure os pontinhos para reordenar.
            </p>
          </div>
        </div>

        {visibleCategorias.length ? (
          <DraggableReorderList
            className="admin-pizza-draggable-list"
            items={visibleCategorias}
            onReorder={(nextVisible) => {
              const visibleIds = new Set(visibleCategorias.map((cat) => cat.id));
              let cursor = 0;
              const merged = sortByOrdem(categorias).map((cat) => {
                if (!visibleIds.has(cat.id)) return cat;
                const replacement = nextVisible[cursor];
                cursor += 1;
                return replacement || cat;
              });
              persist(
                {
                  ...cardapio,
                  categorias: merged.map((cat, ordem) => ({ ...cat, ordem })),
                },
                'Ordem atualizada.'
              );
            }}
            renderItem={(cat) => {
              const fromPrice = computeCategoriaFromPrice(cardapio, cat);
              return (
                <div className="admin-catalog-item-row admin-pizza-cat-row admin-grouped-sort-browse-item">
                  {cat.imagemUrl ? (
                    <img className="admin-catalog-item-img" src={cat.imagemUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <ImagePlaceholder size={112} />
                  )}
                  <div className="admin-catalog-item-main">
                    <div className="admin-item-title">{cat.nomePublico || 'Sem nome'}</div>
                    <div className="admin-item-desc">{cat.descricao || '—'}</div>
                    <div className="admin-catalog-item-tags">
                      <span>{cat.saborIds?.length || 0} sabores</span>
                      <span>{cat.tamanhoIds?.length || 0} tamanhos</span>
                      <span>
                        {cat.minSabores}–{cat.maxSabores} sabores
                      </span>
                    </div>
                    <div className="admin-order-price">
                      {fromPrice > 0 ? `A partir de ${formatCurrency(fromPrice)}` : 'Sem preço'}
                    </div>
                  </div>
                  <div className="admin-item-actions-col">
                    <div className="admin-availability-cell">
                      <span>Disponível</span>
                      <Switch
                        checked={cat.ativo !== false}
                        label={`Alterar disponibilidade de ${cat.nomePublico}`}
                        onChange={(checked) => toggleCategoriaAtivo(cat.id, checked)}
                      />
                    </div>
                    <button type="button" className="admin-link-btn" onClick={() => openEditCategoria(cat)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="admin-link-btn"
                      style={{ color: 'var(--admin-danger, #dc2626)' }}
                      onClick={() => removeCategoria(cat.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <div className="admin-empty-catalog">Nenhuma categoria cadastrada.</div>
        )}
      </div>

      {draft ? (
        <PizzaEditorShell
          title={categorias.some((item) => item.id === draft.id) ? 'Editar categoria' : 'Nova categoria'}
          subtitle="Defina como este grupo aparece no cardápio e quais opções entram na montagem."
          active={draft.ativo !== false}
          onActiveChange={(checked) => setDraft((prev) => ({ ...prev, ativo: checked }))}
          onClose={cancelEdit}
          isDirty={isDraftDirty}
          footer={({ requestClose }) => (
            <>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={requestClose}>
                Cancelar
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveCategoria}>
                Salvar categoria
              </button>
            </>
          )}
        >
          <div className="admin-pizza-editor-layout">
            <aside className="admin-pizza-editor-side">
              <PizzaPhotoField imageUrl={draft.imagemUrl} label="Foto do grupo" onFile={handleCategoriaImage} />
              <div className="admin-pizza-editor-tip">
                Essa foto aparece no cardápio como capa do grupo de pizzas.
              </div>
            </aside>

            <div className="admin-pizza-editor-main">
              <div className="admin-catalog-form-grid">
                <div className="admin-form-group">
                  <label className="admin-label">Nome no cardápio</label>
                  <input
                    className="admin-input"
                    value={draft.nomePublico}
                    onChange={(event) => setDraft((prev) => ({ ...prev, nomePublico: event.target.value }))}
                    placeholder="Ex.: Pizzas tradicionais"
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

              <CategoryLayoutPicker
                value={draft.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT}
                onChange={(exibicaoCardapio) =>
                  setDraft((prev) => ({ ...prev, exibicaoCardapio }))
                }
              />

              <div className="admin-pizza-editor-section">
                <div className="admin-pizza-sabores-select-row">
                  <strong>Selecionar sabores</strong>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    onClick={() => setSaborPickerOpen(true)}
                  >
                    Selecionar
                  </button>
                  <span className="admin-pizza-sabores-select-count">
                    {draft.saborIds.length} sabores selecionados
                  </span>
                </div>
                {!saboresAtivos.length ? (
                  <p className="admin-help-text">Cadastre sabores na sub-aba Sabores primeiro.</p>
                ) : null}
              </div>

              <div className="admin-pizza-editor-section">
                <div className="admin-pizza-section-heading">
                  <strong>Tamanhos permitidos</strong>
                  <span>Mostre somente os tamanhos que essa categoria vende.</span>
                </div>
                <div className="admin-pizza-option-grid compact">
                  {tamanhosAtivos.map((tam) => (
                    <PizzaCheckPill
                      key={tam.id}
                      checked={draft.tamanhoIds.includes(tam.id)}
                      onChange={() => toggleTamanhoId(tam.id)}
                    >
                      <strong>{tam.nome}</strong>
                      {tam.descricaoFatias ? <small>{tam.descricaoFatias}</small> : null}
                    </PizzaCheckPill>
                  ))}
                </div>
              </div>

              <div className="admin-pizza-editor-section">
                <div className="admin-pizza-section-heading">
                  <strong>Regras de montagem</strong>
                  <span>Controle quantidade de sabores e forma de cálculo.</span>
                </div>
                <div className="admin-catalog-form-grid">
                  <div className="admin-form-group">
                    <label className="admin-label">Mín. sabores</label>
                    <input
                      className="admin-input"
                      type="number"
                      min={1}
                      max={4}
                      value={draft.minSabores}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          minSabores: Number(event.target.value || 1),
                          maxSabores: Math.max(Number(event.target.value || 1), prev.maxSabores),
                        }))
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Máx. sabores</label>
                    <input
                      className="admin-input"
                      type="number"
                      min={1}
                      max={4}
                      value={draft.maxSabores}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          maxSabores: Math.max(prev.minSabores, Number(event.target.value || prev.minSabores)),
                        }))
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Regra de preço</label>
                    <select
                      className="admin-input"
                      value={draft.regraPreco}
                      onChange={(event) => setDraft((prev) => ({ ...prev, regraPreco: event.target.value }))}
                    >
                      <option value="mais_caro">Cobra o mais caro</option>
                      <option value="media">Média dos sabores</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Repetição</label>
                    <button
                      type="button"
                      className={`admin-pizza-toggle-card ${draft.permitirSaboresDuplicados ? 'is-active' : ''}`}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          permitirSaboresDuplicados: !prev.permitirSaboresDuplicados,
                        }))
                      }
                    >
                      <span className="admin-pizza-check-mark">&#10003;</span>
                      Permitir repetir sabor
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-pizza-editor-section">
                <div className="admin-product-addon-steps">
                  <div className="admin-product-config-copy">
                    <strong>Adicionais e complementos</strong>
                    <p>Cada passo vira uma pergunta no cardápio, como em Produtos.</p>
                  </div>

                  <DraggableReorderList
                    items={addonPassos}
                    emptyLabel="Nenhum passo ainda."
                    onReorder={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        adicionaisPassos: normalizeAddonPassos(
                          next.map((passo, index) => ({ ...passo, ordem: index }))
                        ),
                      }))
                    }
                    renderItem={(passo) => {
                      const cat = addonCategories.find(
                        (row) => row.id === passo.categoriaAdicionalId
                      );
                      const totalInCat = addonItems.filter(
                        (item) =>
                          item.categoriaId === passo.categoriaAdicionalId && item.ativo !== false
                      ).length;
                      const selectedCount = passo.itemIds.length;
                      return (
                        <div className="admin-addon-passo-summary">
                          <button
                            type="button"
                            className="admin-addon-passo-summary-main"
                            onClick={() => {
                              setEditingAddonPassoId(passo.id);
                              setAddonPassoModalOpen(true);
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
                            onClick={() => setRemovingAddonPassoId(passo.id)}
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
                    onClick={() => {
                      setEditingAddonPassoId('');
                      setAddonPassoModalOpen(true);
                    }}
                  >
                    Adicionar passo
                  </button>
                </div>
              </div>

              <div className="admin-pizza-editor-section">
                <div className="admin-pizza-sabores-select-row">
                  <div>
                    <strong>Peça também</strong>
                    <span className="admin-pizza-section-sub">
                      Produtos sugeridos depois da montagem da pizza.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    onClick={() => setPecaPickerOpen(true)}
                  >
                    Selecionar
                  </button>
                  <span className="admin-pizza-sabores-select-count">
                    {pecaTambemSelected.length} produto(s) selecionado(s)
                  </span>
                </div>
                {pecaTambemSelected.length ? (
                  <p className="admin-help-text">
                    Selecionados: {pecaTambemSelected.map((item) => item.nome).join(', ')}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </PizzaEditorShell>
      ) : null}

      {draft && saborPickerOpen ? (
        <PizzaSaboresPickerModal
          sabores={saboresAtivos}
          selectedIds={draft.saborIds}
          onChange={(next) => setDraft((prev) => ({ ...prev, saborIds: next }))}
          exibirFotos={draft.exibirFotosSabores !== false}
          onExibirFotosChange={(next) =>
            setDraft((prev) => ({ ...prev, exibirFotosSabores: next }))
          }
          onClose={() => setSaborPickerOpen(false)}
        />
      ) : null}
      {draft && pecaPickerOpen ? (
        <PizzaPecaTambemPickerModal
          products={productCandidates}
          categories={(data.categorias || []).filter((cat) => cat.ativo !== false)}
          selectedIds={normalizePecaTambemIds(draft.pecaTambemIds)}
          onChange={(next) => setDraft((prev) => ({ ...prev, pecaTambemIds: next }))}
          onClose={() => setPecaPickerOpen(false)}
        />
      ) : null}
      <ProductAddonPassoModal
        open={addonPassoModalOpen}
        passo={editingAddonPasso}
        categories={addonCategories}
        items={addonItems}
        onClose={() => {
          setAddonPassoModalOpen(false);
          setEditingAddonPassoId('');
        }}
        onSave={(passo) => {
          setDraft((prev) => {
            const current = normalizeAddonPassos(prev.adicionaisPassos);
            const exists = current.some((row) => row.id === passo.id);
            const next = exists
              ? current.map((row) => (row.id === passo.id ? { ...passo, ordem: row.ordem } : row))
              : [...current, { ...passo, ordem: current.length }];
            return { ...prev, adicionaisPassos: normalizeAddonPassos(next) };
          });
          setAddonPassoModalOpen(false);
          setEditingAddonPassoId('');
        }}
      />
      <AdminConfirmDialog
        open={Boolean(removingAddonPassoId)}
        title="Remover passo?"
        message="Esse passo de adicionais será removido desta categoria de pizza."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setRemovingAddonPassoId('')}
        onConfirm={() => {
          setDraft((prev) => ({
            ...prev,
            adicionaisPassos: normalizeAddonPassos(
              (prev.adicionaisPassos || []).filter((passo) => passo.id !== removingAddonPassoId)
            ),
          }));
          setRemovingAddonPassoId('');
        }}
      />
    </div>
  );
}
