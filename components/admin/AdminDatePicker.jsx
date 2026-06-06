'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const WEEKDAYS = [
  { key: 'dom', label: 'D' },
  { key: 'seg', label: 'S' },
  { key: 'ter', label: 'T' },
  { key: 'qua', label: 'Q' },
  { key: 'qui', label: 'Q' },
  { key: 'sex', label: 'S' },
  { key: 'sab', label: 'S' },
];

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const POPOVER_HEIGHT = 320;
const POPOVER_WIDTH = 280;

function parseValue(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AdminDatePicker({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Selecionar data',
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const [placement, setPlacement] = useState('below');
  const parsed = parseValue(value);
  const [viewDate, setViewDate] = useState(() => parsed || new Date());
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    function onDocClick(event) {
      if (
        !wrapRef.current?.contains(event.target) &&
        !event.target.closest?.('.admin-date-picker-popover')
      ) {
        setOpen(false);
      }
    }

    function onReposition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < POPOVER_HEIGHT && rect.top > spaceBelow;
      const top = openAbove ? rect.top - POPOVER_HEIGHT - 6 : rect.bottom + 6;
      const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 12);

      setPlacement(openAbove ? 'above' : 'below');
      setPopoverStyle({
        position: 'fixed',
        top: Math.max(8, top),
        left: Math.max(12, left),
        width: POPOVER_WIDTH,
        zIndex: 1500,
      });
    }

    onReposition();
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const display = parsed
    ? parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const grid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let index = 0; index < startOffset; index += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  }, [viewDate]);

  const today = new Date();

  function toggleOpen() {
    if (disabled) return;
    setOpen((current) => !current);
  }

  function selectDay(day) {
    onChange?.(toIso(day));
    setOpen(false);
  }

  function clear() {
    onChange?.('');
    setOpen(false);
  }

  function shiftMonth(delta) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  const popover =
    open && popoverStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`admin-date-picker-popover is-fixed is-${placement}`}
            style={popoverStyle}
            role="dialog"
            aria-label="Calendário"
          >
            <div className="admin-date-picker-head">
              <button
                type="button"
                className="admin-date-picker-nav"
                onClick={() => shiftMonth(-1)}
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <strong>
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </strong>
              <button
                type="button"
                className="admin-date-picker-nav"
                onClick={() => shiftMonth(1)}
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>

            <div className="admin-date-picker-weekdays" aria-hidden="true">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday.key}>{weekday.label}</span>
              ))}
            </div>

            <div className="admin-date-picker-grid">
              {grid.map((day, index) =>
                day ? (
                  <button
                    key={toIso(day)}
                    type="button"
                    className={[
                      value === toIso(day) ? 'is-selected' : '',
                      isSameDay(day, today) ? 'is-today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => selectDay(day)}
                  >
                    {day.getDate()}
                  </button>
                ) : (
                  <span key={`empty-${index}`} className="admin-date-picker-empty" />
                )
              )}
            </div>

            <div className="admin-date-picker-footer">
              <button type="button" className="admin-date-picker-clear" onClick={clear}>
                Limpar
              </button>
              <button type="button" className="admin-date-picker-today" onClick={() => selectDay(today)}>
                Hoje
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={`admin-date-picker${compact ? ' is-compact' : ''}`}
      ref={wrapRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`admin-date-picker-trigger admin-input${display ? '' : ' is-placeholder'}`}
        disabled={disabled}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span>{display || placeholder}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M8 2v3M16 2v3M4 7h16M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {popover}
    </div>
  );
}
