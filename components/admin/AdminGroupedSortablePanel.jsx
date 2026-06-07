'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const ADMIN_UNGROUPED_ID = '__ungrouped__';

function getInsertIndex(rows, pointerY) {
  const visible = rows.filter((row) => !row.classList.contains('is-dragging'));
  if (!visible.length) return 0;
  for (let index = 0; index < visible.length; index += 1) {
    const rect = visible[index].getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (pointerY < midpoint) return index;
  }
  return visible.length;
}

function findGroupAtPointer(panelEl, pointerY) {
  const groups = [...panelEl.querySelectorAll('[data-group-sort-id]')];
  for (const groupEl of groups) {
    const rect = groupEl.getBoundingClientRect();
    if (pointerY >= rect.top && pointerY <= rect.bottom) {
      return groupEl;
    }
  }
  return null;
}

function normalizeGroupKey(groupId, includeUngrouped) {
  if (!groupId && includeUngrouped) return ADMIN_UNGROUPED_ID;
  return groupId || '';
}

function applyItemDrop({
  items,
  draggedId,
  targetGroupId,
  insertIndex,
  getItemId,
  getItemGroupId,
  groupIdKey,
  includeUngrouped,
  sectionGroupIds,
}) {
  const next = items.map((item) => ({ ...item }));
  const moving = next.find((item) => getItemId(item) === draggedId);
  if (!moving) return items;

  const toKey = normalizeGroupKey(targetGroupId === ADMIN_UNGROUPED_ID ? '' : targetGroupId, includeUngrouped);
  const fromKey = normalizeGroupKey(getItemGroupId(moving), includeUngrouped);
  moving[groupIdKey] = toKey === ADMIN_UNGROUPED_ID ? '' : toKey;

  const lists = new Map();
  sectionGroupIds.forEach((groupId) => lists.set(groupId, []));
  next
    .filter((item) => getItemId(item) !== draggedId)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .forEach((item) => {
      const key = normalizeGroupKey(getItemGroupId(item), includeUngrouped);
      if (!lists.has(key)) lists.set(key, []);
      lists.get(key).push(item);
    });

  const targetList = [...(lists.get(toKey) || [])];
  const safeIndex = Math.max(0, Math.min(insertIndex, targetList.length));
  targetList.splice(safeIndex, 0, moving);
  lists.set(toKey, targetList);

  let ordem = 0;
  sectionGroupIds.forEach((groupId) => {
    (lists.get(groupId) || []).forEach((item) => {
      const row = next.find((entry) => getItemId(entry) === getItemId(item));
      if (row) row.ordem = ordem;
      ordem += 1;
    });
  });

  return [...next].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

export default function AdminGroupedSortablePanel({
  groups = [],
  items = [],
  groupIdKey = 'categoriaId',
  getItemGroupId = (item) => item[groupIdKey] || '',
  getGroupId = (group) => group.id,
  getItemId = (item) => item.id,
  includeUngroupedSection = false,
  ungroupedLabel = 'Sem grupo',
  onGroupsReorder,
  onItemsChange,
  renderGroupHeader,
  renderItemPreview,
  hint = 'Segure o ícone à esquerda e arraste para reposicionar. Ao mover um item sobre outra categoria, ela se expande para você soltar na posição desejada.',
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set());
  const [floatOffset, setFloatOffset] = useState({ x: 0, y: 0 });
  const [rowSize, setRowSize] = useState({ width: 0, height: 0 });
  const startPointer = useRef({ x: 0, y: 0 });
  const startRect = useRef(null);

  const orderedGroups = useMemo(
    () => [...groups].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [groups]
  );

  const sectionGroups = useMemo(() => {
    const list = [...orderedGroups];
    if (includeUngroupedSection) {
      list.push({ id: ADMIN_UNGROUPED_ID, nome: ungroupedLabel, ordem: 9999 });
    }
    return list;
  }, [includeUngroupedSection, orderedGroups, ungroupedLabel]);

  const sectionGroupIds = useMemo(
    () => sectionGroups.map((group) => getGroupId(group)),
    [getGroupId, sectionGroups]
  );

  const itemsByGroup = useMemo(() => {
    const map = new Map();
    sectionGroupIds.forEach((groupId) => map.set(groupId, []));
    [...items]
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .forEach((item) => {
        const key = normalizeGroupKey(getItemGroupId(item), includeUngroupedSection);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
      });
    return map;
  }, [getItemGroupId, includeUngroupedSection, items, sectionGroupIds]);

  const flatItemsOnly = sectionGroups.length === 0;

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const finishDrag = useCallback(
    (commit) => {
      const active = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      setFloatOffset({ x: 0, y: 0 });
      startRect.current = null;
      if (!commit || !active) return;

      if (active.kind === 'group' && onGroupsReorder) {
        const fromIdx = orderedGroups.findIndex((group) => getGroupId(group) === active.id);
        let toIdx = active.insertIndex;
        if (toIdx < 0) toIdx = fromIdx;
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          const next = [...orderedGroups];
          const [moved] = next.splice(fromIdx, 1);
          const adjustedTo = toIdx > fromIdx ? toIdx - 1 : toIdx;
          next.splice(adjustedTo, 0, moved);
          onGroupsReorder(next.map((group, ordem) => ({ ...group, ordem })));
        }
        return;
      }

      if (active.kind === 'item' && onItemsChange) {
        if (flatItemsOnly) {
          const fromIdx = items.findIndex((item) => getItemId(item) === active.id);
          let toIdx = active.insertIndex;
          if (toIdx < 0) toIdx = fromIdx;
          if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
            const next = [...items].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
            const [moved] = next.splice(fromIdx, 1);
            const adjustedTo = toIdx > fromIdx ? toIdx - 1 : toIdx;
            next.splice(adjustedTo, 0, moved);
            onItemsChange(next.map((item, ordem) => ({ ...item, ordem })));
          }
          return;
        }

        if (!active.targetGroupId) return;
        onItemsChange(
          applyItemDrop({
            items,
            draggedId: active.id,
            targetGroupId: active.targetGroupId,
            insertIndex: active.insertIndex,
            getItemId,
            getItemGroupId,
            groupIdKey,
            includeUngrouped: includeUngroupedSection,
            sectionGroupIds,
          })
        );
      }
    },
    [
      flatItemsOnly,
      getGroupId,
      getItemGroupId,
      getItemId,
      groupIdKey,
      includeUngroupedSection,
      items,
      onGroupsReorder,
      onItemsChange,
      orderedGroups,
      sectionGroupIds,
    ]
  );

  useEffect(() => {
    if (!dragState) return undefined;

    function onPointerMove(event) {
      setFloatOffset({
        x: event.clientX - startPointer.current.x,
        y: event.clientY - startPointer.current.y,
      });
      if (!panelRef.current || !dragRef.current) return;

      if (dragRef.current.kind === 'group') {
        const headers = [...panelRef.current.querySelectorAll('.admin-grouped-sort-group-header')];
        const nextIndex = getInsertIndex(headers, event.clientY);
        dragRef.current = { ...dragRef.current, insertIndex: nextIndex };
        setDragState({ ...dragRef.current });
        return;
      }

      if (flatItemsOnly) {
        const rows = [...panelRef.current.querySelectorAll('.admin-grouped-sort-item-row')];
        const nextIndex = getInsertIndex(rows, event.clientY);
        dragRef.current = { ...dragRef.current, insertIndex: nextIndex };
        setDragState({ ...dragRef.current });
        return;
      }

      const groupEl = findGroupAtPointer(panelRef.current, event.clientY);
      if (!groupEl) return;
      const targetGroupId = groupEl.dataset.groupSortId;
      setExpandedGroupIds((prev) => {
        if (prev.has(targetGroupId)) return prev;
        const next = new Set(prev);
        next.add(targetGroupId);
        return next;
      });
      const itemRows = [...groupEl.querySelectorAll('.admin-grouped-sort-item-row')];
      const nextIndex = getInsertIndex(itemRows, event.clientY);
      dragRef.current = {
        ...dragRef.current,
        targetGroupId,
        insertIndex: nextIndex,
      };
      setDragState({ ...dragRef.current });
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
  }, [dragState, finishDrag, flatItemsOnly]);

  function beginDrag(event, payload, rowSelector) {
    if (event.button !== 0) return;
    const row = event.currentTarget.closest(rowSelector);
    if (!row) return;
    event.preventDefault();
    const rect = row.getBoundingClientRect();
    startRect.current = rect;
    setRowSize({ width: rect.width, height: rect.height });
    startPointer.current = { x: event.clientX, y: event.clientY };
    dragRef.current = payload;
    setDragState(payload);
  }

  function renderDraggingStyle(isDragging) {
    if (!isDragging || !startRect.current) return undefined;
    return {
      position: 'fixed',
      left: startRect.current.left,
      top: startRect.current.top,
      width: rowSize.width || startRect.current.width,
      transform: `translate(${floatOffset.x}px, ${floatOffset.y}px)`,
      zIndex: 1200,
      boxShadow: '0 14px 32px rgba(15, 23, 42, 0.18)',
    };
  }

  function renderItemRow(item, groupId, index, groupItems) {
    const id = getItemId(item);
    const isDragging = dragState?.kind === 'item' && dragState.id === id;
    const showPlaceholder =
      dragState?.kind === 'item' &&
      dragState.targetGroupId === groupId &&
      dragState.insertIndex === index &&
      !isDragging;

    return (
      <div key={id} className="admin-grouped-sort-item-slot">
        {showPlaceholder ? (
          <div className="admin-sortable-placeholder" style={{ height: rowSize.height || 52 }} />
        ) : null}
        <div
          className={`admin-grouped-sort-item-row ${isDragging ? 'is-dragging' : ''}`}
          style={renderDraggingStyle(isDragging)}
        >
          <button
            type="button"
            className="admin-sortable-handle"
            onPointerDown={(event) =>
              beginDrag(event, {
                kind: 'item',
                id,
                sourceGroupId: groupId,
                targetGroupId: groupId,
                insertIndex: index,
              }, '.admin-grouped-sort-item-row')
            }
            aria-label="Arrastar para reordenar"
          >
            <span />
            <span />
            <span />
          </button>
          {renderItemPreview(item)}
        </div>
      </div>
    );
  }

  const flatItems = [...items].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  return (
    <div className="admin-grouped-sortable-panel" ref={panelRef}>
      {hint ? <p className="admin-help-text admin-sortable-panel-hint">{hint}</p> : null}

      {flatItemsOnly ? (
        <div className="admin-grouped-sort-items admin-grouped-sort-items-flat" data-group-sort-id="__flat__">
          {flatItems.map((item, index) => renderItemRow(item, '__flat__', index, flatItems))}
          {dragState?.kind === 'item' &&
          dragState.targetGroupId === '__flat__' &&
          dragState.insertIndex === flatItems.length ? (
            <div className="admin-sortable-placeholder" style={{ height: rowSize.height || 52 }} />
          ) : null}
        </div>
      ) : (
        sectionGroups.map((group, groupIndex) => {
          const groupId = getGroupId(group);
          const groupItems = itemsByGroup.get(groupId) || [];
          const isExpanded = expandedGroupIds.has(groupId);
          const isDraggingGroup = dragState?.kind === 'group' && dragState.id === groupId;
          const showGroupPlaceholder =
            dragState?.kind === 'group' && dragState.insertIndex === groupIndex && !isDraggingGroup;

          return (
            <div key={groupId} className="admin-grouped-sort-group-slot">
              {showGroupPlaceholder ? (
                <div className="admin-sortable-placeholder" style={{ height: rowSize.height || 56 }} />
              ) : null}
              <div
                className="admin-card admin-catalog-card admin-grouped-sort-group-card"
                data-group-sort-id={groupId}
              >
                <div
                  className={`admin-catalog-header-bar admin-grouped-sort-group-header ${isDraggingGroup ? 'is-dragging' : ''}`}
                  style={renderDraggingStyle(isDraggingGroup)}
                >
                  {onGroupsReorder && groupId !== ADMIN_UNGROUPED_ID ? (
                    <button
                      type="button"
                      className="admin-sortable-handle"
                      onPointerDown={(event) =>
                        beginDrag(
                          event,
                          {
                            kind: 'group',
                            id: groupId,
                            insertIndex: orderedGroups.findIndex((entry) => getGroupId(entry) === groupId),
                          },
                          '.admin-grouped-sort-group-header'
                        )
                      }
                      aria-label={`Arrastar grupo ${group.nome}`}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                  ) : (
                    <span className="admin-grouped-sort-handle-spacer" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    className="admin-grouped-sort-group-toggle"
                    onClick={() => toggleGroup(groupId)}
                    aria-expanded={isExpanded}
                  >
                    {renderGroupHeader(group, { isExpanded, itemCount: groupItems.length })}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="admin-grouped-sort-items">
                    {groupItems.length ? (
                      groupItems.map((item, index) => renderItemRow(item, groupId, index, groupItems))
                    ) : (
                      <div className="admin-grouped-sort-empty">Nenhum item nesta categoria.</div>
                    )}
                    {dragState?.kind === 'item' &&
                    dragState.targetGroupId === groupId &&
                    dragState.insertIndex === groupItems.length ? (
                      <div className="admin-sortable-placeholder" style={{ height: rowSize.height || 52 }} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
