export const ADMIN_STORAGE_KEY = 'cardapio_admin_data_v1';

export const DEFAULT_ADMIN_DATA = {
  loja: {
    nome: 'Açaí da Serra',
    slug: 'acai-da-serra',
    telefone: '(11) 98888-1234',
    whatsapp: '(11) 98888-1234',
    endereco: 'Rua das Palmeiras, 450 – Vila Madalena, SP',
    documentoFiscal: '',
    pedidoMinimo: 0,
    descricao: '',
    aberta: true,
    corMarca: '#610C27',
    chavePix: '',
    descricaoChavePix: '',
    metaPixelId: '',
    paletteColors: [],
    paletteLogoUrl: '',
    logoUrl: '',
    capaUrl: '',
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
  categorias: [
    { id: 'cat-1', nome: 'Combos com Promoção!', ativo: true, ordem: 0 },
    { id: 'cat-2', nome: 'Açaí no Copo', ativo: true, ordem: 1 },
    { id: 'cat-3', nome: 'Bebidas', ativo: true, ordem: 2 },
  ],
  produtos: [
    {
      id: 'prod-1',
      categoriaId: 'cat-1',
      nome: 'Cremes de 500g + 3 adicionais Grátis',
      descricao: '1 ou 2 cremes no mesmo recipiente metade/metade.',
      preco: 42.9,
      imagemUrl: '',
      ativo: true,
      ordem: 0,
      tags: ['500g', 'Promo'],
    },
    {
      id: 'prod-2',
      categoriaId: 'cat-2',
      nome: 'Açaí no Copo 300ml',
      descricao: 'Açaí cremoso com 1 topping à escolha.',
      preco: 18.9,
      imagemUrl: '',
      ativo: true,
      ordem: 0,
      tags: ['300ml'],
    },
    {
      id: 'prod-3',
      categoriaId: 'cat-3',
      nome: 'Água mineral',
      descricao: 'Água mineral sem gás 500ml.',
      preco: 5,
      imagemUrl: '',
      ativo: true,
      ordem: 0,
      tags: ['500ml'],
    },
  ],
  adicionaisCategorias: [
    { id: 'add-cat-1', nome: 'Complementos', ativo: true, ordem: 0 },
  ],
  adicionaisItens: [
    {
      id: 'add-item-1',
      categoriaId: 'add-cat-1',
      nome: 'Granola extra',
      descricao: 'Porção adicional de granola.',
      preco: 3,
      imagemUrl: '',
      ativo: true,
      ordem: 0,
      tags: ['extra'],
    },
  ],
  promocoes: [],
  cupons: [],
  pedidos: [
    {
      id: '1042',
      status: 'novo',
      tipo: 'delivery',
      clienteNome: 'Maria Silva',
      clienteTelefone: '(11) 98888-1234',
      clienteRef: '',
      atendente: 'Sistema',
      createdAt: new Date().toISOString(),
      prazo: '16:23',
      endereco: {
        cep: '01310-100',
        logradouro: 'Rua das Flores',
        numero: '120',
        bairro: 'Centro',
        cidade: 'São Paulo',
        complemento: '',
      },
      observacao: '',
      itens: [],
      subtotal: 48.9,
      frete: 0,
      acrescimo: 0,
      desconto: 0,
      total: 48.9,
      historico: [{ status: 'novo', at: new Date().toISOString() }],
      pagamento: { metodo: 'dinheiro', recebido: 50, troco: 1.1 },
      autoImported: false,
    },
  ],
};

export function withDerivedData(data) {
  const loja = { ...DEFAULT_ADMIN_DATA.loja, ...(data?.loja || {}) };
  const categorias = [...(data?.categorias || DEFAULT_ADMIN_DATA.categorias)].sort(
    (a, b) => a.ordem - b.ordem
  );
  const produtos = [...(data?.produtos || DEFAULT_ADMIN_DATA.produtos)].sort(
    (a, b) => a.ordem - b.ordem
  );
  const adicionaisCategorias = [
    ...(data?.adicionaisCategorias || DEFAULT_ADMIN_DATA.adicionaisCategorias),
  ].sort((a, b) => a.ordem - b.ordem);
  const adicionaisItens = [...(data?.adicionaisItens || DEFAULT_ADMIN_DATA.adicionaisItens)].sort(
    (a, b) => a.ordem - b.ordem
  );
  const promocoes = [...(data?.promocoes || DEFAULT_ADMIN_DATA.promocoes)].sort(
    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
  );
  const cupons = [...(data?.cupons || DEFAULT_ADMIN_DATA.cupons)].sort(
    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
  );

  return {
    loja,
    categorias,
    produtos,
    adicionaisCategorias,
    adicionaisItens,
    promocoes,
    cupons,
    pedidos: [...(data?.pedidos || DEFAULT_ADMIN_DATA.pedidos)].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ),
  };
}
