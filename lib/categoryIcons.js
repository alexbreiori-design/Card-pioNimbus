import { LEGACY_CATEGORY_ICONS } from '@/lib/categoryIconsShared';

/** Lista estática mínima (SSR / fallback). Admin carrega a lista completa via API. */
export const CATEGORY_ICONS = LEGACY_CATEGORY_ICONS;

export {
  FALLBACK_ICON_ID,
  getCategoryIconPath,
  humanizeIconId,
  isStrokeCategoryIcon,
  mergeCategoryIconLists,
  supportsMaskTint,
} from '@/lib/categoryIconsShared';
