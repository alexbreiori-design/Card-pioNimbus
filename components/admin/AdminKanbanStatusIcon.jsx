'use client';

const ICONS = {
  novo: 'ph ph-seal-check',
  em_preparo: 'ph ph-cooking-pot',
  saiu_entrega: 'ph-fill ph-motorcycle',
  delivery: 'ph-fill ph-motorcycle',
};

export default function AdminKanbanStatusIcon({ status, className = '' }) {
  const iconClass = ICONS[status];
  if (!iconClass) return null;
  return <i className={`${iconClass} admin-kanban-phosphor-icon ${className}`.trim()} aria-hidden="true" />;
}
