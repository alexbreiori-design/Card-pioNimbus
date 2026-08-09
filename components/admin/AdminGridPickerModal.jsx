'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';

/** Zoom 0 ≈ tiles pequenos; 100 ≈ tiles grandes. */
const ZOOM_DEFAULT = 38;
const TILE_MIN_PX = 64;
const TILE_MAX_PX = 168;
const TILE_HIDE_META_PX = 78;

function tileSizeFromZoom(zoom) {
  const t = Math.min(100, Math.max(0, Number(zoom) || 0)) / 100;
  return Math.round(TILE_MIN_PX + (TILE_MAX_PX - TILE_MIN_PX) * t);
}

function formatPriceBr(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

/**
 * Picker em grid/lista (foto + zoom), opcionalmente com busca, chips de categoria e toggle de fotos.
 * Usado por combo, peça também, sabores e adicionais de pizza.
 */
export default function AdminGridPickerModal({
  open = true,
  title = 'Selecionar',
  subtitle = '',
  items = [],
  categories = [],
  selectedIds = [],
  onToggle,
  onSetSelectedIds,
  onClose,
  maxSelection = 0,
  showPrice = true,
  showCategoryChips = true,
  searchPlaceholder = 'Pesquisar...',
  emptyLabel = 'Nenhum item encontrado.',
  concludeLabel = 'Concluir',
  getItemId = (item) => item.id,
  getItemName = (item) => item.nome || item.name || '',
  getItemDesc = (item) => item.descricao || item.desc || '',
  getItemImage = (item) => item.imagemUrl || item.imageUrl || '',
  getItemPrice = (item) => item.preco ?? item.price ?? 0,
  getItemCategoryId = (item) => item.categoriaId || '',
  exibirFotos,
  onExibirFotosChange,
  showExibirFotos = false,
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [viewMode, setViewMode] = useState('grid');

  const tileSize = tileSizeFromZoom(zoom);
  const hideMeta = tileSize < TILE_HIDE_META_PX;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const atMax = maxSelection > 0 && selectedIds.length >= maxSelection;
  const isList = viewMode === 'list';

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const categoryId = getItemCategoryId(item);
      const matchesCategory =
        !showCategoryChips ||
        categoryFilter === 'todos' ||
        categoryId === categoryFilter ||
        (!categoryId && categoryFilter === 'sem-categoria');
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        String(getItemName(item)).toLowerCase().includes(q) ||
        String(getItemDesc(item)).toLowerCase().includes(q)
      );
    });
  }, [
    items,
    search,
    categoryFilter,
    showCategoryChips,
    getItemCategoryId,
    getItemName,
    getItemDesc,
  ]);

  const visibleIds = useMemo(
    () => filteredItems.map((item) => getItemId(item)),
    [filteredItems, getItemId]
  );

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

  useEffect(() => {
    if (!open) {
      setSearch('');
      setCategoryFilter('todos');
      setZoom(ZOOM_DEFAULT);
      setViewMode('grid');
    }
  }, [open]);

  function handleSelectAllVisible() {
    if (!onSetSelectedIds) return;
    const next = [...selectedIds];
    for (const id of visibleIds) {
      if (next.includes(id)) continue;
      if (maxSelection > 0 && next.length >= maxSelection) break;
      next.push(id);
    }
    onSetSelectedIds(next);
  }

  function handleDeselectAllVisible() {
    if (!onSetSelectedIds) return;
    const visible = new Set(visibleIds);
    onSetSelectedIds(selectedIds.filter((id) => !visible.has(id)));
  }

  if (!open) return null;

  return (
    <div className="admin-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="admin-picker-modal admin-combo-picker-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-picker-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="admin-picker-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="admin-combo-picker-toolbar">
          <input
            className="admin-input admin-combo-picker-search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="admin-combo-picker-chips-row">
          <div className="admin-picker-category-chips admin-combo-picker-chips">
            {showCategoryChips && categories.length ? (
              <>
                <button
                  type="button"
                  className={`admin-catalog-cat-pill ${categoryFilter === 'todos' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('todos')}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`admin-catalog-cat-pill ${categoryFilter === cat.id ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cat.id)}
                  >
                    {cat.nome}
                  </button>
                ))}
              </>
            ) : null}
          </div>
          <div className="admin-addon-passo-bulk">
            <button type="button" className="admin-link-btn" onClick={handleSelectAllVisible}>
              Marcar todos
            </button>
            <button type="button" className="admin-link-btn" onClick={handleDeselectAllVisible}>
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

        <div className="admin-combo-picker-content">
          {filteredItems.length ? (
            isList ? (
              <div className="admin-combo-picker-list">
                {filteredItems.map((item) => {
                  const id = getItemId(item);
                  const selected = selectedSet.has(id);
                  const disabled = !selected && atMax;
                  const name = getItemName(item);
                  const desc = getItemDesc(item);
                  const imageUrl = getItemImage(item);
                  const price = getItemPrice(item);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`admin-combo-picker-list-row${selected ? ' is-selected' : ''}${
                        disabled ? ' is-disabled' : ''
                      }`}
                      onClick={() => {
                        if (disabled) return;
                        onToggle?.(item);
                      }}
                      aria-pressed={selected}
                      disabled={disabled}
                    >
                      <span className={`admin-picker-check${selected ? ' checked' : ''}`}>
                        {selected ? '✓' : ''}
                      </span>
                      <div className="admin-combo-picker-list-media">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <ImagePlaceholder size={28} />
                        )}
                      </div>
                      <div className="admin-combo-picker-list-main">
                        <strong>{name}</strong>
                        {desc ? <p>{desc}</p> : null}
                      </div>
                      {showPrice ? (
                        <span className="admin-combo-picker-list-price">
                          R$ {formatPriceBr(price)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className={`admin-addon-passo-item-grid admin-combo-picker-grid${
                  hideMeta ? ' is-compact' : ''
                }`}
                style={{ '--addon-passo-tile': `${tileSize}px` }}
              >
                {filteredItems.map((item) => {
                  const id = getItemId(item);
                  const selected = selectedSet.has(id);
                  const disabled = !selected && atMax;
                  const name = getItemName(item);
                  const imageUrl = getItemImage(item);
                  const price = getItemPrice(item);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`admin-addon-passo-card${selected ? ' is-selected' : ''}${
                        disabled ? ' is-disabled' : ''
                      }`}
                      onClick={() => {
                        if (disabled) return;
                        onToggle?.(item);
                      }}
                      aria-pressed={selected}
                      disabled={disabled}
                      title={name}
                    >
                      <div className="admin-addon-passo-card-media">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <ImagePlaceholder size={Math.max(28, Math.round(tileSize * 0.55))} />
                        )}
                      </div>
                      {!hideMeta ? (
                        <div className="admin-addon-passo-card-body">
                          <span className="admin-addon-passo-card-name">{name}</span>
                          {showPrice ? (
                            <span className="admin-combo-picker-card-price">
                              R$ {formatPriceBr(price)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="admin-empty-catalog">{emptyLabel}</div>
          )}
        </div>

        <div className="admin-picker-footer admin-combo-picker-footer">
          <div className="admin-addon-passo-footer-left">
            {!isList ? (
              <div className="admin-addon-passo-zoom" role="group" aria-labelledby="grid-picker-zoom-label">
                <span className="admin-addon-passo-zoom-label" id="grid-picker-zoom-label">
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
                    aria-labelledby="grid-picker-zoom-label"
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
                className={`admin-addon-passo-photos-toggle${exibirFotos ? ' is-on' : ''}`}
                onClick={() => onExibirFotosChange?.(!exibirFotos)}
                aria-pressed={exibirFotos === true}
              >
                {exibirFotos ? (
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
          <span className="admin-picker-selection-count">
            {maxSelection > 0
              ? `${selectedIds.length} de ${maxSelection} selecionados`
              : `${selectedIds.length} selecionados`}
          </span>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
            {concludeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
