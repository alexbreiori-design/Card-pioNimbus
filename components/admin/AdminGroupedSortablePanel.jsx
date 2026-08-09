'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripIcon } from '@/components/lightswind/draggable-reorder-list';

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
  defaultExpandAll = true,
  browseMode = false,
  onGroupsReorder,
  onItemsChange,
  renderGroupHeader,
  renderGroupActions,
  renderItemPreview,
  hint = '',
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set());
  /** Após arrastar categoria, mantém acordeão fechado até “Mostrar itens”. */
  const [categoriesOnlyMode, setCategoriesOnlyMode] = useState(false);
  const [floatOffset, setFloatOffset] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState(null);
  const initializedExpand = useRef(false);

  useEffect(() => {
    dragRef.current = dragState;
  }, [dragState]);

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

  const sectionGroupIdsKey = sectionGroupIds.join('|');

  useEffect(() => {
    if (!defaultExpandAll || categoriesOnlyMode) return;
    if (!initializedExpand.current) {
      initializedExpand.current = true;
      setExpandedGroupIds(new Set(sectionGroupIds));
      return;
    }
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      sectionGroupIds.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expand when group id set changes
  }, [categoriesOnlyMode, defaultExpandAll, sectionGroupIdsKey]);

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

  const exitCategoriesOnlyMode = useCallback(() => {
    setCategoriesOnlyMode(false);
    setExpandedGroupIds(new Set(sectionGroupIds));
  }, [sectionGroupIds]);

  const toggleGroup = useCallback(
    (groupId) => {
      if (categoriesOnlyMode) return;
      setExpandedGroupIds((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return next;
      });
    },
    [categoriesOnlyMode]
  );

  const finishDrag = useCallback(
    (commit) => {
      const active = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      setFloatOffset({ x: 0, y: 0 });
      setDragOrigin(null);
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
    if (!dragState || !dragOrigin) return undefined;

    function onPointerMove(event) {
      setFloatOffset({
        x: event.clientX - dragOrigin.startX,
        y: event.clientY - dragOrigin.startY,
      });
      if (!panelRef.current || !dragRef.current) return;

      if (dragRef.current.kind === 'group') {
        const headers = [...panelRef.current.querySelectorAll('.admin-grouped-sort-group-header')];
        const nextIndex = getInsertIndex(headers, event.clientY);
        const next = { ...dragRef.current, insertIndex: nextIndex };
        dragRef.current = next;
        setDragState(next);
        return;
      }

      if (flatItemsOnly) {
        const rows = [...panelRef.current.querySelectorAll('.admin-grouped-sort-item-row')];
        const nextIndex = getInsertIndex(rows, event.clientY);
        const next = { ...dragRef.current, insertIndex: nextIndex };
        dragRef.current = next;
        setDragState(next);
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
      const next = {
        ...dragRef.current,
        targetGroupId,
        insertIndex: nextIndex,
      };
      dragRef.current = next;
      setDragState(next);
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
  }, [dragState, dragOrigin, finishDrag, flatItemsOnly]);

  function beginDrag(event, payload, rowSelector) {
    if (event.button !== 0) return;
    const row = event.currentTarget.closest(rowSelector);
    if (!row) return;
    event.preventDefault();
    const rect = row.getBoundingClientRect();
    setDragOrigin({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      startX: event.clientX,
      startY: event.clientY,
    });

    if (payload.kind === 'group') {
      setCategoriesOnlyMode(true);
      setExpandedGroupIds(new Set());
    }

    setDragState(payload);
  }

  function renderDraggingStyle(isDragging) {
    if (!isDragging || !dragOrigin) return undefined;
    return {
      position: 'fixed',
      left: dragOrigin.left,
      top: dragOrigin.top,
      width: dragOrigin.width,
      transform: `translate(${floatOffset.x}px, ${floatOffset.y}px) scale(1.02)`,
      zIndex: 1200,
      boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
    };
  }

  function renderItemRow(item, groupId, index) {
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
          <div className="admin-sortable-placeholder" style={{ height: dragOrigin?.height || 52 }} />
        ) : null}
        <div
          className={`admin-grouped-sort-item-row ${isDragging ? 'is-dragging' : ''}`}
          style={renderDraggingStyle(isDragging)}
        >
          <button
            type="button"
            className="admin-draggable-reorder-handle admin-grouped-sort-grip"
            onPointerDown={(event) =>
              beginDrag(
                event,
                {
                  kind: 'item',
                  id,
                  sourceGroupId: groupId,
                  targetGroupId: groupId,
                  insertIndex: index,
                },
                '.admin-grouped-sort-item-row'
              )
            }
            aria-label="Arrastar para reordenar"
          >
            <GripIcon />
          </button>
          {renderItemPreview(item)}
        </div>
      </div>
    );
  }

  const flatItems = [...items].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const hideItems = categoriesOnlyMode || dragState?.kind === 'group';
  const defaultHint = browseMode
    ? 'Segure os pontinhos para reordenar. Arrastar uma categoria fecha as listas; use Mostrar itens para expandir de novo.'
    : '';

  return (
    <div
      className={`admin-grouped-sortable-panel${browseMode ? ' is-browse' : ''}${
        hideItems ? ' is-categories-only' : ''
      }`}
      ref={panelRef}
    >
      {(hint || defaultHint) ? (
        <p className="admin-help-text admin-sortable-panel-hint">{hint || defaultHint}</p>
      ) : null}
      {categoriesOnlyMode ? (
        <div className="admin-grouped-sort-categories-bar">
          <p className="admin-help-text admin-grouped-sort-categories-hint">
            Modo categorias: arraste pelos pontinhos para reordenar os grupos.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={exitCategoriesOnlyMode}
          >
            Mostrar itens
          </button>
        </div>
      ) : null}

      {flatItemsOnly ? (
        <div className="admin-grouped-sort-items admin-grouped-sort-items-flat" data-group-sort-id="__flat__">
          {flatItems.map((item, index) => renderItemRow(item, '__flat__', index))}
          {dragState?.kind === 'item' &&
          dragState.targetGroupId === '__flat__' &&
          dragState.insertIndex === flatItems.length ? (
            <div className="admin-sortable-placeholder" style={{ height: dragOrigin?.height || 52 }} />
          ) : null}
        </div>
      ) : (
        sectionGroups.map((group, groupIndex) => {
          const groupId = getGroupId(group);
          const groupItems = itemsByGroup.get(groupId) || [];
          const isExpanded = !hideItems && expandedGroupIds.has(groupId);
          const isDraggingGroup = dragState?.kind === 'group' && dragState.id === groupId;
          const showGroupPlaceholder =
            dragState?.kind === 'group' && dragState.insertIndex === groupIndex && !isDraggingGroup;

          return (
            <div key={groupId} className="admin-grouped-sort-group-slot">
              {showGroupPlaceholder ? (
                <div className="admin-sortable-placeholder" style={{ height: dragOrigin?.height || 56 }} />
              ) : null}
              <div
                className={`admin-card admin-catalog-card admin-grouped-sort-group-card${
                  hideItems ? ' is-collapsed-only' : ''
                }`}
                data-group-sort-id={groupId}
              >
                <div
                  className={`admin-catalog-header-bar admin-grouped-sort-group-header ${
                    isDraggingGroup ? 'is-dragging' : ''
                  }${hideItems ? ' is-compact' : ''}`}
                  style={renderDraggingStyle(isDraggingGroup)}
                >
                  {onGroupsReorder && groupId !== ADMIN_UNGROUPED_ID ? (
                    <button
                      type="button"
                      className="admin-draggable-reorder-handle admin-grouped-sort-grip"
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
                      <GripIcon />
                    </button>
                  ) : (
                    <span className="admin-grouped-sort-handle-spacer" aria-hidden="true" />
                  )}
                  <div className="admin-grouped-sort-group-main">
                    {renderGroupHeader(group, {
                      isExpanded,
                      itemCount: groupItems.length,
                      categoriesOnly: hideItems,
                      onToggle: () => toggleGroup(groupId),
                    })}
                  </div>
                  {!hideItems && renderGroupActions
                    ? renderGroupActions(group, { itemCount: groupItems.length })
                    : null}
                </div>

                <div
                  className={`admin-grouped-sort-items-wrap${isExpanded ? ' is-open' : ''}`}
                  aria-hidden={!isExpanded}
                >
                  {isExpanded ? (
                    <div className="admin-grouped-sort-items">
                      {groupItems.length ? (
                        groupItems.map((item, index) => renderItemRow(item, groupId, index))
                      ) : (
                        <div className="admin-grouped-sort-empty">Nenhum item nesta categoria.</div>
                      )}
                      {dragState?.kind === 'item' &&
                      dragState.targetGroupId === groupId &&
                      dragState.insertIndex === groupItems.length ? (
                        <div className="admin-sortable-placeholder" style={{ height: dragOrigin?.height || 52 }} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
