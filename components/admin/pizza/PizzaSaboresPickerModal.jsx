'use client';

import { useMemo, useState } from 'react';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';

export default function PizzaSaboresPickerModal({ sabores, selectedIds, onChange, onClose }) {
  const [search, setSearch] = useState('');

  const filteredSabores = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sabores.filter(
      (sabor) =>
        !q ||
        sabor.nome.toLowerCase().includes(q) ||
        String(sabor.descricao || '').toLowerCase().includes(q)
    );
  }, [sabores, search]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  function toggleSabor(saborId) {
    const has = selectedSet.has(saborId);
    onChange(has ? selectedIds.filter((id) => id !== saborId) : [...selectedIds, saborId]);
  }

  function markAllFiltered() {
    const next = new Set(selectedIds);
    filteredSabores.forEach((sabor) => next.add(sabor.id));
    onChange([...next]);
  }

  function unmarkAllFiltered() {
    const remove = new Set(filteredSabores.map((sabor) => sabor.id));
    onChange(selectedIds.filter((id) => !remove.has(id)));
  }

  return (
    <div className="admin-picker-modal admin-pizza-sabores-picker" onClick={(event) => event.stopPropagation()}>
      <div className="admin-picker-header">
        <div>
          <h3>Selecionar sabores</h3>
          <p>Marque os sabores que entram nesta categoria.</p>
        </div>
        <button type="button" className="admin-picker-close" onClick={onClose}>
          x
        </button>
      </div>

      <div className="admin-picker-search-row">
        <input
          className="admin-input"
          placeholder="Pesquisar sabor..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="admin-pizza-picker-bulk-row">
        <button type="button" className="admin-pizza-picker-bulk-check is-mark-all" onClick={markAllFiltered}>
          <span className="admin-pizza-picker-bulk-box" aria-hidden="true" />
          <span>Marcar todos</span>
        </button>
        <button type="button" className="admin-pizza-picker-bulk-check is-unmark-all" onClick={unmarkAllFiltered}>
          <span className="admin-pizza-picker-bulk-box" aria-hidden="true" />
          <span>Desmarcar todos</span>
        </button>
      </div>

      <div className="admin-picker-content">
        {filteredSabores.length ? (
          filteredSabores.map((sabor) => {
            const checked = selectedSet.has(sabor.id);
            return (
              <div key={sabor.id} className="admin-picker-item">
                <button
                  type="button"
                  className={`admin-square-check ${checked ? 'checked' : ''}`}
                  aria-label={`Selecionar ${sabor.nome}`}
                  onClick={() => toggleSabor(sabor.id)}
                >
                  {checked ? '✓' : ''}
                </button>
                {sabor.imagemUrl ? <img src={sabor.imagemUrl} alt="" /> : <ImagePlaceholder size={48} />}
                <div>
                  <strong>{sabor.nome}</strong>
                  <p>{sabor.descricao || 'Sem descrição'}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="admin-empty-catalog">Nenhum sabor encontrado.</div>
        )}
      </div>

      <div className="admin-picker-footer">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
          Salvar seleção
        </button>
      </div>
    </div>
  );
}
