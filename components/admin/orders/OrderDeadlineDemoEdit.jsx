'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminToast } from '@/context/AdminToastContext';

function toTimeInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function entregarAteFromTimeInput(value) {
  const [hours, minutes] = String(value || '').split(':').map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export default function OrderDeadlineDemoEdit({ order, storeSlug, onUpdated, stopPropagation = false }) {
  const toast = useAdminToast();
  const [open, setOpen] = useState(false);
  const [timeValue, setTimeValue] = useState('');
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setTimeValue(toTimeInputValue(order?.entregarAte));
  }, [order?.entregarAte, order?.id]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  async function saveDeadline(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const entregarAte = entregarAteFromTimeInput(timeValue);
    if (!entregarAte) {
      toast.error('Informe um horário válido.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/orders/demo-deadline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: storeSlug,
          dbId: order.dbId,
          codigo: order.id,
          entregarAte,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível ajustar o prazo.');
      }
      setOpen(false);
      toast.success('Prazo de demonstração atualizado.');
      await onUpdated?.(payload.order);
    } catch (error) {
      toast.error(error?.message || 'Erro ao ajustar prazo.');
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(event) {
    if (stopPropagation) event.stopPropagation();
    setOpen((current) => !current);
  }

  return (
    <span className="admin-order-deadline-demo-wrap" ref={wrapRef}>
      <button
        type="button"
        className="admin-order-deadline-demo-btn"
        onClick={handleToggle}
        aria-label="Ajustar prazo para demonstração"
        title="Ajustar prazo (demo loja modelo)"
      >
        <i className="ph ph-pencil-simple" aria-hidden="true" />
      </button>
      {open ? (
        <form className="admin-order-deadline-demo-popover" onSubmit={saveDeadline} onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}>
          <input
            type="time"
            className="admin-input admin-order-deadline-demo-input"
            value={timeValue}
            onChange={(event) => setTimeValue(event.target.value)}
            disabled={saving}
          />
          <button type="submit" className="admin-btn admin-btn-primary admin-order-deadline-demo-save" disabled={saving}>
            Ok
          </button>
        </form>
      ) : null}
    </span>
  );
}
