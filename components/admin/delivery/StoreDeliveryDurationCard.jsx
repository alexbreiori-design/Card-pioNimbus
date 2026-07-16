'use client';

import { useEffect, useState } from 'react';
import StoreSectionHead from '@/components/admin/StoreSectionHead';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import {
  formatHHMMInput,
  parseHHMMToMinutes,
  resolveLojaDurations,
} from '@/lib/deliveryDuration';
import { applyScheduleOpenStatus } from '@/lib/storeHours';

export default function StoreDeliveryDurationCard({ compact = false }) {
  const { data, saveData, ready } = useAdminData();
  const toast = useAdminToast();
  const [draft, setDraft] = useState({ tempoEntregaDelivery: '', tempoEntregaRetirada: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const durations = resolveLojaDurations(data?.loja || {});
    setDraft(durations);
  }, [ready, data?.loja?.tempoEntregaDelivery, data?.loja?.tempoEntregaRetirada]);

  function setDurationField(field, raw) {
    setDraft((prev) => ({ ...prev, [field]: formatHHMMInput(raw) }));
  }

  function blurDurationField(field) {
    setDraft((prev) => {
      const durations = resolveLojaDurations({ ...prev, [field]: prev[field] });
      return { ...prev, ...durations };
    });
  }

  async function saveDurations() {
    const durations = resolveLojaDurations(draft);
    if (
      !parseHHMMToMinutes(durations.tempoEntregaDelivery) ||
      !parseHHMMToMinutes(durations.tempoEntregaRetirada)
    ) {
      toast.error('Informe tempos válidos no formato HH:MM (ex: 00:45 para 45 minutos).');
      return;
    }

    setSaving(true);
    try {
      await saveData((prev) => ({
        ...prev,
        loja: applyScheduleOpenStatus({
          ...prev.loja,
          ...durations,
        }),
      }));
      toast.success('Tempos de entrega salvos.');
    } catch (error) {
      toast.error(error?.message || 'Erro ao salvar tempos de entrega.');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return null;

  if (compact) {
    return (
      <section className="admin-card admin-delivery-duration-strip" aria-label="Tempo estimado de entrega">
        <div className="admin-delivery-duration-strip-inner">
          <div className="admin-delivery-duration-strip-copy">
            <strong>Tempo estimado</strong>
            <span>HH:MM a partir da confirmação do pedido.</span>
          </div>
          <div className="admin-delivery-duration-strip-fields">
            <label className="admin-delivery-duration-strip-field">
              <span>Delivery</span>
              <input
                className="admin-input"
                inputMode="numeric"
                maxLength={5}
                value={draft.tempoEntregaDelivery || ''}
                onChange={(e) => setDurationField('tempoEntregaDelivery', e.target.value)}
                onBlur={() => blurDurationField('tempoEntregaDelivery')}
                placeholder="00:45"
              />
            </label>
            <label className="admin-delivery-duration-strip-field">
              <span>Retirada</span>
              <input
                className="admin-input"
                inputMode="numeric"
                maxLength={5}
                value={draft.tempoEntregaRetirada || ''}
                onChange={(e) => setDurationField('tempoEntregaRetirada', e.target.value)}
                onBlur={() => blurDurationField('tempoEntregaRetirada')}
                placeholder="00:30"
              />
            </label>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void saveDurations()}
              disabled={saving}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-card admin-store-block-card admin-compact-page-card">
      <StoreSectionHead
        iconNode={<i className="ph ph-clock admin-kanban-phosphor-icon" aria-hidden="true" />}
        title="Tempo estimado de entrega"
        hint="Duração em horas e minutos (HH:MM). O horário «até …» nos pedidos é calculado a partir da confirmação."
      />
      <div className="admin-store-section-body">
        <div className="admin-store-delivery-time-row admin-store-delivery-duration-row">
          <div className="admin-form-group">
            <label className="admin-label">Delivery</label>
            <p className="admin-help-text" style={{ margin: '0 0 8px' }}>
              Cliente escolhe «Receber em seu endereço».
            </p>
            <input
              className="admin-input"
              inputMode="numeric"
              maxLength={5}
              value={draft.tempoEntregaDelivery || ''}
              onChange={(e) => setDurationField('tempoEntregaDelivery', e.target.value)}
              onBlur={() => blurDurationField('tempoEntregaDelivery')}
              placeholder="00:45"
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Retirada</label>
            <p className="admin-help-text" style={{ margin: '0 0 8px' }}>
              Cliente escolhe «Retirar no estabelecimento».
            </p>
            <input
              className="admin-input"
              inputMode="numeric"
              maxLength={5}
              value={draft.tempoEntregaRetirada || ''}
              onChange={(e) => setDurationField('tempoEntregaRetirada', e.target.value)}
              onBlur={() => blurDurationField('tempoEntregaRetirada')}
              placeholder="00:30"
            />
          </div>
        </div>
        <div className="admin-delivery-duration-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => void saveDurations()}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Salvar tempos'}
          </button>
        </div>
      </div>
    </div>
  );
}
