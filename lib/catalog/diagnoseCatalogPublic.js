import { buildProductSectionKey } from '@/lib/cardapio/catalogSections';
import { isLegacyCatalogPublicFormat } from '@/lib/catalogPublic';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';

/**
 * Valida consistência entre products[] e categories[] de um catalog_public.
 * Útil para debugar lojas onde produtos somem ou seções ficam vazias.
 */
export function diagnoseCatalogPublic(catalog = {}) {
  const products = catalog.products || [];
  const categories = catalog.categories || ['Todos'];
  const categorySet = new Set(categories.filter((cat) => cat !== 'Todos'));
  const issues = [];

  if (isLegacyCatalogPublicFormat(categories, products)) {
    issues.push({
      code: 'legacy_section_format',
      message:
        'Catálogo público legado ou nomes de categoria com ":" (ex.: "Marmitex Do Dia:"). Compatível na leitura; salve o catálogo no admin para regenerar.',
    });
  }

  const keysFromProducts = new Set();
  const orphans = [];
  const missingKeys = [];

  products.forEach((product) => {
    const sectionKey = product.sectionKey || buildProductSectionKey(product);
    keysFromProducts.add(sectionKey);

    if (product.category === PROMO_CATEGORY_NAME) return;

    if (!categorySet.has(sectionKey)) {
      orphans.push({
        id: product.id,
        name: product.name,
        sectionKey,
        category: product.category,
        type: product.type,
      });
    }
  });

  categorySet.forEach((key) => {
    if (key === PROMO_CATEGORY_NAME) return;
    if (!keysFromProducts.has(key)) {
      missingKeys.push(key);
    }
  });

  if (orphans.length) {
    issues.push({
      code: 'orphan_products',
      message: `${orphans.length} produto(s) com sectionKey fora de categories[]`,
      sample: orphans.slice(0, 5),
    });
  }

  if (missingKeys.length) {
    issues.push({
      code: 'empty_sections',
      message: `${missingKeys.length} seção(ões) em categories[] sem produtos`,
      sample: missingKeys.slice(0, 10),
    });
  }

  const marmitaProducts = products.filter((p) => p.type === 'marmita');
  const marmitaWithoutPublicName = marmitaProducts.filter(
    (p) => !String(p.marmitaConfig?.nomePublico || '').trim()
  );
  if (marmitaWithoutPublicName.length) {
    issues.push({
      code: 'marmita_missing_nome_publico',
      message: `${marmitaWithoutPublicName.length} card(s) de marmita sem nomePublico no config`,
      sample: marmitaWithoutPublicName.slice(0, 3).map((p) => p.id),
    });
  }

  const vitrineCards = marmitaProducts.filter((p) => p.isMarmitaVitrine);
  if (marmitaProducts.length && !vitrineCards.length) {
    const hasMarmitaSection = [...keysFromProducts].some((key) => key.startsWith('marmita:'));
    if (!hasMarmitaSection) {
      issues.push({
        code: 'marmita_hidden',
        message:
          'Há marmitas no catálogo mas nenhuma seção marmita: — verifique dia ativo, nomePublico, horário vinculado ou vitrine.',
      });
    }
  }

  return {
    ok: issues.length === 0,
    productCount: products.length,
    categoryCount: categories.length - 1,
    marmitaProductCount: marmitaProducts.length,
    issues,
  };
}
