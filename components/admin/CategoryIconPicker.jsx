'use client';

import CategoryIcon from '@/components/admin/CategoryIcon';
import { useCategoryIcons } from '@/hooks/useCategoryIcons';

export default function CategoryIconPicker({ value, onChange }) {
  const icons = useCategoryIcons();

  return (
    <div className="admin-category-icon-picker">
      {icons.map((icon) => {
        const isActive = value === icon.id;
        return (
          <button
            key={icon.id}
            type="button"
            className={`admin-category-icon-option${isActive ? ' active' : ''}`}
            onClick={() => onChange(icon.id)}
            title={icon.label}
            aria-pressed={isActive}
          >
            <CategoryIcon name={icon.id} size={24} tinted />
          </button>
        );
      })}
    </div>
  );
}
