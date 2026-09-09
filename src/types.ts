export type PriceMarkupType = 'percentage' | 'fixed_value' | 'fixed' | 'none' | 'direct';
export type OutOfStockAction = 'pause' | 'alert_only' | 'keep_active' | 'keep';
export type UserRole = 'admin' | 'editor' | 'viewer' | 'ADMIN' | 'EDITOR' | 'VIEWER' | 'GERENTE' | 'gerente';

export interface StoreConfig {
  id: string;
  slug: string;
  storeName: string;
  logo: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  pixelFacebook?: string;
  googleAnalytics?: string;
  googleAds?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  bannerUrl?: string;
  bannerLink?: string;
  bannerTag?: string;
  bannerTitulo?: string;
  bannerSubtitulo?: string;
  tituloSite?: string;
  descricaoSite?: string;
  lojaAtiva?: boolean;
  msgManutencao?: string;
  mensagemTopo?: string;
  corBarraTopo?: string;
  cnpj?: string;
  endereco?: string;
  email?: string;
  canalWhatsapp?: string;
  canalTelegram?: string;
  botaoCanalFlutuante?: boolean;
  textoDisclosure?: string;
  avisoPrecos?: string;
  adminUser?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminPasswordHash?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  storeId: string;
  ativo: boolean;
  tipo: 'FISICO' | 'DIGITAL';
  plataforma: string;
  categoria: string;
  subcategoria?: string;
  nome: string;
  descricao: string;
  preco: number;
  precoPromo?: number | null;
  cupom?: string;
  validade?: string | null;
  linkAfiliado: string;
  textoBotao?: string;
  video?: string;
  img1: string;
  img2?: string;
  img3?: string;
  img4?: string;
  ordem?: number;
  destaque?: boolean;
  cliques?: number;
  createdAt?: string;
  updatedAt?: string;
  supplierPrice?: number | null;
  supplierPromo?: number | null;
  lastPriceCheckAt?: string;
  priceStatus?: 'up' | 'down' | 'unchanged' | 'out_of_stock' | 'error';
  [key: string]: any;
}

export interface Category {
  id: string;
  storeId: string;
  nome: string;
  icone?: string;
  ordem?: number;
  ativo?: boolean;
  mostrarNoMenu?: boolean;
  descricao?: string;
  subcategorias?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Platform {
  id: string;
  storeId: string;
  nome: string;
  icone?: string;
  cor?: string;
  corBadge?: string;
  textoBotaoPadrao?: string;
  descricao?: string;
  urlPadrao?: string;
  ativo?: boolean;
  ordem?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ClickRecord {
  id: string;
  storeId: string;
  productId?: string;
  productName?: string;
  produto?: string;
  category?: string;
  categoria?: string;
  platform?: string;
  plataforma?: string;
  tipo?: string;
  origem?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  userAgent?: string;
  referer?: string;
  ip?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface StoreMetrics {
  totalViews?: number;
  views?: number;
  totalClicks?: number;
  uniqueVisitors?: number;
  ctr?: number;
  couponCopies?: number;
  topProducts?: Array<{
    id?: string;
    nome: string;
    cliques: number;
    plataforma?: string;
    categoria?: string;
    preco?: number;
    img?: string;
  }>;
  topCategories?: Array<{
    nome: string;
    cliques: number;
  }>;
  topPlatforms?: Array<{
    nome: string;
    cliques: number;
  }>;
  platforms?: Array<any>;
  categories?: Array<any>;
  recentClicks?: Array<any>;
  utms?: any;
  dailyClicks?: Array<{
    date: string;
    clicks: number;
  }>;
  [key: string]: any;
}

export interface StoreUser {
  id: string;
  storeId: string;
  nome?: string;
  username: string;
  email: string;
  password?: string;
  passwordHash?: string;
  avatar?: string;
  role: UserRole;
  ativo: boolean;
  ultimoAcesso?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  [key: string]: any;
}

export interface PriceMonitorSettings {
  storeId?: string;
  totalMonitoredProducts?: number;
  enabled?: boolean;
  frequencyHours?: number;
  autoApply?: boolean;
  checkIntervalHours?: number;
  outOfStockAction?: OutOfStockAction;
  markupType?: PriceMarkupType;
  markupValue?: number;
  notifyPriceChanges?: boolean;
  lastSyncAt?: string;
  activeSuppliers?: string[];
  [key: string]: any;
}

export interface PriceCheckResult {
  productId?: string;
  productName?: string;
  detectedName?: string;
  detectedImage?: string;
  currency?: string;
  currentCatalogPrice?: number;
  currentCatalogPromo?: number | null;
  supplierPrice: number | null;
  supplierPromo: number | null;
  calculatedPrice?: number | null;
  calculatedPromo?: number | null;
  inStock: boolean;
  platform: string;
  url: string;
  status?: 'up' | 'down' | 'unchanged' | 'out_of_stock' | 'not_found' | 'error';
  diffPercent?: number;
  checkedAt?: string;
  rawText?: string;
  error?: string;
  message?: string;
  [key: string]: any;
}

export interface PriceLogRecord {
  id?: string;
  storeId?: string;
  productId?: string;
  productName?: string;
  platform?: string;
  previousPrice?: number;
  oldPrice?: number;
  oldPromo?: number | null;
  newPrice?: number;
  newPromo?: number | null;
  supplierPrice?: number;
  newSupplierPrice?: number;
  newSupplierPromo?: number | null;
  appliedPrice?: number;
  appliedPromo?: number | null;
  stockStatus?: string;
  actionTaken?: string;
  status?: 'up' | 'down' | 'unchanged' | 'out_of_stock' | 'error' | string;
  timestamp?: string;
  createdAt?: string;
  applied?: boolean;
  [key: string]: any;
}

export interface PriceUpdateItem {
  productId: string;
  newSupplierPrice?: number | null;
  newSupplierPromo?: number | null;
  newPrice?: number;
  newPromo?: number | null;
  stockStatus?: 'in_stock' | 'out_of_stock';
  ativo?: boolean;
  [key: string]: any;
}

export interface BlogPost {
  id: string;
  storeId?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags?: string[];
  author?: string;
  authorId?: string;
  authorAvatar?: string;
  authorRole?: string;
  authorBio?: string;
  readTime?: string;
  destaque?: boolean;
  status: 'published' | 'draft';
  views?: number;
  linkedProductIds?: string[];
  sidebarBanner?: ArticleSidebarBanner;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface BlogCategory {
  id: string;
  storeId?: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  order?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface BlogEditor {
  id: string;
  storeId?: string;
  name: string;
  avatar?: string;
  role: string;
  bio: string;
  socialLink?: string;
  email?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ArticleFooterAd {
  id?: string;
  enabled: boolean;
  category?: string; // Target blog category filter (only show in articles of this category)
  type: 'banner' | 'html' | 'product';
  productId?: string;
  title?: string;
  bannerImageUrl?: string;
  bannerLinkUrl?: string;
  bannerAlt?: string;
  bannerBadge?: string;
  bannerButtonText?: string;
  htmlCode?: string;
  openInNewTab?: boolean;
  productPrice?: number;
  productPromoPrice?: number | null;
  productPlatform?: string;
  productCoupon?: string;
  [key: string]: any;
}

export interface ArticleSidebarBanner {
  enabled: boolean;
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
  badge?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  openInNewTab?: boolean;
  [key: string]: any;
}

export interface BlogSettings {
  storeId?: string;
  // Hero settings
  heroBackgroundImage?: string;
  heroOverlayOpacity?: number; // 0 to 100
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  heroShowSearch?: boolean;
  heroSearchPlaceholder?: string;
  heroShowCta?: boolean;
  heroCtaText?: string;
  heroCtaTarget?: string;
  // Top Announcement Bar for Blog
  topBarEnabled?: boolean;
  topBarText?: string;
  topBarBgColor?: string;
  topBarTextColor?: string;
  topBarLink?: string;
  // Header / Branding for Blog
  blogLogo?: string;
  blogStoreName?: string;
  blogTagline?: string;
  blogPrimaryColor?: string;
  // Navigation Menu options for Blog
  menuHomeLabel?: string;
  menuStoreLabel?: string;
  menuShowStore?: boolean;
  menuStoreBadge?: string;
  menuInstitutionalLabel?: string;
  menuShowInstitutional?: boolean;
  menuContactLabel?: string;
  menuShowContact?: boolean;
  menuShowWhatsApp?: boolean;
  menuShowVitrineBtn?: boolean;
  menuVitrineBtnText?: string;
  // Categories Bar & Layout
  showCategoriesBar?: boolean;
  // Footer customization for Blog
  footerText?: string;
  footerShowSocial?: boolean;

  articleFooterAd?: ArticleFooterAd;
  articleFooterAds?: ArticleFooterAd[]; // Multiple category-targeted ads
  articleSidebarBanner?: ArticleSidebarBanner; // Vertical sidebar banner in articles
  // Institutional Texts & Legal Data
  sobreNos?: string;
  textoDisclosure?: string;
  termosUso?: string;
  politicaPrivacidade?: string;
  cnpj?: string;
  endereco?: string;
  email?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ContactMessage {
  id: string;
  storeId?: string;
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  lida?: boolean;
  createdAt?: string;
  [key: string]: any;
}

export interface InstitutionalData {
  id?: string;
  storeSlug: string;
  storeName?: string;
  cnpj?: string;
  endereco?: string;
  email?: string;
  sobreNos?: string;
  textoDisclosure?: string;
  termosUso?: string;
  politicaPrivacidade?: string;
  updatedAt?: string;
  [key: string]: any;
}

