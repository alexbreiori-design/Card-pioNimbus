'use client';

import { useEffect, useMemo, useState } from 'react';
import CategoryLayoutPicker from '@/components/admin/CategoryLayoutPicker';
import { CATEGORY_LAYOUT_DEFAULT } from '@/lib/cardapio/categoryLayouts';

/**
 * Modal para criar/editar faixa de exibição.
 * Em modo create: lista categorias com check do padrão do admin + nome + layout.
 */
export default function AdminFaixaModal({
  open,
  title = 'Como o cliente vê',
  mode = 'create',
  initialNome = '',
  initialLayout = CATEGORY_LAYOUT_DEFAULT,
  initialMemberIds = [],
  categories = [],
  getCategoryId = (cat) => cat.id,
  getCategoryLabel = (cat) => cat.nome || cat.nomePublico || 'Sem nome',
  confirmLabel = 'Exibir juntas',
  onClose,
  onConfirm,
}) {
  const [nome, setNome] = useState(initialNome);
  const [layout, setLayout] = useState(initialLayout);
  const [selectedIds, setSelectedIds] = useState(initialMemberIds);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setNome(initialNome);
    setLayout(initialLayout || CATEGORY_LAYOUT_DEFAULT);
    setSelectedIds(initialMemberIds || []);
    setSearch('');
    setError('');
  }, [open, initialNome, initialLayout, initialMemberIds]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) =>
      String(getCategoryLabel(cat) || '')
        .toLowerCase()
        .includes(q)
    );
  }, [categories, search, getCategoryLabel]);

  const selectedLabels = useMemo(
    () =>
      selectedIds
        .map((id) => categories.find((cat) => getCategoryId(cat) === id))
        .filter(Boolean)
        .map((cat) => getCategoryLabel(cat)),
    [selectedIds, categories, getCategoryId, getCategoryLabel]
  );

  if (!open) return null;

  function toggleId(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );
  }

  function handleConfirm() {
    const trimmed = String(nome || '').trim();
    if (!trimmed) {
      setError('Informe o nome da seção no cardápio.');
      return;
    }
    if (selectedIds.length < 2) {
      setError('Selecione ao menos duas categorias para agrupar.');
      return;
    }
    onConfirm?.({
      nome: trimmed,
      layout,
      membroIds: selectedIds,
      mode,
    });
  }

  return (
    <div className="admin-confirm-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-confirm-modal admin-faixa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-faixa-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="admin-faixa-modal-title">{title}</h3>
        <p className="admin-faixa-modal-hint">
          As categorias continuam separadas no admin. No cardápio elas aparecem numa seção só.
        </p>

        {error ? <div className="admin-error">{error}</div> : null}

        <div className="admin-form-group">
          <label className="admin-label" htmlFor="admin-faixa-nome">
            Nome da seção no cardápio
          </label>
          <input
            id="admin-faixa-nome"
            className="admin-input"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex: Pizzas"
            autoFocus
          />
        </div>

        <CategoryLayoutPicker value={layout} onChange={setLayout} />

        <div className="admin-faixa-pick">
          <div className="admin-faixa-pick-head">
            <span className="admin-label">Categorias na seção ({selectedIds.length})</span>
            {categories.length > 6 ? (
              <input
                className="admin-input admin-faixa-pick-search"
                placeholder="Pesquisar categoria..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            ) : null}
          </div>
          <div className="admin-faixa-pick-list">
            {filteredCategories.length ? (
              filteredCategories.map((cat) => {
                const id = getCategoryId(cat);
                const checked = selectedIds.includes(id);
                return (
                  <label key={id} className={`admin-pizza-check admin-faixa-pick-row${checked ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(id)}
                    />
                    <span className="admin-pizza-check-box" aria-hidden="true" />
                    <span className="admin-pizza-check-label">{getCategoryLabel(cat)}</span>
                  </label>
                );
              })
            ) : (
              <p className="admin-help-text">Nenhuma categoria encontrada.</p>
            )}
          </div>
          {selectedLabels.length >= 2 ? (
            <p className="admin-help-text admin-faixa-modal-members">
              Juntando: {selectedLabels.join(' · ')}
            </p>
          ) : null}
        </div>

        <div className="admin-confirm-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
