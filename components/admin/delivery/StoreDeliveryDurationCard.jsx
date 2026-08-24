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

const EMPTY_DRAFT = {
  tempoEntregaDelivery: '',
  tempoEntregaDeliveryMin: '',
  tempoEntregaRetirada: '',
  tempoEntregaRetiradaMin: '',
};

function validateDurationDraft(draft) {
  if (
    !parseHHMMToMinutes(draft.tempoEntregaDelivery) ||
    !parseHHMMToMinutes(draft.tempoEntregaRetirada)
  ) {
    return 'Informe tempos válidos no formato HH:MM (ex: 00:45 para 45 minutos).';
  }

  const deliveryMin = parseHHMMToMinutes(draft.tempoEntregaDeliveryMin);
  const deliveryMax = parseHHMMToMinutes(draft.tempoEntregaDelivery);
  if (draft.tempoEntregaDeliveryMin?.trim()) {
    if (deliveryMin === null) {
      return 'Delivery «De»: informe HH:MM válido ou deixe vazio.';
    }
    if (deliveryMin >= deliveryMax) {
      return 'Delivery: «De» precisa ser menor que «Até».';
    }
  }

  const pickupMin = parseHHMMToMinutes(draft.tempoEntregaRetiradaMin);
  const pickupMax = parseHHMMToMinutes(draft.tempoEntregaRetirada);
  if (draft.tempoEntregaRetiradaMin?.trim()) {
    if (pickupMin === null) {
      return 'Retirada «De»: informe HH:MM válido ou deixe vazio.';
    }
    if (pickupMin >= pickupMax) {
      return 'Retirada: «De» precisa ser menor que «Até».';
    }
  }

  return '';
}

function DurationRangeFields({ label, minField, maxField, draft, onChange, onBlur }) {
  return (
    <div className="admin-delivery-duration-range">
      <span className="admin-delivery-duration-range-label">{label}</span>
      <div className="admin-delivery-duration-range-fields">
        <label className="admin-delivery-duration-strip-field">
          <span>De</span>
          <input
            className="admin-input"
            inputMode="numeric"
            maxLength={5}
            value={draft[minField] || ''}
            onChange={(e) => onChange(minField, e.target.value)}
            onBlur={() => onBlur(minField)}
            placeholder="00:35"
            aria-label={`${label} — tempo mínimo`}
          />
        </label>
        <label className="admin-delivery-duration-strip-field">
          <span>Até</span>
          <input
            className="admin-input"
            inputMode="numeric"
            maxLength={5}
            value={draft[maxField] || ''}
            onChange={(e) => onChange(maxField, e.target.value)}
            onBlur={() => onBlur(maxField)}
            placeholder="01:00"
            aria-label={`${label} — tempo máximo`}
          />
        </label>
      </div>
    </div>
  );
}

export default function StoreDeliveryDurationCard({ compact = false }) {
  const { data, saveData, ready } = useAdminData();
  const toast = useAdminToast();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const durations = resolveLojaDurations(data?.loja || {});
    setDraft(durations);
  }, [
    ready,
    data?.loja?.tempoEntregaDelivery,
    data?.loja?.tempoEntregaDeliveryMin,
    data?.loja?.tempoEntregaRetirada,
    data?.loja?.tempoEntregaRetiradaMin,
  ]);

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
    const validationError = validateDurationDraft(draft);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const durations = resolveLojaDurations(draft);
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
            <span>HH:MM a partir da confirmação. «De» opcional para faixa (ex.: 35 min – 1 h).</span>
          </div>
          <div className="admin-delivery-duration-strip-fields">
            <DurationRangeFields
              label="Delivery"
              minField="tempoEntregaDeliveryMin"
              maxField="tempoEntregaDelivery"
              draft={draft}
              onChange={setDurationField}
              onBlur={blurDurationField}
            />
            <DurationRangeFields
              label="Retirada"
              minField="tempoEntregaRetiradaMin"
              maxField="tempoEntregaRetirada"
              draft={draft}
              onChange={setDurationField}
              onBlur={blurDurationField}
            />
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
        hint="Duração em HH:MM a partir da confirmação. Preencha «De» e «Até» para mostrar uma faixa no cardápio (ex.: 35 min – 1 h)."
      />
      <div className="admin-store-section-body">
        <div className="admin-store-delivery-time-row admin-store-delivery-duration-row">
          <div className="admin-form-group admin-delivery-duration-range-block">
            <label className="admin-label">Delivery</label>
            <p className="admin-help-text" style={{ margin: '0 0 8px' }}>
              Cliente escolhe «Receber em seu endereço».
            </p>
            <div className="admin-delivery-duration-range-fields">
              <label className="admin-form-group">
                <span className="admin-label">De (opcional)</span>
                <input
                  className="admin-input"
                  inputMode="numeric"
                  maxLength={5}
                  value={draft.tempoEntregaDeliveryMin || ''}
                  onChange={(e) => setDurationField('tempoEntregaDeliveryMin', e.target.value)}
                  onBlur={() => blurDurationField('tempoEntregaDeliveryMin')}
                  placeholder="00:35"
                />
              </label>
              <label className="admin-form-group">
                <span className="admin-label">Até</span>
                <input
                  className="admin-input"
                  inputMode="numeric"
                  maxLength={5}
                  value={draft.tempoEntregaDelivery || ''}
                  onChange={(e) => setDurationField('tempoEntregaDelivery', e.target.value)}
                  onBlur={() => blurDurationField('tempoEntregaDelivery')}
                  placeholder="01:00"
                />
              </label>
            </div>
          </div>
          <div className="admin-form-group admin-delivery-duration-range-block">
            <label className="admin-label">Retirada</label>
            <p className="admin-help-text" style={{ margin: '0 0 8px' }}>
              Cliente escolhe «Retirar no estabelecimento».
            </p>
            <div className="admin-delivery-duration-range-fields">
              <label className="admin-form-group">
                <span className="admin-label">De (opcional)</span>
                <input
                  className="admin-input"
                  inputMode="numeric"
                  maxLength={5}
                  value={draft.tempoEntregaRetiradaMin || ''}
                  onChange={(e) => setDurationField('tempoEntregaRetiradaMin', e.target.value)}
                  onBlur={() => blurDurationField('tempoEntregaRetiradaMin')}
                  placeholder="00:20"
                />
              </label>
              <label className="admin-form-group">
                <span className="admin-label">Até</span>
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
            </div>
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
