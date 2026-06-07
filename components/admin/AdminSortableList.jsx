'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function getInsertIndex(items, getId, pointerY, listEl, rowSelector) {
  const rows = [...listEl.querySelectorAll(rowSelector)].filter(
    (row) => !row.classList.contains('is-dragging')
  );
  if (!rows.length) return 0;

  for (let index = 0; index < rows.length; index += 1) {
    const rect = rows[index].getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (pointerY < midpoint) return index;
  }
  return rows.length;
}

export default function AdminSortableList({
  items,
  getId = (item) => item.id,
  onReorder,
  renderItem,
  rowClassName = 'admin-sortable-row',
  listClassName = 'admin-sortable-list',
}) {
  const listRef = useRef(null);
  const dragIdRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [insertIndex, setInsertIndex] = useState(-1);
  const [floatOffset, setFloatOffset] = useState({ x: 0, y: 0 });
  const [rowSize, setRowSize] = useState({ width: 0, height: 0 });
  const startPointer = useRef({ x: 0, y: 0 });
  const startRect = useRef(null);

  const finishDrag = useCallback(
    (commit) => {
      const activeId = dragIdRef.current;
      if (commit && activeId) {
        const fromIdx = items.findIndex((item) => getId(item) === activeId);
        let toIdx = insertIndex;
        if (toIdx < 0) toIdx = fromIdx;
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          const next = [...items];
          const [moved] = next.splice(fromIdx, 1);
          const adjustedTo = toIdx > fromIdx ? toIdx - 1 : toIdx;
          next.splice(adjustedTo, 0, moved);
          onReorder(next.map((item, idx) => ({ ...item, ordem: idx })));
        }
      }
      dragIdRef.current = null;
      setDragId(null);
      setInsertIndex(-1);
      setFloatOffset({ x: 0, y: 0 });
      startRect.current = null;
    },
    [getId, insertIndex, items, onReorder]
  );

  useEffect(() => {
    if (!dragId) return undefined;

    function onPointerMove(event) {
      setFloatOffset({
        x: event.clientX - startPointer.current.x,
        y: event.clientY - startPointer.current.y,
      });
      if (!listRef.current) return;
      const nextIndex = getInsertIndex(
        items,
        getId,
        event.clientY,
        listRef.current,
        `.${rowClassName}`
      );
      setInsertIndex(nextIndex);
    }

    function onPointerUp() {
      finishDrag(true);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragId, finishDrag, getId, items, rowClassName]);

  function startDrag(event, id) {
    if (event.button !== 0) return;
    const row = event.currentTarget.closest(`.${rowClassName}`);
    if (!row) return;
    event.preventDefault();
    const rect = row.getBoundingClientRect();
    startRect.current = rect;
    setRowSize({ width: rect.width, height: rect.height });
    startPointer.current = { x: event.clientX, y: event.clientY };
    dragIdRef.current = id;
    setDragId(id);
    const currentIndex = items.findIndex((item) => getId(item) === id);
    setInsertIndex(currentIndex);
  }

  return (
    <div className={listClassName} ref={listRef}>
      {items.map((item, index) => {
        const id = getId(item);
        const isDragging = dragId === id;
        const showPlaceholder = dragId && insertIndex === index && !isDragging;
        return (
          <div key={id} className="admin-sortable-slot">
            {showPlaceholder ? <div className="admin-sortable-placeholder" style={{ height: rowSize.height || 48 }} /> : null}
            <div
              className={`${rowClassName} ${isDragging ? 'is-dragging' : ''}`}
              style={
                isDragging && startRect.current
                  ? {
                      position: 'fixed',
                      left: startRect.current.left,
                      top: startRect.current.top,
                      width: rowSize.width || startRect.current.width,
                      transform: `translate(${floatOffset.x}px, ${floatOffset.y}px)`,
                      zIndex: 1200,
                      boxShadow: '0 14px 32px rgba(15, 23, 42, 0.18)',
                    }
                  : undefined
              }
            >
              <button
                type="button"
                className="admin-sortable-handle"
                onPointerDown={(event) => startDrag(event, id)}
                aria-label="Arrastar para reordenar"
              >
                <span />
                <span />
                <span />
              </button>
              {renderItem(item, { isDragging })}
            </div>
          </div>
        );
      })}
      {dragId && insertIndex === items.length ? (
        <div className="admin-sortable-placeholder" style={{ height: rowSize.height || 48 }} />
      ) : null}
    </div>
  );
}
