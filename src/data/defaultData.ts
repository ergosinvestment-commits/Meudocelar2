import { StoreConfig, Product, Category, Platform } from '../types';

export const FALLBACK_STORE_CONFIG: StoreConfig = {
  id: 'store-1',
  slug: 'achadinhos-da-maria',
  storeName: 'Meudocelar',
  logo: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80&fm=webp',
  instagram: '@meudocelar',
  facebook: 'facebook.com/meudocelar',
  tiktok: '@meudocelar',
  pixelFacebook: '',
  googleAnalytics: '',
  googleAds: '',
  corPrimaria: '#2A5C3F',
  corSecundaria: '#1B1B1B',
  bannerUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80&fm=webp',
  bannerLink: 'Eletrônicos',
  bannerTag: 'SELEÇÃO ESPECIAL',
  bannerTitulo: 'Ofertas Imperdíveis do Dia',
  bannerSubtitulo: 'Ofertas com até 60% de desconto e cupons exclusivos testados.',
  tituloSite: 'Meudocelar — As Melhores Ofertas e Produtos para seu Lar',
  descricaoSite: 'Encontre produtos imperdíveis para sua casa e dia a dia na Amazon, Shopee, Mercado Livre e Magalu.',
  lojaAtiva: true,
  msgManutencao: 'Estamos atualizando nosso catálogo de promoções. Volte em breve!',
  mensagemTopo: '🔥 Frete Grátis e Cupons Exclusivos adicionados hoje! Aproveite antes que acabem.',
  corBarraTopo: '#2A5C3F',
  cnpj: '',
  endereco: 'São Paulo, SP - Brasil',
  email: 'contato@meudocelar.com.br',
  canalWhatsapp: 'https://whatsapp.com/channel/example',
  canalTelegram: 'https://t.me/meudocelar',
  botaoCanalFlutuante: true,
  textoDisclosure: 'Este site participa de programas de afiliados e pode receber comissão pelas compras realizadas nos links, sem custo adicional para você.',
  avisoPrecos: 'Os preços, estoques e cupons podem sofrer alterações a qualquer momento pelas lojas parceiras.',
  sobreNos: '',
  termosUso: '',
  politicaPrivacidade: ''
};

export const FALLBACK_PRODUCTS: Product[] = [];

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-1', storeId: 'store-1', nome: 'Eletrônicos', mostrarNoMenu: true, ordem: 1, subcategorias: ['Áudio', 'Wearables', 'Acessórios', 'Dispositivos'] },
  { id: 'cat-2', storeId: 'store-1', nome: 'Casa & Cozinha', mostrarNoMenu: true, ordem: 2, subcategorias: ['Eletroportáteis', 'Organização', 'Decoração'] },
  { id: 'cat-3', storeId: 'store-1', nome: 'Beleza & Cuidados', mostrarNoMenu: true, ordem: 3, subcategorias: ['Cabelos', 'Skincare', 'Maquiagem'] },
  { id: 'cat-4', storeId: 'store-1', nome: 'Moda & Acessórios', mostrarNoMenu: true, ordem: 4, subcategorias: ['Roupas', 'Calçados', 'Bolsas'] },
  { id: 'cat-5', storeId: 'store-1', nome: 'Cursos & Livros', mostrarNoMenu: true, ordem: 5, subcategorias: ['Desenvolvimento', 'Finanças', 'Negócios'] },
  { id: 'cat-6', storeId: 'store-1', nome: 'Saúde & Fitness', mostrarNoMenu: false, ordem: 6, subcategorias: ['Suplementos', 'Equipamentos'] },
];

export const FALLBACK_PLATFORMS: Platform[] = [
  { id: 'plat-1', storeId: 'store-1', nome: 'Amazon', corBadge: '#FF9900', icone: '📦', textoBotaoPadrao: 'Ver oferta na Amazon →', urlPadrao: 'https://amazon.com.br', ordem: 1, ativo: true, descricao: 'Amazon Brasil' },
  { id: 'plat-2', storeId: 'store-1', nome: 'Shopee', corBadge: '#EE4D2D', icone: '🛍️', textoBotaoPadrao: 'Pegar Desconto na Shopee →', urlPadrao: 'https://shopee.com.br', ordem: 2, ativo: true, descricao: 'Shopee Brasil' },
  { id: 'plat-3', storeId: 'store-1', nome: 'Mercado Livre', corBadge: '#EAB308', icone: '🤝', textoBotaoPadrao: 'Ver no Mercado Livre →', urlPadrao: 'https://mercadolivre.com.br', ordem: 3, ativo: true, descricao: 'Mercado Livre' },
  { id: 'plat-4', storeId: 'store-1', nome: 'Magalu', corBadge: '#0086FF', icone: '🏬', textoBotaoPadrao: 'Ver na Magalu →', urlPadrao: 'https://magazineluiza.com.br', ordem: 4, ativo: true, descricao: 'Magazine Luiza' },
  { id: 'plat-5', storeId: 'store-1', nome: 'Hotmart', corBadge: '#F97316', icone: '🎓', textoBotaoPadrao: 'Quero Conhecer o Curso →', urlPadrao: 'https://hotmart.com', ordem: 5, ativo: true, descricao: 'Hotmart' }
];

export const FALLBACK_BLOG_POSTS: any[] = [
  {
    id: 'post-1',
    storeId: 'store-1',
    slug: '5-itens-essenciais-para-transformar-sua-cozinha-em-2026',
    title: '5 Itens Essenciais que Transformam Qualquer Cozinha e Economizam Tempo',
    excerpt: 'Descubra os eletroportáteis e organizadores inteligentes que estão fazendo sucesso por unir praticidade, design elegante e ótimo custo-benefício.',
    content: `Cozinhar e manter a casa em ordem não precisa ser uma maratona cansativa. Com a evolução dos utensílios domésticos e eletroportáteis inteligentes, é possível economizar até 50% do tempo no preparo das refeições diárias e ainda deixar sua bancada com visual de revista.

### 1. A Air Fryer Digital com Janela de Visualização
Se você ainda não tem uma fritadeira sem óleo ou tem um modelo muito antigo, os novos modelos digitais com visor transparente mudaram o jogo. Você acompanha o ponto exato dos alimentos sem perder calor abrindo a gaveta.

### 2. Organizadores Acrílicos Herméticos
Manter grãos, massas e temperos em potes transparentes e empilháveis não é só estética: aumenta a durabilidade dos alimentos em até 3 vezes e evita desperdício na despensa.

### 3. Moedores Elétricos e Mini Processadores Recarregáveis
Picar alho, cebola e nozes em segundos com um clique elimina odores nas mãos e agiliza todo o refogado.

### 4. Panelas com Revestimento Cerâmico Atóxico
Mais saudáveis, exigem menos óleo e são extremamente fáceis de limpar — a esponja desliza sem esforço.

### 5. Balança Digital de Alta Precisão
Fundamental para acertar o ponto de bolos, pães e porções equilibradas sem erro.

Confira nossa seleção completa na aba **Loja** com os melhores preços garimpados diretamente na Amazon, Shopee e Mercado Livre!`,
    coverImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80&fm=webp',
    category: 'Casa & Cozinha',
    tags: ['Cozinha Prática', 'Organização', 'Achadinhos', 'Guia de Compras'],
    author: 'Equipe Meu Doce Lar',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp',
    readTime: '4 min de leitura',
    destaque: true,
    status: 'published',
    views: 342,
    publishedAt: '2026-08-28T14:00:00Z',
    createdAt: '2026-08-28T14:00:00Z'
  },
  {
    id: 'post-2',
    storeId: 'store-1',
    slug: 'guia-definitivo-de-organizacao-de-armarios-e-closet',
    title: 'Guia Definitivo: Como Dobrar o Espaço Útil do seu Armário e Closet',
    excerpt: 'Técnicas práticas de dobras verticais, cabides padronizados e organizadores modulares para manter tudo visível e acessível.',
    content: `Você já teve a sensação de abrir o armário cheio de roupas e achar que não tem nada para vestir? Esse problema quase sempre é de visibilidade, não de quantidade de peças.

Quando as roupas ficam empilhadas uma sobre a outra, as peças de baixo são esquecidas. Aqui estão as regras de ouro dos Personal Organizers:

1. **Padronize os Cabides**: Cabides finos de veludo ocupam 60% menos espaço que os de madeira ou plástico grosso e evitam que tecidos finos escorreguem.
2. **Use Colmeias Organizadoras**: Perfeitas para gavetas de roupas íntimas, meias, camisetas e roupas de academia.
3. **Aproveite a Altura dos Prateleiras**: Use cestos suspensos aramados para aproveitar o vão vertical que normalmente fica vazio.
4. **Desapego Sazonal**: A cada mudança de estação, separe o que não usou nos últimos 6 meses para doação.

Visite nossa **Loja** para encontrar os cabides de veludo e colmeias organizadoras com os melhores cupons ativos!`,
    coverImage: 'https://images.unsplash.com/photo-1558997519-83ea9252def8?w=1200&auto=format&fit=crop&q=80&fm=webp',
    category: 'Organização',
    tags: ['Closet', 'Dicas Práticas', 'Casa Organizada'],
    author: 'Maria Clara',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80&fm=webp',
    readTime: '5 min de leitura',
    destaque: false,
    status: 'published',
    views: 218,
    publishedAt: '2026-08-25T10:30:00Z',
    createdAt: '2026-08-25T10:30:00Z'
  },
  {
    id: 'post-3',
    storeId: 'store-1',
    slug: 'iluminacao-aconchegante-truques-para-transformar-sua-sala',
    title: 'Iluminação Aconchegante: 4 Truques Simples para Deixar sua Sala Quentinha',
    excerpt: 'Aprenda como luzes indiretas, lâmpadas com temperatura de cor quente e luminárias de apoio criam um clima acolhedor de refúgio.',
    content: `A iluminação tem o poder de transformar completamente o humor de uma casa. Uma luz direta de teto, muito branca e forte, pode deixar a sala com clima de consultório médico. Já pontos de luz suaves criam a atmosfera de aconchego que todos buscamos ao chegar do trabalho.

- **Temperatura de Cor**: Opte sempre por lâmpadas de 2700K a 3000K (luz amarelada/quente) nas áreas de descanso como sala e quartos.
- **Luminárias Articuladas de Mesa e Chão**: Criam cantinhos de leitura charmosos sem precisar de reforma elétrica.
- **Fitas de LED Embutidas**: Perfeitas atrás da TV ou embaixo de prateleiras para dar um efeito moderno e flutuante.
- **Velas Aromáticas e Difusores**: Complementam o estímulo visual com um aroma acolhedor de baunilha, lavanda ou alecrim.

Todos esses itens estão catalogados na nossa seção de **Eletrônicos & Casa** com links diretos para compras seguras!`,
    coverImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&auto=format&fit=crop&q=80&fm=webp',
    category: 'Decoração',
    tags: ['Iluminação', 'Decoração', 'Conforto'],
    author: 'Equipe Meu Doce Lar',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp',
    readTime: '3 min de leitura',
    destaque: false,
    status: 'published',
    views: 185,
    publishedAt: '2026-08-20T16:15:00Z',
    createdAt: '2026-08-20T16:15:00Z'
  }
];

export const FALLBACK_BLOG_CATEGORIES: any[] = [
  {
    id: 'blog-cat-1',
    storeId: 'store-1',
    name: 'Casa & Cozinha',
    slug: 'casa-cozinha',
    icon: '🍳',
    description: 'Eletroportáteis, utensílios inteligentes e truques culinários.',
    order: 1,
    active: true
  },
  {
    id: 'blog-cat-2',
    storeId: 'store-1',
    name: 'Organização',
    slug: 'organizacao',
    icon: '📦',
    description: 'Dicas práticas para closets, despensas e otimização de espaço.',
    order: 2,
    active: true
  },
  {
    id: 'blog-cat-3',
    storeId: 'store-1',
    name: 'Decoração',
    slug: 'decoracao',
    icon: '🛋️',
    description: 'Ideias aconchegantes, iluminação, paletas e ambientação.',
    order: 3,
    active: true
  },
  {
    id: 'blog-cat-4',
    storeId: 'store-1',
    name: 'Dicas de Compras',
    slug: 'dicas-de-compras',
    icon: '🛍️',
    description: 'Guia de cupons, comparativos de preços e garimpos confiáveis.',
    order: 4,
    active: true
  },
  {
    id: 'blog-cat-5',
    storeId: 'store-1',
    name: 'Tecnologia & Smart Home',
    slug: 'smart-home',
    icon: '💡',
    description: 'Dispositivos inteligentes, automação e gadgets práticos.',
    order: 5,
    active: true
  }
];

export const FALLBACK_BLOG_EDITORS: any[] = [
  {
    id: 'editor-1',
    storeId: 'store-1',
    name: 'Maria Clara',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80&fm=webp',
    role: 'Editora-Chefe & Curadora de Achadinhos',
    bio: 'Pesquisadora obsessiva por produtos de alta qualidade com o melhor custo-benefício para transformar lares em refúgios confortáveis.',
    socialLink: 'https://instagram.com/meudocelar',
    email: 'mariaclara@achadinhosdamaria.com.br',
    active: true
  },
  {
    id: 'editor-2',
    storeId: 'store-1',
    name: 'Equipe Meu Doce Lar',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp',
    role: 'Equipe Editorial & Testes Práticos',
    bio: 'Nosso time multidisciplinar que testa produtos, valida cupons de desconto em tempo real e compartilha guias sinceros.',
    socialLink: 'https://instagram.com/meudocelar',
    email: 'contato@achadinhosdamaria.com.br',
    active: true
  },
  {
    id: 'editor-3',
    storeId: 'store-1',
    name: 'Lucas Brandão',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80&fm=webp',
    role: 'Especialista em Smart Home & Gadgets',
    bio: 'Entusiasta de automação residencial, gadgets úteis e tecnologia que simplifica a rotina doméstica sem custar uma fortuna.',
    socialLink: 'https://instagram.com',
    email: 'lucas@achadinhosdamaria.com.br',
    active: true
  }
];

export const FALLBACK_BLOG_SETTINGS: any = {
  storeId: 'store-1',
  heroBackgroundImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80&fm=webp',
  heroOverlayOpacity: 65,
  heroTitle: 'Guia de Achadinhos & Dicas para seu Lar',
  heroSubtitle: 'Análises sinceras, seleções com os melhores preços garimpados e dicas práticas de organização para sua rotina.',
  heroBadge: 'BLOG & DICAS EXCLUSIVAS',
  heroShowSearch: true,
  heroSearchPlaceholder: 'Buscar artigos por tema (ex: Air Fryer, Cozinha, Organização)...',
  heroShowCta: true,
  heroCtaText: 'Explorar Vitrine de Ofertas',
  heroCtaTarget: 'store',
  topBarEnabled: false,
  topBarText: '✨ Confira os novos achadinhos e guias de compras da semana!',
  topBarBgColor: '#2A5C3F',
  topBarTextColor: '#FFFFFF',
  topBarLink: '',
  blogLogo: '',
  blogStoreName: '',
  blogTagline: 'Blog & Achadinhos Verificados',
  blogPrimaryColor: '#2A5C3F',
  menuHomeLabel: 'Início (Blog)',
  menuStoreLabel: 'Loja & Achadinhos',
  menuShowStore: true,
  menuStoreBadge: 'Ofertas',
  menuInstitutionalLabel: 'Institucional',
  menuShowInstitutional: true,
  menuContactLabel: 'Contato',
  menuShowContact: true,
  menuShowWhatsApp: true,
  menuShowVitrineBtn: true,
  menuVitrineBtnText: 'Ver Vitrine',
  showCategoriesBar: true,
  footerText: '',
  footerShowSocial: true,
  articleFooterAd: {
    enabled: false,
    category: '',
    type: 'banner',
    title: '',
    bannerImageUrl: '',
    bannerLinkUrl: '',
    bannerAlt: '',
    bannerBadge: 'OFERTA DO DIA',
    bannerButtonText: 'Aproveitar Oferta →',
    htmlCode: '',
    openInNewTab: true
  },
  articleFooterAds: []
};

