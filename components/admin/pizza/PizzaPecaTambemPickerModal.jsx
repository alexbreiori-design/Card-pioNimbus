'use client';

import AdminGridPickerModal from '@/components/admin/AdminGridPickerModal';
import { MAX_PECA_TAMBEM } from '@/lib/productSuggestions';

export default function PizzaPecaTambemPickerModal({
  products = [],
  categories = [],
  selectedIds = [],
  onChange,
  onClose,
  subtitle = `Selecione até ${MAX_PECA_TAMBEM} produtos sugeridos na sacola do cardápio.`,
}) {
  function handleToggle(product) {
    const has = selectedIds.includes(product.id);
    if (has) {
      onChange?.(selectedIds.filter((id) => id !== product.id));
      return;
    }
    if (selectedIds.length >= MAX_PECA_TAMBEM) return;
    onChange?.([...selectedIds, product.id]);
  }

  return (
    <AdminGridPickerModal
      open
      title="Peça também"
      subtitle={subtitle}
      items={products}
      categories={categories}
      selectedIds={selectedIds}
      onToggle={handleToggle}
      onSetSelectedIds={onChange}
      onClose={onClose}
      maxSelection={MAX_PECA_TAMBEM}
      searchPlaceholder="Pesquisar produto..."
      emptyLabel="Nenhum produto encontrado."
      concludeLabel="Salvar seleção"
      showPrice
      showCategoryChips
      keepImageColor
    />
  );
}
