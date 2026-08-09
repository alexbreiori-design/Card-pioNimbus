'use client';

import AdminGridPickerModal from '@/components/admin/AdminGridPickerModal';

export default function AdminComboProductPickerModal({
  open,
  products = [],
  categories = [],
  selectedIds = [],
  onToggle,
  onSetSelectedIds,
  onClose,
}) {
  return (
    <AdminGridPickerModal
      open={open}
      title="Adicionar produto ao combo"
      subtitle="Selecione produtos existentes para montar o combo."
      items={products}
      categories={categories}
      selectedIds={selectedIds}
      onToggle={onToggle}
      onSetSelectedIds={onSetSelectedIds}
      onClose={onClose}
      searchPlaceholder="Pesquisar produto..."
      emptyLabel="Nenhum produto encontrado."
      concludeLabel="Concluir"
      showPrice
      showCategoryChips
    />
  );
}
