import { buildInitialMenuStoreState } from '@/lib/superAdmin/createStore';
import { getModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { fetchStoreStateBySlugServer } from '@/lib/supabase/storeStateServer';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Monta menu_store_state para nova loja — opcionalmente copia catálogo da loja modelo.
 */
export async function buildStoreStateForCreate(supabase, input) {
  const base = buildInitialMenuStoreState(input);
  const modelSlug = getModelStoreSlug();
  if (!input.cloneFromModel || !modelSlug) return base;

  const modelRow = await fetchStoreStateBySlugServer(modelSlug);
  if (!modelRow?.data) return base;

  const cloned = cloneJson(modelRow.data);
  cloned.loja = {
    ...cloned.loja,
    slug: input.slug,
    nome: input.nome,
    telefone: input.telefone || '',
    whatsapp: input.telefone || '',
    segmento: input.segmento || '',
    enderecoCidade: input.cidade || '',
    endereco: input.cidade || '',
    aberta: true,
    fechadaManual: false,
  };
  cloned.pedidos = [];
  cloned.clientes = [];
  return cloned;
}
