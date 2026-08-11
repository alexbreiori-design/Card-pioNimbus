import { NIMBUS_DEMO_SLUG, NIMBUS_PRICE } from '@/lib/landing/constants';

export const landingNav = [
  { id: 'dores', label: 'Por que mudar', icon: 'frown' },
  { id: 'proposito', label: 'Nossa visão', icon: 'star' },
  { id: 'recursos', label: 'O sistema', icon: 'grid' },
  { id: 'preco', label: 'Preço', icon: 'tag' },
  { id: 'faq', label: 'Dúvidas', icon: 'faq' },
];

export const landingHero = {
  titleBefore: 'O cardápio mais',
  titleAfter: 'para o seu restaurante.',
  titleWords: ['bonito', 'prático', 'honesto'],
  lead: 'Um cardápio bonito para o seu cliente, prático para a equipe e honesto para o seu bolso.',
  hint: 'Clique no aparelho para experimentar',
  calloutTitle: 'Comprove a melhor\nexperiência de compra!',
  calloutSub: 'Clique em um dos dispositivos e teste.',
  demoClose: 'Fechar demonstração',
  chips: [
    'Ativação em 48h',
    'Suporte humano',
    'Sem taxa por pedido',
    'Frete por distância',
    'Cardápio do dia automático',
  ],
};

export const landingPains = {
  eyebrow: 'A verdade é que...',
  titleLine1: 'Se você chegou até aqui,',
  titleLine2Before: 'é porque ',
  titleHighlight: 'já sabe',
  titleLine2After: ' que precisa',
  titleLine3: 'de um cardápio digital.',
  body: 'Talvez você já tenha testado outras opções. Talvez já tenha se\nfrustrado com sistemas complicados, taxas altas ou que prometem muito e entregam pouco.',
  emphasis: 'A boa notícia? Você acabou de encontrar diferente.',
  mascotSrc: '/images/landing/mascote-page.webp',
  mascotAlt: 'Mascote Nimbus',
  bubbles: [
    {
      icon: 'clock',
      tone: 'purple',
      text: 'Perco muito tempo respondendo pedidos no WhatsApp.',
    },
    {
      icon: 'calculator',
      tone: 'pink',
      text: 'Os sistemas são caros e nenhum pouco práticos.',
    },
    {
      icon: 'user',
      tone: 'blue',
      text: 'Meus clientes reclamam que é difícil fazer o pedido.',
    },
    {
      icon: 'trendUp',
      tone: 'green',
      text: 'Eu só quero é vender mais e ter menos dor de cabeça.',
    },
  ],
  reality: {
    eyebrow: 'A realidade do delivery hoje',
    title: 'Você lida com muitos desafios todos os dias',
    lead: 'E a maioria dos cardápios digitais só adiciona mais um problema.',
    challenges: [
      {
        icon: 'headphones',
        tone: 'pink',
        title: 'Pedidos espalhados',
        text: 'WhatsApp, Instagram, telefone, iFood... tudo misturado e difícil de organizar.',
      },
      {
        icon: 'clock',
        tone: 'blue',
        title: 'Tempo perdido',
        text: 'Você ou sua equipe gastam horas do dia respondendo as mesmas perguntas.',
      },
      {
        icon: 'currency',
        tone: 'purple',
        title: 'Pagando caro',
        text: 'Taxas altas, planos cheios de coisas que você não usa e ainda limitações chatas.',
      },
      {
        icon: 'frown',
        tone: 'orange',
        title: 'Experiência ruim',
        text: 'Cardápios feios, lentos e difíceis de usar afastam seus clientes.',
      },
      {
        icon: 'trendUp',
        tone: 'green',
        title: 'Poderia sair mais venda',
        text: 'Um cardápio mal feito pode te fazer perder pedidos todos os dias, sem você perceber.',
      },
    ],
    bannerBold: 'Não deveria ser assim.',
    bannerRest: ' Seu restaurante merece mais. Seus clientes também.',
  },
};

export const landingPurpose = {
  eyebrow: 'O nosso propósito',
  titleBefore: 'Uma nova visão para o',
  titleHighlight: 'cardápio digital',
  lead: 'Criado por quem também se cansou dos mesmos sistemas de sempre.',
  cards: [
    {
      id: 'bonito',
      icon: 'star',
      title: 'Bonito',
      description: 'Porque o cardápio é a primeira impressão do seu restaurante.',
      image: '/images/landing/features/purpose-bonito.png',
      imageAlt: 'Cardápio Nimbus no celular',
    },
    {
      id: 'pratico',
      icon: 'check',
      title: 'Prático',
      descriptionBefore: 'Porque ninguém deveria ',
      descriptionBold: 'perder tempo',
      descriptionAfter: ' aprendendo a usar um sistema.',
      image: '/images/landing/features/purpose-pratico.png',
      imageAlt: 'Painel Nimbus no tablet',
    },
    {
      id: 'honesto',
      icon: 'shield',
      title: 'Honesto',
      descriptionBefore: 'Porque você merece pagar por um ',
      descriptionBold: 'produto que resolve seu problema',
      descriptionAfter: ', não por centenas de funções que nunca vai usar.',
      bullets: [
        'Tudo que sua operação precisa',
        'Com preço justo',
        'Sem recursos desnecessários',
        'Suporte que realmente ajuda',
      ],
      piggyImage: '/images/landing/features/purpose-honesto-piggy.png',
      piggyAlt: 'Cofrinho ilustrando preço justo',
      mascotImage: '/images/landing/features/mascote-nuvem.png',
      mascotAlt: 'Mascote Nimbus',
    },
  ],
  bannerLine1Before: 'Mais do que um cardápio digital, o Nimbus é feito para o ',
  bannerLine1Bold: 'dia a dia do seu restaurante.',
  bannerLine2Parts: [
    'Bonito para o seu cliente',
    'Prático para a sua equipe',
    'Honesto para o seu bolso.',
  ],
};

export const landingFeaturesShowcase = {
  eyebrow: 'Tudo o que seu restaurante precisa',
  titleBefore: 'Um sistema ',
  titleHighlight: 'completo',
  titleMid: ' para',
  titleAfter: 'cuidar do seu restaurante, do início ao fim.',
  footerNote: 'E isso é só uma fração do que o nosso sistema tem a oferecer!',
  footerCta: 'Ver todas as funcionalidades',
  categories: [
    {
      id: 'venda-online',
      icon: 'bag',
      tone: 'violet',
      title: 'Venda online',
      summary: 'Cardápio e pedido do cliente',
      description:
        'Seu cliente encontra tudo com facilidade e faz o pedido em poucos minutos, do jeito que preferir.',
      image: '/images/landing/features/feature-venda-online.png',
      imageAlt: 'Cardápio e pedido online no Nimbus',
      chips: [
        { icon: 'menu', label: 'Cardápio personalizado' },
        { icon: 'tag', label: 'Combos e adicionais' },
        { icon: 'currency', label: 'Pagamentos online' },
        { icon: 'sparkle', label: 'Promoções inteligentes' },
      ],
    },
    {
      id: 'pedidos',
      icon: 'orders',
      tone: 'pink',
      title: 'Pedidos',
      summary: 'Recebimento e gestão de pedidos',
      description:
        'Cada pedido chega organizado e sua equipe acompanha tudo sem perder tempo ou deixar algo passar.',
      image: '/images/landing/features/feature-pedidos.png',
      imageAlt: 'Painel de pedidos do Nimbus',
      chips: [
        { icon: 'orders', label: 'Pedidos organizados' },
        { icon: 'steps', label: 'Comandas automáticas' },
        { icon: 'store', label: 'Vendas no balcão' },
        { icon: 'bell', label: 'Avisos em tempo real' },
      ],
    },
    {
      id: 'entregas',
      icon: 'truck',
      tone: 'blue',
      title: 'Entregas',
      summary: 'Rotas e status de entrega',
      description:
        'Do preparo até a entrega, acompanhe cada etapa e mantenha seu cliente sempre informado.',
      image: '/images/landing/features/feature-entregas.png',
      imageAlt: 'Rotas e entregas no Nimbus',
      chips: [
        { icon: 'mapPin', label: 'Rotas de entrega' },
        { icon: 'trendUp', label: 'Acompanhamento do pedido' },
        { icon: 'whatsapp', label: 'WhatsApp automático' },
        { icon: 'truck', label: 'Delivery ou retirada' },
      ],
    },
    {
      id: 'gestao',
      icon: 'trendUp',
      tone: 'emerald',
      title: 'Gestão',
      summary: 'Relatórios e desempenho',
      description:
        'Veja o que realmente importa para tomar decisões mais inteligentes e acompanhar o crescimento da sua loja.',
      image: '/images/landing/features/feature-gestao.png',
      imageAlt: 'Relatórios e métricas no Nimbus',
      chips: [
        { icon: 'trendUp', label: 'Relatórios completos' },
        { icon: 'calculator', label: 'Métricas de conversão' },
        { icon: 'user', label: 'Histórico de clientes' },
        { icon: 'star', label: 'Produtos mais vendidos' },
      ],
    },
    {
      id: 'personalizacao',
      icon: 'palette',
      tone: 'orange',
      title: 'Personalização',
      summary: 'Identidade e visual da loja',
      description:
        'Deixe o cardápio com a identidade do seu restaurante e publique tudo com poucos cliques.',
      image: '/images/landing/features/feature-personalizacao.png',
      imageAlt: 'Personalização da loja no Nimbus',
      chips: [
        { icon: 'palette', label: 'Sua identidade visual' },
        { icon: 'link', label: 'Link exclusivo' },
        { icon: 'clock', label: 'Horários automáticos' },
        { icon: 'image', label: 'Banners e destaques' },
      ],
    },
  ],
};

export const landingPricing = {
  title: 'Um preço. Tudo incluso.',
  text: 'Sem plano Pro, sem módulo extra. Valor fixo pelo Cardápio Nimbus completo.',
  planName: 'Nimbus Completo',
  price: NIMBUS_PRICE,
  period: '/ mês',
  note: 'Sem fidelidade no contrato. Cancele quando quiser.',
  cardTagline: 'Tudo incluso · sem módulos extras',
  features: [
    'Cardápio público ilimitado',
    'Painel de pedidos em kanban',
    'Produtos, adicionais, promoções e cupons',
    'Taxa de entrega por zona e distância',
    'Pixel do Facebook',
    'WhatsApp no fluxo de pedidos',
    'Impressão de ticket térmico',
    'CRM de clientes',
    'Múltiplos endereços por cliente',
    'Troca automática de cardápio por dia',
    'Suporte 100% humano',
    'Treinamento incluso',
    'Ativação em até 48h',
    'Segmentos adaptados (marmita, pizza e mais)',
  ],
};

export const landingFaq = [
  {
    q: 'Preciso saber de tecnologia?',
    a: 'Não. O treinamento é em linguagem simples e você domina o essencial em menos de 15 minutos.',
  },
  {
    q: 'Tem fidelidade no contrato?',
    a: 'Não. A mensalidade é sem fidelidade e você cancela quando quiser.',
  },
  {
    q: 'A Nimbus cobra por pedido?',
    a: 'Não. R$ 149,90/mês com tudo incluso, sem taxa em cima de cada venda.',
  },
  {
    q: 'Como o cliente paga?',
    a: 'Pix, dinheiro ou cartão na entrega. Você configura do seu jeito.',
  },
  {
    q: 'Como funciona a taxa de entrega?',
    a: 'Você cadastra zonas por km. A Nimbus calcula e mostra o frete antes da confirmação.',
  },
  {
    q: 'Em quanto tempo fica pronto?',
    a: 'Ativação em até 48 horas com acompanhamento da equipe.',
  },
  {
    q: 'Serve para pizzaria e marmitaria?',
    a: 'Sim. O cardápio se adapta ao segmento da sua loja.',
  },
];

export const landingFooter = {
  product: [
    { label: 'Por que mudar', href: '#dores' },
    { label: 'Nossa visão', href: '#proposito' },
    { label: 'O sistema', href: '#recursos' },
    { label: 'Preço', href: '#preco' },
    { label: 'Ver exemplo', href: `/${NIMBUS_DEMO_SLUG}` },
  ],
  company: [
    { label: 'Falar no WhatsApp', href: 'whatsapp' },
    { label: 'Login lojista', href: '/login' },
  ],
  resources: [
    { label: 'Dúvidas', href: '#faq' },
    { label: 'Cardápio demo', href: `/${NIMBUS_DEMO_SLUG}` },
  ],
  legal: [
    { label: 'Privacidade', href: '/privacidade?from=%2F' },
    { label: 'Termos', href: '/termos?from=%2F' },
  ],
};
