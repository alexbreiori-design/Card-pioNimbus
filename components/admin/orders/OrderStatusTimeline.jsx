'use client';

const STEPS = [
  { key: 'novo', label: 'Recebido' },
  { key: 'em_preparo', label: 'Em preparo' },
  { key: 'saiu_entrega', label: 'Saiu p/ entrega' },
  { key: 'concluido', label: 'Concluído' },
];

export default function OrderStatusTimeline({ status, historico = [] }) {
  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const historyMap = new Map((historico || []).map((h) => [h.status, h.at]));

  return (
    <div className="admin-order-timeline">
      <div className="admin-order-timeline-track">
        <span className="admin-order-timeline-fill" style={{ width: `${((currentIdx + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="admin-order-timeline-steps">
        {STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const at = historyMap.get(step.key);
          return (
            <div key={step.key} className={`admin-order-timeline-step ${done ? 'done' : ''} ${idx === currentIdx ? 'current' : ''}`}>
              <span className="admin-order-timeline-dot" />
              <strong>{step.label}</strong>
              {at ? (
                <span>{new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
