'use client';

import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from 'motion/react';
import { cn } from '@/lib/utils/cn';

export function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

function Row({ item, getId, renderItem, dragDisabled }) {
  const dragControls = useDragControls();
  const id = getId(item);

  return (
    <Reorder.Item
      value={item}
      id={id}
      dragListener={false}
      dragControls={dragControls}
      className="admin-draggable-reorder-item"
    >
      <motion.div
        layout
        className="admin-draggable-reorder-row"
        whileDrag={{
          scale: 1.02,
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
          zIndex: 50,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        {!dragDisabled ? (
          <button
            type="button"
            className="admin-draggable-reorder-handle"
            aria-label="Arrastar para reordenar"
            onPointerDown={(event) => dragControls.start(event)}
          >
            <GripIcon />
          </button>
        ) : null}
        <div className="admin-draggable-reorder-body">
          {renderItem ? renderItem(item) : null}
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

/**
 * Lightswind draggable-reorder-list adaptado ao admin (motion/react + CSS admin).
 * Controlado: `items` + `onReorder`.
 */
export function DraggableReorderList({
  items,
  onReorder,
  getId = (item) => item.id,
  renderItem,
  className = '',
  dragDisabled = false,
  emptyLabel = 'Nenhum passo adicionado.',
}) {
  return (
    <div className={cn('admin-draggable-reorder-list', className)}>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(next) => onReorder?.(next)}
        className="admin-draggable-reorder-group"
        as="div"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <Row
              key={getId(item)}
              item={item}
              getId={getId}
              renderItem={renderItem}
              dragDisabled={dragDisabled}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {!items.length ? (
        <p className="admin-draggable-reorder-empty">{emptyLabel}</p>
      ) : null}
    </div>
  );
}

export default DraggableReorderList;
