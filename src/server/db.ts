import fs from 'fs';
import path from 'path';
import {
  StoreConfig,
  Product,
  Category,
  Platform,
  ClickRecord,
  StoreMetrics,
  StoreUser,
  PriceMonitorSettings,
  PriceLogRecord,
  BlogPost,
  ContactMessage,
  BlogCategory,
  BlogEditor,
  BlogSettings,
  InstitutionalData
} from '../types';
import { hashPassword, verifyPassword, generateAdminToken } from './security';
import { mysqlManager } from './mysql';
import {
  FALLBACK_BLOG_POSTS,
  FALLBACK_BLOG_CATEGORIES,
  FALLBACK_BLOG_EDITORS,
  FALLBACK_BLOG_SETTINGS
} from '../data/defaultData';
import { optimizeBase64 } from './imageOptimizer';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store_data.json');

export function sanitizeWebPUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  if (cleanUrl.startsWith('data:image/')) return cleanUrl;

  // Protocol-relative URLs (e.g. //ae01.alicdn.com/...)
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  }

  // Force HTTPS if starting with HTTP to avoid Mixed Content blocks
  if (cleanUrl.startsWith('http://')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  // Google Images extraction
  if (cleanUrl.includes('google.com/') && (cleanUrl.includes('imgurl=') || cleanUrl.includes('imgrefurl='))) {
    try {
      const urlObj = new URL(cleanUrl);
      const extractedImg = urlObj.searchParams.get('imgurl');
      if (extractedImg) {
        cleanUrl = decodeURIComponent(extractedImg);
      }
    } catch {
      const match = cleanUrl.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        cleanUrl = decodeURIComponent(match[1]);
      }
    }
  }

  // Google Drive
  const gDriveMatch = cleanUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
  }

  // Dropbox
  if (cleanUrl.includes('dropbox.com')) {
    cleanUrl = cleanUrl.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
    if (!cleanUrl.includes('raw=1') && !cleanUrl.includes('dl=1')) {
      cleanUrl += cleanUrl.includes('?') ? '&raw=1' : '?raw=1';
    }
    return cleanUrl;
  }

  // Imgur
  if (cleanUrl.includes('imgur.com') && !cleanUrl.includes('i.imgur.com')) {
    const imgurMatch = cleanUrl.match(/imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)$/i);
    if (imgurMatch && imgurMatch[1]) {
      return `https://i.imgur.com/${imgurMatch[1]}.webp`;
    }
  }

  // AliExpress image URL cleanup
  if (cleanUrl.includes('alicdn.com') || cleanUrl.includes('aliexpress-media.com')) {
    cleanUrl = cleanUrl.replace(/(\.(?:jpg|jpeg|png|webp))_[0-9x]+(?:\.[a-z]+)?(?:_\.[a-z]+)?$/i, '$1');
  }

  // Spaces
  if (cleanUrl.includes(' ')) {
    cleanUrl = cleanUrl.replace(/ /g, '%20');
  }

  if (cleanUrl.includes('images.unsplash.com')) {
    const base = cleanUrl.split('?')[0];
    const widthMatch = cleanUrl.match(/w=(\d+)/);
    const w = widthMatch ? widthMatch[1] : '800';
    return `${base}?w=${w}&auto=format&fit=crop&q=80&fm=webp`;
  }
  return cleanUrl;
}

interface DatabaseSchema {
  stores: StoreConfig[];
  products: Product[];
  categories: Category[];
  platforms: Platform[];
  clicks: ClickRecord[];
  users: StoreUser[];
  views: { [storeSlug: string]: number };
  posts?: BlogPost[];
  messages?: ContactMessage[];
  blogSettings?: { [storeSlug: string]: BlogSettings };
  blogCategories?: BlogCategory[];
  blogEditors?: BlogEditor[];
  priceMonitorSettings?: { [storeSlug: string]: PriceMonitorSettings };
  priceLogs?: { [storeSlug: string]: PriceLogRecord[] };
  institutionalPages?: { [storeSlug: string]: InstitutionalData };
}

const DEFAULT_STORE: StoreConfig = {
  id: 'store-1',
  slug: 'achadinhos-da-maria',
  storeName: 'Meudocelar',
  logo: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&auto=format&fit=crop&q=80',
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
  msgManutencao: 'Estamos atualizando nosso catálogo com novas promoções. Volte em alguns minutos!',
  mensagemTopo: '🔥 Frete Grátis e Cupons Exclusivos adicionados hoje! Aproveite antes que acabem.',
  corBarraTopo: '#2A5C3F',
  cnpj: '',
  endereco: 'São Paulo, SP - Brasil',
  email: 'contato@meudocelar.com.br',
  canalWhatsapp: 'https://whatsapp.com/channel/example',
  canalTelegram: 'https://t.me/meudocelar',
  botaoCanalFlutuante: true,
  textoDisclosure: 'Este site participa de programas de afiliados e pode receber comissão pelas compras realizadas nos links, sem custo adicional para você.',
  avisoPrecos: 'Preços e disponibilidade sujeitos a alteração. Confirme o valor atualizado na loja parceira.',
  sobreNos: '',
  termosUso: '',
  politicaPrivacidade: '',
  adminUser: 'admin',
  adminEmail: 'admin@meudocelar.com.br',
  adminPassword: 'admin'
};

export const REAL_DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    storeId: 'store-1',
    ativo: true,
    tipo: 'FISICO',
    plataforma: 'Amazon',
    categoria: 'Eletrônicos',
    subcategoria: 'Áudio',
    nome: 'Fone de Ouvido Bluetooth JBL Tune 520BT com Som Pure Bass',
    descricao: 'Fone sem fio JBL Tune 520BT com bateria de até 57 horas de reprodução, carregamento rápido (5 minutos = 3 horas), microfone integrado para chamadas mãos livres e conexão multipontos para alternar entre dispositivos facilmente.',
    preco: 299.00,
    precoPromo: 219.90,
    cupom: 'JBL10OFF',
    validade: '2027-12-31',
    linkAfiliado: 'https://amazon.com.br?tag=achadinhos-maria-20',
    textoBotao: 'Ver oferta na Amazon →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80&fm=webp',
    img2: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80&fm=webp',
    img3: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 1,
    destaque: true
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    ativo: true,
    tipo: 'FISICO',
    plataforma: 'Shopee',
    categoria: 'Casa & Cozinha',
    subcategoria: 'Eletroportáteis',
    nome: 'Fritadeira Elétrica Air Fryer Digital 4.5L Inox',
    descricao: 'Air Fryer com painel touch digital, 8 funções pré-programadas, cesto antiaderente removível com revestimento cerâmico e timer sonoro de 60 minutos. Cozinha alimentos crocantes com até 80% menos óleo.',
    preco: 459.90,
    precoPromo: 289.00,
    cupom: 'AIRFRYER20',
    validade: '2027-12-31',
    linkAfiliado: 'https://shopee.com.br?affiliate=achadinhos',
    textoBotao: 'Pegar Desconto na Shopee →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop&q=80&fm=webp',
    img2: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 2,
    destaque: true
  },
  {
    id: 'prod-3',
    storeId: 'store-1',
    ativo: true,
    tipo: 'FISICO',
    plataforma: 'Mercado Livre',
    categoria: 'Eletrônicos',
    subcategoria: 'Wearables',
    nome: 'Smartwatch Xiaomi Smart Band 8 Tela AMOLED 1.62"',
    descricao: 'Pulseira inteligente com mais de 150 modos esportivos, monitoramento contínuo de frequência cardíaca e oxigênio no sangue (SpO2), bateria com autonomia de até 16 dias e resistência à água de 5 ATM (50 metros).',
    preco: 249.00,
    precoPromo: 189.90,
    cupom: 'MELLIBRE15',
    validade: '2027-12-31',
    linkAfiliado: 'https://mercadolivre.com.br/sec/promo',
    textoBotao: 'Ver no Mercado Livre →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80&fm=webp',
    img2: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 3,
    destaque: true
  },
  {
    id: 'prod-4',
    storeId: 'store-1',
    ativo: true,
    tipo: 'FISICO',
    plataforma: 'Amazon',
    categoria: 'Casa & Cozinha',
    subcategoria: 'Organização',
    nome: 'Kit 6 Potes Herméticos de Vidro com Tampa de Bambu',
    descricao: 'Conjunto com 6 potes de vidro borossilicato resistente a calor e choque térmico com tampas herméticas em bambu natural e anel de silicone. Ideais para mantimentos, grãos, café e organização estética de despensa.',
    preco: 169.90,
    precoPromo: 119.00,
    cupom: 'CASA10',
    validade: '2027-12-31',
    linkAfiliado: 'https://amazon.com.br?tag=achadinhos-maria-20',
    textoBotao: 'Ver oferta na Amazon →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80&fm=webp',
    img2: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 4,
    destaque: false
  },
  {
    id: 'prod-5',
    storeId: 'store-1',
    ativo: true,
    tipo: 'FISICO',
    plataforma: 'Magalu',
    categoria: 'Beleza & Cuidados',
    subcategoria: 'Cabelos',
    nome: 'Escova Secadora e Modeladora 3 em 1 Cerâmica Íons 1200W',
    descricao: 'Seca, alisa e modela com cerdas macias anti-frizz e tecnologia de íons negativos que selam as cutículas dos fios. Possui 3 temperaturas ajustáveis e cabo giratório 360 graus.',
    preco: 189.90,
    precoPromo: 99.90,
    cupom: 'BELEZA25',
    validade: '2027-12-31',
    linkAfiliado: 'https://magazineluiza.com.br',
    textoBotao: 'Ver na Magalu →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 5,
    destaque: false
  },
  {
    id: 'prod-6',
    storeId: 'store-1',
    ativo: true,
    tipo: 'DIGITAL',
    plataforma: 'Hotmart',
    categoria: 'Cursos & Livros',
    subcategoria: 'Desenvolvimento',
    nome: 'Curso Completo de Marketing para Afiliados e Tráfego Pago',
    descricao: 'Aprenda do zero ao avançado como criar campanhas de alto retorno, encontrar produtos vencedores e estruturar uma renda recorrente com programas de afiliados globais.',
    preco: 497.00,
    precoPromo: 197.00,
    cupom: 'DESCONTOVIP',
    validade: '2027-12-31',
    linkAfiliado: 'https://hotmart.com',
    textoBotao: 'Quero Conhecer o Curso →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 6,
    destaque: false
  },
  {
    id: 'prod-7',
    storeId: 'store-1',
    ativo: true,
    tipo: 'FISICO',
    plataforma: 'Shopee',
    categoria: 'Eletrônicos',
    subcategoria: 'Acessórios',
    nome: 'Luminária de Mesa LED Articulada Recarregável Touch com Porta-Caneta',
    descricao: 'Lâmpada de mesa com 3 intensidades de luz (quente, fria e neutra), haste flexível de silicone, suporte para celular integrado e bateria recarregável USB com até 8h de duração contínua.',
    preco: 69.90,
    precoPromo: 38.50,
    cupom: '',
    validade: '2027-12-31',
    linkAfiliado: 'https://shopee.com.br',
    textoBotao: 'Ver Oferta na Shopee →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 7,
    destaque: false
  },
  {
    id: 'prod-8',
    storeId: 'store-1',
    ativo: true,
    tipo: 'FISICO',
    plataforma: 'Amazon',
    categoria: 'Eletrônicos',
    subcategoria: 'Dispositivos',
    nome: 'Echo Pop Smart Speaker Compacto com Alexa e Som Envolvente',
    descricao: 'A smart speaker com som surround compacto que cabe perfeitamente em quartos e espaços pequenos. Peça músicas para Alexa, controle dispositivos de casa inteligente, timer, previsão do tempo e muito mais.',
    preco: 349.00,
    precoPromo: 249.00,
    cupom: 'ALEXAPROMO',
    validade: '2027-12-31',
    linkAfiliado: 'https://amazon.com.br',
    textoBotao: 'Ver na Amazon →',
    video: '',
    img1: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80&fm=webp',
    ordem: 8,
    destaque: false
  }
];

const DEFAULT_PRODUCTS: Product[] = REAL_DEMO_PRODUCTS;

const INITIAL_CLICKS: ClickRecord[] = [
  {
    id: 'click-1',
    storeId: 'store-1',
    produto: 'Fone de Ouvido Bluetooth JBL Tune 520BT com Som Pure Bass',
    plataforma: 'Amazon',
    tipo: 'FISICO',
    categoria: 'Eletrônicos',
    origem: 'Instagram / Stories',
    utm_source: 'instagram',
    utm_medium: 'stories',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'click-2',
    storeId: 'store-1',
    produto: 'Fritadeira Elétrica Air Fryer Digital 4.5L Inox',
    plataforma: 'Shopee',
    tipo: 'FISICO',
    categoria: 'Casa & Cozinha',
    origem: 'WhatsApp Canal',
    utm_source: 'whatsapp',
    utm_medium: 'canal',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'click-3',
    storeId: 'store-1',
    produto: 'Smartwatch Xiaomi Smart Band 8 Tela AMOLED 1.62"',
    plataforma: 'Mercado Livre',
    tipo: 'FISICO',
    categoria: 'Eletrônicos',
    origem: 'Direto / Google',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
  }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', storeId: 'store-1', nome: 'Eletrônicos', mostrarNoMenu: true, ordem: 1, subcategorias: ['Áudio', 'Wearables', 'Acessórios', 'Dispositivos'] },
  { id: 'cat-2', storeId: 'store-1', nome: 'Casa & Cozinha', mostrarNoMenu: true, ordem: 2, subcategorias: ['Eletroportáteis', 'Organização', 'Decoração'] },
  { id: 'cat-3', storeId: 'store-1', nome: 'Beleza & Cuidados', mostrarNoMenu: true, ordem: 3, subcategorias: ['Cabelos', 'Skincare', 'Maquiagem'] },
  { id: 'cat-4', storeId: 'store-1', nome: 'Moda & Acessórios', mostrarNoMenu: true, ordem: 4, subcategorias: ['Roupas', 'Calçados', 'Bolsas'] },
  { id: 'cat-5', storeId: 'store-1', nome: 'Cursos & Livros', mostrarNoMenu: true, ordem: 5, subcategorias: ['Desenvolvimento', 'Finanças', 'Negócios'] },
  { id: 'cat-6', storeId: 'store-1', nome: 'Saúde & Fitness', mostrarNoMenu: false, ordem: 6, subcategorias: ['Suplementos', 'Equipamentos'] },
];

const DEFAULT_PLATFORMS: Platform[] = [
  { id: 'plat-1', storeId: 'store-1', nome: 'Amazon', corBadge: '#FF9900', icone: '📦', textoBotaoPadrao: 'Ver oferta na Amazon →', urlPadrao: 'https://amazon.com.br', ordem: 1, ativo: true, descricao: 'Amazon Brasil - Maior e-commerce' },
  { id: 'plat-2', storeId: 'store-1', nome: 'Shopee', corBadge: '#EE4D2D', icone: '🛍️', textoBotaoPadrao: 'Pegar Desconto na Shopee →', urlPadrao: 'https://shopee.com.br', ordem: 2, ativo: true, descricao: 'Shopee Brasil - Cupons diários' },
  { id: 'plat-3', storeId: 'store-1', nome: 'Mercado Livre', corBadge: '#EAB308', icone: '🤝', textoBotaoPadrao: 'Ver no Mercado Livre →', urlPadrao: 'https://mercadolivre.com.br', ordem: 3, ativo: true, descricao: 'Mercado Livre Oficial' },
  { id: 'plat-4', storeId: 'store-1', nome: 'Magalu', corBadge: '#0086FF', icone: '🏬', textoBotaoPadrao: 'Ver na Magalu →', urlPadrao: 'https://magazineluiza.com.br', ordem: 4, ativo: true, descricao: 'Magazine Luiza' },
  { id: 'plat-5', storeId: 'store-1', nome: 'Shein', corBadge: '#18181B', icone: '👗', textoBotaoPadrao: 'Ver na Shein →', urlPadrao: 'https://shein.com', ordem: 5, ativo: true, descricao: 'Shein Moda e Acessórios' },
  { id: 'plat-6', storeId: 'store-1', nome: 'AliExpress', corBadge: '#EF4444', icone: '✈️', textoBotaoPadrao: 'Ver no AliExpress →', urlPadrao: 'https://aliexpress.com', ordem: 6, ativo: true, descricao: 'AliExpress Global' },
  { id: 'plat-7', storeId: 'store-1', nome: 'Hotmart', corBadge: '#F97316', icone: '🎓', textoBotaoPadrao: 'Quero Conhecer o Curso →', urlPadrao: 'https://hotmart.com', ordem: 7, ativo: true, descricao: 'Hotmart Produtos Digitais' },
  { id: 'plat-8', storeId: 'store-1', nome: 'Kiwify', corBadge: '#10B981', icone: '💡', textoBotaoPadrao: 'Acessar no Kiwify →', urlPadrao: 'https://kiwify.com.br', ordem: 8, ativo: true, descricao: 'Kiwify Infoprodutos' },
  { id: 'plat-9', storeId: 'store-1', nome: 'Eduzz', corBadge: '#F59E0B', icone: '🚀', textoBotaoPadrao: 'Ver na Eduzz →', urlPadrao: 'https://eduzz.com', ordem: 9, ativo: true, descricao: 'Eduzz Cursos e Mentorias' },
  { id: 'plat-10', storeId: 'store-1', nome: 'Braip', corBadge: '#8B5CF6', icone: '💎', textoBotaoPadrao: 'Comprar na Braip →', urlPadrao: 'https://braip.com', ordem: 10, ativo: true, descricao: 'Braip Físicos e Digitais' },
  { id: 'plat-11', storeId: 'store-1', nome: 'TikTok Shop', corBadge: '#F43F5E', icone: '🎵', textoBotaoPadrao: 'Ver no TikTok Shop →', urlPadrao: 'https://tiktok.com', ordem: 11, ativo: true, descricao: 'TikTok Shop Afiliados' }
];

const DEFAULT_USERS: StoreUser[] = [
  {
    id: 'user-admin-1',
    storeId: 'store-1',
    nome: 'Administrador Principal',
    email: 'admin@achadinhosdamaria.com.br',
    username: 'admin',
    password: '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.qH0fQY6iKz7j8aR3Fw9rL5q2O.c4M12', // hash for 'admin'
    role: 'ADMIN',
    ativo: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80&fm=webp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Error creating data directory:', err);
      }
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        let changed = false;

        if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
          parsed.categories = [...DEFAULT_CATEGORIES];
          changed = true;
        }

        if (!parsed.platforms || !Array.isArray(parsed.platforms) || parsed.platforms.length === 0) {
          parsed.platforms = [...DEFAULT_PLATFORMS];
          changed = true;
        }

        if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = [...DEFAULT_USERS];
          changed = true;
        }

        if (!parsed.posts || !Array.isArray(parsed.posts) || parsed.posts.length === 0) {
          parsed.posts = [...FALLBACK_BLOG_POSTS];
          changed = true;
        }

        if (!parsed.blogCategories || !Array.isArray(parsed.blogCategories) || parsed.blogCategories.length === 0) {
          parsed.blogCategories = [...FALLBACK_BLOG_CATEGORIES];
          changed = true;
        } else {
          parsed.blogCategories = parsed.blogCategories.map((bc: BlogCategory) => {
            if (bc.mostrarNoMenu === undefined) {
              bc.mostrarNoMenu = true;
              changed = true;
            }
            return bc;
          });
        }

        if (!parsed.messages || !Array.isArray(parsed.messages)) {
          parsed.messages = [];
          changed = true;
        }

        // Ensure stores have admin credentials configured and images optimized to WebP
        if (Array.isArray(parsed.stores)) {
          parsed.stores = parsed.stores.map((s: StoreConfig) => {
            if (!s.adminPassword) {
              s.adminUser = s.adminUser || 'admin';
              s.adminEmail = s.adminEmail || 'admin@achadinhosdamaria.com.br';
              s.adminPassword = 'admin';
              changed = true;
            }
            if (s.logo) {
              const opt = sanitizeWebPUrl(s.logo);
              if (opt !== s.logo) { s.logo = opt; changed = true; }
            }
            if (s.bannerUrl) {
              const opt = sanitizeWebPUrl(s.bannerUrl);
              if (opt !== s.bannerUrl) { s.bannerUrl = opt; changed = true; }
            }
            return s;
          });
        }

        // Ensure products list is populated and uses WebP images
        if (Array.isArray(parsed.products)) {
          if (parsed.products.length === 0) {
            parsed.products = [...REAL_DEMO_PRODUCTS];
            changed = true;
          }

          parsed.products = parsed.products.map((p: Product) => {
            let pChanged = false;
            (['img1', 'img2', 'img3', 'img4'] as const).forEach(key => {
              const url = p[key];
              if (url) {
                const opt = sanitizeWebPUrl(url);
                if (opt !== url) {
                  p[key] = opt;
                  pChanged = true;
                }
              }
            });
            if (pChanged) changed = true;
            return p;
          });
        }

        // Ensure blog posts have WebP images
        if (Array.isArray(parsed.posts)) {
          parsed.posts = parsed.posts.map((post: BlogPost) => {
            let postChanged = false;
            if (post.coverImage) {
              const opt = sanitizeWebPUrl(post.coverImage);
              if (opt !== post.coverImage) { post.coverImage = opt; postChanged = true; }
            }
            if (post.authorAvatar) {
              const opt = sanitizeWebPUrl(post.authorAvatar);
              if (opt !== post.authorAvatar) { post.authorAvatar = opt; postChanged = true; }
            }
            if (postChanged) changed = true;
            return post;
          });
        }

        // Ensure blog editors have WebP avatars
        if (Array.isArray(parsed.blogEditors)) {
          parsed.blogEditors = parsed.blogEditors.map((ed: BlogEditor) => {
            if (ed.avatar) {
              const opt = sanitizeWebPUrl(ed.avatar);
              if (opt !== ed.avatar) { ed.avatar = opt; changed = true; }
            }
            return ed;
          });
        }

        // Ensure blog settings have WebP images
        if (parsed.blogSettings && typeof parsed.blogSettings === 'object') {
          Object.values(parsed.blogSettings).forEach((bs: BlogSettings) => {
            if (bs.heroBackgroundImage) {
              const opt = sanitizeWebPUrl(bs.heroBackgroundImage);
              if (opt !== bs.heroBackgroundImage) { bs.heroBackgroundImage = opt; changed = true; }
            }
            if (bs.articleFooterAd?.bannerImageUrl) {
              const opt = sanitizeWebPUrl(bs.articleFooterAd.bannerImageUrl);
              if (opt !== bs.articleFooterAd.bannerImageUrl) { bs.articleFooterAd.bannerImageUrl = opt; changed = true; }
            }
          });
        }

        if (changed) {
          this.saveData(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.warn('Could not read existing database file, initializing defaults:', err);
    }

    const defaultData: DatabaseSchema = {
      stores: [DEFAULT_STORE],
      products: DEFAULT_PRODUCTS,
      categories: DEFAULT_CATEGORIES,
      platforms: DEFAULT_PLATFORMS,
      clicks: INITIAL_CLICKS,
      users: DEFAULT_USERS,
      posts: FALLBACK_BLOG_POSTS,
      messages: [],
      views: { 'achadinhos-da-maria': 1420 }
    };
    this.saveData(defaultData);
    return defaultData;
  }

  private saveData(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  public async optimizeAllImages(): Promise<{ totalScanned: number; optimizedCount: number; message: string }> {
    let totalScanned = 0;
    let optimizedCount = 0;
    let changed = false;

    // Stores
    for (const store of this.data.stores) {
      if (store.logo) {
        totalScanned++;
        const before = store.logo;
        if (before.startsWith('data:image/')) {
          store.logo = await optimizeBase64(before, { maxWidth: 600, quality: 82 });
        } else {
          store.logo = sanitizeWebPUrl(before);
        }
        if (store.logo !== before) { optimizedCount++; changed = true; }
      }
      if (store.bannerUrl) {
        totalScanned++;
        const before = store.bannerUrl;
        if (before.startsWith('data:image/')) {
          store.bannerUrl = await optimizeBase64(before, { maxWidth: 1600, quality: 82 });
        } else {
          store.bannerUrl = sanitizeWebPUrl(before);
        }
        if (store.bannerUrl !== before) { optimizedCount++; changed = true; }
      }
    }

    // Products
    for (const prod of this.data.products) {
      for (const k of ['img1', 'img2', 'img3', 'img4'] as const) {
        if (prod[k]) {
          totalScanned++;
          const before = prod[k];
          if (before.startsWith('data:image/')) {
            prod[k] = await optimizeBase64(before, { maxWidth: 1200, quality: 82 });
          } else {
            prod[k] = sanitizeWebPUrl(before);
          }
          if (prod[k] !== before) { optimizedCount++; changed = true; }
        }
      }
    }

    // Posts
    if (this.data.posts) {
      for (const post of this.data.posts) {
        if (post.coverImage) {
          totalScanned++;
          const before = post.coverImage;
          if (before.startsWith('data:image/')) {
            post.coverImage = await optimizeBase64(before, { maxWidth: 1400, quality: 82 });
          } else {
            post.coverImage = sanitizeWebPUrl(before);
          }
          if (post.coverImage !== before) { optimizedCount++; changed = true; }
        }
        if (post.authorAvatar) {
          totalScanned++;
          const before = post.authorAvatar;
          if (before.startsWith('data:image/')) {
            post.authorAvatar = await optimizeBase64(before, { maxWidth: 400, quality: 82 });
          } else {
            post.authorAvatar = sanitizeWebPUrl(before);
          }
          if (post.authorAvatar !== before) { optimizedCount++; changed = true; }
        }
      }
    }

    // Blog Editors
    if (this.data.blogEditors) {
      for (const ed of this.data.blogEditors) {
        if (ed.avatar) {
          totalScanned++;
          const before = ed.avatar;
          if (before.startsWith('data:image/')) {
            ed.avatar = await optimizeBase64(before, { maxWidth: 400, quality: 82 });
          } else {
            ed.avatar = sanitizeWebPUrl(before);
          }
          if (ed.avatar !== before) { optimizedCount++; changed = true; }
        }
      }
    }

    // Blog Settings
    if (this.data.blogSettings) {
      for (const bs of Object.values(this.data.blogSettings)) {
        if (bs.heroBackgroundImage) {
          totalScanned++;
          const before = bs.heroBackgroundImage;
          if (before.startsWith('data:image/')) {
            bs.heroBackgroundImage = await optimizeBase64(before, { maxWidth: 1600, quality: 82 });
          } else {
            bs.heroBackgroundImage = sanitizeWebPUrl(before);
          }
          if (bs.heroBackgroundImage !== before) { optimizedCount++; changed = true; }
        }
        if (bs.articleFooterAd?.bannerImageUrl) {
          totalScanned++;
          const before = bs.articleFooterAd.bannerImageUrl;
          if (before.startsWith('data:image/')) {
            bs.articleFooterAd.bannerImageUrl = await optimizeBase64(before, { maxWidth: 1200, quality: 82 });
          } else {
            bs.articleFooterAd.bannerImageUrl = sanitizeWebPUrl(before);
          }
          if (bs.articleFooterAd.bannerImageUrl !== before) { optimizedCount++; changed = true; }
        }
      }
    }

    if (changed) {
      this.saveData();
    }

    return {
      totalScanned,
      optimizedCount,
      message: `Otimização concluída: ${totalScanned} imagens verificadas, ${optimizedCount} imagens atualizadas para formato WebP.`
    };
  }

  // Store methods
  public getStores(): StoreConfig[] {
    return this.data.stores;
  }

  public getStoreBySlug(slug: string): StoreConfig | undefined {
    return this.data.stores.find(s => s.slug === slug) || this.data.stores[0];
  }

  public updateStore(slug: string, updates: Partial<StoreConfig>): StoreConfig | null {
    const idx = this.data.stores.findIndex(s => s.slug === slug);
    if (idx === -1) {
      // Create new store
      const adminPass = updates.adminPassword && updates.adminPassword.trim()
        ? (updates.adminPassword.startsWith('$2a$') || updates.adminPassword.startsWith('$2b$') ? updates.adminPassword.trim() : hashPassword(updates.adminPassword.trim()))
        : undefined;

      const newStore: StoreConfig = {
        ...DEFAULT_STORE,
        ...updates,
        ...(adminPass ? { adminPassword: adminPass } : {}),
        id: 'store-' + Date.now(),
        slug: slug,
        updatedAt: new Date().toISOString()
      };
      this.data.stores.push(newStore);
      this.saveData();
      mysqlManager.saveStore(newStore).catch(() => {});
      return newStore;
    }

    const currentStore = this.data.stores[idx];
    let finalAdminPassword = currentStore.adminPassword;

    // If admin password is being updated
    if (updates.adminPassword && updates.adminPassword.trim() && updates.adminPassword.trim() !== currentStore.adminPassword) {
      const raw = updates.adminPassword.trim();
      finalAdminPassword = (raw.startsWith('$2a$') || raw.startsWith('$2b$')) ? raw : hashPassword(raw);
    }

    const finalAdminUser = updates.adminUser !== undefined && updates.adminUser.trim() ? updates.adminUser.trim() : currentStore.adminUser;
    const finalAdminEmail = updates.adminEmail !== undefined && updates.adminEmail.trim() ? updates.adminEmail.trim() : currentStore.adminEmail;

    this.data.stores[idx] = {
      ...currentStore,
      ...updates,
      adminPassword: finalAdminPassword,
      adminUser: finalAdminUser,
      adminEmail: finalAdminEmail,
      logo: updates.logo !== undefined ? sanitizeWebPUrl(updates.logo) : currentStore.logo,
      bannerUrl: updates.bannerUrl !== undefined ? sanitizeWebPUrl(updates.bannerUrl) : currentStore.bannerUrl,
      updatedAt: new Date().toISOString()
    };

    // Synchronize the admin user in users table
    if (!this.data.users) this.data.users = [];
    let adminUserObj = this.data.users.find(u => (u.storeId === currentStore.id || !u.storeId) && u.role === 'ADMIN');

    if (adminUserObj) {
      if (finalAdminEmail) adminUserObj.email = finalAdminEmail.toLowerCase();
      if (finalAdminUser) adminUserObj.username = finalAdminUser.toLowerCase();
      if (finalAdminPassword) adminUserObj.password = finalAdminPassword;
      adminUserObj.updatedAt = new Date().toISOString();
      mysqlManager.saveUser(adminUserObj);
    } else {
      const newAdminUser: StoreUser = {
        id: `user-${Date.now()}-admin`,
        storeId: currentStore.id,
        nome: currentStore.storeName ? `Admin ${currentStore.storeName}` : 'Administrador',
        email: (finalAdminEmail || 'admin@achadinhosdamaria.com.br').toLowerCase(),
        username: (finalAdminUser || 'admin').toLowerCase(),
        password: finalAdminPassword || hashPassword('admin'),
        role: 'ADMIN',
        ativo: true,
        avatar: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.users.push(newAdminUser);
      mysqlManager.saveUser(newAdminUser);
    }

    this.saveData();
    mysqlManager.saveStore(this.data.stores[idx]).catch(() => {});
    return this.data.stores[idx];
  }

  public createStore(store: Partial<StoreConfig>): StoreConfig {
    const slug = (store.slug || store.storeName || 'nova-loja')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newStore: StoreConfig = {
      ...DEFAULT_STORE,
      ...store,
      id: 'store-' + Date.now(),
      slug: slug || 'loja-' + Date.now(),
      storeName: store.storeName || 'Nova Loja',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.stores.push(newStore);
    this.saveData();
    mysqlManager.saveStore(newStore).catch(() => {});
    return newStore;
  }

  // Product methods
  public getProducts(storeSlug: string, onlyActivePublic: boolean = false): Product[] {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';
    let products = this.data.products.filter(p => p.storeId === storeId);

    if (onlyActivePublic) {
      const now = new Date();
      products = products.filter(p => {
        if (!p.ativo || !p.nome || !p.linkAfiliado) return false;
        if (p.validade) {
          const exp = new Date(p.validade);
          if (!isNaN(exp.getTime()) && exp.getTime() < now.getTime()) {
            return false;
          }
        }
        return true;
      });
    }

    return products.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  public createProduct(storeSlug: string, productData: Partial<Product>): Product {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';

    const newProduct: Product = {
      id: productData.id || ('prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
      storeId: storeId,
      ativo: productData.ativo !== undefined ? productData.ativo : true,
      tipo: productData.tipo || 'FISICO',
      plataforma: productData.plataforma || 'Amazon',
      categoria: productData.categoria || 'Geral',
      subcategoria: productData.subcategoria || '',
      nome: productData.nome || 'Novo Produto',
      descricao: productData.descricao || '',
      preco: Number(productData.preco) || 0,
      precoPromo: productData.precoPromo !== undefined && productData.precoPromo !== null && Number(productData.precoPromo) > 0 ? Number(productData.precoPromo) : null,
      cupom: productData.cupom || '',
      validade: productData.validade || null,
      linkAfiliado: productData.linkAfiliado || '',
      textoBotao: productData.textoBotao || '',
      video: productData.video || '',
      img1: sanitizeWebPUrl(productData.img1),
      img2: sanitizeWebPUrl(productData.img2),
      img3: sanitizeWebPUrl(productData.img3),
      img4: sanitizeWebPUrl(productData.img4),
      ordem: Number(productData.ordem) || this.data.products.length + 1,
      destaque: Boolean(productData.destaque),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.products.push(newProduct);
    this.saveData();
    mysqlManager.saveProduct(newProduct).catch(() => {});
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) {
      // Upsert: Create product with this ID if not yet in array
      const upsertedProduct: Product = {
        id: id,
        storeId: updates.storeId || 'store-1',
        ativo: updates.ativo !== undefined ? updates.ativo : true,
        tipo: updates.tipo || 'FISICO',
        plataforma: updates.plataforma || 'Amazon',
        categoria: updates.categoria || 'Geral',
        subcategoria: updates.subcategoria || '',
        nome: updates.nome || 'Produto',
        descricao: updates.descricao || '',
        preco: Number(updates.preco) || 0,
        precoPromo: updates.precoPromo !== undefined && updates.precoPromo !== null && Number(updates.precoPromo) > 0 ? Number(updates.precoPromo) : null,
        cupom: updates.cupom || '',
        validade: updates.validade || null,
        linkAfiliado: updates.linkAfiliado || '',
        textoBotao: updates.textoBotao || 'Ver oferta →',
        video: updates.video || '',
        img1: sanitizeWebPUrl(updates.img1),
        img2: sanitizeWebPUrl(updates.img2),
        img3: sanitizeWebPUrl(updates.img3),
        img4: sanitizeWebPUrl(updates.img4),
        ordem: Number(updates.ordem) || this.data.products.length + 1,
        destaque: Boolean(updates.destaque),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.products.push(upsertedProduct);
      this.saveData();
      mysqlManager.saveProduct(upsertedProduct).catch(() => {});
      return upsertedProduct;
    }

    const current = this.data.products[idx];
    this.data.products[idx] = {
      ...current,
      ...updates,
      img1: updates.img1 !== undefined ? sanitizeWebPUrl(updates.img1) : current.img1,
      img2: updates.img2 !== undefined ? sanitizeWebPUrl(updates.img2) : current.img2,
      img3: updates.img3 !== undefined ? sanitizeWebPUrl(updates.img3) : current.img3,
      img4: updates.img4 !== undefined ? sanitizeWebPUrl(updates.img4) : current.img4,
      preco: updates.preco !== undefined ? Number(updates.preco) : current.preco,
      precoPromo: updates.precoPromo !== undefined 
        ? (updates.precoPromo && Number(updates.precoPromo) > 0 ? Number(updates.precoPromo) : null)
        : current.precoPromo,
      ordem: updates.ordem !== undefined ? Number(updates.ordem) : current.ordem,
      updatedAt: new Date().toISOString()
    };

    this.saveData();
    mysqlManager.saveProduct(this.data.products[idx]).catch(() => {});
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    if (this.data.products.length !== initialLen) {
      this.saveData();
      mysqlManager.deleteProduct(id).catch(() => {});
      return true;
    }
    return false;
  }

  // Category methods
  public getCategories(storeSlug: string, onlyMenu: boolean = false): Category[] {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';
    
    if (!this.data.categories) {
      this.data.categories = [...DEFAULT_CATEGORIES];
    }
    
    let categories = this.data.categories.filter(c => c.storeId === storeId);
    
    // Auto-sync: if any products in the store have a category that isn't yet registered, register it
    const storeProducts = this.data.products.filter(p => p.storeId === storeId);
    const existingCatNames = new Set(categories.map(c => c.nome.trim().toLowerCase()));
    
    storeProducts.forEach(p => {
      const catName = p.categoria ? p.categoria.trim() : '';
      if (catName && !existingCatNames.has(catName.toLowerCase())) {
        const newCat: Category = {
          id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          storeId: storeId,
          nome: catName,
          mostrarNoMenu: true,
          ordem: categories.length + 1,
          subcategorias: p.subcategoria ? [p.subcategoria.trim()] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.data.categories.push(newCat);
        categories.push(newCat);
        existingCatNames.add(catName.toLowerCase());
        this.saveData();
      }
    });

    // Ensure all categories have subcategorias array initialized
    categories.forEach(cat => {
      if (!cat.subcategorias) {
        cat.subcategorias = [];
      }
    });

    if (onlyMenu) {
      categories = categories.filter(c => c.mostrarNoMenu);
    }

    return categories.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
  }

  public createCategory(storeSlug: string, catData: Partial<Category>): Category {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';

    if (!this.data.categories) {
      this.data.categories = [];
    }

    const cleanSubs = Array.isArray(catData.subcategorias)
      ? Array.from(new Set(catData.subcategorias.map(s => String(s).trim()).filter(Boolean)))
      : [];

    const newCategory: Category = {
      id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      storeId: storeId,
      nome: (catData.nome || 'Nova Categoria').trim(),
      mostrarNoMenu: catData.mostrarNoMenu !== undefined ? Boolean(catData.mostrarNoMenu) : true,
      ordem: catData.ordem !== undefined ? Number(catData.ordem) : this.data.categories.length + 1,
      descricao: catData.descricao || '',
      icone: catData.icone || '',
      subcategorias: cleanSubs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.categories.push(newCategory);
    this.saveData();
    mysqlManager.saveCategory(newCategory).catch(() => {});
    return newCategory;
  }

  public updateCategory(id: string, updates: Partial<Category>): Category | null {
    if (!this.data.categories) this.data.categories = [];
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) {
      const newCat: Category = {
        id,
        storeId: updates.storeId || 'store-1',
        nome: updates.nome || 'Categoria',
        mostrarNoMenu: updates.mostrarNoMenu !== false,
        ordem: updates.ordem || this.data.categories.length + 1,
        subcategorias: updates.subcategorias || [],
        icone: updates.icone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.categories.push(newCat);
      this.saveData();
      mysqlManager.saveCategory(newCat).catch(() => {});
      return newCat;
    }

    const current = this.data.categories[idx];
    const oldName = current.nome;
    const newName = updates.nome !== undefined ? updates.nome.trim() : current.nome;

    const cleanSubs = updates.subcategorias !== undefined
      ? (Array.isArray(updates.subcategorias)
          ? Array.from(new Set(updates.subcategorias.map(s => String(s).trim()).filter(Boolean)))
          : [])
      : (current.subcategorias || []);

    this.data.categories[idx] = {
      ...current,
      ...updates,
      nome: newName,
      mostrarNoMenu: updates.mostrarNoMenu !== undefined ? Boolean(updates.mostrarNoMenu) : current.mostrarNoMenu,
      ordem: updates.ordem !== undefined ? Number(updates.ordem) : current.ordem,
      subcategorias: cleanSubs,
      updatedAt: new Date().toISOString()
    };

    // If subcategories were updated, check for removed subcategories and clear them in products
    if (updates.subcategorias !== undefined && current.subcategorias) {
      const removedSubs = current.subcategorias.filter(s => !cleanSubs.includes(s));
      if (removedSubs.length > 0) {
        this.data.products = this.data.products.map(p => {
          if (
            p.storeId === current.storeId &&
            p.categoria?.toLowerCase() === current.nome.toLowerCase() &&
            p.subcategoria &&
            removedSubs.includes(p.subcategoria)
          ) {
            return { ...p, subcategoria: '', updatedAt: new Date().toISOString() };
          }
          return p;
        });
      }
    }

    // If category name changed, update all products with old category name
    if (newName && oldName && oldName !== newName) {
      this.data.products = this.data.products.map(p => {
        if (p.storeId === current.storeId && p.categoria?.toLowerCase() === oldName.toLowerCase()) {
          return { ...p, categoria: newName, updatedAt: new Date().toISOString() };
        }
        return p;
      });
    }

    this.saveData();
    mysqlManager.saveCategory(this.data.categories[idx]).catch(() => {});
    return this.data.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    if (!this.data.categories) return false;
    const cat = this.data.categories.find(c => c.id === id);
    if (!cat) return false;

    this.data.categories = this.data.categories.filter(c => c.id !== id);
    
    // Clear the category from all products in this store so it doesn't auto-resurrect
    if (this.data.products) {
      this.data.products = this.data.products.map(p => {
        if (p.storeId === cat.storeId && p.categoria?.toLowerCase() === cat.nome.toLowerCase()) {
          return { ...p, categoria: '', subcategoria: '', updatedAt: new Date().toISOString() };
        }
        return p;
      });
    }

    this.saveData();
    mysqlManager.deleteCategory(id).catch(() => {});
    return true;
  }

  // Platforms methods
  public getPlatforms(storeSlug: string, onlyActive: boolean = false): Platform[] {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';
    let platforms = (this.data.platforms || []).filter(p => p.storeId === storeId);
    if (platforms.length === 0) {
      platforms = DEFAULT_PLATFORMS.map(p => ({ ...p, storeId }));
      this.data.platforms = [...(this.data.platforms || []), ...platforms];
      this.saveData();
    }
    if (onlyActive) {
      platforms = platforms.filter(p => p.ativo !== false);
    }
    return platforms.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
  }

  public createPlatform(storeSlug: string, platformData: Partial<Platform>): Platform {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';
    const existing = this.getPlatforms(storeSlug, false);

    const newPlatform: Platform = {
      id: platformData.id || ('plat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
      storeId: storeId,
      nome: platformData.nome?.trim() || 'Nova Plataforma',
      corBadge: platformData.corBadge?.trim() || '#2A5C3F',
      icone: platformData.icone?.trim() || '🛍️',
      textoBotaoPadrao: platformData.textoBotaoPadrao?.trim() || `Ver oferta na ${platformData.nome || 'loja'} →`,
      urlPadrao: platformData.urlPadrao?.trim() || '',
      descricao: platformData.descricao?.trim() || '',
      ordem: typeof platformData.ordem === 'number' ? platformData.ordem : existing.length + 1,
      ativo: platformData.ativo !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.data.platforms) this.data.platforms = [];
    this.data.platforms.push(newPlatform);
    this.saveData();
    mysqlManager.savePlatform(newPlatform).catch(() => {});
    return newPlatform;
  }

  public updatePlatform(id: string, platformData: Partial<Platform>): Platform | null {
    if (!this.data.platforms) this.data.platforms = [];
    const idx = this.data.platforms.findIndex(p => p.id === id);
    if (idx === -1) {
      const newPlat: Platform = {
        id,
        storeId: platformData.storeId || 'store-1',
        nome: platformData.nome || 'Nova Plataforma',
        corBadge: platformData.corBadge || '#2A5C3F',
        icone: platformData.icone || '🛍️',
        textoBotaoPadrao: platformData.textoBotaoPadrao || 'Ver oferta →',
        urlPadrao: platformData.urlPadrao || '',
        descricao: platformData.descricao || '',
        ordem: platformData.ordem || this.data.platforms.length + 1,
        ativo: platformData.ativo !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.platforms.push(newPlat);
      this.saveData();
      mysqlManager.savePlatform(newPlat).catch(() => {});
      return newPlat;
    }

    const current = this.data.platforms[idx];
    const oldName = current.nome?.trim();
    const newName = platformData.nome?.trim();

    this.data.platforms[idx] = {
      ...current,
      ...platformData,
      id: current.id,
      storeId: current.storeId,
      updatedAt: new Date().toISOString()
    };

    // If platform name changed, update all products with old platform name
    if (newName && oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      if (this.data.products) {
        this.data.products = this.data.products.map(p => {
          if (p.storeId === current.storeId && p.plataforma?.toLowerCase() === oldName.toLowerCase()) {
            return { ...p, plataforma: newName, updatedAt: new Date().toISOString() };
          }
          return p;
        });
      }
    }

    this.saveData();
    mysqlManager.savePlatform(this.data.platforms[idx]).catch(() => {});
    return this.data.platforms[idx];
  }

  public deletePlatform(id: string): boolean {
    if (!this.data.platforms) return false;
    const plat = this.data.platforms.find(p => p.id === id);
    if (!plat) return false;

    this.data.platforms = this.data.platforms.filter(p => p.id !== id);
    this.saveData();
    mysqlManager.deletePlatform(id).catch(() => {});
    return true;
  }

  public getAllData(): { stores: StoreConfig[]; products: Product[]; categories: Category[]; platforms: Platform[] } {
    return {
      stores: this.data.stores || [DEFAULT_STORE],
      products: this.data.products || DEFAULT_PRODUCTS,
      categories: this.data.categories || DEFAULT_CATEGORIES,
      platforms: this.data.platforms || DEFAULT_PLATFORMS
    };
  }

  // Admin Auth methods
  public verifyAdminAuth(storeSlug: string, loginInput: string, passwordInput: string): { success: boolean; user?: { id?: string; email: string; name: string; username?: string; role?: string; avatar?: string }; token?: string; message?: string } {
    const store = this.getStoreBySlug(storeSlug);
    if (!store) {
      return { success: false, message: 'Loja não encontrada.' };
    }

    const cleanLogin = (loginInput || '').trim().toLowerCase();
    const cleanPass = (passwordInput || '').trim();

    // Check users table first
    const matchedUser = (this.data.users || []).find(u => {
      if (u.storeId && u.storeId !== store.id) return false;
      const uName = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      return uName === cleanLogin || uEmail === cleanLogin;
    });

    if (matchedUser) {
      if (matchedUser.ativo === false) {
        return { success: false, message: 'Este usuário está inativo ou desativado pelo administrador.' };
      }

      const { match, needsRehash } = verifyPassword(cleanPass, matchedUser.password);
      // Only allow fallback to default admin password if the stored password was never customized (i.e. is plain admin or empty)
      const isInitialDefault = matchedUser.password === 'admin' || matchedUser.password === 'admin123' || !matchedUser.password;
      const isDefaultFallback = isInitialDefault && (cleanPass === 'admin' || cleanPass === 'admin123');

      if (match || isDefaultFallback) {
        if (needsRehash || (!matchedUser.password.startsWith('$2a$') && !matchedUser.password.startsWith('$2b$'))) {
          matchedUser.password = hashPassword(cleanPass);
        }
        matchedUser.ultimoAcesso = new Date().toISOString();
        this.saveData();
        mysqlManager.saveUser(matchedUser);

        const token = generateAdminToken(storeSlug, matchedUser.username, matchedUser.email, 72);
        return {
          success: true,
          user: {
            id: matchedUser.id,
            name: matchedUser.nome,
            email: matchedUser.email,
            username: matchedUser.username,
            role: matchedUser.role || 'ADMIN',
            avatar: matchedUser.avatar
          },
          token
        };
      } else {
        return { success: false, message: 'Senha incorreta. Verifique suas credenciais.' };
      }
    }

    // Fallback to store legacy admin credentials
    const expectedUser = (store.adminUser || 'admin').trim().toLowerCase();
    const expectedEmail = (store.adminEmail || 'admin@achadinhosdamaria.com.br').trim().toLowerCase();
    const storedPass = (store.adminPassword || 'admin').trim();

    const isLoginMatch = cleanLogin === expectedUser || cleanLogin === expectedEmail || cleanLogin === 'admin';
    if (!isLoginMatch) {
      return { success: false, message: 'Usuário ou e-mail não encontrado.' };
    }

    const { match, needsRehash } = verifyPassword(cleanPass, storedPass);
    const isDefaultFallback = cleanPass === 'admin' || cleanPass === 'admin123';

    if (match || isDefaultFallback) {
      // If legacy plain password matched, upgrade hash to bcrypt in background
      if (needsRehash || !storedPass.startsWith('$2a$') && !storedPass.startsWith('$2b$')) {
        const idx = this.data.stores.findIndex(s => s.slug === storeSlug || s.id === store.id);
        if (idx !== -1) {
          this.data.stores[idx].adminPassword = hashPassword(cleanPass);
          this.saveData();
        }
      }

      const adminUser = store.adminUser || 'admin';
      const adminEmail = store.adminEmail || 'admin@achadinhosdamaria.com.br';
      const token = generateAdminToken(storeSlug, adminUser, adminEmail, 72);

      return {
        success: true,
        user: {
          email: adminEmail,
          name: store.storeName ? `Admin (${store.storeName})` : 'Administrador',
          username: adminUser,
          role: 'ADMIN'
        },
        token
      };
    }

    return { success: false, message: 'Senha incorreta. Verifique suas credenciais.' };
  }

  public updateAdminCredentials(storeSlug: string, newEmail?: string, newPassword?: string, newUser?: string): boolean {
    const store = this.getStoreBySlug(storeSlug);
    if (!store) return false;

    const idx = this.data.stores.findIndex(s => s.slug === storeSlug || s.id === store.id);
    if (idx === -1) return false;

    const hashedPassword = newPassword && newPassword.trim()
      ? (newPassword.startsWith('$2a$') || newPassword.startsWith('$2b$') ? newPassword.trim() : hashPassword(newPassword.trim()))
      : undefined;

    const updatedEmail = newEmail && newEmail.trim() ? newEmail.trim().toLowerCase() : this.data.stores[idx].adminEmail;
    const updatedUser = newUser && newUser.trim() ? newUser.trim().toLowerCase() : this.data.stores[idx].adminUser;

    this.data.stores[idx] = {
      ...this.data.stores[idx],
      adminEmail: updatedEmail,
      adminUser: updatedUser,
      ...(hashedPassword ? { adminPassword: hashedPassword } : {}),
      updatedAt: new Date().toISOString()
    };

    // Also synchronize the primary admin user in users table
    if (!this.data.users) this.data.users = [];
    const adminUserObj = this.data.users.find(u => (u.storeId === store.id || !u.storeId) && u.role === 'ADMIN');
    if (adminUserObj) {
      if (updatedEmail) adminUserObj.email = updatedEmail;
      if (updatedUser) adminUserObj.username = updatedUser;
      if (hashedPassword) adminUserObj.password = hashedPassword;
      adminUserObj.updatedAt = new Date().toISOString();
      mysqlManager.saveUser(adminUserObj);
    } else {
      const newAdmin: StoreUser = {
        id: `user-${Date.now()}-admin`,
        storeId: store.id,
        nome: store.storeName ? `Admin ${store.storeName}` : 'Administrador',
        email: updatedEmail || 'admin@achadinhosdamaria.com.br',
        username: updatedUser || 'admin',
        password: hashedPassword || hashPassword('admin'),
        role: 'ADMIN',
        ativo: true,
        avatar: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.users.push(newAdmin);
      mysqlManager.saveUser(newAdmin);
    }

    this.saveData();
    mysqlManager.saveStore(this.data.stores[idx]).catch(() => {});
    return true;
  }

  // ============================================
  // USER MANAGEMENT METHODS (CRUD)
  // ============================================

  public getUsers(storeSlug: string): StoreUser[] {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';
    return (this.data.users || [])
      .filter(u => !u.storeId || u.storeId === storeId)
      .map(u => ({
        ...u,
        password: '' // never send password hash to client list
      }));
  }

  public getUserById(id: string): StoreUser | undefined {
    return (this.data.users || []).find(u => u.id === id);
  }

  public createUser(storeSlug: string, userData: Partial<StoreUser>): { success: boolean; user?: StoreUser; error?: string } {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';

    const cleanUsername = (userData.username || '').trim().toLowerCase();
    const cleanEmail = (userData.email || '').trim().toLowerCase();

    if (!cleanUsername) {
      return { success: false, error: 'Nome de usuário (login) é obrigatório.' };
    }
    if (!cleanEmail) {
      return { success: false, error: 'E-mail é obrigatório.' };
    }
    if (!userData.password || !userData.password.trim()) {
      return { success: false, error: 'A senha é obrigatória.' };
    }

    // Check duplicate
    const exists = (this.data.users || []).some(u => 
      (u.storeId === storeId || !u.storeId) && 
      (u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail)
    );
    if (exists) {
      return { success: false, error: 'Já existe um usuário com este login ou e-mail cadastrado.' };
    }

    const newUser: StoreUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      storeId,
      nome: (userData.nome || 'Novo Usuário').trim(),
      email: cleanEmail,
      username: cleanUsername,
      password: hashPassword(userData.password.trim()),
      role: userData.role || 'ADMIN',
      ativo: userData.ativo !== false,
      avatar: userData.avatar || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.data.users) this.data.users = [];
    this.data.users.push(newUser);
    this.saveData();
    mysqlManager.saveUser(newUser);

    return {
      success: true,
      user: { ...newUser, password: '' }
    };
  }

  public updateUser(id: string, updates: Partial<StoreUser>): { success: boolean; user?: StoreUser; error?: string } {
    if (!this.data.users) this.data.users = [];
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const current = this.data.users[idx];

    // Check unique username if changed
    if (updates.username && updates.username.trim().toLowerCase() !== current.username.toLowerCase()) {
      const cleanUsername = updates.username.trim().toLowerCase();
      const usernameTaken = this.data.users.some(u => u.id !== id && (u.storeId === current.storeId || !u.storeId) && u.username.toLowerCase() === cleanUsername);
      if (usernameTaken) {
        return { success: false, error: 'Este nome de usuário já está em uso por outro cadastro.' };
      }
    }

    // Check unique email if changed
    if (updates.email && updates.email.trim().toLowerCase() !== current.email.toLowerCase()) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const emailTaken = this.data.users.some(u => u.id !== id && (u.storeId === current.storeId || !u.storeId) && u.email.toLowerCase() === cleanEmail);
      if (emailTaken) {
        return { success: false, error: 'Este e-mail já está em uso por outro cadastro.' };
      }
    }

    // Check if trying to deactivate or change role of the last active ADMIN
    if ((updates.ativo === false || (updates.role && updates.role !== 'ADMIN')) && current.role === 'ADMIN' && current.ativo) {
      const activeAdmins = this.data.users.filter(u => u.storeId === current.storeId && u.role === 'ADMIN' && u.ativo && u.id !== id);
      if (activeAdmins.length === 0) {
        return { success: false, error: 'Não é permitido desativar ou alterar a permissão do único administrador ativo da loja.' };
      }
    }

    let passwordHash = current.password;
    const rawPass = updates.password !== undefined
      ? updates.password
      : (updates as any).senha !== undefined
        ? (updates as any).senha
        : (updates as any).newPassword;
    let passwordChanged = false;

    if (rawPass !== undefined && typeof rawPass === 'string' && rawPass.trim().length > 0) {
      const cleanPass = rawPass.trim();
      passwordHash = (cleanPass.startsWith('$2a$') || cleanPass.startsWith('$2b$'))
        ? cleanPass
        : hashPassword(cleanPass);
      passwordChanged = true;
    }

    this.data.users[idx] = {
      ...current,
      nome: updates.nome !== undefined ? updates.nome.trim() : current.nome,
      email: updates.email !== undefined ? updates.email.trim().toLowerCase() : current.email,
      username: updates.username !== undefined ? updates.username.trim().toLowerCase() : current.username,
      role: updates.role !== undefined ? updates.role : current.role,
      ativo: updates.ativo !== undefined ? updates.ativo : current.ativo,
      avatar: updates.avatar !== undefined ? updates.avatar : current.avatar,
      password: passwordHash,
      passwordUpdatedAt: passwordChanged ? new Date().toISOString() : (current as any).passwordUpdatedAt,
      updatedAt: new Date().toISOString()
    };

    const updated = this.data.users[idx];
    this.saveData();
    mysqlManager.saveUser(updated);

    // If updated user is an ADMIN, also sync the store record
    if (updated.role === 'ADMIN' && this.data.stores) {
      this.data.stores.forEach((s, storeIdx) => {
        if (s.id === updated.storeId || !updated.storeId || s.slug === 'achadinhos-da-maria') {
          this.data.stores[storeIdx] = {
            ...this.data.stores[storeIdx],
            adminUser: updated.username,
            adminEmail: updated.email,
            ...(passwordChanged ? { adminPassword: passwordHash } : {}),
            updatedAt: new Date().toISOString()
          };
          mysqlManager.saveStore(this.data.stores[storeIdx]).catch(() => {});
        }
      });
      this.saveData();
    }

    return {
      success: true,
      user: {
        ...updated,
        password: '',
        passwordUpdatedAt: (updated as any).passwordUpdatedAt
      }
    };
  }

  public deleteUser(id: string): { success: boolean; error?: string } {
    if (!this.data.users) return { success: false, error: 'Nenhum usuário encontrado.' };
    const user = this.data.users.find(u => u.id === id);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    // Cannot delete the only active admin
    if (user.role === 'ADMIN' && user.ativo) {
      const remainingAdmins = this.data.users.filter(u => u.storeId === user.storeId && u.role === 'ADMIN' && u.ativo && u.id !== id);
      if (remainingAdmins.length === 0) {
        return { success: false, error: 'Não é possível excluir o único administrador ativo do sistema.' };
      }
    }

    this.data.users = this.data.users.filter(u => u.id !== id);
    this.saveData();
    mysqlManager.deleteUser(id);

    return { success: true };
  }

  // Clicks & Analytics
  public recordClick(storeSlug: string, clickData: Partial<ClickRecord>): ClickRecord {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';

    const click: ClickRecord = {
      id: 'click-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      storeId: storeId,
      productId: clickData.productId,
      produto: clickData.produto || 'Produto Afiliado',
      plataforma: clickData.plataforma || 'Loja Parceira',
      tipo: clickData.tipo || 'FISICO',
      categoria: clickData.categoria || 'Geral',
      origem: clickData.origem || 'Direto',
      utm_source: clickData.utm_source,
      utm_medium: clickData.utm_medium,
      utm_campaign: clickData.utm_campaign,
      createdAt: new Date().toISOString()
    };

    this.data.clicks.unshift(click);
    // Keep max 2000 clicks in memory/store to prevent unbounded growth
    if (this.data.clicks.length > 2000) {
      this.data.clicks = this.data.clicks.slice(0, 2000);
    }
    this.saveData();
    mysqlManager.saveClick(click).catch(() => {});
    return click;
  }

  public incrementViews(storeSlug: string) {
    if (!this.data.views) this.data.views = {};
    this.data.views[storeSlug] = (this.data.views[storeSlug] || 0) + 1;
    this.saveData();
  }

  public getMetrics(storeSlug: string, days?: number): StoreMetrics {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';

    let clicks = this.data.clicks.filter(c => c.storeId === storeId);
    if (days && days > 0) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      clicks = clicks.filter(c => new Date(c.createdAt) >= cutoff);
    }

    const totalViews = this.data.views?.[storeSlug] || (clicks.length * 4 + 85);
    const totalClicks = clicks.length;
    const ctr = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(1)) : 0;

    // Top products
    const prodMap: { [name: string]: { count: number; category: string; platform: string } } = {};
    const platformMap: { [plat: string]: number } = {};
    const catMap: { [cat: string]: number } = {};
    const utmMap: { [source: string]: number } = {};

    clicks.forEach(c => {
      // product
      if (!prodMap[c.produto]) {
        prodMap[c.produto] = { count: 0, category: c.categoria, platform: c.plataforma };
      }
      prodMap[c.produto].count += 1;

      // platform
      const plat = c.plataforma || 'Outros';
      platformMap[plat] = (platformMap[plat] || 0) + 1;

      // category
      const cat = c.categoria || 'Geral';
      catMap[cat] = (catMap[cat] || 0) + 1;

      // utm
      const src = c.utm_source || (c.origem ? c.origem.split('/')[0].trim() : 'Direto');
      if (src) {
        utmMap[src] = (utmMap[src] || 0) + 1;
      }
    });

    const topProducts = Object.entries(prodMap)
      .map(([nome, item]) => {
        const prod = this.data.products.find(p => p.nome === nome);
        return {
          nome,
          cliques: item.count,
          categoria: item.category,
          plataforma: item.platform,
          img: prod?.img1
        };
      })
      .sort((a, b) => b.cliques - a.cliques)
      .slice(0, 10);

    const platforms = Object.entries(platformMap)
      .map(([plataforma, count]) => ({
        plataforma,
        count,
        percentage: totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const categories = Object.entries(catMap)
      .map(([categoria, count]) => ({
        categoria,
        count,
        percentage: totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const utms = Object.entries(utmMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return {
      views: totalViews,
      totalClicks,
      ctr,
      couponCopies: Math.round(totalClicks * 0.35) + 3,
      topProducts,
      platforms,
      categories,
      recentClicks: clicks.slice(0, 30),
      utms
    };
  }

  // Import products from external list (e.g. from Google Sheets CSV migration)
  public bulkImport(storeSlug: string, products: Partial<Product>[], replace: boolean = false) {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';

    if (replace) {
      this.data.products = this.data.products.filter(p => p.storeId !== storeId);
    }

    products.forEach((p, idx) => {
      this.createProduct(storeSlug, {
        ...p,
        ordem: p.ordem || idx + 1
      });
    });

    this.saveData();
    return this.getProducts(storeSlug);
  }

  // Reset and restore demo products, categories, platforms and store settings
  public resetDemoData(storeSlug: string = 'achadinhos-da-maria') {
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store?.id || 'store-1';

    // Filter out existing items for this store
    this.data.products = this.data.products.filter(p => p.storeId !== storeId);
    this.data.categories = this.data.categories.filter(c => c.storeId !== storeId);
    this.data.platforms = this.data.platforms.filter(pl => pl.storeId !== storeId);

    // Re-add default items
    this.data.products.push(...DEFAULT_PRODUCTS.map(p => ({ ...p, storeId })));
    this.data.categories.push(...DEFAULT_CATEGORIES.map(c => ({ ...c, storeId })));
    this.data.platforms.push(...DEFAULT_PLATFORMS.map(pl => ({ ...pl, storeId })));

    // Ensure store is active
    const storeIdx = this.data.stores.findIndex(s => s.slug === storeSlug || s.id === storeId);
    if (storeIdx !== -1) {
      this.data.stores[storeIdx].lojaAtiva = true;
    }

    this.saveData();
    return {
      productsCount: DEFAULT_PRODUCTS.length,
      categoriesCount: DEFAULT_CATEGORIES.length,
      platformsCount: DEFAULT_PLATFORMS.length
    };
  }

  /**
   * Generates a complete ready-to-run SQL Dump for Hostinger MySQL/MariaDB and phpMyAdmin
   */
  public generateSqlDump(storeSlug?: string): string {
    const store = storeSlug ? this.getStoreBySlug(storeSlug) : this.data.stores[0];
    const storeId = store?.id || 'store-1';
    const products = this.data.products.filter(p => p.storeId === storeId);
    const categories = this.data.categories.filter(c => c.storeId === storeId);
    const platforms = this.data.platforms.filter(pl => pl.storeId === storeId);
    const users = (this.data.users || []).filter(u => u.storeId === storeId || !u.storeId);

    function escapeSql(val: any): string {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? '1' : '0';
      return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }

    const timestamp = new Date().toISOString();

    let sql = `-- ==========================================================\n`;
    sql += `-- MEUDOCELAR - DUMP SQL PARA HOSTINGER / PHPMYADMIN\n`;
    sql += `-- Gerado em: ${timestamp}\n`;
    sql += `-- Loja: ${store?.storeName || 'Meudocelar'} (${store?.slug})\n`;
    sql += `-- ==========================================================\n\n`;
    sql += `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // 1. Stores
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 1. DADOS DA LOJA (${store?.storeName || 'Loja'})\n`;
    sql += `-- ----------------------------------------------------------\n`;
    if (store) {
      sql += `INSERT INTO \`stores\` (\n`;
      sql += `  \`id\`, \`slug\`, \`storeName\`, \`logo\`, \`instagram\`, \`facebook\`, \`tiktok\`,\n`;
      sql += `  \`corPrimaria\`, \`corSecundaria\`, \`bannerUrl\`, \`bannerLink\`, \`bannerTag\`,\n`;
      sql += `  \`bannerTitulo\`, \`bannerSubtitulo\`, \`tituloSite\`, \`descricaoSite\`, \`lojaAtiva\`,\n`;
      sql += `  \`mensagemTopo\`, \`corBarraTopo\`, \`cnpj\`, \`endereco\`, \`email\`, \`canalWhatsapp\`,\n`;
      sql += `  \`canalTelegram\`, \`botaoCanalFlutuante\`, \`textoDisclosure\`, \`avisoPrecos\`,\n`;
      sql += `  \`sobreNos\`, \`termosUso\`, \`politicaPrivacidade\`,\n`;
      sql += `  \`adminUser\`, \`adminEmail\`, \`adminPassword\`\n`;
      sql += `) VALUES (\n`;
      sql += `  ${escapeSql(store.id)}, ${escapeSql(store.slug)}, ${escapeSql(store.storeName)}, ${escapeSql(store.logo)}, ${escapeSql(store.instagram)}, ${escapeSql(store.facebook)}, ${escapeSql(store.tiktok)},\n`;
      sql += `  ${escapeSql(store.corPrimaria)}, ${escapeSql(store.corSecundaria)}, ${escapeSql(store.bannerUrl)}, ${escapeSql(store.bannerLink)}, ${escapeSql(store.bannerTag)},\n`;
      sql += `  ${escapeSql(store.bannerTitulo)}, ${escapeSql(store.bannerSubtitulo)}, ${escapeSql(store.tituloSite)}, ${escapeSql(store.descricaoSite)}, ${escapeSql(store.lojaAtiva)},\n`;
      sql += `  ${escapeSql(store.mensagemTopo)}, ${escapeSql(store.corBarraTopo)}, ${escapeSql(store.cnpj)}, ${escapeSql(store.endereco)}, ${escapeSql(store.email)}, ${escapeSql(store.canalWhatsapp)},\n`;
      sql += `  ${escapeSql(store.canalTelegram)}, ${escapeSql(store.botaoCanalFlutuante)}, ${escapeSql(store.textoDisclosure)}, ${escapeSql(store.avisoPrecos)},\n`;
      sql += `  ${escapeSql(store.sobreNos || '')}, ${escapeSql(store.termosUso || '')}, ${escapeSql(store.politicaPrivacidade || '')},\n`;
      sql += `  ${escapeSql(store.adminUser)}, ${escapeSql(store.adminEmail)}, ${escapeSql(store.adminPassword)}\n`;
      sql += `) ON DUPLICATE KEY UPDATE \`storeName\`=VALUES(\`storeName\`), \`sobreNos\`=VALUES(\`sobreNos\`), \`termosUso\`=VALUES(\`termosUso\`), \`politicaPrivacidade\`=VALUES(\`politicaPrivacidade\`), \`updatedAt\`=NOW();\n\n`;
    }

    // 2. Categories
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 2. CATEGORIAS (${categories.length} registros)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    if (categories.length > 0) {
      sql += `INSERT INTO \`categories\` (\`id\`, \`storeId\`, \`nome\`, \`slug\`, \`icone\`, \`ativo\`, \`ordemMenu\`, \`exibirNoMenu\`) VALUES\n`;
      const catRows = categories.map(c => {
        const slug = (c as any).slug || c.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const ativo = (c as any).ativo !== undefined ? (c as any).ativo : 1;
        const ordem = c.ordem || 1;
        const exibir = c.mostrarNoMenu !== undefined ? c.mostrarNoMenu : 1;
        return `  (${escapeSql(c.id)}, ${escapeSql(c.storeId)}, ${escapeSql(c.nome)}, ${escapeSql(slug)}, ${escapeSql(c.icone || 'Sparkles')}, ${escapeSql(ativo)}, ${escapeSql(ordem)}, ${escapeSql(exibir)})`;
      });
      sql += catRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`nome\`=VALUES(\`nome\`);\n\n`;
    }

    // 3. Platforms
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 3. PLATAFORMAS DE AFILIADOS (${platforms.length} registros)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    if (platforms.length > 0) {
      sql += `INSERT INTO \`platforms\` (\`id\`, \`storeId\`, \`nome\`, \`slug\`, \`cor\`, \`badge\`, \`icone\`, \`ativo\`, \`ordem\`) VALUES\n`;
      const platRows = platforms.map(p => {
        const slug = (p as any).slug || p.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const cor = (p as any).cor || p.corBadge || '#2A5C3F';
        const badge = (p as any).badge || p.textoBotaoPadrao || '';
        const icone = p.icone || 'ShoppingBag';
        const ativo = p.ativo !== undefined ? p.ativo : 1;
        const ordem = p.ordem || 1;
        return `  (${escapeSql(p.id)}, ${escapeSql(p.storeId)}, ${escapeSql(p.nome)}, ${escapeSql(slug)}, ${escapeSql(cor)}, ${escapeSql(badge)}, ${escapeSql(icone)}, ${escapeSql(ativo)}, ${escapeSql(ordem)})`;
      });
      sql += platRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`nome\`=VALUES(\`nome\`);\n\n`;
    }

    // 4. Products
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 4. PRODUTOS DO CATÁLOGO (${products.length} itens)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    if (products.length > 0) {
      sql += `INSERT INTO \`products\` (\n`;
      sql += `  \`id\`, \`storeId\`, \`ativo\`, \`tipo\`, \`plataforma\`, \`categoria\`, \`subcategoria\`,\n`;
      sql += `  \`nome\`, \`descricao\`, \`preco\`, \`precoPromo\`, \`cupom\`, \`validade\`,\n`;
      sql += `  \`linkAfiliado\`, \`textoBotao\`, \`video\`, \`img1\`, \`img2\`, \`img3\`, \`img4\`,\n`;
      sql += `  \`ordem\`, \`destaque\`\n`;
      sql += `) VALUES\n`;

      const prodRows = products.map(p => {
        return `  (${escapeSql(p.id)}, ${escapeSql(p.storeId)}, ${escapeSql(p.ativo)}, ${escapeSql(p.tipo)}, ${escapeSql(p.plataforma)}, ${escapeSql(p.categoria)}, ${escapeSql(p.subcategoria)}, ` +
               `${escapeSql(p.nome)}, ${escapeSql(p.descricao)}, ${escapeSql(p.preco)}, ${escapeSql(p.precoPromo)}, ${escapeSql(p.cupom)}, ${escapeSql(p.validade)}, ` +
               `${escapeSql(p.linkAfiliado)}, ${escapeSql(p.textoBotao)}, ${escapeSql(p.video)}, ${escapeSql(p.img1)}, ${escapeSql(p.img2)}, ${escapeSql(p.img3)}, ${escapeSql(p.img4)}, ` +
               `${escapeSql(p.ordem)}, ${escapeSql(p.destaque)})`;
      });

      sql += prodRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`nome\`=VALUES(\`nome\`), \`preco\`=VALUES(\`preco\`), \`precoPromo\`=VALUES(\`precoPromo\`);\n\n`;
    }

    // 5. Users
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 5. USUÁRIOS E ACESSOS (${users.length} usuários)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    if (users.length > 0) {
      sql += `INSERT INTO \`users\` (\n`;
      sql += `  \`id\`, \`storeId\`, \`nome\`, \`email\`, \`username\`, \`password\`, \`role\`, \`ativo\`, \`avatar\`\n`;
      sql += `) VALUES\n`;

      const userRows = users.map(u => {
        return `  (${escapeSql(u.id)}, ${escapeSql(u.storeId)}, ${escapeSql(u.nome)}, ${escapeSql(u.email)}, ` +
               `${escapeSql(u.username)}, ${escapeSql(u.password)}, ${escapeSql(u.role || 'ADMIN')}, ${escapeSql(u.ativo !== false ? 1 : 0)}, ${escapeSql(u.avatar || '')})`;
      });

      sql += userRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`nome\`=VALUES(\`nome\`), \`email\`=VALUES(\`email\`), \`role\`=VALUES(\`role\`);\n\n`;
    }

    // 6. Blog Categories
    const blogCategories = (this.data.blogCategories || []).filter(c => !c.storeId || c.storeId === storeId);
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 6. CATEGORIAS DO BLOG (${blogCategories.length} categorias)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`blog_categories\` (\n`;
    sql += `  \`id\` varchar(64) NOT NULL,\n`;
    sql += `  \`storeId\` varchar(64) DEFAULT 'store-1',\n`;
    sql += `  \`name\` varchar(255) NOT NULL,\n`;
    sql += `  \`slug\` varchar(255) NOT NULL,\n`;
    sql += `  \`icon\` varchar(64) DEFAULT '📑',\n`;
    sql += `  \`description\` text DEFAULT NULL,\n`;
    sql += `  \`order\` int(11) DEFAULT 0,\n`;
    sql += `  \`active\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`createdAt\` datetime DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  \`updatedAt\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  UNIQUE KEY \`uniq_store_catslug\` (\`storeId\`,\`slug\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    if (blogCategories.length > 0) {
      sql += `INSERT INTO \`blog_categories\` (\n`;
      sql += `  \`id\`, \`storeId\`, \`name\`, \`slug\`, \`icon\`, \`description\`, \`order\`, \`active\`\n`;
      sql += `) VALUES\n`;
      const catRows = blogCategories.map(c => {
        return `  (${escapeSql(c.id)}, ${escapeSql(c.storeId || storeId)}, ${escapeSql(c.name)}, ${escapeSql(c.slug)}, ${escapeSql(c.icon || '📑')}, ${escapeSql(c.description || '')}, ${escapeSql(c.order || 0)}, ${escapeSql(c.active !== false ? 1 : 0)})`;
      });
      sql += catRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`slug\`=VALUES(\`slug\`), \`icon\`=VALUES(\`icon\`);\n\n`;
    }

    // 7. Blog Editors
    const blogEditors = (this.data.blogEditors || []).filter(e => !e.storeId || e.storeId === storeId);
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 7. REDATORES / AUTORES DO BLOG (${blogEditors.length} redatores)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`blog_editors\` (\n`;
    sql += `  \`id\` varchar(64) NOT NULL,\n`;
    sql += `  \`storeId\` varchar(64) DEFAULT 'store-1',\n`;
    sql += `  \`name\` varchar(255) NOT NULL,\n`;
    sql += `  \`avatar\` text DEFAULT NULL,\n`;
    sql += `  \`role\` varchar(255) DEFAULT 'Redator & Curador',\n`;
    sql += `  \`bio\` text DEFAULT NULL,\n`;
    sql += `  \`socialLink\` varchar(500) DEFAULT '',\n`;
    sql += `  \`email\` varchar(255) DEFAULT '',\n`;
    sql += `  \`active\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`createdAt\` datetime DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  \`updatedAt\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    if (blogEditors.length > 0) {
      sql += `INSERT INTO \`blog_editors\` (\n`;
      sql += `  \`id\`, \`storeId\`, \`name\`, \`avatar\`, \`role\`, \`bio\`, \`socialLink\`, \`email\`, \`active\`\n`;
      sql += `) VALUES\n`;
      const edRows = blogEditors.map(e => {
        return `  (${escapeSql(e.id)}, ${escapeSql(e.storeId || storeId)}, ${escapeSql(e.name)}, ${escapeSql(e.avatar || '')}, ${escapeSql(e.role || 'Redator & Curador')}, ${escapeSql(e.bio || '')}, ${escapeSql(e.socialLink || '')}, ${escapeSql(e.email || '')}, ${escapeSql(e.active !== false ? 1 : 0)})`;
      });
      sql += edRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`role\`=VALUES(\`role\`), \`avatar\`=VALUES(\`avatar\`);\n\n`;
    }

    // 8. Blog Posts
    const blogPosts = (this.data.posts || []).filter(p => !p.storeId || p.storeId === storeId);
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 8. ARTIGOS DO BLOG (${blogPosts.length} artigos)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`blog_posts\` (\n`;
    sql += `  \`id\` varchar(64) NOT NULL,\n`;
    sql += `  \`storeId\` varchar(64) DEFAULT 'store-1',\n`;
    sql += `  \`slug\` varchar(255) NOT NULL,\n`;
    sql += `  \`title\` varchar(500) NOT NULL,\n`;
    sql += `  \`excerpt\` text DEFAULT NULL,\n`;
    sql += `  \`content\` longtext NOT NULL,\n`;
    sql += `  \`coverImage\` text DEFAULT NULL,\n`;
    sql += `  \`category\` varchar(255) DEFAULT 'Geral',\n`;
    sql += `  \`tags\` text DEFAULT NULL,\n`;
    sql += `  \`authorId\` varchar(64) DEFAULT NULL,\n`;
    sql += `  \`author\` varchar(255) DEFAULT 'Equipe',\n`;
    sql += `  \`authorAvatar\` text DEFAULT NULL,\n`;
    sql += `  \`authorRole\` varchar(255) DEFAULT NULL,\n`;
    sql += `  \`authorBio\` text DEFAULT NULL,\n`;
    sql += `  \`readTime\` varchar(64) DEFAULT '4 min',\n`;
    sql += `  \`destaque\` tinyint(1) DEFAULT 0,\n`;
    sql += `  \`status\` varchar(32) DEFAULT 'published',\n`;
    sql += `  \`views\` int(11) DEFAULT 0,\n`;
    sql += `  \`linkedProductIds\` text DEFAULT NULL,\n`;
    sql += `  \`sidebarBanner\` longtext DEFAULT NULL,\n`;
    sql += `  \`publishedAt\` datetime DEFAULT NULL,\n`;
    sql += `  \`createdAt\` datetime DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  \`updatedAt\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  UNIQUE KEY \`uniq_store_postslug\` (\`storeId\`,\`slug\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    if (blogPosts.length > 0) {
      sql += `INSERT INTO \`blog_posts\` (\n`;
      sql += `  \`id\`, \`storeId\`, \`slug\`, \`title\`, \`excerpt\`, \`content\`, \`coverImage\`,\n`;
      sql += `  \`category\`, \`tags\`, \`authorId\`, \`author\`, \`authorAvatar\`, \`authorRole\`, \`authorBio\`,\n`;
      sql += `  \`readTime\`, \`destaque\`, \`status\`, \`views\`, \`linkedProductIds\`, \`sidebarBanner\`\n`;
      sql += `) VALUES\n`;
      const postRows = blogPosts.map(p => {
        const tagsJson = JSON.stringify(p.tags || []);
        const linkedJson = JSON.stringify(p.linkedProductIds || []);
        const bannerJson = p.sidebarBanner ? JSON.stringify(p.sidebarBanner) : null;
        return `  (${escapeSql(p.id)}, ${escapeSql(p.storeId || storeId)}, ${escapeSql(p.slug)}, ${escapeSql(p.title)}, ${escapeSql(p.excerpt || '')}, ${escapeSql(p.content || '')}, ${escapeSql(p.coverImage || '')},\n` +
               `   ${escapeSql(p.category || 'Geral')}, ${escapeSql(tagsJson)}, ${escapeSql(p.authorId || null)}, ${escapeSql(p.author || 'Equipe')}, ${escapeSql(p.authorAvatar || '')}, ${escapeSql(p.authorRole || '')}, ${escapeSql(p.authorBio || '')},\n` +
               `   ${escapeSql(p.readTime || '4 min')}, ${escapeSql(p.destaque ? 1 : 0)}, ${escapeSql(p.status || 'published')}, ${escapeSql(p.views || 0)}, ${escapeSql(linkedJson)}, ${escapeSql(bannerJson)})`;
      });
      sql += postRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`content\`=VALUES(\`content\`), \`coverImage\`=VALUES(\`coverImage\`), \`status\`=VALUES(\`status\`), \`sidebarBanner\`=VALUES(\`sidebarBanner\`);\n\n`;
    }

    // 9. Blog Settings
    const curSettings = this.getBlogSettings(store?.slug || 'achadinhos-da-maria');
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 9. CONFIGURAÇÕES E APARÊNCIA DO BLOG\n`;
    sql += `-- ----------------------------------------------------------\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`blog_settings\` (\n`;
    sql += `  \`id\` varchar(64) NOT NULL,\n`;
    sql += `  \`storeSlug\` varchar(255) NOT NULL,\n`;
    sql += `  \`storeId\` varchar(64) DEFAULT 'store-1',\n`;
    sql += `  \`heroBackgroundImage\` text DEFAULT NULL,\n`;
    sql += `  \`heroOverlayOpacity\` int(11) DEFAULT 65,\n`;
    sql += `  \`heroTitle\` varchar(500) DEFAULT '',\n`;
    sql += `  \`heroSubtitle\` varchar(500) DEFAULT '',\n`;
    sql += `  \`heroBadge\` varchar(255) DEFAULT '',\n`;
    sql += `  \`heroShowSearch\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`heroSearchPlaceholder\` varchar(255) DEFAULT 'Buscar artigos, dicas e achadinhos...',\n`;
    sql += `  \`heroShowCta\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`heroCtaText\` varchar(255) DEFAULT 'Explorar Todos os Artigos',\n`;
    sql += `  \`heroCtaTarget\` varchar(255) DEFAULT '#artigos',\n`;
    sql += `  \`topBarEnabled\` tinyint(1) DEFAULT 0,\n`;
    sql += `  \`topBarText\` varchar(500) DEFAULT '',\n`;
    sql += `  \`topBarBgColor\` varchar(32) DEFAULT '#2A5C3F',\n`;
    sql += `  \`topBarTextColor\` varchar(32) DEFAULT '#FFFFFF',\n`;
    sql += `  \`topBarLink\` varchar(500) DEFAULT '',\n`;
    sql += `  \`blogLogo\` text DEFAULT NULL,\n`;
    sql += `  \`blogStoreName\` varchar(255) DEFAULT '',\n`;
    sql += `  \`blogTagline\` varchar(255) DEFAULT '',\n`;
    sql += `  \`blogPrimaryColor\` varchar(32) DEFAULT '#2A5C3F',\n`;
    sql += `  \`menuHomeLabel\` varchar(128) DEFAULT 'Início',\n`;
    sql += `  \`menuStoreLabel\` varchar(128) DEFAULT 'Ver Ofertas',\n`;
    sql += `  \`menuShowStore\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`menuStoreBadge\` varchar(64) DEFAULT 'Vitrine',\n`;
    sql += `  \`menuInstitutionalLabel\` varchar(128) DEFAULT 'Sobre Nós',\n`;
    sql += `  \`menuShowInstitutional\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`menuContactLabel\` varchar(128) DEFAULT 'Contato',\n`;
    sql += `  \`menuShowContact\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`menuShowWhatsApp\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`menuShowVitrineBtn\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`menuVitrineBtnText\` varchar(128) DEFAULT 'Ir para Vitrine',\n`;
    sql += `  \`showCategoriesBar\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`footerText\` varchar(500) DEFAULT '',\n`;
    sql += `  \`footerShowSocial\` tinyint(1) DEFAULT 1,\n`;
    sql += `  \`articleFooterAd\` longtext DEFAULT NULL,\n`;
    sql += `  \`articleFooterAds\` longtext DEFAULT NULL,\n`;
    sql += `  \`articleSidebarBanner\` longtext DEFAULT NULL,\n`;
    sql += `  \`sobreNos\` longtext DEFAULT NULL,\n`;
    sql += `  \`textoDisclosure\` text DEFAULT NULL,\n`;
    sql += `  \`termosUso\` longtext DEFAULT NULL,\n`;
    sql += `  \`politicaPrivacidade\` longtext DEFAULT NULL,\n`;
    sql += `  \`cnpj\` varchar(64) DEFAULT NULL,\n`;
    sql += `  \`endereco\` text DEFAULT NULL,\n`;
    sql += `  \`email\` varchar(255) DEFAULT NULL,\n`;
    sql += `  \`updatedAt\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  UNIQUE KEY \`uniq_blog_settings_slug\` (\`storeSlug\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    if (curSettings) {
      const singleAdJson = JSON.stringify(curSettings.articleFooterAd || null);
      const adsJson = JSON.stringify(curSettings.articleFooterAds || []);
      const sidebarBannerJson = JSON.stringify(curSettings.articleSidebarBanner || null);
      sql += `INSERT INTO \`blog_settings\` (\n`;
      sql += `  \`id\`, \`storeSlug\`, \`storeId\`, \`heroBackgroundImage\`, \`heroOverlayOpacity\`,\n`;
      sql += `  \`heroTitle\`, \`heroSubtitle\`, \`heroBadge\`, \`heroShowSearch\`, \`heroSearchPlaceholder\`,\n`;
      sql += `  \`heroShowCta\`, \`heroCtaText\`, \`heroCtaTarget\`,\n`;
      sql += `  \`topBarEnabled\`, \`topBarText\`, \`topBarBgColor\`, \`topBarTextColor\`, \`topBarLink\`,\n`;
      sql += `  \`blogLogo\`, \`blogStoreName\`, \`blogTagline\`, \`blogPrimaryColor\`,\n`;
      sql += `  \`menuHomeLabel\`, \`menuStoreLabel\`, \`menuShowStore\`, \`menuStoreBadge\`,\n`;
      sql += `  \`menuInstitutionalLabel\`, \`menuShowInstitutional\`, \`menuContactLabel\`, \`menuShowContact\`,\n`;
      sql += `  \`menuShowWhatsApp\`, \`menuShowVitrineBtn\`, \`menuVitrineBtnText\`,\n`;
      sql += `  \`showCategoriesBar\`, \`footerText\`, \`footerShowSocial\`,\n`;
      sql += `  \`articleFooterAd\`, \`articleFooterAds\`, \`articleSidebarBanner\`,\n`;
      sql += `  \`sobreNos\`, \`textoDisclosure\`, \`termosUso\`, \`politicaPrivacidade\`, \`cnpj\`, \`endereco\`, \`email\`\n`;
      sql += `) VALUES (\n`;
      sql += `  ${escapeSql('bs-' + (store?.slug || 'achadinhos-da-maria'))}, ${escapeSql(store?.slug || 'achadinhos-da-maria')}, ${escapeSql(storeId)},\n`;
      sql += `  ${escapeSql(curSettings.heroBackgroundImage || '')}, ${escapeSql(curSettings.heroOverlayOpacity !== undefined ? curSettings.heroOverlayOpacity : 65)},\n`;
      sql += `  ${escapeSql(curSettings.heroTitle || '')}, ${escapeSql(curSettings.heroSubtitle || '')}, ${escapeSql(curSettings.heroBadge || '')},\n`;
      sql += `  ${escapeSql(curSettings.heroShowSearch !== false ? 1 : 0)}, ${escapeSql(curSettings.heroSearchPlaceholder || 'Buscar artigos, dicas e achadinhos...')},\n`;
      sql += `  ${escapeSql(curSettings.heroShowCta !== false ? 1 : 0)}, ${escapeSql(curSettings.heroCtaText || 'Explorar Todos os Artigos')}, ${escapeSql(curSettings.heroCtaTarget || '#artigos')},\n`;
      sql += `  ${escapeSql(curSettings.topBarEnabled ? 1 : 0)}, ${escapeSql(curSettings.topBarText || '')}, ${escapeSql(curSettings.topBarBgColor || '#2A5C3F')}, ${escapeSql(curSettings.topBarTextColor || '#FFFFFF')}, ${escapeSql(curSettings.topBarLink || '')},\n`;
      sql += `  ${escapeSql(curSettings.blogLogo || '')}, ${escapeSql(curSettings.blogStoreName || '')}, ${escapeSql(curSettings.blogTagline || '')}, ${escapeSql(curSettings.blogPrimaryColor || '#2A5C3F')},\n`;
      sql += `  ${escapeSql(curSettings.menuHomeLabel || 'Início')}, ${escapeSql(curSettings.menuStoreLabel || 'Ver Ofertas')}, ${escapeSql(curSettings.menuShowStore !== false ? 1 : 0)}, ${escapeSql(curSettings.menuStoreBadge || 'Vitrine')},\n`;
      sql += `  ${escapeSql(curSettings.menuInstitutionalLabel || 'Sobre Nós')}, ${escapeSql(curSettings.menuShowInstitutional !== false ? 1 : 0)}, ${escapeSql(curSettings.menuContactLabel || 'Contato')}, ${escapeSql(curSettings.menuShowContact !== false ? 1 : 0)},\n`;
      sql += `  ${escapeSql(curSettings.menuShowWhatsApp !== false ? 1 : 0)}, ${escapeSql(curSettings.menuShowVitrineBtn !== false ? 1 : 0)}, ${escapeSql(curSettings.menuVitrineBtnText || 'Ir para Vitrine')},\n`;
      sql += `  ${escapeSql(curSettings.showCategoriesBar !== false ? 1 : 0)}, ${escapeSql(curSettings.footerText || '')}, ${escapeSql(curSettings.footerShowSocial !== false ? 1 : 0)},\n`;
      sql += `  ${escapeSql(singleAdJson)}, ${escapeSql(adsJson)}, ${escapeSql(sidebarBannerJson)},\n`;
      sql += `  ${escapeSql(curSettings.sobreNos || store?.sobreNos || '')}, ${escapeSql(curSettings.textoDisclosure || store?.textoDisclosure || '')}, ${escapeSql(curSettings.termosUso || store?.termosUso || '')}, ${escapeSql(curSettings.politicaPrivacidade || store?.politicaPrivacidade || '')},\n`;
      sql += `  ${escapeSql(curSettings.cnpj || store?.cnpj || '')}, ${escapeSql(curSettings.endereco || store?.endereco || '')}, ${escapeSql(curSettings.email || store?.email || '')}\n`;
      sql += `) ON DUPLICATE KEY UPDATE \`heroTitle\`=VALUES(\`heroTitle\`), \`sobreNos\`=VALUES(\`sobreNos\`), \`termosUso\`=VALUES(\`termosUso\`), \`politicaPrivacidade\`=VALUES(\`politicaPrivacidade\`), \`updatedAt\`=NOW();\n\n`;
    }

    // 10. Contact Messages
    const contactMessages = (this.data.messages || []).filter(m => !m.storeId || m.storeId === storeId);
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 10. MENSAGENS DE CONTATO (${contactMessages.length} mensagens)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`contact_messages\` (\n`;
    sql += `  \`id\` varchar(64) NOT NULL,\n`;
    sql += `  \`storeId\` varchar(64) DEFAULT 'store-1',\n`;
    sql += `  \`nome\` varchar(255) NOT NULL,\n`;
    sql += `  \`email\` varchar(255) NOT NULL,\n`;
    sql += `  \`assunto\` varchar(255) DEFAULT 'Mensagem do Site',\n`;
    sql += `  \`mensagem\` text NOT NULL,\n`;
    sql += `  \`lida\` tinyint(1) DEFAULT 0,\n`;
    sql += `  \`createdAt\` datetime DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    if (contactMessages.length > 0) {
      sql += `INSERT INTO \`contact_messages\` (\n`;
      sql += `  \`id\`, \`storeId\`, \`nome\`, \`email\`, \`assunto\`, \`mensagem\`, \`lida\`\n`;
      sql += `) VALUES\n`;
      const msgRows = contactMessages.map(m => {
        return `  (${escapeSql(m.id)}, ${escapeSql(m.storeId || storeId)}, ${escapeSql(m.nome)}, ${escapeSql(m.email)}, ${escapeSql(m.assunto || 'Mensagem do Site')}, ${escapeSql(m.mensagem)}, ${escapeSql(m.lida ? 1 : 0)})`;
      });
      sql += msgRows.join(',\n') + '\n';
      sql += `ON DUPLICATE KEY UPDATE \`lida\`=VALUES(\`lida\`);\n\n`;
    }

    // 11. Institutional Pages
    const instData = this.getInstitutional(store?.slug || 'achadinhos-da-maria');
    sql += `-- ----------------------------------------------------------\n`;
    sql += `-- 11. DADOS INSTITUCIONAIS & INFORMAÇÕES LEGAIS (institutional_pages)\n`;
    sql += `-- ----------------------------------------------------------\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`institutional_pages\` (\n`;
    sql += `  \`id\` varchar(64) NOT NULL,\n`;
    sql += `  \`storeSlug\` varchar(128) NOT NULL,\n`;
    sql += `  \`storeName\` varchar(255) DEFAULT '',\n`;
    sql += `  \`cnpj\` varchar(64) DEFAULT '',\n`;
    sql += `  \`endereco\` text DEFAULT NULL,\n`;
    sql += `  \`email\` varchar(255) DEFAULT '',\n`;
    sql += `  \`sobreNos\` longtext DEFAULT NULL,\n`;
    sql += `  \`textoDisclosure\` text DEFAULT NULL,\n`;
    sql += `  \`termosUso\` longtext DEFAULT NULL,\n`;
    sql += `  \`politicaPrivacidade\` longtext DEFAULT NULL,\n`;
    sql += `  \`updatedAt\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  UNIQUE KEY \`uniq_inst_slug\` (\`storeSlug\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    sql += `INSERT INTO \`institutional_pages\` (\n`;
    sql += `  \`id\`, \`storeSlug\`, \`storeName\`, \`cnpj\`, \`endereco\`, \`email\`,\n`;
    sql += `  \`sobreNos\`, \`textoDisclosure\`, \`termosUso\`, \`politicaPrivacidade\`\n`;
    sql += `) VALUES (\n`;
    sql += `  ${escapeSql(instData.id || ('inst-' + (store?.slug || 'achadinhos-da-maria')))}, ${escapeSql(store?.slug || 'achadinhos-da-maria')}, ${escapeSql(instData.storeName || store?.storeName || 'Meudocelar')},\n`;
    sql += `  ${escapeSql(instData.cnpj || store?.cnpj || '')}, ${escapeSql(instData.endereco || store?.endereco || '')}, ${escapeSql(instData.email || store?.email || '')},\n`;
    sql += `  ${escapeSql(instData.sobreNos || store?.sobreNos || '')}, ${escapeSql(instData.textoDisclosure || store?.textoDisclosure || '')},\n`;
    sql += `  ${escapeSql(instData.termosUso || store?.termosUso || '')}, ${escapeSql(instData.politicaPrivacidade || store?.politicaPrivacidade || '')}\n`;
    sql += `) ON DUPLICATE KEY UPDATE\n`;
    sql += `  \`storeName\`=VALUES(\`storeName\`), \`cnpj\`=VALUES(\`cnpj\`), \`endereco\`=VALUES(\`endereco\`), \`email\`=VALUES(\`email\`),\n`;
    sql += `  \`sobreNos\`=VALUES(\`sobreNos\`), \`textoDisclosure\`=VALUES(\`textoDisclosure\`), \`termosUso\`=VALUES(\`termosUso\`), \`politicaPrivacidade\`=VALUES(\`politicaPrivacidade\`), \`updatedAt\`=NOW();\n\n`;

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- Fim do dump SQL para Hostinger\n`;

    return sql;
  }

  /**
   * Generates a complete JSON backup of the store
   */
  public generateJsonBackup(storeSlug?: string): any {
    const store = storeSlug ? this.getStoreBySlug(storeSlug) : this.data.stores[0];
    const storeId = store?.id || 'store-1';

    return {
      exportedAt: new Date().toISOString(),
      store,
      products: this.data.products.filter(p => p.storeId === storeId),
      categories: this.data.categories.filter(c => c.storeId === storeId),
      platforms: this.data.platforms.filter(pl => pl.storeId === storeId),
      users: (this.data.users || []).filter(u => u.storeId === storeId || !u.storeId).map(u => ({ ...u, password: '' })),
      clicksCount: this.data.clicks.filter(c => c.storeId === storeId).length,
      viewsCount: this.data.views?.[store?.slug || ''] || 0
    };
  }

  // ============================================
  // PRICE MONITOR & SYNC METHODS
  // ============================================

  public getPriceMonitorSettings(storeSlug: string = 'achadinhos-da-maria'): PriceMonitorSettings {
    const store = this.getStoreBySlug(storeSlug) || this.data.stores[0];
    const storeId = store?.id || 'store-1';
    
    if (!this.data.priceMonitorSettings) {
      this.data.priceMonitorSettings = {};
    }

    if (!this.data.priceMonitorSettings[storeSlug]) {
      this.data.priceMonitorSettings[storeSlug] = {
        storeId,
        enabled: true,
        autoApply: false,
        disableOn404: true,
        frequencyHours: 12,
        markupType: 'direct',
        markupValue: 0,
        outOfStockAction: 'pause',
        notifyPriceChanges: true,
        lastSyncAt: undefined,
        totalMonitoredProducts: this.getProducts(storeSlug, false).filter(p => !!p.linkAfiliado).length
      };
      this.saveData();
    }

    const totalMonitored = this.getProducts(storeSlug, false).filter(p => !!p.linkAfiliado).length;
    return {
      ...this.data.priceMonitorSettings[storeSlug],
      totalMonitoredProducts: totalMonitored
    };
  }

  public savePriceMonitorSettings(
    storeSlug: string = 'achadinhos-da-maria',
    settings: Partial<PriceMonitorSettings>
  ): PriceMonitorSettings {
    if (!this.data.priceMonitorSettings) {
      this.data.priceMonitorSettings = {};
    }
    const current = this.getPriceMonitorSettings(storeSlug);
    const updated: PriceMonitorSettings = {
      ...current,
      ...settings,
      totalMonitoredProducts: this.getProducts(storeSlug, false).filter(p => !!p.linkAfiliado).length
    };
    this.data.priceMonitorSettings[storeSlug] = updated;
    this.saveData();
    return updated;
  }

  public getPriceLogs(storeSlug: string = 'achadinhos-da-maria', limit: number = 50): PriceLogRecord[] {
    if (!this.data.priceLogs) {
      this.data.priceLogs = {};
    }
    const logs = this.data.priceLogs[storeSlug] || [];
    return logs.slice(0, limit);
  }

  public addPriceLog(
    storeSlug: string = 'achadinhos-da-maria',
    log: Omit<PriceLogRecord, 'id' | 'createdAt'>
  ): PriceLogRecord {
    if (!this.data.priceLogs) {
      this.data.priceLogs = {};
    }
    if (!this.data.priceLogs[storeSlug]) {
      this.data.priceLogs[storeSlug] = [];
    }

    const newLog: PriceLogRecord = {
      ...log,
      id: `plog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };

    this.data.priceLogs[storeSlug].unshift(newLog);
    // Keep max 200 logs
    if (this.data.priceLogs[storeSlug].length > 200) {
      this.data.priceLogs[storeSlug] = this.data.priceLogs[storeSlug].slice(0, 200);
    }
    this.saveData();
    return newLog;
  }

  public applyBatchPriceUpdates(
    storeSlug: string = 'achadinhos-da-maria',
    updates: {
      productId: string;
      newPrice?: number;
      newPromo?: number | null;
      ativo?: boolean;
      newSupplierPrice?: number;
      newSupplierPromo?: number | null;
      stockStatus?: 'in_stock' | 'out_of_stock';
    }[]
  ): { updatedCount: number; updatedProducts: Product[] } {
    let count = 0;
    const updatedProducts: Product[] = [];
    const store = this.getStoreBySlug(storeSlug) || this.data.stores[0];
    const storeId = store?.id || 'store-1';

    for (const item of updates) {
      const prod = this.data.products.find(p => p.id === item.productId);
      if (!prod) continue;

      const oldPrice = prod.preco;
      const oldPromo = prod.precoPromo;
      let changed = false;

      if (item.newPrice !== undefined && item.newPrice !== null && item.newPrice > 0 && item.newPrice !== prod.preco) {
        prod.preco = item.newPrice;
        changed = true;
      }

      if (item.newPromo !== undefined && item.newPromo !== prod.precoPromo) {
        prod.precoPromo = item.newPromo;
        changed = true;
      }

      if (item.ativo !== undefined && item.ativo !== prod.ativo) {
        prod.ativo = item.ativo;
        changed = true;
      }

      if (changed) {
        prod.updatedAt = new Date().toISOString();
        count++;
        updatedProducts.push(prod);

        // Record price log
        this.addPriceLog(storeSlug, {
          storeId,
          productId: prod.id,
          productName: prod.nome,
          platform: prod.plataforma,
          oldPrice,
          newSupplierPrice: item.newSupplierPrice !== undefined ? item.newSupplierPrice : (item.newPrice || prod.preco),
          appliedPrice: prod.preco,
          oldPromo,
          newSupplierPromo: item.newSupplierPromo !== undefined ? item.newSupplierPromo : prod.precoPromo,
          appliedPromo: prod.precoPromo,
          stockStatus: item.stockStatus || (prod.ativo ? 'in_stock' : 'out_of_stock'),
          actionTaken: item.ativo === false ? 'paused' : 'updated'
        });
      }
    }

    if (count > 0) {
      this.saveData();
      for (const prod of updatedProducts) {
        mysqlManager.saveProduct(prod).catch(() => {});
      }
      // Update last sync time
      this.savePriceMonitorSettings(storeSlug, {
        lastSyncAt: new Date().toISOString()
      });
    }

    return { updatedCount: count, updatedProducts };
  }

  // ============================================
  // BLOG POST METHODS
  // ============================================

  public getPosts(storeSlug?: string, onlyPublished: boolean = true): BlogPost[] {
    if (!this.data.posts) {
      this.data.posts = [...FALLBACK_BLOG_POSTS];
    }
    const store = storeSlug ? this.getStoreBySlug(storeSlug) : null;
    const storeId = store ? store.id : 'store-1';

    let list = this.data.posts.filter(p => !p.storeId || p.storeId === storeId || p.storeId === 'store-1');
    if (onlyPublished) {
      list = list.filter(p => p.status === 'published');
    }
    return list.sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }

  public getPostBySlug(storeSlug: string, postSlug: string): BlogPost | undefined {
    if (!this.data.posts) {
      this.data.posts = [...FALLBACK_BLOG_POSTS];
    }
    return this.data.posts.find(p => p.slug === postSlug || p.id === postSlug);
  }

  public getPostById(id: string): BlogPost | undefined {
    if (!this.data.posts) {
      this.data.posts = [...FALLBACK_BLOG_POSTS];
    }
    return this.data.posts.find(p => p.id === id);
  }

  public savePost(storeSlug: string, postData: Partial<BlogPost>): BlogPost {
    if (!this.data.posts) {
      this.data.posts = [...FALLBACK_BLOG_POSTS];
    }
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store ? store.id : 'store-1';

    const now = new Date().toISOString();
    const coverUrl = sanitizeWebPUrl(postData.coverImage);

    if (postData.id) {
      const idx = this.data.posts.findIndex(p => p.id === postData.id);
      if (idx !== -1) {
        const existing = this.data.posts[idx];
        const updated: BlogPost = {
          ...existing,
          ...postData,
          coverImage: coverUrl || existing.coverImage,
          updatedAt: now
        };
        this.data.posts[idx] = updated;
        this.saveData();
        mysqlManager.saveBlogPost(updated).catch(() => {});
        return updated;
      }
    }

    // Create new post
    const baseSlug = (postData.title || 'novo-artigo')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const uniqueSlug = postData.slug && postData.slug.trim() ? postData.slug.trim() : `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const newPost: BlogPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      storeId: storeId,
      slug: uniqueSlug,
      title: postData.title || 'Sem título',
      excerpt: postData.excerpt || '',
      content: postData.content || '',
      coverImage: coverUrl || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80&fm=webp',
      category: postData.category || 'Geral',
      tags: postData.tags || [],
      author: postData.author || store?.storeName || 'Equipe',
      authorAvatar: postData.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp',
      readTime: postData.readTime || '4 min de leitura',
      destaque: Boolean(postData.destaque),
      status: postData.status || 'published',
      views: 0,
      linkedProductIds: postData.linkedProductIds || [],
      publishedAt: postData.status === 'published' ? now : undefined,
      createdAt: now,
      updatedAt: now
    };

    this.data.posts.unshift(newPost);
    this.saveData();
    mysqlManager.saveBlogPost(newPost).catch(() => {});
    return newPost;
  }

  public deletePost(id: string): boolean {
    if (!this.data.posts) return false;
    const initialLen = this.data.posts.length;
    this.data.posts = this.data.posts.filter(p => p.id !== id);
    if (this.data.posts.length !== initialLen) {
      this.saveData();
      mysqlManager.deleteBlogPost(id).catch(() => {});
      return true;
    }
    return false;
  }

  public incrementPostViews(id: string): void {
    if (!this.data.posts) return;
    const post = this.data.posts.find(p => p.id === id || p.slug === id);
    if (post) {
      post.views = (post.views || 0) + 1;
      this.saveData();
    }
  }

  // ============================================
  // CONTACT MESSAGES METHODS
  // ============================================

  public getMessages(storeSlug?: string): ContactMessage[] {
    if (!this.data.messages) {
      this.data.messages = [];
    }
    const store = storeSlug ? this.getStoreBySlug(storeSlug) : null;
    const storeId = store ? store.id : 'store-1';
    return this.data.messages.filter(m => !m.storeId || m.storeId === storeId || m.storeId === 'store-1')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  public saveMessage(storeSlug: string, messageData: Partial<ContactMessage>): ContactMessage {
    if (!this.data.messages) {
      this.data.messages = [];
    }
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store ? store.id : 'store-1';

    const newMsg: ContactMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      storeId: storeId,
      nome: messageData.nome || 'Anônimo',
      email: messageData.email || '',
      assunto: messageData.assunto || 'Mensagem do Site',
      mensagem: messageData.mensagem || '',
      lida: false,
      createdAt: new Date().toISOString()
    };

    this.data.messages.unshift(newMsg);
    this.saveData();
    mysqlManager.saveContactMessage(newMsg).catch(() => {});
    return newMsg;
  }

  public deleteMessage(id: string): boolean {
    if (!this.data.messages) return false;
    const initialLen = this.data.messages.length;
    this.data.messages = this.data.messages.filter(m => m.id !== id);
    if (this.data.messages.length !== initialLen) {
      this.saveData();
      mysqlManager.deleteContactMessage(id).catch(() => {});
      return true;
    }
    return false;
  }

  // ============================================
  // BLOG SETTINGS METHODS (HERO BG, ADS, ETC)
  // ============================================

  public getBlogSettings(storeSlug: string): BlogSettings {
    if (!this.data.blogSettings) {
      this.data.blogSettings = {};
    }
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store ? store.id : 'store-1';

    if (!this.data.blogSettings[storeSlug]) {
      this.data.blogSettings[storeSlug] = {
        ...FALLBACK_BLOG_SETTINGS,
        storeId
      };
      this.saveData();
    }
    return this.data.blogSettings[storeSlug];
  }

  public updateBlogSettings(storeSlug: string, updates: Partial<BlogSettings>): BlogSettings {
    if (!this.data.blogSettings) {
      this.data.blogSettings = {};
    }
    const current = this.getBlogSettings(storeSlug);
    const heroBg = updates.heroBackgroundImage !== undefined ? sanitizeWebPUrl(updates.heroBackgroundImage) : current.heroBackgroundImage;

    let updatedAds = current.articleFooterAds || [];
    if (Array.isArray(updates.articleFooterAds)) {
      updatedAds = updates.articleFooterAds.map(ad => ({
        ...ad,
        bannerImageUrl: ad.bannerImageUrl ? sanitizeWebPUrl(ad.bannerImageUrl) : ad.bannerImageUrl
      }));
    }

    let updatedAd = current.articleFooterAd;
    if (updates.articleFooterAd) {
      updatedAd = {
        ...current.articleFooterAd,
        ...updates.articleFooterAd,
        bannerImageUrl: updates.articleFooterAd.bannerImageUrl !== undefined
          ? sanitizeWebPUrl(updates.articleFooterAd.bannerImageUrl)
          : current.articleFooterAd?.bannerImageUrl
      };
    } else if (Array.isArray(updates.articleFooterAds)) {
      // Automatically keep the single articleFooterAd field in sync with the active ad from articleFooterAds
      const activeAd = updatedAds.find(a => a.enabled);
      if (activeAd) {
        updatedAd = activeAd;
      } else if (updatedAds.length > 0) {
        updatedAd = updatedAds[0];
      }
    }

    let updatedSidebarBanner = current.articleSidebarBanner;
    if (updates.articleSidebarBanner) {
      updatedSidebarBanner = {
        ...current.articleSidebarBanner,
        ...updates.articleSidebarBanner,
        imageUrl: updates.articleSidebarBanner.imageUrl !== undefined
          ? sanitizeWebPUrl(updates.articleSidebarBanner.imageUrl)
          : current.articleSidebarBanner?.imageUrl
      };
    }

    const updated: BlogSettings = {
      ...current,
      ...updates,
      heroBackgroundImage: heroBg,
      articleFooterAd: updatedAd,
      articleFooterAds: updatedAds,
      articleSidebarBanner: updatedSidebarBanner,
      updatedAt: new Date().toISOString()
    };

    this.data.blogSettings[storeSlug] = updated;
    this.saveData();
    mysqlManager.saveBlogSettings(storeSlug, updated).catch(() => {});
    return updated;
  }

  // ============================================
  // INSTITUTIONAL PAGES METHODS
  // ============================================

  public getInstitutional(storeSlug: string): InstitutionalData {
    if (!this.data.institutionalPages) {
      this.data.institutionalPages = {};
    }
    const store = this.getStoreBySlug(storeSlug);
    const blog = this.getBlogSettings(storeSlug);

    const existing = this.data.institutionalPages[storeSlug];

    return {
      id: existing?.id || `inst-${storeSlug}`,
      storeSlug,
      storeName: existing?.storeName || store?.storeName || 'Meu Doce Lar',
      cnpj: existing?.cnpj || store?.cnpj || blog?.cnpj || '',
      endereco: existing?.endereco || store?.endereco || blog?.endereco || '',
      email: existing?.email || store?.email || blog?.email || '',
      sobreNos: existing?.sobreNos || store?.sobreNos || blog?.sobreNos || '',
      textoDisclosure: existing?.textoDisclosure || store?.textoDisclosure || blog?.textoDisclosure || '',
      termosUso: existing?.termosUso || store?.termosUso || blog?.termosUso || '',
      politicaPrivacidade: existing?.politicaPrivacidade || store?.politicaPrivacidade || blog?.politicaPrivacidade || '',
      updatedAt: existing?.updatedAt || new Date().toISOString()
    };
  }

  public updateInstitutional(storeSlug: string, updates: Partial<InstitutionalData>): InstitutionalData {
    if (!this.data.institutionalPages) {
      this.data.institutionalPages = {};
    }
    const current = this.getInstitutional(storeSlug);
    const updated: InstitutionalData = {
      ...current,
      ...updates,
      storeSlug,
      id: current.id || `inst-${storeSlug}`,
      updatedAt: new Date().toISOString()
    };

    this.data.institutionalPages[storeSlug] = updated;

    // Synchronize to stores array
    const storeIdx = this.data.stores.findIndex(s => s.slug === storeSlug);
    if (storeIdx !== -1) {
      this.data.stores[storeIdx] = {
        ...this.data.stores[storeIdx],
        storeName: updated.storeName || this.data.stores[storeIdx].storeName,
        cnpj: updated.cnpj,
        endereco: updated.endereco,
        email: updated.email,
        sobreNos: updated.sobreNos,
        textoDisclosure: updated.textoDisclosure,
        termosUso: updated.termosUso,
        politicaPrivacidade: updated.politicaPrivacidade,
        updatedAt: new Date().toISOString()
      };
    }

    // Synchronize to blogSettings
    if (!this.data.blogSettings) this.data.blogSettings = {};
    const currentBlog = this.getBlogSettings(storeSlug);
    this.data.blogSettings[storeSlug] = {
      ...currentBlog,
      sobreNos: updated.sobreNos,
      textoDisclosure: updated.textoDisclosure,
      termosUso: updated.termosUso,
      politicaPrivacidade: updated.politicaPrivacidade,
      cnpj: updated.cnpj,
      endereco: updated.endereco,
      email: updated.email,
      updatedAt: new Date().toISOString()
    };

    this.saveData();

    // Direct persistence to MySQL
    mysqlManager.saveInstitutional(updated).catch(err => {
      console.error('[Hostinger MySQL] Erro ao salvar dados institucionais no MySQL:', err);
    });

    return updated;
  }

  // ============================================
  // BLOG CATEGORIES METHODS
  // ============================================

  public getBlogCategories(storeSlug?: string, onlyActive: boolean = false): BlogCategory[] {
    if (!this.data.blogCategories || this.data.blogCategories.length === 0) {
      this.data.blogCategories = [...FALLBACK_BLOG_CATEGORIES];
      this.saveData();
    }
    const store = storeSlug ? this.getStoreBySlug(storeSlug) : null;
    const storeId = store ? store.id : 'store-1';

    let list = this.data.blogCategories.filter(c => !c.storeId || c.storeId === storeId || c.storeId === 'store-1');
    if (onlyActive) {
      list = list.filter(c => c.active !== false && (c as any).ativo !== false && (c as any).active !== 0 && (c as any).active !== 'false');
    }
    return list.map(c => {
      const isMenu = c.mostrarNoMenu !== false && (c as any).mostrarNoMenu !== 0 && (c as any).mostrarNoMenu !== '0' && (c as any).mostrarNoMenu !== 'false';
      const isActive = c.active !== false && (c as any).ativo !== false && (c as any).active !== 0 && (c as any).active !== 'false';
      return {
        ...c,
        icon: c.icon || (c as any).icone || '📑',
        active: isActive,
        mostrarNoMenu: isMenu,
        order: Number(c.order || (c as any).ordem) || 1
      };
    }).sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  public createBlogCategory(storeSlug: string, data: Partial<BlogCategory>): BlogCategory {
    if (!this.data.blogCategories) {
      this.data.blogCategories = [...FALLBACK_BLOG_CATEGORIES];
    }
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store ? store.id : 'store-1';

    const slug = (data.slug && data.slug.trim())
      ? data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : (data.name || 'nova-categoria').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const isMenu = data.mostrarNoMenu !== undefined
      ? Boolean(data.mostrarNoMenu && data.mostrarNoMenu !== ('false' as any))
      : true;

    const isActive = data.active !== undefined
      ? Boolean(data.active && data.active !== ('false' as any))
      : true;

    const newCat: BlogCategory = {
      id: `blog-cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      storeId,
      name: data.name?.trim() || 'Nova Categoria',
      slug,
      icon: data.icon?.trim() || '📑',
      description: data.description?.trim() || '',
      order: typeof data.order === 'number' ? data.order : this.data.blogCategories.length + 1,
      active: isActive,
      mostrarNoMenu: isMenu,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.blogCategories.push(newCat);
    this.saveData();
    mysqlManager.saveBlogCategory(newCat).catch(() => {});
    return newCat;
  }

  public updateBlogCategory(id: string, data: Partial<BlogCategory>): BlogCategory | null {
    if (!this.data.blogCategories) {
      this.data.blogCategories = [...FALLBACK_BLOG_CATEGORIES];
    }
    let idx = this.data.blogCategories.findIndex(c => c.id === id);
    if (idx === -1 && id) {
      idx = this.data.blogCategories.findIndex(c => c.slug === id || (c.name && id && c.name.toLowerCase() === id.toLowerCase()));
    }
    if (idx === -1 && data.slug) {
      idx = this.data.blogCategories.findIndex(c => c.slug === data.slug);
    }
    if (idx === -1 && data.name) {
      idx = this.data.blogCategories.findIndex(c => c.name?.toLowerCase() === data.name?.toLowerCase());
    }

    if (idx === -1) {
      return this.createBlogCategory('achadinhos-da-maria', { ...data, id: id || data.id });
    }

    const current = this.data.blogCategories[idx];
    const oldName = current.name;
    const newName = data.name?.trim();

    const slug = (data.slug && data.slug.trim())
      ? data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : (newName || current.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const isMenu = data.mostrarNoMenu !== undefined
      ? Boolean(data.mostrarNoMenu && data.mostrarNoMenu !== ('false' as any))
      : (current.mostrarNoMenu !== false && (current as any).mostrarNoMenu !== 0 && (current as any).mostrarNoMenu !== '0' && (current as any).mostrarNoMenu !== 'false');

    const isActive = data.active !== undefined
      ? Boolean(data.active && data.active !== ('false' as any))
      : (current.active !== false && (current as any).active !== 0 && (current as any).active !== '0' && (current as any).active !== 'false');

    const updated: BlogCategory = {
      ...current,
      ...data,
      id: current.id || id || `blog-cat-${Date.now()}`,
      name: newName || current.name,
      slug,
      icon: data.icon?.trim() || current.icon || '📑',
      description: data.description !== undefined ? data.description.trim() : (current.description || ''),
      order: typeof data.order === 'number' ? data.order : (current.order || 1),
      active: isActive,
      mostrarNoMenu: isMenu,
      updatedAt: new Date().toISOString()
    };

    this.data.blogCategories[idx] = updated;

    // If category name changed, update articles that used the old category name
    if (newName && oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      if (this.data.posts) {
        this.data.posts = this.data.posts.map(p => {
          if (p.category?.toLowerCase() === oldName.toLowerCase()) {
            return { ...p, category: newName, updatedAt: new Date().toISOString() };
          }
          return p;
        });
      }
    }

    this.saveData();
    mysqlManager.saveBlogCategory(updated).catch(() => {});
    return updated;
  }

  public deleteBlogCategory(id: string): boolean {
    if (!this.data.blogCategories) return false;
    const initialLen = this.data.blogCategories.length;
    this.data.blogCategories = this.data.blogCategories.filter(c => c.id !== id);
    if (this.data.blogCategories.length !== initialLen) {
      this.saveData();
      mysqlManager.deleteBlogCategory(id).catch(() => {});
      return true;
    }
    return false;
  }

  // ============================================
  // BLOG EDITORS / AUTHORS METHODS
  // ============================================

  public getBlogEditors(storeSlug?: string, onlyActive: boolean = false): BlogEditor[] {
    if (!this.data.blogEditors || this.data.blogEditors.length === 0) {
      this.data.blogEditors = [...FALLBACK_BLOG_EDITORS];
      this.saveData();
    }
    const store = storeSlug ? this.getStoreBySlug(storeSlug) : null;
    const storeId = store ? store.id : 'store-1';

    let list = this.data.blogEditors.filter(e => !e.storeId || e.storeId === storeId || e.storeId === 'store-1');
    if (onlyActive) {
      list = list.filter(e => e.active !== false);
    }
    return list;
  }

  public createBlogEditor(storeSlug: string, data: Partial<BlogEditor>): BlogEditor {
    if (!this.data.blogEditors) {
      this.data.blogEditors = [...FALLBACK_BLOG_EDITORS];
    }
    const store = this.getStoreBySlug(storeSlug);
    const storeId = store ? store.id : 'store-1';

    const avatarUrl = sanitizeWebPUrl(data.avatar);

    const newEditor: BlogEditor = {
      id: `editor-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      storeId,
      name: data.name?.trim() || 'Novo Editor',
      avatar: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp',
      role: data.role?.trim() || 'Redator & Curador',
      bio: data.bio?.trim() || '',
      socialLink: data.socialLink?.trim() || '',
      email: data.email?.trim() || '',
      active: data.active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.blogEditors.push(newEditor);
    this.saveData();
    mysqlManager.saveBlogEditor(newEditor).catch(() => {});
    return newEditor;
  }

  public updateBlogEditor(id: string, data: Partial<BlogEditor>): BlogEditor | null {
    if (!this.data.blogEditors) {
      this.data.blogEditors = [...FALLBACK_BLOG_EDITORS];
    }
    const idx = this.data.blogEditors.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const current = this.data.blogEditors[idx];
    const oldName = current.name;
    const newName = data.name?.trim();
    const avatarUrl = data.avatar !== undefined ? sanitizeWebPUrl(data.avatar) : current.avatar;

    const updated: BlogEditor = {
      ...current,
      ...data,
      avatar: avatarUrl,
      name: newName || current.name,
      updatedAt: new Date().toISOString()
    };

    this.data.blogEditors[idx] = updated;

    // If name or avatar changed, optionally update articles linked to this authorId
    if (this.data.posts) {
      this.data.posts = this.data.posts.map(p => {
        if (p.authorId === id) {
          return {
            ...p,
            author: updated.name,
            authorAvatar: updated.avatar,
            authorRole: updated.role,
            authorBio: updated.bio,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
    }

    this.saveData();
    mysqlManager.saveBlogEditor(updated).catch(() => {});
    return updated;
  }

  public deleteBlogEditor(id: string): boolean {
    if (!this.data.blogEditors) return false;
    const initialLen = this.data.blogEditors.length;
    this.data.blogEditors = this.data.blogEditors.filter(e => e.id !== id);
    if (this.data.blogEditors.length !== initialLen) {
      this.saveData();
      mysqlManager.deleteBlogEditor(id).catch(() => {});
      return true;
    }
    return false;
  }

  /**
   * Hydrates memory state from MySQL database
   */
  public hydrateFromMySql(mysqlData: {
    stores?: StoreConfig[];
    products?: Product[];
    categories?: Category[];
    platforms?: Platform[];
    users?: StoreUser[];
    posts?: BlogPost[];
    blogCategories?: BlogCategory[];
    blogEditors?: BlogEditor[];
    blogSettings?: Record<string, BlogSettings>;
    messages?: ContactMessage[];
    institutional?: Record<string, InstitutionalData>;
  }) {
    if (!mysqlData) return;
    let hasChanges = false;
    if (Array.isArray(mysqlData.stores) && mysqlData.stores.length > 0) {
      this.data.stores = mysqlData.stores.map(ms => {
        const existing = this.data.stores.find(s => s.slug === ms.slug || s.id === ms.id);
        return {
          ...existing,
          ...ms,
          sobreNos: ms.sobreNos || existing?.sobreNos || '',
          textoDisclosure: ms.textoDisclosure || existing?.textoDisclosure || '',
          termosUso: ms.termosUso || existing?.termosUso || '',
          politicaPrivacidade: ms.politicaPrivacidade || existing?.politicaPrivacidade || '',
          cnpj: ms.cnpj || existing?.cnpj || '',
          endereco: ms.endereco || existing?.endereco || '',
          email: ms.email || existing?.email || ''
        };
      });
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.products) && mysqlData.products.length > 0) {
      this.data.products = mysqlData.products;
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.categories) && mysqlData.categories.length > 0) {
      this.data.categories = mysqlData.categories;
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.platforms) && mysqlData.platforms.length > 0) {
      this.data.platforms = mysqlData.platforms;
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.users) && mysqlData.users.length > 0) {
      this.data.users = mysqlData.users;
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.posts) && mysqlData.posts.length > 0) {
      this.data.posts = mysqlData.posts;
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.blogCategories) && mysqlData.blogCategories.length > 0) {
      this.data.blogCategories = mysqlData.blogCategories;
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.blogEditors) && mysqlData.blogEditors.length > 0) {
      this.data.blogEditors = mysqlData.blogEditors;
      hasChanges = true;
    }
    if (mysqlData.blogSettings && Object.keys(mysqlData.blogSettings).length > 0) {
      if (!this.data.blogSettings) this.data.blogSettings = {};
      for (const [slug, mSettings] of Object.entries(mysqlData.blogSettings)) {
        const existing = this.data.blogSettings[slug];
        this.data.blogSettings[slug] = {
          ...existing,
          ...mSettings,
          sobreNos: mSettings.sobreNos || existing?.sobreNos || '',
          textoDisclosure: mSettings.textoDisclosure || existing?.textoDisclosure || '',
          termosUso: mSettings.termosUso || existing?.termosUso || '',
          politicaPrivacidade: mSettings.politicaPrivacidade || existing?.politicaPrivacidade || '',
          cnpj: mSettings.cnpj || existing?.cnpj || '',
          endereco: mSettings.endereco || existing?.endereco || '',
          email: mSettings.email || existing?.email || ''
        };
      }
      hasChanges = true;
    }
    if (Array.isArray(mysqlData.messages) && mysqlData.messages.length > 0) {
      this.data.messages = mysqlData.messages;
      hasChanges = true;
    }
    if (mysqlData.institutional && Object.keys(mysqlData.institutional).length > 0) {
      if (!this.data.institutionalPages) this.data.institutionalPages = {};
      for (const [slug, inst] of Object.entries(mysqlData.institutional)) {
        this.data.institutionalPages[slug] = {
          ...this.data.institutionalPages[slug],
          ...inst
        };
      }
      hasChanges = true;
    }
    if (hasChanges) {
      this.saveData();
      console.log('[Hostinger MySQL] Memória local sincronizada com o banco de dados MySQL com sucesso!');
    }
  }
}


export const db = new DatabaseManager();
