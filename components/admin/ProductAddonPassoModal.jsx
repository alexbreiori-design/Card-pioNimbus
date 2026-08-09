'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { normalizeAddonPasso } from '@/lib/productAddonPassos';

function emptyDraft() {
  return normalizeAddonPasso({
    titulo: '',
    categoriaAdicionalId: '',
    itemIds: [],
    tipoSelecao: 'multipla',
    min: 0,
    max: 99,
    obrigatorio: false,
    exibirFotos: true,
  });
}

/** Zoom 0 ≈ 20/linha; 100 ≈ 5/linha. */
const ZOOM_DEFAULT = 38;
const TILE_MIN_PX = 48;
const TILE_MAX_PX = 200;
const TILE_HIDE_NAME_PX = 70;

function tileSizeFromZoom(zoom) {
  const t = Math.min(100, Math.max(0, Number(zoom) || 0)) / 100;
  return Math.round(TILE_MIN_PX + (TILE_MAX_PX - TILE_MIN_PX) * t);
}

function PassoForm({ initialPasso, categories, items, onClose, onSave, showExibirFotos = true }) {
  const [draft, setDraft] = useState(() =>
    initialPasso ? normalizeAddonPasso(initialPasso) : emptyDraft()
  );
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [viewMode, setViewMode] = useState('grid');

  const tileSize = tileSizeFromZoom(zoom);
  const hideNames = tileSize < TILE_HIDE_NAME_PX;
  const isList = viewMode === 'list';

  const categoryItems = useMemo(() => {
    if (!draft.categoriaAdicionalId) return [];
    return items.filter(
      (item) => item.categoriaId === draft.categoriaAdicionalId && item.ativo !== false
    );
  }, [draft.categoriaAdicionalId, items]);

  const selectedCount = draft.itemIds.filter((id) =>
    categoryItems.some((item) => item.id === id)
  ).length;

  function setField(patch) {
    setDraft((prev) => normalizeAddonPasso({ ...prev, ...patch }));
  }

  function handleCategoryChange(categoriaAdicionalId) {
    const cat = categories.find((row) => row.id === categoriaAdicionalId);
    const nextItems = items.filter(
      (item) => item.categoriaId === categoriaAdicionalId && item.ativo !== false
    );
    setField({
      categoriaAdicionalId,
      itemIds: nextItems.map((item) => item.id),
      titulo: draft.titulo.trim() || cat?.nome || '',
      tipoSelecao: cat?.tipoSelecao === 'simples' ? 'simples' : draft.tipoSelecao,
    });
  }

  function toggleItem(itemId) {
    setDraft((prev) => {
      const has = prev.itemIds.includes(itemId);
      const itemIds = has
        ? prev.itemIds.filter((id) => id !== itemId)
        : [...prev.itemIds, itemId];
      return normalizeAddonPasso({ ...prev, itemIds });
    });
  }

  function selectAll() {
    setField({ itemIds: categoryItems.map((item) => item.id) });
  }

  function deselectAll() {
    setField({ itemIds: [] });
  }

  function handleSave() {
    const titulo = draft.titulo.trim();
    if (!titulo) {
      setError('Informe o nome da pergunta que aparece no cardápio.');
      return;
    }
    if (!draft.categoriaAdicionalId) {
      setError('Selecione uma categoria de adicionais.');
      return;
    }
    if (!selectedCount) {
      setError('Selecione ao menos um item da categoria.');
      return;
    }

    let max =
      draft.tipoSelecao === 'simples'
        ? 1
        : Math.max(1, Math.min(selectedCount, Number(draft.max || selectedCount)));
    let min =
      draft.tipoSelecao === 'simples'
        ? draft.obrigatorio
          ? 1
          : 0
        : Math.max(0, Number(draft.min || 0));

    if (draft.tipoSelecao === 'multipla') {
      if (min > max) {
        setError('O mínimo não pode ser maior que o máximo.');
        return;
      }
      if (min > selectedCount) {
        setError('O mínimo não pode ser maior que a quantidade de itens selecionados.');
        return;
      }
      if (max > selectedCount) max = selectedCount;
      if (draft.obrigatorio && min < 1) min = 1;
    }

    onSave?.(
      normalizeAddonPasso({
        ...draft,
        titulo,
        min,
        max,
        itemIds: draft.itemIds.filter((id) => categoryItems.some((item) => item.id === id)),
      })
    );
  }

  return (
    <>
      <div className="admin-order-aux-modal-body">
        {error ? <div className="admin-error">{error}</div> : null}

        <div className="admin-addon-passo-top-row">
          <div className="admin-form-group admin-addon-passo-field-title">
            <label className="admin-label">Pergunta no cardápio</label>
            <input
              className="admin-input"
              value={draft.titulo}
              onChange={(event) => setField({ titulo: event.target.value })}
              placeholder="Ex: Escolha as proteínas"
            />
          </div>
          <div className="admin-form-group admin-addon-passo-field-cat">
            <label className="admin-label">Categoria</label>
            <select
              className="admin-input"
              value={draft.categoriaAdicionalId}
              onChange={(event) => handleCategoryChange(event.target.value)}
            >
              <option value="">Selecione</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-group admin-addon-passo-field-tipo">
            <label className="admin-label">Seleção</label>
            <select
              className="admin-input"
              value={draft.tipoSelecao}
              onChange={(event) => {
                const tipoSelecao = event.target.value === 'simples' ? 'simples' : 'multipla';
                setField({
                  tipoSelecao,
                  max: tipoSelecao === 'simples' ? 1 : Math.max(2, selectedCount || 2),
                  min: tipoSelecao === 'simples' ? (draft.obrigatorio ? 1 : 0) : Math.max(0, Number(draft.min || 0)),
                });
              }}
            >
              <option value="simples">Uma opção</option>
              <option value="multipla">Várias opções</option>
            </select>
          </div>
          {draft.tipoSelecao === 'multipla' ? (
            <>
              <div className="admin-form-group admin-addon-passo-field-limit">
                <label className="admin-label">Mínimo</label>
                <input
                  type="number"
                  className="admin-input"
                  min={draft.obrigatorio ? 1 : 0}
                  max={Math.max(1, selectedCount || 1)}
                  value={Number(draft.min || 0)}
                  onChange={(event) =>
                    setField({
                      min: Math.max(draft.obrigatorio ? 1 : 0, Number(event.target.value || 0)),
                    })
                  }
                />
              </div>
              <div className="admin-form-group admin-addon-passo-field-limit">
                <label className="admin-label">Máximo</label>
                <input
                  type="number"
                  className="admin-input"
                  min={Math.max(1, Number(draft.min || 0) || 1)}
                  max={Math.max(1, selectedCount || 99)}
                  value={Number(draft.max || 1)}
                  onChange={(event) =>
                    setField({
                      max: Math.max(1, Number(event.target.value || 1)),
                    })
                  }
                />
              </div>
            </>
          ) : null}
          <div className="admin-form-group admin-addon-passo-field-required">
            <label className="admin-label">Obrigatório</label>
            <button
              type="button"
              className={`admin-addon-passo-required-toggle${draft.obrigatorio ? ' is-on' : ''}`}
              onClick={() =>
                setField({
                  obrigatorio: !draft.obrigatorio,
                  min: !draft.obrigatorio
                    ? Math.max(1, Number(draft.min || 1))
                    : draft.tipoSelecao === 'simples'
                      ? 0
                      : Math.max(0, Number(draft.min || 0)),
                })
              }
              aria-pressed={draft.obrigatorio === true}
            >
              {draft.obrigatorio ? 'Sim' : 'Não'}
            </button>
          </div>
        </div>

        {draft.categoriaAdicionalId ? (
          <div className="admin-addon-passo-items">
            <div className="admin-addon-passo-items-head">
              <span>
                Itens da categoria ({selectedCount}/{categoryItems.length})
              </span>
              <div className="admin-addon-passo-items-head-right">
                <div className="admin-addon-passo-bulk">
                  <button type="button" className="admin-link-btn" onClick={selectAll}>
                    Marcar todos
                  </button>
                  <button type="button" className="admin-link-btn" onClick={deselectAll}>
                    Desmarcar todos
                  </button>
                </div>
                <div className="admin-picker-view-toggle" role="group" aria-label="Visualização">
                  <button
                    type="button"
                    className={`admin-picker-view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
                    aria-label="Visualização em grade"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                  >
                    <AdminIcon name="category" className="admin-picker-view-icon" />
                  </button>
                  <button
                    type="button"
                    className={`admin-picker-view-btn${viewMode === 'list' ? ' is-active' : ''}`}
                    aria-label="Visualização em lista"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                  >
                    <AdminIcon name="layoutList" className="admin-picker-view-icon" />
                  </button>
                </div>
              </div>
            </div>
            {categoryItems.length ? (
              isList ? (
                <div className="admin-combo-picker-list admin-addon-passo-item-list">
                  {categoryItems.map((item) => {
                    const checked = draft.itemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`admin-combo-picker-list-row${checked ? ' is-selected' : ''}`}
                        onClick={() => toggleItem(item.id)}
                        aria-pressed={checked}
                      >
                        <span className={`admin-picker-check${checked ? ' checked' : ''}`}>
                          {checked ? '✓' : ''}
                        </span>
                        <div className="admin-combo-picker-list-media">
                          {item.imagemUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imagemUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <ImagePlaceholder size={28} />
                          )}
                        </div>
                        <div className="admin-combo-picker-list-main">
                          <strong>{item.nome}</strong>
                          {item.descricao ? <p>{item.descricao}</p> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className={`admin-addon-passo-item-grid${hideNames ? ' is-compact' : ''}`}
                  style={{
                    '--addon-passo-tile': `${tileSize}px`,
                  }}
                >
                  {categoryItems.map((item) => {
                    const checked = draft.itemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`admin-addon-passo-card${checked ? ' is-selected' : ''}`}
                        onClick={() => toggleItem(item.id)}
                        aria-pressed={checked}
                        title={item.nome}
                      >
                        <div className="admin-addon-passo-card-media">
                          {item.imagemUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imagemUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <ImagePlaceholder size={Math.max(28, Math.round(tileSize * 0.55))} />
                          )}
                        </div>
                        {!hideNames ? (
                          <div className="admin-addon-passo-card-body">
                            <span className="admin-addon-passo-card-name">{item.nome}</span>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <p className="admin-help-text">Nenhum item ativo nesta categoria.</p>
            )}
          </div>
        ) : (
          <p className="admin-help-text">Selecione uma categoria para listar os itens.</p>
        )}
      </div>

      <div className="admin-order-aux-modal-footer admin-addon-passo-footer">
        <div className="admin-addon-passo-footer-left">
          {!isList ? (
            <div className="admin-addon-passo-zoom" role="group" aria-labelledby="addon-passo-zoom-label">
              <span className="admin-addon-passo-zoom-label" id="addon-passo-zoom-label">
                Zoom
              </span>
              <div className="admin-addon-passo-zoom-control">
                <button
                  type="button"
                  className="admin-addon-passo-zoom-btn"
                  aria-label="Diminuir zoom"
                  disabled={zoom <= 0}
                  onClick={() => setZoom((value) => Math.max(0, value - 8))}
                >
                  −
                </button>
                <input
                  type="range"
                  className="admin-addon-passo-zoom-slider"
                  min={0}
                  max={100}
                  step={1}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  aria-labelledby="addon-passo-zoom-label"
                />
                <button
                  type="button"
                  className="admin-addon-passo-zoom-btn"
                  aria-label="Aumentar zoom"
                  disabled={zoom >= 100}
                  onClick={() => setZoom((value) => Math.min(100, value + 8))}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
          {showExibirFotos ? (
            <button
              type="button"
              className={`admin-addon-passo-photos-toggle${draft.exibirFotos ? ' is-on' : ''}`}
              onClick={() => setField({ exibirFotos: !draft.exibirFotos })}
              aria-pressed={draft.exibirFotos === true}
            >
              {draft.exibirFotos ? (
                <>
                  <span>Exibindo fotos</span>
                  <span>no cardápio</span>
                </>
              ) : (
                <>
                  <span>Não exibindo fotos</span>
                  <span>no cardápio</span>
                </>
              )}
            </button>
          ) : null}
        </div>
        <div className="admin-addon-passo-footer-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave}>
            Salvar passo
          </button>
        </div>
      </div>
    </>
  );
}

export default function ProductAddonPassoModal({
  open,
  passo,
  categories = [],
  items = [],
  onClose,
  onSave,
  showExibirFotos = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      event.preventDefault();
      onClose?.();
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="admin-confirm-overlay admin-order-aux-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="admin-confirm-modal admin-order-aux-modal admin-addon-passo-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="addon-passo-modal-title"
      >
        <div className="admin-order-aux-modal-head">
          <h3 id="addon-passo-modal-title">{passo ? 'Editar passo' : 'Novo passo'}</h3>
          <button type="button" className="admin-order-aux-close" onClick={onClose} aria-label="Fechar">
            <AdminIcon name="close" />
          </button>
        </div>

        <PassoForm
          key={passo?.id || 'new-passo'}
          initialPasso={passo}
          categories={categories}
          items={items}
          onClose={onClose}
          onSave={onSave}
          showExibirFotos={showExibirFotos}
        />
      </div>
    </div>
  );
}
