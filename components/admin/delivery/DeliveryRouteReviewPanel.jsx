'use client';

import DraggableReorderList from '@/components/lightswind/draggable-reorder-list';
import {
  computeLegDistances,
  computeTotalRouteKm,
  formatRouteKm,
} from '@/lib/delivery/routePreview';
import { getOrderDeadlineStatus } from '@/lib/orders/orderDeadline';

function DeadlineBadge({ stop }) {
  const status = getOrderDeadlineStatus({
    entregarAte: stop.entregarAte,
    status: 'em_preparo',
  });
  if (status === 'overdue') {
    return <span className="admin-delivery-routes-review-badge is-overdue">Atrasado</span>;
  }
  if (status === 'warning') {
    return <span className="admin-delivery-routes-review-badge is-warning">Em breve</span>;
  }
  return null;
}

function StopRowContent({ stop, index, fromStoreKm }) {
  return (
    <div className="admin-delivery-routes-review-stop-row">
      <span className="admin-delivery-routes-review-stop-index" aria-hidden="true">
        {index + 1}
      </span>
      <div className="admin-delivery-routes-review-stop-main">
        <strong>
          #{stop.codigo} · {stop.clienteNome}
        </strong>
        <span title={stop.enderecoTexto}>{stop.enderecoTexto || 'Sem endereço'}</span>
      </div>
      <div className="admin-delivery-routes-review-stop-meta">
        <span>{formatRouteKm(fromStoreKm)} da loja</span>
        <DeadlineBadge stop={stop} />
      </div>
    </div>
  );
}

export default function DeliveryRouteReviewPanel({
  store,
  mode,
  onModeChange,
  orderedStops,
  onReorder,
  onRestoreBest,
  manualDisabled = false,
}) {
  const origin = store?.lat && store?.lng ? { lat: store.lat, lng: store.lng } : null;
  const { fromStoreKm } = origin
    ? computeLegDistances(origin, orderedStops)
    : { fromStoreKm: [] };
  const totalKm = origin ? computeTotalRouteKm(origin, orderedStops) : 0;

  const stopCount = orderedStops.length;
  const summaryLabel =
    stopCount === 1
      ? `1 parada · ${formatRouteKm(totalKm)} no total`
      : `${stopCount} paradas · ${formatRouteKm(totalKm)} no total`;

  return (
    <div className="admin-delivery-routes-review-panel">
      <p className="admin-delivery-routes-review-section-title">Opções de rota</p>

      <div
        className="admin-delivery-routes-review-segmented"
        role="group"
        aria-label="Opções de rota"
      >
        <button
          type="button"
          className={mode === 'best' ? 'is-active' : ''}
          aria-pressed={mode === 'best'}
          onClick={() => onModeChange('best')}
        >
          Melhor rota
        </button>
        <button
          type="button"
          className={mode === 'manual' ? 'is-active' : ''}
          aria-pressed={mode === 'manual'}
          disabled={manualDisabled}
          title={
            manualDisabled ? 'Disponível com 2 ou mais paradas' : 'Defina a ordem manualmente'
          }
          onClick={() => !manualDisabled && onModeChange('manual')}
        >
          Ordem manual
        </button>
      </div>

      <p className="admin-delivery-routes-review-summary">{summaryLabel}</p>

      {mode === 'manual' ? (
        <>
          <DraggableReorderList
            className="admin-delivery-routes-review-draggable"
            items={orderedStops}
            onReorder={onReorder}
            getId={(stop) => stop.pedidoId}
            renderItem={(stop) => {
              const index = orderedStops.findIndex((item) => item.pedidoId === stop.pedidoId);
              return (
                <StopRowContent
                  stop={stop}
                  index={index >= 0 ? index : 0}
                  fromStoreKm={fromStoreKm[index >= 0 ? index : 0]}
                />
              );
            }}
          />
          <button
            type="button"
            className="admin-delivery-routes-review-restore"
            onClick={onRestoreBest}
          >
            Restaurar melhor rota
          </button>
        </>
      ) : (
        <ul className="admin-delivery-routes-review-static-list">
          {orderedStops.map((stop, index) => (
            <li key={stop.pedidoId} className="admin-delivery-routes-review-static-item">
              <StopRowContent stop={stop} index={index} fromStoreKm={fromStoreKm[index]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
