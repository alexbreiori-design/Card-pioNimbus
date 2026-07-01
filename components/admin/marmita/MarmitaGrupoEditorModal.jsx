'use client';

import CategoryIconPicker from '@/components/admin/CategoryIconPicker';
import CategoryLayoutPicker from '@/components/admin/CategoryLayoutPicker';
import { CATEGORY_LAYOUT_DEFAULT } from '@/lib/cardapio/categoryLayouts';

export default function MarmitaGrupoEditorModal({
  draft,
  onChange,
  onSave,
  onCancel,
  title,
  subtitle,
  weekdayOptions = null,
}) {
  if (!draft) return null;

  return (
    <div className="admin-confirm-overlay" onClick={onCancel}>
      <div
        className="admin-confirm-modal admin-category-edit-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}

        {weekdayOptions?.length ? (
          <div className="admin-marmita-grupo-modal-suggest">
            <p className="admin-help-text admin-marmita-grupo-suggest-label">
              Sugestão por dia (ou digite outro nome):
            </p>
            <div className="admin-marmita-grupo-suggest-row">
              {weekdayOptions.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  onClick={() => onChange({ ...draft, nome: day.label })}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="admin-form-group">
          <label className="admin-label">Nome do grupo</label>
          <input
            className="admin-input"
            value={draft.nome}
            onChange={(event) => onChange({ ...draft, nome: event.target.value })}
            placeholder="Ex.: Segunda-feira"
            autoFocus
          />
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Ícone no cardápio</label>
          <CategoryIconPicker
            value={draft.icone || 'combo'}
            onChange={(icone) => onChange({ ...draft, icone })}
          />
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Permitir dias duplicados?</label>
          <select
            className="admin-input"
            value={draft.permitirDiasDuplicados ? 'sim' : 'nao'}
            onChange={(event) =>
              onChange({
                ...draft,
                permitirDiasDuplicados: event.target.value === 'sim',
              })
            }
          >
            <option value="nao">Não — uma marmita ativa por dia</option>
            <option value="sim">Sim — várias no mesmo dia</option>
          </select>
        </div>

        <CategoryLayoutPicker
          value={draft.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT}
          onChange={(exibicaoCardapio) => onChange({ ...draft, exibicaoCardapio })}
        />

        <div className="admin-confirm-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
