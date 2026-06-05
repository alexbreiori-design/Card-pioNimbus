export const ADMIN_STORAGE_KEY = 'cardapio_admin_data_v1';

/** Apenas metadados da loja quando não há dados remotos — sem produtos de demonstração. */
export const DEFAULT_ADMIN_DATA = {
  loja: {
    nome: 'Nimbus Burger',
    slug: 'nimbus-burger',
    telefone: '',
    whatsapp: '(43)99192-9193',
    endereco: '',
    documentoFiscal: '',
    pedidoMinimo: 0,
    descricao: '',
    aberta: true,
    fechadaManual: false,
    corMarca: '#4e48dd',
    chavePix: '',
    descricaoChavePix: '',
    metaPixelId: '',
    segmento: '',
    tempoEntregaDelivery: '00:45',
    tempoEntregaRetirada: '00:30',
    paletteColors: [],
    paletteLogoUrl: '',
    logoUrl: 'https://drive.google.com/file/d/1uoeUbb8J8qlNSPX0gqKyeUVEkKXqlpNp/view?usp=sharing',
    logoComandaUrl: '',
    capaUrl: 'https://drive.google.com/file/d/1KGWQUGzj6qXy-34J6Yd3nCxWKlDGQdsO/view?usp=sharing',
    horarios: {
      segunda: { fechado: false, abertura: '14:00', fechamento: '23:00' },
      terca: { fechado: false, abertura: '14:00', fechamento: '23:00' },
      quarta: { fechado: false, abertura: '14:00', fechamento: '23:00' },
      quinta: { fechado: false, abertura: '14:00', fechamento: '23:00' },
      sexta: { fechado: false, abertura: '14:00', fechamento: '23:30' },
      sabado: { fechado: false, abertura: '14:00', fechamento: '23:30' },
      domingo: { fechado: false, abertura: '14:00', fechamento: '23:00' },
    },
  },
  categorias: [],
  produtos: [],
  adicionaisCategorias: [],
  adicionaisItens: [],
  promocoes: [],
  cupons: [],
  clientes: [],
  pedidos: [],
};

function sortByOrdem(list) {
  return [...list].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

export function withDerivedData(data) {
  const loja = { ...DEFAULT_ADMIN_DATA.loja, ...(data?.loja || {}) };
  const categorias = sortByOrdem(Array.isArray(data?.categorias) ? data.categorias : []);
  const produtos = sortByOrdem(Array.isArray(data?.produtos) ? data.produtos : []);
  const adicionaisCategorias = sortByOrdem(
    Array.isArray(data?.adicionaisCategorias) ? data.adicionaisCategorias : []
  );
  const adicionaisItens = sortByOrdem(Array.isArray(data?.adicionaisItens) ? data.adicionaisItens : []);
  const promocoes = sortByOrdem(Array.isArray(data?.promocoes) ? data.promocoes : []);
  const cupons = sortByOrdem(Array.isArray(data?.cupons) ? data.cupons : []);
  const clientes = [...(Array.isArray(data?.clientes) ? data.clientes : [])].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0).getTime() -
      new Date(a.updated_at || a.created_at || 0).getTime()
  );

  return {
    _meta: data?._meta || {},
    loja,
    categorias,
    produtos,
    adicionaisCategorias,
    adicionaisItens,
    promocoes,
    cupons,
    clientes,
    pedidos: [...(Array.isArray(data?.pedidos) ? data.pedidos : [])].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ),
  };
}
