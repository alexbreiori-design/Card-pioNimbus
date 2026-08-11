'use client';

import AdminGridPickerModal from '@/components/admin/AdminGridPickerModal';

export default function PizzaSaboresPickerModal({
  sabores = [],
  selectedIds = [],
  onChange,
  onClose,
  exibirFotos = true,
  onExibirFotosChange,
}) {
  function handleToggle(sabor) {
    const has = selectedIds.includes(sabor.id);
    onChange?.(
      has ? selectedIds.filter((id) => id !== sabor.id) : [...selectedIds, sabor.id]
    );
  }

  return (
    <AdminGridPickerModal
      open
      title="Selecionar sabores"
      subtitle="Marque os sabores que entram nesta categoria."
      items={sabores}
      selectedIds={selectedIds}
      onToggle={handleToggle}
      onSetSelectedIds={onChange}
      onClose={onClose}
      searchPlaceholder="Pesquisar sabor..."
      emptyLabel="Nenhum sabor encontrado."
      concludeLabel="Salvar seleção"
      showPrice={false}
      showCategoryChips={false}
      showExibirFotos
      exibirFotos={exibirFotos !== false}
      onExibirFotosChange={onExibirFotosChange}
    />
  );
}
