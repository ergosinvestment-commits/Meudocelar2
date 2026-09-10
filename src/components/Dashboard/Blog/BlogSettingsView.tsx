import React, { useState, useEffect } from 'react';
import { BlogSettings, ArticleFooterAd, BlogCategory, BlogPost, Product, ArticleSidebarBanner } from '../../../types';
import {
  fetchAdminBlogSettings,
  saveAdminBlogSettings,
  saveAdminBlogPost,
  uploadImageToServer,
  fetchAdminBlogCategories,
  fetchAdminBlogPosts,
  fetchAdminProducts,
  ensureBlogTablesInMySql,
  fetchBlogSqlScript,
  fetchStoreConfig,
  updateStoreConfig,
  fetchAdminInstitutional,
  saveAdminInstitutional,
  ensureInstitutionalTableInMySql
} from '../../../api/client';
import { normalizeImageUrl } from '../../../utils';
import { compressImageToWebP } from '../../../utils/imageCompressor';
import {
  Image as ImageIcon,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Megaphone,
  Layout,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  Code,
  Plus,
  Tag,
  Filter,
  Check,
  X,
  Layers,
  ShoppingBag,
  Search,
  Palette,
  Menu as MenuIcon,
  Compass,
  Database,
  Terminal,
  Copy,
  FileText,
  Globe,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  HardDrive,
  CheckSquare,
  Square,
  SlidersHorizontal,
  MessageCircle,
  Store,
  Upload,
  BookOpen,
  Mail,
  Building2,
  MapPin,
  Lock,
  Pencil,
  Power
} from 'lucide-react';

interface BlogSettingsViewProps {
  storeSlug: string;
  onSaved?: (settings: BlogSettings) => void;
  hideHeroAndFooter?: boolean;
  defaultSection?: 'all' | 'topbar' | 'branding' | 'menu' | 'hero' | 'footer' | 'ads' | 'database';
}

export default function BlogSettingsView({
  storeSlug,
  onSaved,
  hideHeroAndFooter = false,
  defaultSection
}: BlogSettingsViewProps) {
  const [settings, setSettings] = useState<BlogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingCat, setActionLoadingCat] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active section filter
  const [activeSection, setActiveSection] = useState<
    'all' | 'topbar' | 'branding' | 'menu' | 'hero' | 'footer' | 'ads' | 'database'
  >(defaultSection || (hideHeroAndFooter ? 'ads' : 'all'));

  // Top Bar Announcement states
  const [topBarEnabled, setTopBarEnabled] = useState(false);
  const [topBarText, setTopBarText] = useState('');
  const [topBarBgColor, setTopBarBgColor] = useState('#2A5C3F');
  const [topBarTextColor, setTopBarTextColor] = useState('#FFFFFF');
  const [topBarLink, setTopBarLink] = useState('');

  // Branding & Visual states
  const [blogStoreName, setBlogStoreName] = useState('');
  const [blogTagline, setBlogTagline] = useState('Blog & Achadinhos Verificados');
  const [blogLogo, setBlogLogo] = useState('');
  const [blogPrimaryColor, setBlogPrimaryColor] = useState('#2A5C3F');

  // Navigation Menu states
  const [menuHomeLabel, setMenuHomeLabel] = useState('Início (Blog)');
  const [menuStoreLabel, setMenuStoreLabel] = useState('Loja & Achadinhos');
  const [menuShowStore, setMenuShowStore] = useState(true);
  const [menuStoreBadge, setMenuStoreBadge] = useState('Ofertas');
  const [menuInstitutionalLabel, setMenuInstitutionalLabel] = useState('Institucional');
  const [menuShowInstitutional, setMenuShowInstitutional] = useState(true);
  const [menuContactLabel, setMenuContactLabel] = useState('Contato');
  const [menuShowContact, setMenuShowContact] = useState(true);
  const [menuShowWhatsApp, setMenuShowWhatsApp] = useState(true);
  const [menuShowVitrineBtn, setMenuShowVitrineBtn] = useState(true);
  const [menuVitrineBtnText, setMenuVitrineBtnText] = useState('Ver Vitrine');

  // Hero extra states
  const [heroBg, setHeroBg] = useState('');
  const [heroOpacity, setHeroOpacity] = useState(65);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroBadge, setHeroBadge] = useState('');
  const [heroShowSearch, setHeroShowSearch] = useState(true);
  const [heroSearchPlaceholder, setHeroSearchPlaceholder] = useState('Buscar artigos, dicas e truques...');
  const [heroShowCta, setHeroShowCta] = useState(true);
  const [heroCtaText, setHeroCtaText] = useState('Explorar Vitrine de Ofertas');
  const [heroCtaTarget, setHeroCtaTarget] = useState('store');

  // Layout & Footer states
  const [showCategoriesBar, setShowCategoriesBar] = useState(true);
  const [footerText, setFooterText] = useState('');
  const [footerShowSocial, setFooterShowSocial] = useState(true);

  // MySQL Hostinger Assistant states
  const [checkingMySql, setCheckingMySql] = useState(false);
  const [mysqlResult, setMysqlResult] = useState<{
    success: boolean;
    message: string;
    tablesResult?: any;
    syncResult?: any;
    diagnostics?: any;
  } | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlScript, setSqlScript] = useState('');
  const [loadingSql, setLoadingSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Category & Ads states
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoryAds, setCategoryAds] = useState<ArticleFooterAd[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Casa & Cozinha');
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Active Ad Form states (bound to selectedCategory)
  const [adEnabled, setAdEnabled] = useState(false);
  const [adType, setAdType] = useState<'banner' | 'html' | 'product'>('banner');
  const [adTitle, setAdTitle] = useState('');
  const [adBannerImg, setAdBannerImg] = useState('');
  const [adBannerLink, setAdBannerLink] = useState('');
  const [adBannerAlt, setAdBannerAlt] = useState('');
  const [adBannerBadge, setAdBannerBadge] = useState('OFERTA DO DIA');
  const [adBannerBtn, setAdBannerBtn] = useState('Aproveitar Oferta →');
  const [adHtmlCode, setAdHtmlCode] = useState('');
  const [adNewTab, setAdNewTab] = useState(true);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);
  const [confirmDeleteBannerId, setConfirmDeleteBannerId] = useState<string | null>(null);

  // Article Sidebar Vertical Banner states (Per-Article)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [isUploadingBannerImg, setIsUploadingBannerImg] = useState<boolean>(false);
  const [sidebarBannerEnabled, setSidebarBannerEnabled] = useState(true);
  const [sidebarBannerImg, setSidebarBannerImg] = useState('');
  const [sidebarBannerName, setSidebarBannerName] = useState('');
  const [sidebarBannerLink, setSidebarBannerLink] = useState('');
  const [sidebarBannerAlt, setSidebarBannerAlt] = useState('');
  const [sidebarBannerBadge, setSidebarBannerBadge] = useState('DESTAQUE');
  const [sidebarBannerTitle, setSidebarBannerTitle] = useState('');
  const [sidebarBannerDesc, setSidebarBannerDesc] = useState('');
  const [sidebarBannerBtn, setSidebarBannerBtn] = useState('Quero Conhecer →');
  const [sidebarBannerNewTab, setSidebarBannerNewTab] = useState(true);
  const [sidebarBannerSelectedProdId, setSidebarBannerSelectedProdId] = useState('');

  // Store Products states (Opção 3: Produto da Loja)
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');

  // Institutional (Página Institucional) states
  const [instStoreName, setInstStoreName] = useState<string>('');
  const [instCnpj, setInstCnpj] = useState<string>('');
  const [instEndereco, setInstEndereco] = useState<string>('');
  const [instEmail, setInstEmail] = useState<string>('');
  const [instSobreNos, setInstSobreNos] = useState<string>('');
  const [instTextoDisclosure, setInstTextoDisclosure] = useState<string>('');
  const [instTermosUso, setInstTermosUso] = useState<string>('');
  const [instPoliticaPrivacidade, setInstPoliticaPrivacidade] = useState<string>('');
  const [instActiveTab, setInstActiveTab] = useState<'dados' | 'sobre' | 'afiliados' | 'termos' | 'privacidade'>('dados');
  const [savingInst, setSavingInst] = useState<boolean>(false);
  const [syncingInstTable, setSyncingInstTable] = useState<boolean>(false);
  const [syncingBlogTables, setSyncingBlogTables] = useState<boolean>(false);

  async function handleSyncBlogTables() {
    try {
      setSyncingBlogTables(true);
      setFeedback(null);
      const res = await ensureBlogTablesInMySql(storeSlug);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: '✓ Tabelas do blog e colunas de banner lateral validadas e sincronizadas com sucesso no MySQL da Hostinger!'
        });
        loadSettings();
      } else {
        setFeedback({
          type: 'error',
          message: 'Aviso MySQL: ' + (res.message || 'Verifique as credenciais do banco na aba Banco de Dados.')
        });
      }
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao validar tabelas no MySQL: ' + (err?.message || 'Falha de conexão')
      });
    } finally {
      setSyncingBlogTables(false);
    }
  }

  async function handleSyncInstitutionalTable() {
    try {
      setSyncingInstTable(true);
      setFeedback(null);
      const res = await ensureInstitutionalTableInMySql(storeSlug);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: '✓ Tabela institutional_pages e colunas institucionais validadas com sucesso no MySQL da Hostinger!'
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'Aviso MySQL: ' + (res.message || 'Verifique as credenciais do banco na aba Banco de Dados.')
        });
      }
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao validar tabela no MySQL: ' + (err?.message || 'Falha de conexão')
      });
    } finally {
      setSyncingInstTable(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, [storeSlug]);

  async function loadSettings() {
    try {
      setLoading(true);
      const [data, storeConfigData, categoriesData, postsData, productsData, instData] = await Promise.all([
        fetchAdminBlogSettings(storeSlug),
        fetchStoreConfig(storeSlug).catch(() => null),
        fetchAdminBlogCategories(storeSlug).catch(() => []),
        fetchAdminBlogPosts(storeSlug).catch(() => []),
        fetchAdminProducts(storeSlug).catch(() => []),
        fetchAdminInstitutional(storeSlug).catch(() => null)
      ]);

      if (instData) {
        setInstStoreName(instData.storeName || storeConfigData?.storeName || data?.blogStoreName || '');
        setInstCnpj(instData.cnpj || storeConfigData?.cnpj || data?.cnpj || '');
        setInstEndereco(instData.endereco || storeConfigData?.endereco || data?.endereco || '');
        setInstEmail(instData.email || storeConfigData?.email || data?.email || '');
        setInstSobreNos(instData.sobreNos || storeConfigData?.sobreNos || data?.sobreNos || '');
        setInstTextoDisclosure(instData.textoDisclosure || storeConfigData?.textoDisclosure || data?.textoDisclosure || '');
        setInstTermosUso(instData.termosUso || storeConfigData?.termosUso || data?.termosUso || '');
        setInstPoliticaPrivacidade(instData.politicaPrivacidade || storeConfigData?.politicaPrivacidade || data?.politicaPrivacidade || '');
      } else if (storeConfigData) {
        setInstStoreName(storeConfigData.storeName || data?.blogStoreName || '');
        setInstCnpj(storeConfigData.cnpj !== undefined ? storeConfigData.cnpj : (data?.cnpj || ''));
        setInstEndereco(storeConfigData.endereco !== undefined ? storeConfigData.endereco : (data?.endereco || ''));
        setInstEmail(storeConfigData.email !== undefined ? storeConfigData.email : (data?.email || ''));
        setInstSobreNos(storeConfigData.sobreNos !== undefined ? storeConfigData.sobreNos : (data?.sobreNos || ''));
        setInstTextoDisclosure(storeConfigData.textoDisclosure !== undefined ? storeConfigData.textoDisclosure : (data?.textoDisclosure || ''));
        setInstTermosUso(storeConfigData.termosUso !== undefined ? storeConfigData.termosUso : (data?.termosUso || ''));
        setInstPoliticaPrivacidade(storeConfigData.politicaPrivacidade !== undefined ? storeConfigData.politicaPrivacidade : (data?.politicaPrivacidade || ''));
      } else if (data) {
        setInstStoreName(data.blogStoreName || '');
        setInstCnpj(data.cnpj || '');
        setInstEndereco(data.endereco || '');
        setInstEmail(data.email || '');
        setInstSobreNos(data.sobreNos || '');
        setInstTextoDisclosure(data.textoDisclosure || '');
        setInstTermosUso(data.termosUso || '');
        setInstPoliticaPrivacidade(data.politicaPrivacidade || '');
      }

      if (Array.isArray(productsData)) {
        setProducts(productsData);
      }

      // Collect all unique category names
      const catSet = new Set<string>();
      ['Casa & Cozinha', 'Decoração', 'Organização', 'Mesa Posta', 'Achadinhos', 'Dicas'].forEach(c => catSet.add(c));

      if (Array.isArray(categoriesData)) {
        categoriesData.forEach((c: BlogCategory) => {
          if (c.name && c.name.trim()) catSet.add(c.name.trim());
        });
      }

      if (Array.isArray(postsData)) {
        setBlogPosts(postsData);
        postsData.forEach((p: BlogPost) => {
          if (p.category && p.category.trim()) catSet.add(p.category.trim());
        });

        // Initialize per-article sidebar banner
        const published = postsData.filter((p: BlogPost) => p.published !== false);
        if (published.length > 0) {
          const withBanner = published.find((p: BlogPost) => p.sidebarBanner?.imageUrl);
          const initialArticle = withBanner || published[0];
          setSelectedArticleId(initialArticle.id);
          if (initialArticle.sidebarBanner?.imageUrl) {
            setSidebarBannerImg(initialArticle.sidebarBanner.imageUrl || '');
            setSidebarBannerName(initialArticle.sidebarBanner.altText || initialArticle.sidebarBanner.title || 'Banner Lateral');
            setSidebarBannerLink(initialArticle.sidebarBanner.linkUrl || '');
            setSidebarBannerBtn(initialArticle.sidebarBanner.buttonText || 'Quero Conhecer →');
            setSidebarBannerNewTab(initialArticle.sidebarBanner.openInNewTab !== false);
            setSidebarBannerEnabled(initialArticle.sidebarBanner.enabled !== false);
          } else {
            setSidebarBannerImg('');
            setSidebarBannerName('');
            setSidebarBannerLink('');
            setSidebarBannerBtn('Quero Conhecer →');
            setSidebarBannerNewTab(true);
            setSidebarBannerEnabled(true);
          }
        }
      }

      const allCategories = Array.from(catSet);
      setAvailableCategories(allCategories);

      if (data) {
        setSettings(data);
        // Hero
        setHeroBg(data.heroBackgroundImage || '');
        setHeroOpacity(data.heroOverlayOpacity !== undefined ? data.heroOverlayOpacity : 65);
        setHeroTitle(data.heroTitle || '');
        setHeroSubtitle(data.heroSubtitle || '');
        setHeroBadge(data.heroBadge || '');
        setHeroShowSearch(data.heroShowSearch !== false);
        setHeroSearchPlaceholder(data.heroSearchPlaceholder || 'Buscar artigos, dicas e truques...');
        setHeroShowCta(data.heroShowCta !== false);
        setHeroCtaText(data.heroCtaText || 'Explorar Vitrine de Ofertas');
        setHeroCtaTarget(data.heroCtaTarget || 'store');

        // Top Bar
        setTopBarEnabled(Boolean(data.topBarEnabled));
        setTopBarText(data.topBarText || '');
        setTopBarBgColor(data.topBarBgColor || '#2A5C3F');
        setTopBarTextColor(data.topBarTextColor || '#FFFFFF');
        setTopBarLink(data.topBarLink || '');

        // Branding
        setBlogStoreName(data.blogStoreName || '');
        setBlogTagline(data.blogTagline || 'Blog & Achadinhos Verificados');
        setBlogLogo(data.blogLogo || '');
        setBlogPrimaryColor(data.blogPrimaryColor || '#2A5C3F');

        // Navigation Menu
        setMenuHomeLabel(data.menuHomeLabel || 'Início (Blog)');
        setMenuStoreLabel(data.menuStoreLabel || 'Loja & Achadinhos');
        setMenuShowStore(data.menuShowStore !== false);
        setMenuStoreBadge(data.menuStoreBadge ?? 'Ofertas');
        setMenuInstitutionalLabel(data.menuInstitutionalLabel || 'Institucional');
        setMenuShowInstitutional(data.menuShowInstitutional !== false);
        setMenuContactLabel(data.menuContactLabel || 'Contato');
        setMenuShowContact(data.menuShowContact !== false);
        setMenuShowWhatsApp(data.menuShowWhatsApp !== false);
        setMenuShowVitrineBtn(data.menuShowVitrineBtn !== false);
        setMenuVitrineBtnText(data.menuVitrineBtnText || 'Ver Vitrine');

        // Layout & Footer
        setShowCategoriesBar(data.showCategoriesBar !== false);
        setFooterText(data.footerText || '');
        setFooterShowSocial(data.footerShowSocial !== false);

        // Resolve existing ads list
        let initialAds: ArticleFooterAd[] = [];
        if (Array.isArray(data.articleFooterAds) && data.articleFooterAds.length > 0) {
          initialAds = data.articleFooterAds;
        } else if (data.articleFooterAd && (data.articleFooterAd.category || data.articleFooterAd.bannerImageUrl || data.articleFooterAd.title)) {
          initialAds = [{
            ...data.articleFooterAd,
            category: data.articleFooterAd.category || allCategories[0] || 'Casa & Cozinha'
          }];
        }
        setCategoryAds(initialAds);

        // Select the first category to edit
        const defaultCat = initialAds[0]?.category || allCategories[0] || 'Casa & Cozinha';
        setSelectedCategory(defaultCat);
        populateFormForCategory(defaultCat, initialAds);
      } else {
        const defaultCat = allCategories[0] || 'Casa & Cozinha';
        setSelectedCategory(defaultCat);
      }
    } catch (err) {
      console.error('Error loading blog settings:', err);
    } finally {
      setLoading(false);
    }
  }

  function populateFormForCategory(catName: string, ads: ArticleFooterAd[]) {
    const target = catName.trim().toLowerCase();
    const found = ads.find(a => a.category && a.category.trim().toLowerCase() === target);

    if (found) {
      setAdEnabled(found.enabled !== false);
      setAdType(found.type || 'banner');
      setSelectedProductId(found.productId || '');
      setAdTitle(found.title || '');
      setAdBannerImg(found.bannerImageUrl || found.imageUrl || '');
      setAdBannerLink(found.bannerLinkUrl || found.link || '');
      setAdBannerAlt(found.bannerAlt || found.description || '');
      setAdBannerBadge(found.bannerBadge || 'OFERTA DO DIA');
      setAdBannerBtn(found.bannerButtonText || 'Aproveitar Oferta →');
      setAdHtmlCode(found.htmlCode || '');
      setAdNewTab(found.openInNewTab !== false);
    } else {
      // Empty ad for this category
      setAdEnabled(false);
      setAdType('banner');
      setSelectedProductId('');
      setProductSearch('');
      setAdTitle('');
      setAdBannerImg('');
      setAdBannerLink('');
      setAdBannerAlt('');
      setAdBannerBadge('OFERTA DO DIA');
      setAdBannerBtn('Aproveitar Oferta →');
      setAdHtmlCode('');
      setAdNewTab(true);
    }
  }

  function handleSelectProduct(prodId: string) {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    setAdBannerImg(prod.img1 || '');
    setAdBannerLink(prod.linkAfiliado || '');
    setAdTitle(prod.nome || '');
    setAdBannerAlt(prod.descricao || prod.nome || '');
    setAdBannerBadge(prod.plataforma ? `ACHADINHO NA ${prod.plataforma.toUpperCase()}` : 'ACHADINHO EM DESTAQUE');
    setAdBannerBtn(prod.plataforma ? `Ver Oferta na ${prod.plataforma} →` : 'Aproveitar Oferta →');
    setAdEnabled(true);
  }

  function handleSelectArticleForBanner(postId: string) {
    setSelectedArticleId(postId);
    const post = blogPosts.find(p => p.id === postId);
    if (!post) {
      setSidebarBannerImg('');
      setSidebarBannerName('');
      setSidebarBannerLink('');
      setSidebarBannerBtn('Quero Conhecer →');
      setSidebarBannerNewTab(true);
      setSidebarBannerEnabled(true);
      return;
    }
    const banner = post.sidebarBanner;
    if (banner?.imageUrl) {
      setSidebarBannerImg(banner.imageUrl || '');
      setSidebarBannerName(banner.altText || banner.title || 'Banner Lateral');
      setSidebarBannerLink(banner.linkUrl || '');
      setSidebarBannerBtn(banner.buttonText || 'Quero Conhecer →');
      setSidebarBannerNewTab(banner.openInNewTab !== false);
      setSidebarBannerEnabled(banner.enabled !== false);
    } else {
      setSidebarBannerImg('');
      setSidebarBannerName('');
      setSidebarBannerLink('');
      setSidebarBannerBtn('Quero Conhecer →');
      setSidebarBannerNewTab(true);
      setSidebarBannerEnabled(true);
    }
  }

  function handleNewBanner() {
    // Find first published post without a banner, or fallback to first published post
    const published = blogPosts.filter(p => p.published !== false);
    const publishedWithoutBanner = published.filter(p => !p.sidebarBanner?.imageUrl);
    const nextPostId = publishedWithoutBanner[0]?.id || published[0]?.id || '';

    setSelectedArticleId(nextPostId);
    setSidebarBannerImg('');
    setSidebarBannerName('');
    setSidebarBannerLink('');
    setSidebarBannerBtn('Quero Conhecer →');
    setSidebarBannerNewTab(true);
    setSidebarBannerEnabled(true);

    const formEl = document.getElementById('sidebar-banner-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function handleEditBanner(post: BlogPost) {
    setSelectedArticleId(post.id);
    const banner = post.sidebarBanner;
    setSidebarBannerImg(banner?.imageUrl || '');
    setSidebarBannerName(banner?.altText || banner?.title || 'Banner Lateral');
    setSidebarBannerLink(banner?.linkUrl || '');
    setSidebarBannerBtn(banner?.buttonText || 'Quero Conhecer →');
    setSidebarBannerNewTab(banner?.openInNewTab !== false);
    setSidebarBannerEnabled(banner?.enabled !== false);

    const formEl = document.getElementById('sidebar-banner-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async function handleToggleBannerStatus(post: BlogPost) {
    if (!post.sidebarBanner?.imageUrl) return;
    try {
      setSaving(true);
      const newStatus = !(post.sidebarBanner.enabled !== false);
      const updatedPost: BlogPost = {
        ...post,
        sidebarBanner: {
          ...post.sidebarBanner,
          enabled: newStatus
        }
      };

      const saved = await saveAdminBlogPost(storeSlug, updatedPost);
      setBlogPosts(prev => prev.map(p => p.id === saved.id ? saved : p));

      if (selectedArticleId === saved.id) {
        setSidebarBannerEnabled(newStatus);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('blog-posts-updated', { detail: saved }));
        window.dispatchEvent(new CustomEvent('blog-post-updated', { detail: saved }));
      }

      setFeedback({
        type: 'success',
        message: newStatus
          ? `✓ Banner do artigo "${post.title}" ativado!`
          : `✓ Banner do artigo "${post.title}" desativado!`
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao alterar status do banner: ' + (err?.message || '') });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBanner(post: BlogPost) {
    try {
      setSaving(true);
      const updatedPost: BlogPost = {
        ...post,
        sidebarBanner: {
          enabled: false,
          imageUrl: '',
          linkUrl: '',
          buttonText: '',
          altText: '',
          badge: '',
          title: '',
          description: '',
          openInNewTab: true
        }
      };

      const saved = await saveAdminBlogPost(storeSlug, updatedPost);
      setBlogPosts(prev => prev.map(p => p.id === saved.id ? saved : p));

      if (selectedArticleId === post.id) {
        setSidebarBannerImg('');
        setSidebarBannerName('');
        setSidebarBannerLink('');
        setSidebarBannerBtn('Quero Conhecer →');
        setSidebarBannerEnabled(false);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('blog-posts-updated', { detail: saved }));
        window.dispatchEvent(new CustomEvent('blog-post-updated', { detail: saved }));
      }

      setFeedback({
        type: 'success',
        message: `✓ Banner do artigo "${post.title}" excluído com sucesso!`
      });
      setTimeout(() => setFeedback(null), 4000);
      setConfirmDeleteBannerId(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao excluir banner: ' + (err?.message || '') });
    } finally {
      setSaving(false);
    }
  }

  async function handleBannerFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingBannerImg(true);
      setSidebarBannerName(file.name);
      const compressed = await compressImageToWebP(file, { maxWidth: 900, maxHeight: 1600, quality: 0.85 });
      setSidebarBannerImg(compressed);
      setSidebarBannerEnabled(true);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        if (res) {
          setSidebarBannerImg(res);
          setSidebarBannerEnabled(true);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingBannerImg(false);
      e.target.value = '';
    }
  }

  async function handleSaveSidebarBannerOnly() {
    if (!selectedArticleId) {
      setFeedback({ type: 'error', message: 'Por favor, selecione um artigo publicado antes de salvar o banner lateral.' });
      return;
    }

    const targetPost = blogPosts.find(p => p.id === selectedArticleId);
    if (!targetPost) {
      setFeedback({ type: 'error', message: 'Artigo selecionado não encontrado.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const hasImage = Boolean(sidebarBannerImg.trim());
      const updatedBanner: ArticleSidebarBanner = {
        enabled: hasImage ? sidebarBannerEnabled : false,
        imageUrl: sidebarBannerImg.trim(),
        linkUrl: sidebarBannerLink.trim(),
        buttonText: sidebarBannerBtn.trim() || 'Quero Conhecer →',
        openInNewTab: sidebarBannerNewTab,
        badge: '',
        title: '',
        description: '',
        altText: sidebarBannerName.trim() || targetPost.title || 'Banner Lateral'
      };

      const updatedPost: BlogPost = {
        ...targetPost,
        sidebarBanner: updatedBanner
      };

      // 1. Save directly into blog_posts table for this specific post ONLY
      const savedPost = await saveAdminBlogPost(storeSlug, updatedPost);

      // 2. Update local state
      setBlogPosts(prev => prev.map(p => p.id === savedPost.id ? savedPost : p));

      // 3. Dispatch events for real-time live views
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('blog-posts-updated', { detail: savedPost }));
        window.dispatchEvent(new CustomEvent('blog-post-updated', { detail: savedPost }));
      }

      setFeedback({
        type: 'success',
        message: hasImage
          ? `✓ Banner lateral do artigo "${targetPost.title}" salvo com sucesso!`
          : `✓ Banner lateral do artigo "${targetPost.title}" removido com sucesso!`
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error saving sidebar banner for post:', err);
      setFeedback({ type: 'error', message: 'Erro ao salvar banner lateral: ' + (err?.message || '') });
    } finally {
      setSaving(false);
    }
  }

  function handleSelectCategory(catName: string) {
    setSelectedCategory(catName);
    setCustomCategoryMode(false);
    setCustomCategoryInput('');
    populateFormForCategory(catName, categoryAds);

    // Smooth scroll down to the editor form
    const formEl = document.getElementById('ad-form-section');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function buildCurrentSettingsPayload(adsList: ArticleFooterAd[] = categoryAds): Partial<BlogSettings> {
    return {
      // Hero
      heroBackgroundImage: heroBg.trim(),
      heroOverlayOpacity: Number(heroOpacity),
      heroTitle: heroTitle.trim(),
      heroSubtitle: heroSubtitle.trim(),
      heroBadge: heroBadge.trim(),
      heroShowSearch,
      heroSearchPlaceholder: heroSearchPlaceholder.trim(),
      heroShowCta,
      heroCtaText: heroCtaText.trim(),
      heroCtaTarget: heroCtaTarget.trim() || 'store',

      // Top Bar
      topBarEnabled,
      topBarText: topBarText.trim(),
      topBarBgColor: topBarBgColor.trim(),
      topBarTextColor: topBarTextColor.trim(),
      topBarLink: topBarLink.trim(),

      // Branding
      blogStoreName: blogStoreName.trim(),
      blogTagline: blogTagline.trim(),
      blogLogo: blogLogo.trim(),
      blogPrimaryColor: blogPrimaryColor.trim(),

      // Navigation Menu
      menuHomeLabel: menuHomeLabel.trim(),
      menuStoreLabel: menuStoreLabel.trim(),
      menuShowStore,
      menuStoreBadge: menuStoreBadge.trim(),
      menuInstitutionalLabel: menuInstitutionalLabel.trim(),
      menuShowInstitutional,
      menuContactLabel: menuContactLabel.trim(),
      menuShowContact,
      menuShowWhatsApp,
      menuShowVitrineBtn,
      menuVitrineBtnText: menuVitrineBtnText.trim(),

      // Layout & Footer
      showCategoriesBar,
      footerText: footerText.trim(),
      footerShowSocial,

      // Institutional texts
      sobreNos: instSobreNos.trim(),
      textoDisclosure: instTextoDisclosure.trim(),
      termosUso: instTermosUso.trim(),
      politicaPrivacidade: instPoliticaPrivacidade.trim(),
      cnpj: instCnpj.trim(),
      endereco: instEndereco.trim(),
      email: instEmail.trim(),

      // Ads
      articleFooterAds: adsList,
      articleFooterAd: adsList.find(a => a.enabled) || adsList[0] || undefined,
      articleSidebarBanner: settings?.articleSidebarBanner || {
        enabled: false,
        imageUrl: '',
        linkUrl: '',
        altText: '',
        badge: '',
        title: '',
        description: '',
        buttonText: '',
        openInNewTab: true
      }
    };
  }

  // Persists the ads array directly to the server database
  async function persistAdsToServer(
    updatedAds: ArticleFooterAd[],
    successMessage: string
  ) {
    const payload = buildCurrentSettingsPayload(updatedAds);

    const updated = await saveAdminBlogSettings(storeSlug, payload);
    setSettings(updated);
    setCategoryAds(updated.articleFooterAds || updatedAds);
    setFeedback({
      type: 'success',
      message: successMessage
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('blog-settings-updated', { detail: updated }));
    }
    onSaved?.(updated);
    setTimeout(() => setFeedback(null), 5000);
  }

  async function handleRemoveAd(catName: string) {
    try {
      setActionLoadingCat(catName);
      setConfirmDeleteCat(null);
      setFeedback(null);

      const target = catName.trim().toLowerCase();
      const updated = categoryAds.filter(
        a => (a.category || '').trim().toLowerCase() !== target
      );
      setCategoryAds(updated);

      if (selectedCategory.trim().toLowerCase() === target) {
        setAdEnabled(false);
        setAdTitle('');
        setAdBannerImg('');
        setAdBannerLink('');
        setAdBannerAlt('');
        setAdHtmlCode('');
      }

      await persistAdsToServer(
        updated,
        `✓ Anúncio da categoria "${catName}" foi excluído com sucesso do servidor!`
      );
    } catch (err: any) {
      console.error('Error removing ad:', err);
      setFeedback({ type: 'error', message: 'Erro ao excluir anúncio: ' + (err?.message || '') });
    } finally {
      setActionLoadingCat(null);
    }
  }

  async function handleToggleAdStatus(catName: string) {
    try {
      setActionLoadingCat(catName);
      setFeedback(null);

      const target = catName.trim().toLowerCase();
      let isActivating = false;
      let nextAds = [...categoryAds];

      const isCurrentEditing = selectedCategory.trim().toLowerCase() === target;
      const existingIndex = nextAds.findIndex(a => (a.category || '').trim().toLowerCase() === target);

      if (existingIndex >= 0) {
        const ad = nextAds[existingIndex];
        isActivating = !ad.enabled;

        // Pull current form fields if the user has this category open right now
        const currentTitle = isCurrentEditing ? adTitle.trim() : (ad.title || '');
        const currentImg = isCurrentEditing ? adBannerImg.trim() : (ad.bannerImageUrl || '');
        const currentLink = isCurrentEditing ? adBannerLink.trim() : (ad.bannerLinkUrl || '');
        const currentAlt = isCurrentEditing ? adBannerAlt.trim() : (ad.bannerAlt || '');
        const currentBadge = isCurrentEditing ? adBannerBadge.trim() : (ad.bannerBadge || 'OFERTA DO DIA');
        const currentBtn = isCurrentEditing ? adBannerBtn.trim() : (ad.bannerButtonText || 'Aproveitar Oferta →');
        const currentType = isCurrentEditing ? adType : (ad.type || 'banner');
        const currentHtml = isCurrentEditing ? adHtmlCode.trim() : (ad.htmlCode || '');
        const currentProdId = isCurrentEditing ? selectedProductId : (ad.productId || '');
        const chosenProduct = (currentType === 'product' && currentProdId) ? products.find(p => p.id === currentProdId) : undefined;

        const defaultTitle = chosenProduct?.nome || `Ofertas & Cupons de ${ad.category || catName}`;
        const defaultAlt = chosenProduct?.descricao || `Confira os achadinhos com melhores descontos para ${ad.category || catName}.`;

        const updatedAd: ArticleFooterAd = {
          ...ad,
          enabled: isActivating,
          type: currentType,
          productId: currentType === 'product' ? currentProdId : undefined,
          title: currentTitle || (isActivating ? defaultTitle : ''),
          bannerImageUrl: currentImg || chosenProduct?.img1 || '',
          bannerLinkUrl: currentLink || chosenProduct?.linkAfiliado || '',
          bannerAlt: currentAlt || (isActivating ? defaultAlt : ''),
          bannerBadge: currentBadge || (chosenProduct?.plataforma ? `ACHADINHO NA ${chosenProduct.plataforma.toUpperCase()}` : 'OFERTA DO DIA'),
          bannerButtonText: currentBtn || (chosenProduct?.plataforma ? `Ver Oferta na ${chosenProduct.plataforma} →` : 'Aproveitar Oferta →'),
          htmlCode: currentHtml,
          productPrice: chosenProduct?.preco ?? ad.productPrice,
          productPromoPrice: chosenProduct?.precoPromo ?? ad.productPromoPrice,
          productPlatform: chosenProduct?.plataforma ?? ad.productPlatform,
          productCoupon: chosenProduct?.cupom ?? ad.productCoupon
        };

        nextAds[existingIndex] = updatedAd;

        if (isCurrentEditing) {
          setAdEnabled(isActivating);
          if (isActivating && !currentTitle) setAdTitle(defaultTitle);
          if (isActivating && !currentAlt) setAdBannerAlt(defaultAlt);
        }
      } else {
        // If not in categoryAds yet, create and activate it now!
        isActivating = true;
        const currentTitle = isCurrentEditing ? adTitle.trim() : '';
        const currentImg = isCurrentEditing ? adBannerImg.trim() : '';
        const currentLink = isCurrentEditing ? adBannerLink.trim() : '';
        const currentAlt = isCurrentEditing ? adBannerAlt.trim() : '';
        const chosenProduct = (isCurrentEditing && adType === 'product' && selectedProductId) ? products.find(p => p.id === selectedProductId) : undefined;

        const newAd: ArticleFooterAd = {
          id: `ad-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          category: catName,
          enabled: true,
          type: isCurrentEditing ? adType : 'banner',
          productId: (isCurrentEditing && adType === 'product') ? selectedProductId : undefined,
          title: currentTitle || chosenProduct?.nome || `Ofertas & Cupons de ${catName}`,
          bannerImageUrl: currentImg || chosenProduct?.img1 || '',
          bannerLinkUrl: currentLink || chosenProduct?.linkAfiliado || '',
          bannerAlt: currentAlt || chosenProduct?.descricao || `Confira os achadinhos com melhores descontos para ${catName}.`,
          bannerBadge: isCurrentEditing ? (adBannerBadge.trim() || (chosenProduct?.plataforma ? `ACHADINHO NA ${chosenProduct.plataforma.toUpperCase()}` : 'OFERTA DO DIA')) : 'OFERTA DO DIA',
          bannerButtonText: isCurrentEditing ? (adBannerBtn.trim() || (chosenProduct?.plataforma ? `Ver Oferta na ${chosenProduct.plataforma} →` : 'Aproveitar Oferta →')) : 'Aproveitar Oferta →',
          htmlCode: isCurrentEditing ? adHtmlCode.trim() : '',
          openInNewTab: adNewTab,
          productPrice: chosenProduct?.preco,
          productPromoPrice: chosenProduct?.precoPromo,
          productPlatform: chosenProduct?.plataforma,
          productCoupon: chosenProduct?.cupom
        };
        nextAds.push(newAd);

        if (isCurrentEditing) {
          setAdEnabled(true);
        }
      }

      await persistAdsToServer(
        nextAds,
        isActivating
          ? `✓ Anúncio da categoria "${catName}" foi ATIVADO e já está salvo no servidor! Visível nos artigos de ${catName}.`
          : `Anúncio da categoria "${catName}" foi pausado e salvo no servidor.`
      );
    } catch (err: any) {
      console.error('Error toggling ad status:', err);
      setFeedback({ type: 'error', message: 'Erro ao atualizar status do anúncio: ' + (err?.message || '') });
    } finally {
      setActionLoadingCat(null);
    }
  }

  // Directly saves the ad for the currently selected category
  async function handleSaveCurrentCategoryAd(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setSaving(true);
      setFeedback(null);

      const targetCat = (customCategoryMode ? customCategoryInput : selectedCategory).trim();
      if (!targetCat) {
        setFeedback({ type: 'error', message: 'Por favor, selecione ou informe a categoria do anúncio antes de salvar.' });
        setSaving(false);
        return;
      }

      const chosenProd = (adType === 'product' && selectedProductId) ? products.find(p => p.id === selectedProductId) : undefined;

      // When saving an ad with configured content, ensure it is activated if not explicitly set
      const hasContent = Boolean(
        adTitle.trim() ||
        adBannerImg.trim() ||
        adBannerLink.trim() ||
        (adType === 'product' && selectedProductId) ||
        adHtmlCode.trim()
      );
      const finalEnabled = adEnabled || hasContent;
      setAdEnabled(finalEnabled);

      const currentAdObj: ArticleFooterAd = {
        id: `ad-${targetCat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        category: targetCat,
        enabled: finalEnabled,
        type: adType,
        productId: adType === 'product' ? selectedProductId : undefined,
        title: adTitle.trim() || chosenProd?.nome || `Ofertas & Dicas de ${targetCat}`,
        bannerImageUrl: adBannerImg.trim() || chosenProd?.img1 || '',
        bannerLinkUrl: adBannerLink.trim() || chosenProd?.linkAfiliado || '',
        bannerAlt: adBannerAlt.trim() || chosenProd?.descricao || chosenProd?.nome || `Confira as melhores ofertas de ${targetCat}`,
        bannerBadge: adBannerBadge.trim() || (chosenProd?.plataforma ? `ACHADINHO NA ${chosenProd.plataforma.toUpperCase()}` : 'OFERTA DO DIA'),
        bannerButtonText: adBannerBtn.trim() || (chosenProd?.plataforma ? `Ver Oferta na ${chosenProd.plataforma} →` : 'Aproveitar Oferta →'),
        htmlCode: adHtmlCode.trim(),
        openInNewTab: adNewTab,
        productPrice: chosenProd?.preco,
        productPromoPrice: chosenProd?.precoPromo,
        productPlatform: chosenProd?.plataforma,
        productCoupon: chosenProd?.cupom
      };

      let newAdsList = [...categoryAds];
      const existingIdx = newAdsList.findIndex(
        a => (a.category || '').trim().toLowerCase() === targetCat.toLowerCase()
      );

      if (existingIdx >= 0) {
        newAdsList[existingIdx] = {
          ...newAdsList[existingIdx],
          ...currentAdObj
        };
      } else {
        newAdsList.push(currentAdObj);
      }

      if (customCategoryMode && customCategoryInput.trim()) {
        const customTrimmed = customCategoryInput.trim();
        if (!availableCategories.includes(customTrimmed)) {
          setAvailableCategories(prev => [...prev, customTrimmed]);
        }
        setSelectedCategory(customTrimmed);
        setCustomCategoryMode(false);
        setCustomCategoryInput('');
      }

      setCategoryAds(newAdsList);

      await persistAdsToServer(
        newAdsList,
        `✓ Anúncio para a categoria "${targetCat}" salvo com sucesso no servidor!` +
          (finalEnabled
            ? ' Está ATIVO e visível nos artigos dessa categoria.'
            : ' Anúncio salvo (atualmente pausado - marque como Ativo para exibir nos artigos).')
      );
    } catch (err: any) {
      console.error('Error saving current category ad:', err);
      setFeedback({ type: 'error', message: 'Erro ao salvar anúncio: ' + (err?.message || '') });
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);

      let newAdsList = [...categoryAds];
      const targetCat = (customCategoryMode ? customCategoryInput : selectedCategory).trim();
      const existingIdx = targetCat ? newAdsList.findIndex(
        a => (a.category || '').trim().toLowerCase() === targetCat.toLowerCase()
      ) : -1;
      const hasAdContent = Boolean(
        adTitle.trim() ||
        adBannerImg.trim() ||
        adBannerLink.trim() ||
        (adType === 'product' && selectedProductId) ||
        adHtmlCode.trim() ||
        adEnabled
      );

      // Update category ad if exists or has content
      if (targetCat && (hasAdContent || existingIdx >= 0)) {
        const chosenProd = (adType === 'product' && selectedProductId) ? products.find(p => p.id === selectedProductId) : undefined;

        const currentAdObj: ArticleFooterAd = {
          id: existingIdx >= 0 ? (newAdsList[existingIdx].id || `ad-${targetCat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`) : `ad-${targetCat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          category: targetCat,
          enabled: adEnabled,
          type: adType,
          productId: adType === 'product' ? selectedProductId : undefined,
          title: adTitle.trim() || chosenProd?.nome || '',
          bannerImageUrl: adBannerImg.trim() || chosenProd?.img1 || '',
          bannerLinkUrl: adBannerLink.trim() || chosenProd?.linkAfiliado || '',
          bannerAlt: adBannerAlt.trim() || chosenProd?.descricao || chosenProd?.nome || '',
          bannerBadge: adBannerBadge.trim() || (chosenProd?.plataforma ? `ACHADINHO NA ${chosenProd.plataforma.toUpperCase()}` : 'OFERTA DO DIA'),
          bannerButtonText: adBannerBtn.trim() || (chosenProd?.plataforma ? `Ver Oferta na ${chosenProd.plataforma} →` : 'Aproveitar Oferta →'),
          htmlCode: adHtmlCode.trim(),
          openInNewTab: adNewTab,
          productPrice: chosenProd?.preco,
          productPromoPrice: chosenProd?.precoPromo,
          productPlatform: chosenProd?.plataforma,
          productCoupon: chosenProd?.cupom
        };

        if (existingIdx >= 0) {
          newAdsList[existingIdx] = currentAdObj;
        } else if (hasAdContent) {
          newAdsList.push(currentAdObj);
        }

        if (customCategoryMode && customCategoryInput.trim()) {
          if (!availableCategories.includes(customCategoryInput.trim())) {
            setAvailableCategories(prev => [...prev, customCategoryInput.trim()]);
          }
          setSelectedCategory(customCategoryInput.trim());
          setCustomCategoryMode(false);
          setCustomCategoryInput('');
        }

        setCategoryAds(newAdsList);
      }

      const payload = buildCurrentSettingsPayload(newAdsList);

      const instPayload = {
        storeSlug,
        storeName: instStoreName.trim() || undefined,
        cnpj: instCnpj.trim(),
        endereco: instEndereco.trim(),
        email: instEmail.trim(),
        sobreNos: instSobreNos.trim(),
        textoDisclosure: instTextoDisclosure.trim(),
        termosUso: instTermosUso.trim(),
        politicaPrivacidade: instPoliticaPrivacidade.trim()
      };

      const [updatedBlog, updatedStore, instRes] = await Promise.all([
        saveAdminBlogSettings(storeSlug, payload),
        updateStoreConfig(storeSlug, {
          storeName: instStoreName.trim() || undefined,
          cnpj: instCnpj.trim(),
          endereco: instEndereco.trim(),
          email: instEmail.trim(),
          sobreNos: instSobreNos.trim(),
          textoDisclosure: instTextoDisclosure.trim(),
          termosUso: instTermosUso.trim(),
          politicaPrivacidade: instPoliticaPrivacidade.trim()
        }).catch((err) => {
          console.warn('Could not update store config for institutional fields:', err);
          return null;
        }),
        saveAdminInstitutional(storeSlug, instPayload).catch((err) => {
          console.warn('Could not save institutional to dedicated table:', err);
          return null;
        })
      ]);

      setSettings(updatedBlog);
      setCategoryAds(updatedBlog.articleFooterAds || newAdsList);

      if (instRes?.data) {
        setInstStoreName(instRes.data.storeName || '');
        setInstCnpj(instRes.data.cnpj || '');
        setInstEndereco(instRes.data.endereco || '');
        setInstEmail(instRes.data.email || '');
        setInstSobreNos(instRes.data.sobreNos || '');
        setInstTextoDisclosure(instRes.data.textoDisclosure || '');
        setInstTermosUso(instRes.data.termosUso || '');
        setInstPoliticaPrivacidade(instRes.data.politicaPrivacidade || '');
      }

      setFeedback({
        type: 'success',
        message: 'Configurações de aparência do Blog e dados Institucionais salvos com sucesso!'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('blog-settings-updated', { detail: updatedBlog }));
        if (updatedStore) {
          window.dispatchEvent(new CustomEvent('store-config-updated', { detail: updatedStore }));
        }
        window.dispatchEvent(new CustomEvent('institutional-updated', { detail: instPayload }));
      }
      onSaved?.(updatedBlog);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error saving blog settings:', err);
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar configurações do blog.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveInstitutional(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    try {
      setSavingInst(true);
      setFeedback(null);

      const instPayload = {
        storeSlug,
        storeName: instStoreName.trim() || undefined,
        cnpj: instCnpj.trim(),
        endereco: instEndereco.trim(),
        email: instEmail.trim(),
        sobreNos: instSobreNos.trim(),
        textoDisclosure: instTextoDisclosure.trim(),
        termosUso: instTermosUso.trim(),
        politicaPrivacidade: instPoliticaPrivacidade.trim()
      };

      const [instRes, updatedStore, updatedBlog] = await Promise.all([
        saveAdminInstitutional(storeSlug, instPayload).catch((err) => {
          console.error('Error in saveAdminInstitutional:', err);
          return null;
        }),
        updateStoreConfig(storeSlug, {
          storeName: instStoreName.trim() || undefined,
          cnpj: instCnpj.trim(),
          endereco: instEndereco.trim(),
          email: instEmail.trim(),
          sobreNos: instSobreNos.trim(),
          textoDisclosure: instTextoDisclosure.trim(),
          termosUso: instTermosUso.trim(),
          politicaPrivacidade: instPoliticaPrivacidade.trim()
        }).catch(() => null),
        saveAdminBlogSettings(storeSlug, {
          sobreNos: instSobreNos.trim(),
          textoDisclosure: instTextoDisclosure.trim(),
          termosUso: instTermosUso.trim(),
          politicaPrivacidade: instPoliticaPrivacidade.trim(),
          cnpj: instCnpj.trim(),
          endereco: instEndereco.trim(),
          email: instEmail.trim()
        }).catch(() => null)
      ]);

      if (instRes?.data) {
        setInstStoreName(instRes.data.storeName || '');
        setInstCnpj(instRes.data.cnpj || '');
        setInstEndereco(instRes.data.endereco || '');
        setInstEmail(instRes.data.email || '');
        setInstSobreNos(instRes.data.sobreNos || '');
        setInstTextoDisclosure(instRes.data.textoDisclosure || '');
        setInstTermosUso(instRes.data.termosUso || '');
        setInstPoliticaPrivacidade(instRes.data.politicaPrivacidade || '');
      }

      if (updatedBlog) {
        setSettings(updatedBlog);
      }

      const successMsg = instRes?.mysqlSaved
        ? '✓ Dados Institucionais salvos com sucesso no Banco de Dados (MySQL) e no Portal!'
        : '✓ Dados Institucionais salvos com sucesso!' + (instRes?.mysqlError ? ` (Aviso MySQL: ${instRes.mysqlError})` : '');

      setFeedback({
        type: 'success',
        message: successMsg
      });
      if (typeof window !== 'undefined') {
        if (updatedStore) {
          window.dispatchEvent(new CustomEvent('store-config-updated', { detail: updatedStore }));
        }
        if (updatedBlog) {
          window.dispatchEvent(new CustomEvent('blog-settings-updated', { detail: updatedBlog }));
        }
        window.dispatchEvent(new CustomEvent('institutional-updated', { detail: instPayload }));
      }
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      console.error('Error saving institutional settings:', err);
      setFeedback({
        type: 'error',
        message: 'Erro ao salvar dados institucionais: ' + (err?.message || '')
      });
    } finally {
      setSavingInst(false);
    }
  }

  function handleClearHeroBg() {
    setHeroBg('');
  }

  function handleClearBlogLogo() {
    setBlogLogo('');
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'hero' | 'ad' | 'logo') {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress to WebP or AVIF (whichever is optimal)
      const compressedDataUrl = await compressImageToWebP(file, {
        maxWidth: target === 'hero' ? 1920 : target === 'logo' ? 400 : 1200,
        maxHeight: target === 'hero' ? 1080 : target === 'logo' ? 200 : 800,
        quality: 0.85
      });

      // Save as an optimized .webp asset on server
      const serverUrl = await uploadImageToServer(compressedDataUrl, file.name);
      const finalUrl = serverUrl || compressedDataUrl;

      if (target === 'hero') {
        setHeroBg(finalUrl);
      } else if (target === 'logo') {
        setBlogLogo(finalUrl);
      } else {
        setAdBannerImg(finalUrl);
      }
    } catch (err) {
      console.error('Erro ao comprimir imagem do blog:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (target === 'hero') setHeroBg(base64);
        else if (target === 'logo') setBlogLogo(base64);
        else setAdBannerImg(base64);
      };
      reader.readAsDataURL(file);
    } finally {
      e.target.value = '';
    }
  }

  async function handleEnsureBlogTables() {
    try {
      setCheckingMySql(true);
      setMysqlResult(null);
      const res = await ensureBlogTablesInMySql(storeSlug);
      setMysqlResult(res);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Tabelas do Blog verificadas e sincronizadas com sucesso no MySQL da Hostinger!'
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Aviso do MySQL: ${res.message}`
        });
      }
    } catch (err: any) {
      setMysqlResult({
        success: false,
        message: err?.message || 'Falha ao conectar ao banco de dados.'
      });
      setFeedback({
        type: 'error',
        message: `Erro ao verificar MySQL: ${err?.message || 'Falha na conexão'}`
      });
    } finally {
      setCheckingMySql(false);
    }
  }

  async function handleOpenSqlScriptModal() {
    try {
      setLoadingSql(true);
      setShowSqlModal(true);
      const script = await fetchBlogSqlScript(storeSlug);
      setSqlScript(script);
    } catch (err: any) {
      setSqlScript('-- Erro ao carregar script SQL: ' + (err?.message || 'Erro'));
    } finally {
      setLoadingSql(false);
    }
  }

  function handleCopySql() {
    if (!sqlScript) return;
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-600">Carregando configurações do Blog...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in pb-12">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Layout className="w-5 h-5 text-emerald-600" />
            Configurações Visuais & Anúncios do Blog
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Personalize a imagem de fundo do topo, textos de apresentação e anúncios integrados no rodapé de cada artigo.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION NAV PILLS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar border-b border-neutral-200">
        {[
          { id: 'all', label: 'Todas as Seções', icon: SlidersHorizontal },
          { id: 'topbar', label: 'Barra de Aviso (Topo)', icon: Sparkles },
          { id: 'branding', label: 'Identidade & Logo', icon: Palette },
          { id: 'menu', label: 'Menu de Navegação', icon: MenuIcon },
          { id: 'hero', label: 'Cabeçalho (Hero)', icon: ImageIcon },
          { id: 'ads', label: 'Anúncios nos Artigos', icon: Megaphone },
          { id: 'footer', label: 'Rodapé & Layout', icon: Layout },
          { id: 'database', label: 'Banco MySQL', icon: Database }
        ]
          .filter(sec => !hideHeroAndFooter || (sec.id !== 'hero' && sec.id !== 'footer'))
          .map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION: BARRA DE AVISO SUPERIOR (TOP BAR ANNOUNCEMENT) */}
      {(activeSection === 'all' || activeSection === 'topbar') && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Barra de Anúncio no Topo (Top Bar)
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Exiba uma faixa destacada no topo máximo do site para avisos, cupons ou novidades importantes.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer p-2 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition">
              <input
                type="checkbox"
                checked={topBarEnabled}
                onChange={(e) => setTopBarEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span>Ativar Barra de Aviso no Topo</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Texto do Aviso / Notificação
                </label>
                <input
                  type="text"
                  value={topBarText}
                  onChange={(e) => setTopBarText(e.target.value)}
                  placeholder="Ex: 🌟 Cupons exclusivos e achadinhos testados da Shopee e Mercado Livre!"
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Link de Redirecionamento (Opcional)
                </label>
                <input
                  type="url"
                  value={topBarLink}
                  onChange={(e) => setTopBarLink(e.target.value)}
                  placeholder="https://... ou deixe em branco para apenas texto"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Cor de Fundo da Barra
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={topBarBgColor}
                      onChange={(e) => setTopBarBgColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-neutral-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={topBarBgColor}
                      onChange={(e) => setTopBarBgColor(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 font-mono rounded-lg border border-neutral-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Cor do Texto
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={topBarTextColor}
                      onChange={(e) => setTopBarTextColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-neutral-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={topBarTextColor}
                      onChange={(e) => setTopBarTextColor(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 font-mono rounded-lg border border-neutral-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Bar Preview */}
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Prévia da Barra no Topo
              </span>
              <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100 p-4">
                {topBarEnabled ? (
                  <div
                    className="text-xs font-semibold py-2.5 px-4 text-center rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all"
                    style={{ backgroundColor: topBarBgColor, color: topBarTextColor }}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-300" />
                    <span className="truncate">{topBarText || 'Exemplo de mensagem promocional do topo'}</span>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-neutral-400 font-medium">
                    Barra de aviso está desativada. Marque o checkbox acima para ativar.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: IDENTIDADE VISUAL & LOGO DO BLOG */}
      {(activeSection === 'all' || activeSection === 'branding') && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-emerald-600" />
              Identidade Visual &amp; Logotipo do Blog
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Personalize o nome da marca, o subtítulo descritivo, o logotipo e a cor temática primária do Blog.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nome da Marca / Blog
                </label>
                <input
                  type="text"
                  value={blogStoreName}
                  onChange={(e) => setBlogStoreName(e.target.value)}
                  placeholder="Ex: Achadinhos da Maria"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Slogan / Subtítulo da Marca
                </label>
                <input
                  type="text"
                  value={blogTagline}
                  onChange={(e) => setBlogTagline(e.target.value)}
                  placeholder="Ex: Blog & Achadinhos Verificados"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Cor Primária de Destaque
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={blogPrimaryColor}
                    onChange={(e) => setBlogPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-neutral-200 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={blogPrimaryColor}
                    onChange={(e) => setBlogPrimaryColor(e.target.value)}
                    className="w-32 text-xs px-2.5 py-2 font-mono rounded-lg border border-neutral-200 uppercase"
                  />
                  {/* Preset colors */}
                  <div className="flex items-center gap-1.5">
                    {['#2A5C3F', '#047857', '#1D4ED8', '#7C3AED', '#BE185D', '#EA580C'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBlogPrimaryColor(c)}
                        className="w-6 h-6 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Logotipo do Blog (URL ou Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blogLogo}
                    onChange={(e) => setBlogLogo(e.target.value)}
                    placeholder="https://... ou faça upload ao lado"
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg flex items-center gap-1 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                  {blogLogo && (
                    <button
                      type="button"
                      onClick={handleClearBlogLogo}
                      className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                      title="Remover Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Preview */}
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Prévia da Marca no Topo
              </span>
              <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center gap-4">
                {blogLogo ? (
                  <img
                    src={normalizeImageUrl(blogLogo)}
                    alt="Logo Blog"
                    className="h-12 w-auto max-w-[120px] object-contain rounded-lg"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs"
                    style={{ backgroundColor: blogPrimaryColor }}
                  >
                    {(blogStoreName || 'M').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 tracking-tight">
                    {blogStoreName || 'Achadinhos da Maria'}
                  </h4>
                  <p className="text-xs font-medium text-neutral-500">
                    {blogTagline || 'Blog & Achadinhos Verificados'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: MENU DE NAVEGAÇÃO DO BLOG */}
      {(activeSection === 'all' || activeSection === 'menu') && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <MenuIcon className="w-5 h-5 text-emerald-600" />
              Menu de Navegação do Blog
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Personalize o texto das opções de menu e controle quais páginas aparecem na barra superior para seus leitores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Home link */}
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    Item 1: Início do Blog
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    Obrigatório
                  </span>
                </div>
                <input
                  type="text"
                  value={menuHomeLabel}
                  onChange={(e) => setMenuHomeLabel(e.target.value)}
                  placeholder="Início (Blog)"
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                />
              </div>

              {/* Store link */}
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={menuShowStore}
                      onChange={(e) => setMenuShowStore(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <Store className="w-3.5 h-3.5 text-amber-600" />
                    <span>Item 2: Link da Vitrine / Loja</span>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={menuStoreLabel}
                      onChange={(e) => setMenuStoreLabel(e.target.value)}
                      placeholder="Loja & Achadinhos"
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={menuStoreBadge}
                      onChange={(e) => setMenuStoreBadge(e.target.value)}
                      placeholder="Ofertas"
                      title="Etiqueta/Badge (ex: Ofertas)"
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                    />
                  </div>
                </div>
              </div>

              {/* Institutional link */}
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={menuShowInstitutional}
                    onChange={(e) => setMenuShowInstitutional(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Item 3: Link Institucional</span>
                </label>
                <input
                  type="text"
                  value={menuInstitutionalLabel}
                  onChange={(e) => setMenuInstitutionalLabel(e.target.value)}
                  placeholder="Institucional"
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                />
              </div>

              {/* Contact link */}
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={menuShowContact}
                    onChange={(e) => setMenuShowContact(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <Mail className="w-3.5 h-3.5 text-rose-600" />
                  <span>Item 4: Link de Contato</span>
                </label>
                <input
                  type="text"
                  value={menuContactLabel}
                  onChange={(e) => setMenuContactLabel(e.target.value)}
                  placeholder="Contato"
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                />
              </div>
            </div>

            {/* Quick Actions at Top Right of Header */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Botões de Ação do Topo (Direita)
                </h4>

                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={menuShowWhatsApp}
                    onChange={(e) => setMenuShowWhatsApp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Exibir ícone do WhatsApp no cabeçalho</span>
                </label>

                <div className="pt-2 border-t border-neutral-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={menuShowVitrineBtn}
                      onChange={(e) => setMenuShowVitrineBtn(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Exibir Botão de Ação "Ver Vitrine"</span>
                  </label>
                  {menuShowVitrineBtn && (
                    <input
                      type="text"
                      value={menuVitrineBtnText}
                      onChange={(e) => setMenuVitrineBtnText(e.target.value)}
                      placeholder="Ver Vitrine"
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                    />
                  )}
                </div>
              </div>

              {/* Menu Preview */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-xs">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3 block">
                  Simulação da Barra de Navegação
                </span>
                <div className="p-2.5 rounded-xl bg-neutral-100 flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-1.5 rounded-lg bg-white font-bold text-neutral-900 text-xs shadow-xs">
                      {menuHomeLabel || 'Início'}
                    </span>
                    {menuShowStore && (
                      <span className="px-3 py-1.5 rounded-lg text-neutral-600 text-xs font-semibold flex items-center gap-1">
                        <span>{menuStoreLabel || 'Loja'}</span>
                        {menuStoreBadge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                            {menuStoreBadge}
                          </span>
                        )}
                      </span>
                    )}
                    {menuShowInstitutional && (
                      <span className="px-2.5 py-1.5 rounded-lg text-neutral-600 text-xs font-semibold">
                        {menuInstitutionalLabel || 'Institucional'}
                      </span>
                    )}
                    {menuShowContact && (
                      <span className="px-2.5 py-1.5 rounded-lg text-neutral-600 text-xs font-semibold">
                        {menuContactLabel || 'Contato'}
                      </span>
                    )}
                  </div>
                  {menuShowVitrineBtn && (
                    <span
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs whitespace-nowrap"
                      style={{ backgroundColor: blogPrimaryColor }}
                    >
                      {menuVitrineBtnText || 'Ver Vitrine'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: DADOS DO INSTITUCIONAL (QUEM SOMOS, TERMOS, PRIVACIDADE, AFILIADOS) */}
      {(activeSection === 'all' || activeSection === 'menu') && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Dados do Institucional &amp; Informações Legais
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Configure os dados da sua empresa e o conteúdo exibido nas páginas e abas do <strong>Portal Institucional (/institucional)</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={handleSyncInstitutionalTable}
                disabled={syncingInstTable}
                title="Cria/valida a tabela institutional_pages e colunas institucionais no MySQL da Hostinger"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {syncingInstTable ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{syncingInstTable ? 'Validando...' : 'Sincronizar no MySQL'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveInstitutional}
                disabled={savingInst}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingInst ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{savingInst ? 'Salvando...' : 'Salvar Institucional'}</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs for Institutional settings */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setInstActiveTab('dados')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                instActiveTab === 'dados'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Dados Cadastrais &amp; Contato</span>
            </button>

            <button
              type="button"
              onClick={() => setInstActiveTab('sobre')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                instActiveTab === 'sobre'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Quem Somos (História)</span>
            </button>

            <button
              type="button"
              onClick={() => setInstActiveTab('afiliados')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                instActiveTab === 'afiliados'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Declaração de Afiliados</span>
            </button>

            <button
              type="button"
              onClick={() => setInstActiveTab('termos')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                instActiveTab === 'termos'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Termos de Uso</span>
            </button>

            <button
              type="button"
              onClick={() => setInstActiveTab('privacidade')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                instActiveTab === 'privacidade'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>5. Privacidade &amp; LGPD</span>
            </button>
          </div>

          {/* Sub-tab 1: Dados Cadastrais & Contato */}
          {instActiveTab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Nome da Loja / Razão Social
                  </label>
                  <input
                    type="text"
                    value={instStoreName}
                    onChange={(e) => setInstStoreName(e.target.value)}
                    placeholder="Ex: Achadinhos da Maria / Meu Doce Lar"
                    className="w-full text-xs px-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Nome exibido como titular nos documentos e páginas institucionais.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    CNPJ da Empresa
                  </label>
                  <input
                    type="text"
                    value={instCnpj}
                    onChange={(e) => setInstCnpj(e.target.value)}
                    placeholder="Ex: 00.000.000/0001-00"
                    className="w-full text-xs px-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Identificação cadastral da empresa (opcional para pessoa física).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    E-mail Oficial de Contato &amp; LGPD
                  </label>
                  <input
                    type="email"
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    placeholder="contato@meudocelar.com.br"
                    className="w-full text-xs px-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Canal de suporte ao leitor e solicitações de privacidade.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Endereço / Localização
                  </label>
                  <input
                    type="text"
                    value={instEndereco}
                    onChange={(e) => setInstEndereco(e.target.value)}
                    placeholder="Ex: São Paulo, SP - Brasil"
                    className="w-full text-xs px-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Localização física ou cidade/UF de operação do portal.</p>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Quem Somos (Sobre Nós) */}
          {instActiveTab === 'sobre' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Texto Personalizado: Quem Somos &amp; Missão
                </label>
                <span className="text-[11px] text-neutral-400">Deixe em branco para usar o texto padrão otimizado</span>
              </div>
              <textarea
                rows={6}
                value={instSobreNos}
                onChange={(e) => setInstSobreNos(e.target.value)}
                placeholder="Conte a história do seu blog/loja, seu processo de curadoria, sua missão de ajudar os leitores a encontrar os melhores produtos com desconto..."
                className="w-full text-xs p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition leading-relaxed"
              />
              <p className="text-[11px] text-neutral-500">
                💡 O texto acima será exibido na aba <strong>"Quem Somos"</strong> da página institucional.
              </p>
            </div>
          )}

          {/* Sub-tab 3: Declaração de Afiliados */}
          {instActiveTab === 'afiliados' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Aviso de Afiliados &amp; Transparência (Disclosure)
                </label>
                <span className="text-[11px] text-neutral-400">Deixe em branco para usar o aviso padrão de comissões</span>
              </div>
              <textarea
                rows={5}
                value={instTextoDisclosure}
                onChange={(e) => setInstTextoDisclosure(e.target.value)}
                placeholder="Ex: O Achadinhos da Maria participa de programas de afiliados da Amazon, Shopee e Mercado Livre. Podemos receber comissões por compras qualificadas sem nenhum custo extra para você..."
                className="w-full text-xs p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition leading-relaxed"
              />
              <p className="text-[11px] text-neutral-500">
                💡 Este aviso é fundamental para conformidade com as diretrizes da Amazon Associates, Google e Código do Consumidor.
              </p>
            </div>
          )}

          {/* Sub-tab 4: Termos de Uso */}
          {instActiveTab === 'termos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Termos e Condições de Uso Personalizados
                </label>
                <span className="text-[11px] text-neutral-400">Deixe em branco para usar os termos jurídicos padrão</span>
              </div>
              <textarea
                rows={6}
                value={instTermosUso}
                onChange={(e) => setInstTermosUso(e.target.value)}
                placeholder="Insira cláusulas personalizadas sobre natureza do serviço de curadoria, preços dinâmicos das lojas parceiras, garantias e devoluções..."
                className="w-full text-xs p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition leading-relaxed"
              />
              <p className="text-[11px] text-neutral-500">
                💡 Exibido na aba <strong>"Termos de Uso"</strong> para proteger sua plataforma contra responsabilidades de entrega de terceiros.
              </p>
            </div>
          )}

          {/* Sub-tab 5: Privacidade & LGPD */}
          {instActiveTab === 'privacidade' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Política de Privacidade &amp; LGPD Personalizada
                </label>
                <span className="text-[11px] text-neutral-400">Deixe em branco para usar a política padrão LGPD</span>
              </div>
              <textarea
                rows={6}
                value={instPoliticaPrivacidade}
                onChange={(e) => setInstPoliticaPrivacidade(e.target.value)}
                placeholder="Insira termos adicionais de cookies de afiliados, Google Analytics, direitos do titular e canal DPO/LGPD..."
                className="w-full text-xs p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none transition leading-relaxed"
              />
              <p className="text-[11px] text-neutral-500">
                💡 Exibido na aba <strong>"Privacidade &amp; LGPD"</strong> em conformidade com a Lei Geral de Proteção de Dados.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 1: IMAGEM DE FUNDO DO TOPO (HERO HEADER) */}
      {!hideHeroAndFooter && (activeSection === 'all' || activeSection === 'hero') && (
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <div className="border-b border-neutral-100 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              Cabeçalho do Topo (Hero Header)
            </h3>
            {heroBg && (
              <button
                type="button"
                onClick={handleClearHeroBg}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Imagem de Fundo</span>
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Esta imagem é exibida como fundo no cabeçalho principal do Blog. Você pode inserir uma URL externa, fazer upload de arquivo ou remover para usar o padrão.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                URL da Imagem de Fundo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={heroBg}
                  onChange={(e) => setHeroBg(e.target.value)}
                  placeholder="https://exemplo.com/imagem-topo.webp ou unsplash"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono text-neutral-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Ou Envie uma Imagem do seu Dispositivo
              </label>
              <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-dashed border-neutral-300 rounded-xl cursor-pointer text-xs font-semibold text-neutral-700 transition">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Escolher Imagem (JPG, PNG ou WebP - Máx 4MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'hero')}
                  className="hidden"
                />
              </label>
            </div>

            {/* Overlay Darkness / Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  Opacidade da Camada Escura (Overlay): {heroOpacity}%
                </label>
                <span className="text-[11px] font-semibold text-neutral-500">
                  {heroOpacity >= 70 ? 'Alto contraste' : heroOpacity >= 40 ? 'Equilibrado' : 'Transparente'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={heroOpacity}
                onChange={(e) => setHeroOpacity(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Ajuste a intensidade do filtro escuro para garantir que os textos em branco permaneçam 100% legíveis sobre qualquer foto.
              </p>
            </div>

            {/* Hero Text Customization */}
            <div className="pt-2 border-t border-neutral-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Selo de Destaque (Badge)
                </label>
                <input
                  type="text"
                  value={heroBadge}
                  onChange={(e) => setHeroBadge(e.target.value)}
                  placeholder="BLOG & DICAS EXCLUSIVAS"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Título Principal do Cabeçalho
                </label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="Guia de Achadinhos & Dicas para seu Lar"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Subtítulo Explicativo
                </label>
                <textarea
                  rows={2}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="Análises sinceras, seleções com os melhores preços garimpados e dicas práticas..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              {/* Hero Search & CTA Options */}
              <div className="pt-2 border-t border-neutral-100 space-y-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={heroShowSearch}
                      onChange={(e) => setHeroShowSearch(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <Search className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Exibir Barra de Busca no Cabeçalho</span>
                  </label>
                  {heroShowSearch && (
                    <input
                      type="text"
                      value={heroSearchPlaceholder}
                      onChange={(e) => setHeroSearchPlaceholder(e.target.value)}
                      placeholder="Buscar dicas, produtos, achadinhos..."
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                    />
                  )}
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={heroShowCta}
                      onChange={(e) => setHeroShowCta(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exibir Botão de Ação (CTA) para Vitrine</span>
                  </label>
                  {heroShowCta && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                          Texto do Botão
                        </label>
                        <input
                          type="text"
                          value={heroCtaText}
                          onChange={(e) => setHeroCtaText(e.target.value)}
                          placeholder="Explorar Vitrine de Ofertas"
                          className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                          Destino do Botão (Ação ao Clicar)
                        </label>
                        <select
                          value={heroCtaTarget}
                          onChange={(e) => setHeroCtaTarget(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200"
                        >
                          <option value="store">Página da Loja / Vitrine de Achadinhos</option>
                          <option value="#artigos">Rolar a Página até a Lista de Artigos</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Prévia do Topo do Blog
              </span>
              <span className="text-[10px] bg-neutral-100 text-neutral-600 font-semibold px-2 py-0.5 rounded-md">
                Visualização ao Vivo
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-neutral-800 bg-neutral-900 text-white p-6 sm:p-8 flex flex-col justify-center min-h-[220px] flex-1">
              {/* Background Image Layer */}
              {heroBg ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                  style={{
                    backgroundImage: `url(${normalizeImageUrl(heroBg)})`
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900" />
              )}

              {/* Dark Overlay Layer */}
              <div
                className="absolute inset-0 bg-neutral-950 transition-opacity duration-300"
                style={{ opacity: heroOpacity / 100 }}
              />

              {/* Glow accent */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-2xl bg-emerald-500/20 pointer-events-none" />

              {/* Text content preview */}
              <div className="relative z-10 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-emerald-300 backdrop-blur-md">
                  <Sparkles className="w-2.5 h-2.5" />
                  {heroBadge || 'BLOG & DICAS EXCLUSIVAS'}
                </span>
                <h4 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                  {heroTitle || 'Guia de Achadinhos & Dicas para seu Lar'}
                </h4>
                <p className="text-xs text-neutral-200 max-w-md line-clamp-2 leading-relaxed opacity-90">
                  {heroSubtitle || 'Análises sinceras, seleções com os melhores preços garimpados e dicas práticas de organização para sua rotina.'}
                </p>

                {/* Hero Search Bar Preview */}
                {heroShowSearch && (
                  <div className="pt-1 max-w-sm">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                      <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300">
                        {heroSearchPlaceholder || 'Buscar dicas, produtos, achadinhos...'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hero CTA Button Preview */}
                {heroShowCta && (
                  <div className="pt-1">
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-md cursor-default"
                      style={{ backgroundColor: blogPrimaryColor }}
                    >
                      <Store className="w-3 h-3" />
                      <span>{heroCtaText || 'Explorar Loja de Achadinhos →'}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SECTION 2: ANÚNCIOS NO RODAPÉ DOS ARTIGOS (FILTRADO POR CATEGORIA) */}
      {(activeSection === 'all' || activeSection === 'ads') && (
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <div className="border-b border-neutral-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-600" />
                2. Oferta / Anúncio em Destaque no Rodapé dos Artigos
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Vincule anúncios a categorias específicas. O anúncio só será exibido nos artigos da mesma categoria indicada.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>{categoryAds.filter(a => a.enabled).length} com anúncio ativo</span>
              </span>
            </div>
          </div>

          {/* Rule banner */}
          <div className="mt-3 p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <Filter className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Regra de Exibição por Categoria:</p>
              <p className="text-amber-800/90 text-[11px] mt-0.5 leading-relaxed">
                Cada anúncio é filtrado pela categoria. O sistema só exibirá a oferta no artigo que possuir <strong>a mesma categoria</strong> indicada. Se uma categoria não tiver um anúncio criado ou estiver pausado, <strong>nenhum anúncio aparecerá no artigo</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 2.1 BANNER VERTICAL DA COLUNA LATERAL DOS ARTIGOS */}
        <div className="p-5 sm:p-6 rounded-2xl border-2 border-amber-200 bg-amber-50/30 space-y-6">
          <div className="border-b border-amber-200/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
                Coluna Lateral dos Artigos
              </span>
              <h4 className="text-sm sm:text-base font-bold text-neutral-900 mt-1.5 flex items-center gap-2">
                Banners Laterais por Artigo
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Cada artigo pode ter seu banner lateral vertical exclusivo. Gerencie os banners na tabela abaixo ou cadastre um novo.
              </p>
            </div>

            {/* Botões no topo e à direita do card */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleSyncBlogTables}
                disabled={syncingBlogTables}
                title="Cria/valida a tabela blog_posts e coluna sidebarBanner no MySQL da Hostinger"
                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {syncingBlogTables ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span>{syncingBlogTables ? 'Sincronizando...' : 'Sincronizar Tabelas MySQL'}</span>
              </button>

              <button
                type="button"
                onClick={handleNewBanner}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo</span>
              </button>
            </div>
          </div>

          {/* Tabela de Banners por Artigo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Artigos com Banner Lateral ({blogPosts.filter(p => Boolean(p.sidebarBanner?.imageUrl)).length})</span>
              </h5>
              <span className="text-[11px] text-neutral-500">
                Banners exclusivos por artigo
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-2xs">
              {(() => {
                const postsWithBanner = blogPosts.filter(p => p.published !== false);
                if (postsWithBanner.length === 0) {
                  return (
                    <div className="p-8 text-center bg-neutral-50/50">
                      <ImageIcon className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                      <p className="text-xs font-bold text-neutral-700">Nenhum artigo publicado encontrado</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Artigo Escolhido</th>
                          <th className="py-3 px-4">Banner Escolhido</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {postsWithBanner.map((post) => {
                          const banner = post.sidebarBanner;
                          const hasBanner = Boolean(banner?.imageUrl);
                          const isSelected = selectedArticleId === post.id;
                          const isEnabled = hasBanner && banner?.enabled !== false;
                          const bannerName = banner?.altText || banner?.title || 'Banner Lateral';

                          return (
                            <tr
                              key={post.id}
                              className={`transition ${isSelected ? 'bg-amber-50/60' : 'hover:bg-neutral-50/70'}`}
                            >
                              <td className="py-3 px-4">
                                <div className="font-semibold text-neutral-900 leading-snug">
                                  {post.title}
                                </div>
                                <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                                  <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                    {post.category || 'Geral'}
                                  </span>
                                  {isSelected && (
                                    <span className="text-amber-700 font-bold text-[10px]">
                                      ● Em edição
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {hasBanner ? (
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={normalizeImageUrl(banner?.imageUrl || '')}
                                      alt={bannerName}
                                      className="w-8 h-10 object-cover rounded-md border border-neutral-200 shrink-0 shadow-2xs"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-medium text-neutral-800 truncate max-w-[200px]" title={bannerName}>
                                        {bannerName}
                                      </div>
                                      {banner?.linkUrl ? (
                                        <div className="text-[10px] text-neutral-400 truncate max-w-[200px]" title={banner.linkUrl}>
                                          {banner.linkUrl}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
                                    Sem banner personalizado
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {hasBanner ? (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      isEnabled
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isEnabled ? 'bg-emerald-500' : 'bg-neutral-400'
                                      }`}
                                    />
                                    {isEnabled ? 'Ativo' : 'Desativado'}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-[11px] font-medium">—</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {hasBanner ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleBannerStatus(post)}
                                        disabled={saving}
                                        title={isEnabled ? 'Desativar banner' : 'Ativar banner'}
                                        className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                          isEnabled
                                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                            : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200 border-neutral-200'
                                        }`}
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleEditBanner(post)}
                                        title="Editar banner"
                                        className="p-1.5 text-neutral-700 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 transition cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>

                                      {confirmDeleteBannerId === post.id ? (
                                        <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                                          <span className="text-[10px] font-bold text-rose-700">Excluir?</span>
                                          <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => handleDeleteBanner(post)}
                                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10px] font-black rounded cursor-pointer transition shadow-2xs"
                                          >
                                            Sim
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteBannerId(null)}
                                            className="px-2 py-0.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[10px] font-bold rounded cursor-pointer transition"
                                          >
                                            Não
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteBannerId(post.id)}
                                          disabled={saving}
                                          title="Excluir banner"
                                          className="p-1.5 text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleEditBanner(post)}
                                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Adicionar Banner</span>
                                    </button>
                                  )}
                                    </div>
                                </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Formulário de Configuração do Banner (sem pré-visualização) */}
          <div id="sidebar-banner-form" className="p-5 bg-white rounded-2xl border border-amber-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  {selectedArticleId && blogPosts.find(p => p.id === selectedArticleId)?.sidebarBanner?.imageUrl
                    ? 'Editar Banner do Artigo'
                    : 'Adicionar / Configurar Banner Lateral'}
                </h5>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Preencha os campos abaixo para salvar o banner lateral do artigo selecionado.
                </p>
              </div>
              {selectedArticleId && (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg max-w-[200px] truncate">
                  {blogPosts.find(p => p.id === selectedArticleId)?.title}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* 1. Escolha do artigo */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Escolha do Artigo (Publicado)</span>
                  <span className="text-[11px] font-normal text-neutral-500">
                    {blogPosts.filter(p => p.published !== false).length} publicado(s)
                  </span>
                </label>
                <select
                  value={selectedArticleId}
                  onChange={(e) => handleSelectArticleForBanner(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white font-medium focus:outline-none focus:border-amber-600 shadow-2xs cursor-pointer"
                >
                  <option value="">-- Selecione um artigo publicado --</option>
                  {blogPosts
                    .filter(p => p.published !== false && (!p.sidebarBanner?.imageUrl || p.id === selectedArticleId))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.sidebarBanner?.imageUrl ? '★ (Com banner)' : ''}
                      </option>
                    ))}
                </select>
                {(() => {
                  const sel = blogPosts.find(p => p.id === selectedArticleId);
                  if (!sel) return null;
                  return (
                    <p className="text-[11px] text-neutral-500 mt-1 flex items-center gap-2">
                      <span>Categoria: <strong className="text-neutral-700">{sel.category || 'Geral'}</strong></span>
                      {sel.sidebarBanner?.imageUrl ? (
                        <span className="text-emerald-600 font-semibold">✓ Já possui banner configurado</span>
                      ) : (
                        <span className="text-neutral-400">Sem banner configurado ainda</span>
                      )}
                    </p>
                  );
                })()}
              </div>

              {/* 2. Botão para enviar imagem do computador */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Imagem do Banner Lateral
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    id="sidebar-banner-file-input"
                    accept="image/*"
                    onChange={handleBannerFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="sidebar-banner-file-input"
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition ${
                      isUploadingBannerImg
                        ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {isUploadingBannerImg ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processando Imagem...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Enviar Imagem do Computador</span>
                      </>
                    )}
                  </label>

                  {sidebarBannerImg && (
                    <div className="flex items-center gap-3 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                      <div className="text-[11px] text-neutral-700 font-medium truncate max-w-[200px] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{sidebarBannerName || 'Imagem carregada'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarBannerImg('');
                          setSidebarBannerName('');
                          setSidebarBannerEnabled(false);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                  Envie uma imagem vertical (ex: 300x600 ou formato 4:5 / 9:16). A imagem é otimizada automaticamente.
                </p>

                {/* Direct Image URL input */}
                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Ou Cole a URL Direta da Imagem
                  </label>
                  <input
                    type="url"
                    value={sidebarBannerImg}
                    onChange={(e) => {
                      setSidebarBannerImg(e.target.value);
                      if (e.target.value.trim()) setSidebarBannerEnabled(true);
                    }}
                    placeholder="https://images.unsplash.com/... ou URL da imagem"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-amber-600 bg-white shadow-2xs"
                  />
                </div>
              </div>

              {/* 3. Link de Destino / Afiliado */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Link de Destino / Afiliado
                </label>
                <input
                  type="url"
                  value={sidebarBannerLink}
                  onChange={(e) => setSidebarBannerLink(e.target.value)}
                  placeholder="https://shope.ee/... ou https://amzn.to/..."
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-amber-600 bg-white shadow-2xs"
                />
              </div>

              {/* 4. Texto do Botão CTA */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Texto do Botão CTA
                </label>
                <input
                  type="text"
                  value={sidebarBannerBtn}
                  onChange={(e) => setSidebarBannerBtn(e.target.value)}
                  placeholder="Quero Conhecer →"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-amber-600 bg-white font-semibold shadow-2xs"
                />
              </div>

              {/* 5. Abrir link em nova aba (recomendado) */}
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={sidebarBannerNewTab}
                    onChange={(e) => setSidebarBannerNewTab(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-700 font-medium select-none">
                    Abrir link em nova aba (recomendado)
                  </span>
                </label>
              </div>

              {/* 7. Botão Salvar Banner Lateral */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving || !selectedArticleId}
                  onClick={handleSaveSidebarBannerOnly}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Salvando Banner...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Banner Lateral</span>
                    </>
                  )}
                </button>

                {sidebarBannerImg && (
                  <span className="text-xs text-neutral-500 font-medium">
                    Status:{' '}
                    <strong className={sidebarBannerEnabled ? 'text-emerald-600' : 'text-neutral-500'}>
                      {sidebarBannerEnabled ? 'Ativo para este artigo' : 'Desativado'}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* In-section Feedback banner for Category Ads */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Existing Configured Ads summary cards */}
        {categoryAds.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              Anúncios Cadastrados por Categoria ({categoryAds.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryAds.map((adItem, idx) => {
                const isSelected = selectedCategory.trim().toLowerCase() === (adItem.category || '').trim().toLowerCase();
                return (
                  <div
                    key={adItem.id || `ad-card-${idx}`}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-neutral-200 text-neutral-800">
                          <Tag className="w-3 h-3 text-neutral-600" />
                          <span>{adItem.category || 'Sem categoria'}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-600">
                            {adItem.type === 'product' ? 'Produto' : adItem.type === 'html' ? 'Script' : 'Banner'}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              adItem.enabled
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-neutral-200 text-neutral-600'
                            }`}
                          >
                            {adItem.enabled ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                      </div>

                      {adItem.bannerImageUrl && (
                        <div className="h-16 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-900">
                          <img
                            src={normalizeImageUrl(adItem.bannerImageUrl)}
                            alt={adItem.title || 'Anúncio'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <p className="text-xs font-bold text-neutral-900 line-clamp-1">
                        {adItem.title || adItem.bannerAlt || 'Oferta em Destaque'}
                      </p>

                      {adItem.bannerLinkUrl && (
                        <p className="text-[10px] font-mono text-neutral-500 truncate">
                          {adItem.bannerLinkUrl}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200/80 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(adItem.category || '')}
                        className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        {isSelected ? '✓ Editando Agora' : 'Editar Anúncio'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLoadingCat === adItem.category}
                          onClick={() => handleToggleAdStatus(adItem.category || '')}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                            adItem.enabled
                              ? 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200 shadow-2xs'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-2xs'
                          } ${actionLoadingCat === adItem.category ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={adItem.enabled ? 'Pausar anúncio nesta categoria' : 'Ativar anúncio e salvar no servidor'}
                        >
                          {actionLoadingCat === adItem.category ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Salvando...</span>
                            </>
                          ) : (
                            <span>{adItem.enabled ? 'Pausar' : 'Ativar'}</span>
                          )}
                        </button>

                        {confirmDeleteCat === adItem.category ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                            <span className="text-[10px] font-bold text-rose-700">Excluir?</span>
                            <button
                              type="button"
                              disabled={actionLoadingCat === adItem.category}
                              onClick={() => handleRemoveAd(adItem.category || '')}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10px] font-black rounded cursor-pointer transition shadow-2xs"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCat(null)}
                              className="px-2 py-0.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[10px] font-bold rounded cursor-pointer transition"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoadingCat === adItem.category}
                            onClick={() => setConfirmDeleteCat(adItem.category || '')}
                            className={`p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer ${
                              actionLoadingCat === adItem.category ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            title="Excluir este anúncio da categoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EDITOR DE ANÚNCIO PARA A CATEGORIA SELECIONADA */}
        <div id="ad-form-section" className="p-5 rounded-2xl border-2 border-neutral-200 bg-neutral-50/40 space-y-6 scroll-mt-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                Formulário do Anúncio
              </span>
              <h4 className="text-sm sm:text-base font-bold text-neutral-900 mt-1 flex items-center gap-2">
                Configurar Anúncio para a Categoria:
                <span className="text-emerald-700 font-extrabold underline decoration-emerald-300">
                  {customCategoryMode ? (customCategoryInput || 'Nova Categoria') : selectedCategory}
                </span>
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer bg-white p-2 sm:px-3 rounded-xl border border-neutral-300 shadow-2xs hover:bg-neutral-50 transition shrink-0">
                <input
                  type="checkbox"
                  checked={adEnabled}
                  onChange={(e) => setAdEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-neutral-800">
                  {adEnabled ? '✓ Anúncio ATIVO nesta Categoria' : 'Anúncio Pausado nesta Categoria'}
                </span>
              </label>

              <button
                type="button"
                disabled={saving || actionLoadingCat !== null}
                onClick={handleSaveCurrentCategoryAd}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Anúncio desta Categoria</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Campo Categoria (Filtro Obrigatório) */}
          <div className="space-y-2 bg-white p-4 rounded-xl border border-neutral-200">
            <label className="block text-xs font-bold text-neutral-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Categoria do Artigo * (Filtro Obrigatório)
              </span>
              <span className="text-[10px] text-neutral-500 font-normal">
                Determina onde este anúncio será exibido
              </span>
            </label>

            {!customCategoryMode ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCustomCategoryMode(true);
                      setCustomCategoryInput('');
                    } else {
                      handleSelectCategory(e.target.value);
                    }
                  }}
                  className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white font-semibold text-neutral-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {availableCategories.map((cat) => {
                    const hasAd = categoryAds.some(a => a.category?.trim().toLowerCase() === cat.trim().toLowerCase());
                    return (
                      <option key={cat} value={cat}>
                        {cat} {hasAd ? '✓ (com anúncio configurado)' : '(sem anúncio ainda)'}
                      </option>
                    );
                  })}
                  <option value="__custom__">+ Cadastrar para Outra Categoria (Digitar)...</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setCustomCategoryMode(true);
                    setCustomCategoryInput('');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Digitar Categoria</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="Ex: Sala de Estar, Iluminação, Limpeza..."
                  className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-emerald-500 bg-emerald-50/20 font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomCategoryMode(false);
                    setCustomCategoryInput('');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                >
                  Voltar para Lista
                </button>
              </div>
            )}

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              O anúncio só aparecerá nos artigos cadastrados com a categoria acima. Se um artigo for de outra categoria sem anúncio, nada será exibido.
            </p>
          </div>

          {/* Ad Type Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAdType('banner')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                adType === 'banner'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Banner de Imagem com Link de Afiliado</span>
            </button>

            <button
              type="button"
              onClick={() => setAdType('html')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                adType === 'html'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Código HTML / Script Personalizado (AdSense, etc.)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAdType('product');
                if (!selectedProductId && products.length > 0) {
                  handleSelectProduct(products[0].id);
                }
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                adType === 'product'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
              <span>Produto da Loja (Link Direto)</span>
            </button>
          </div>

          {/* BANNER MODE */}
          {adType === 'banner' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Título da Oferta / Chamada
                  </label>
                  <input
                    type="text"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Ex: Ofertas Especiais de Cozinha com até 50% OFF"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    URL da Imagem do Banner
                  </label>
                  <input
                    type="text"
                    value={adBannerImg}
                    onChange={(e) => setAdBannerImg(e.target.value)}
                    placeholder="https://exemplo.com/banner-promocional.jpg"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 font-mono text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Ou Fazer Upload do Banner do Computador
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white hover:bg-neutral-50 border border-dashed border-neutral-300 rounded-xl cursor-pointer text-xs font-semibold text-neutral-700 transition">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>Escolher Imagem do Banner (Compactada em WebP automaticamente)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'ad')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Link de Destino do Afiliado
                  </label>
                  <input
                    type="url"
                    value={adBannerLink}
                    onChange={(e) => setAdBannerLink(e.target.value)}
                    placeholder="https://amzn.to/exemplo ou https://shopee.com.br/..."
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 text-neutral-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Selo / Badge do Anúncio
                    </label>
                    <input
                      type="text"
                      value={adBannerBadge}
                      onChange={(e) => setAdBannerBadge(e.target.value)}
                      placeholder="OFERTA DO DIA"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Texto do Botão
                    </label>
                    <input
                      type="text"
                      value={adBannerBtn}
                      onChange={(e) => setAdBannerBtn(e.target.value)}
                      placeholder="Aproveitar Oferta →"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Texto Alternativo / Descrição da Oferta
                  </label>
                  <input
                    type="text"
                    value={adBannerAlt}
                    onChange={(e) => setAdBannerAlt(e.target.value)}
                    placeholder="Super Seleção com até 60% OFF e Frete Grátis"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={adNewTab}
                    onChange={(e) => setAdNewTab(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="text-xs text-neutral-700 font-medium">
                    Abrir link em nova aba (recomendado para manter o leitor no site)
                  </span>
                </label>
              </div>

              {/* Banner Preview */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    Prévia do Anúncio nos Artigos de "{customCategoryMode ? (customCategoryInput || 'Nova Categoria') : selectedCategory}"
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                    {adEnabled ? 'Ativo' : 'Pausado'}
                  </span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex-1 flex flex-col justify-center shadow-2xs">
                  {adEnabled ? (
                    <div className="relative group overflow-hidden rounded-2xl border border-amber-200 shadow-md bg-neutral-900 text-white min-h-[160px] flex flex-col justify-end p-5">
                      {adBannerImg ? (
                        <img
                          src={normalizeImageUrl(adBannerImg)}
                          alt={adBannerAlt || 'Anúncio'}
                          className="absolute inset-0 w-full h-full object-cover object-center opacity-60 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-800 via-amber-900 to-neutral-900 opacity-80" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 bg-amber-500 text-neutral-950 text-[10px] font-black tracking-wider uppercase rounded-md">
                            {adBannerBadge || 'OFERTA DO DIA'}
                          </span>
                          <p className="text-sm font-bold text-white leading-tight">
                            {adTitle || adBannerAlt || 'Aproveite as Melhores Ofertas de Hoje'}
                          </p>
                        </div>

                        <span className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-amber-400 text-neutral-950 text-xs font-extrabold rounded-xl shrink-0 shadow-sm">
                          {adBannerBtn || 'Aproveitar Oferta →'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                      <Megaphone className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p className="text-xs font-bold text-neutral-600">Anúncio Desativado para esta Categoria</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Marque a caixa "Anúncio Ativo nesta Categoria" para exibir nos artigos.
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-neutral-400 text-center mt-2">
                    Exibido exclusivamente em artigos categorizados como "{customCategoryMode ? (customCategoryInput || 'Nova Categoria') : selectedCategory}".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* HTML CODE MODE */}
          {adType === 'html' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Cole o Código HTML / Script do Anúncio
                </label>
                <textarea
                  rows={6}
                  value={adHtmlCode}
                  onChange={(e) => setAdHtmlCode(e.target.value)}
                  placeholder="<ins class='adsbygoogle' ...></ins>"
                  className="w-full text-xs font-mono p-3.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-neutral-900 text-emerald-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Suporta blocos de script do Google AdSense, banners em iframe ou tags HTML personalizadas de afiliados.
                </p>
              </div>
            </div>
          )}

          {/* PRODUCT MODE (OPÇÃO 3 - ESCOLHER PRODUTO DA LOJA COM LINK DIRETO) */}
          {adType === 'product' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
                <ShoppingBag className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                    Exibir Produto Cadastrado da Loja nos Artigos de "{customCategoryMode ? (customCategoryInput || 'Nova Categoria') : selectedCategory}"
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Selecione um produto da sua loja. Quando o leitor clicar no anúncio dentro do artigo, ele será levado <strong>diretamente para o link do produto / link de afiliado</strong>.
                  </p>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="p-8 text-center bg-neutral-50 border border-dashed border-neutral-200 rounded-2xl space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-neutral-400" />
                  <p className="text-sm font-bold text-neutral-700">Nenhum produto cadastrado na loja</p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Cadastre produtos no painel principal da loja para poder vinculá-los como anúncios nos artigos do blog.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Product Selection & Customization */}
                  <div className="lg:col-span-6 space-y-4">
                    {/* Search & Selector */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                        1. Selecione o Produto da Loja
                      </label>
                      <div className="relative mb-2">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Buscar por nome, plataforma ou categoria..."
                          className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-white"
                        />
                      </div>

                      <select
                        value={selectedProductId}
                        onChange={(e) => handleSelectProduct(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-white font-semibold text-neutral-800"
                      >
                        <option value="">-- Escolha um produto ({products.length} disponíveis) --</option>
                        {products
                          .filter((p) => {
                            if (!productSearch.trim()) return true;
                            const q = productSearch.toLowerCase();
                            return (
                              p.nome.toLowerCase().includes(q) ||
                              p.categoria.toLowerCase().includes(q) ||
                              (p.plataforma && p.plataforma.toLowerCase().includes(q))
                            );
                          })
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.plataforma || 'Loja'}] {p.nome} - R$ {(p.precoPromo || p.preco).toFixed(2).replace('.', ',')} ({p.categoria})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Quick Selection Grid */}
                    <div>
                      <span className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                        Sugestões rápidas de produtos:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-neutral-100 rounded-xl bg-neutral-50/50">
                        {products
                          .filter((p) => {
                            if (!productSearch.trim()) return true;
                            const q = productSearch.toLowerCase();
                            return (
                              p.nome.toLowerCase().includes(q) ||
                              p.categoria.toLowerCase().includes(q) ||
                              (p.plataforma && p.plataforma.toLowerCase().includes(q))
                            );
                          })
                          .slice(0, 12)
                          .map((p) => {
                            const isThisSelected = p.id === selectedProductId;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectProduct(p.id)}
                                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                                  isThisSelected
                                    ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-500/30'
                                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                                }`}
                              >
                                {p.img1 ? (
                                  <img
                                    src={normalizeImageUrl(p.img1)}
                                    alt={p.nome}
                                    className="w-10 h-10 object-cover rounded-md shrink-0 border border-neutral-100"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-neutral-100 rounded-md flex items-center justify-center shrink-0">
                                    <ShoppingBag className="w-4 h-4 text-neutral-400" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-neutral-900 truncate">{p.nome}</p>
                                  <p className="text-[10px] font-semibold text-emerald-700">
                                    R$ {(p.precoPromo || p.preco).toFixed(2).replace('.', ',')}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Selected Product Field Customizations */}
                    <div className="space-y-3 pt-2 border-t border-neutral-100">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Título em Destaque no Artigo
                        </label>
                        <input
                          type="text"
                          value={adTitle}
                          onChange={(e) => setAdTitle(e.target.value)}
                          placeholder="Ex: Fritadeira Sem Óleo Air Fryer 4L"
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold text-neutral-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            Selo / Badge
                          </label>
                          <input
                            type="text"
                            value={adBannerBadge}
                            onChange={(e) => setAdBannerBadge(e.target.value)}
                            placeholder="ACHADINHO EM DESTAQUE"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            Texto do Botão
                          </label>
                          <input
                            type="text"
                            value={adBannerBtn}
                            onChange={(e) => setAdBannerBtn(e.target.value)}
                            placeholder="Ver Oferta na Shopee →"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Link Direto do Anúncio (Afiliado)
                        </label>
                        <input
                          type="url"
                          value={adBannerLink}
                          onChange={(e) => setAdBannerLink(e.target.value)}
                          placeholder="https://..."
                          className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 text-neutral-800"
                        />
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Preenchido automaticamente com o link do produto selecionado. Ao clicar no anúncio no artigo, o leitor vai direto para este link.
                        </p>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={adNewTab}
                          onChange={(e) => setAdNewTab(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600"
                        />
                        <span className="text-xs text-neutral-700 font-medium">
                          Abrir link do produto em nova aba (recomendado)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Live Card Preview */}
                  <div className="lg:col-span-6 space-y-3">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      Pré-visualização do Anúncio nos Artigos de "{customCategoryMode ? (customCategoryInput || 'Nova Categoria') : selectedCategory}"
                    </label>

                    {selectedProductId ? (
                      (() => {
                        const prod = products.find((p) => p.id === selectedProductId);
                        const hasPromo = prod?.precoPromo && prod.precoPromo < prod.preco;
                        return (
                          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500/30 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              {/* Product Thumbnail */}
                              <div className="w-full sm:w-36 h-36 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200 relative group">
                                <img
                                  src={normalizeImageUrl(adBannerImg || prod?.img1 || '')}
                                  alt={adTitle || prod?.nome || 'Produto'}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                                  {adBannerBadge || prod?.plataforma || 'ACHADINHO'}
                                </span>
                              </div>

                              {/* Product Info */}
                              <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                  {prod?.plataforma ? `Disponível na ${prod.plataforma}` : 'Oferta da Loja'}
                                </span>
                                <h4 className="text-sm sm:text-base font-extrabold text-neutral-900 line-clamp-2 leading-snug">
                                  {adTitle || prod?.nome}
                                </h4>

                                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                                  {hasPromo ? (
                                    <>
                                      <span className="text-xs text-neutral-400 line-through">
                                        R$ {prod.preco.toFixed(2).replace('.', ',')}
                                      </span>
                                      <span className="text-base font-black text-emerald-700">
                                        R$ {prod.precoPromo!.toFixed(2).replace('.', ',')}
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                        -{Math.round(((prod.preco - prod.precoPromo!) / prod.preco) * 100)}%
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-base font-black text-emerald-700">
                                      R$ {(prod?.preco || 0).toFixed(2).replace('.', ',')}
                                    </span>
                                  )}
                                </div>

                                {prod?.cupom && (
                                  <div className="pt-1">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                                      <Tag className="w-3 h-3" />
                                      Cupom: {prod.cupom}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Direct link button */}
                            <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Link direto do anúncio configurado</span>
                              </span>

                              <div className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 shadow-sm flex items-center justify-center gap-2">
                                <span>{adBannerBtn || 'Ver Oferta na Loja →'}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                              <span className="font-bold">Destino do clique:</span>{' '}
                              <span className="font-mono break-all">{adBannerLink || prod?.linkAfiliado}</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-neutral-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50 text-neutral-400" />
                        <p className="text-xs font-bold text-neutral-600">Nenhum produto selecionado</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Escolha um produto na lista ao lado para ver a pré-visualização.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Save Action Bar inside Ad Form */}
              <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-600 font-medium">
                    Categoria atual:{' '}
                    <strong className="text-neutral-900 font-bold">
                      {customCategoryMode ? (customCategoryInput || 'Nova Categoria') : selectedCategory}
                    </strong>
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-xs font-semibold">
                    Status:{' '}
                    <strong className={adEnabled ? 'text-emerald-700 font-bold' : 'text-neutral-500'}>
                      {adEnabled ? 'Ativo' : 'Pausado'}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={saving || actionLoadingCat !== null}
                    onClick={handleSaveCurrentCategoryAd}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Salvando no Servidor...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar Anúncio desta Categoria</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* SECTION: RODAPÉ & LAYOUT DO BLOG */}
      {!hideHeroAndFooter && (activeSection === 'all' || activeSection === 'footer') && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Layout className="w-5 h-5 text-emerald-600" />
              Rodapé &amp; Layout do Blog
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Personalize elementos visuais adicionais do Blog, como a lista de categorias e os direitos autorais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCategoriesBar}
                    onChange={(e) => setShowCategoriesBar(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <Layers className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Exibir Barra com Pílulas de Categorias no Topo dos Artigos</span>
                </label>
                <p className="text-[11px] text-neutral-500 leading-relaxed pl-6">
                  Permite aos visitantes navegar rapidamente entre categorias clicando nas pílulas no topo da listagem de artigos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Texto de Copyright / Rodapé
                </label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Ex: © 2025 Achadinhos da Maria. Todos os direitos reservados."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Footer Preview */}
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Prévia do Rodapé
              </span>
              <div className="p-6 bg-neutral-900 text-neutral-400 rounded-xl text-center text-xs space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-bold text-white text-sm">{blogStoreName || 'Achadinhos da Maria'}</span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-neutral-300 text-xs">{blogTagline || 'Blog & Dicas'}</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {footerText || `© ${new Date().getFullYear()} ${blogStoreName || 'Achadinhos da Maria'}. Todos os direitos reservados.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: BANCO DE DADOS & ASSISTENTE MYSQL HOSTINGER */}
      {(activeSection === 'all' || activeSection === 'database') && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                Assistente de Banco de Dados MySQL (Hostinger)
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Todas as configurações e conteúdos do Blog são sincronizados automaticamente com o seu banco de dados MySQL na Hostinger.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
                  mysqlResult?.success !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    mysqlResult?.success !== false ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {mysqlResult?.success !== false ? 'MySQL Hostinger Ativo' : 'Aguardando Sincronização'}
                </span>
              </span>
            </div>
          </div>

          {/* Database Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Verificar e Criar Tabelas no MySQL
                </h4>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Verifica automaticamente a existência das 5 tabelas do Blog (<code className="text-neutral-800 font-mono text-[11px] bg-neutral-200/60 px-1 py-0.5 rounded">blog_posts</code>, <code className="text-neutral-800 font-mono text-[11px] bg-neutral-200/60 px-1 py-0.5 rounded">blog_categories</code>, <code className="text-neutral-800 font-mono text-[11px] bg-neutral-200/60 px-1 py-0.5 rounded">blog_editors</code>, <code className="text-neutral-800 font-mono text-[11px] bg-neutral-200/60 px-1 py-0.5 rounded">blog_settings</code> e <code className="text-neutral-800 font-mono text-[11px] bg-neutral-200/60 px-1 py-0.5 rounded">contact_messages</code>) e as cria caso ainda não existam.
              </p>

              <button
                type="button"
                onClick={handleEnsureBlogTables}
                disabled={checkingMySql}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {checkingMySql ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando e Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Sincronizar Tabelas do Blog no MySQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Script SQL para phpMyAdmin (Hostinger)
                </h4>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Precisa importar a estrutura diretamente no painel do phpMyAdmin da Hostinger? Abra o script completo pronto para colar e executar com 1 clique.
              </p>

              <button
                type="button"
                onClick={handleOpenSqlScriptModal}
                disabled={loadingSql}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-black active:scale-95 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {loadingSql ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Carregando SQL...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ver Script SQL Completo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MySQL Tables Overview Checklist */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Tabelas do Módulo Blog no Hostinger MySQL
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {[
                { name: 'blog_posts', label: 'Artigos do Blog', desc: 'Posts, slugs, SEO, capa' },
                { name: 'blog_categories', label: 'Categorias', desc: 'Ícones, cores, slugs' },
                { name: 'blog_editors', label: 'Redatores / Autores', desc: 'Bio, avatar, redes' },
                { name: 'blog_settings', label: 'Configurações', desc: 'Hero, anúncios, branding' },
                { name: 'contact_messages', label: 'Mensagens / SAC', desc: 'Fale conosco do Blog' }
              ].map((table) => (
                <div key={table.name} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <code className="font-mono text-[11px] text-emerald-800">{table.name}</code>
                  </div>
                  <p className="text-[11px] font-semibold text-neutral-700 mt-1">{table.label}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{table.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SQL SCRIPT MODAL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-emerald-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Script SQL para Hostinger phpMyAdmin
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Copie e cole na aba SQL do banco no phpMyAdmin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Como executar na Hostinger:</span>
                  <ol className="list-decimal list-inside mt-1 space-y-1 text-[11px] text-amber-800">
                    <li>Acesse o hPanel da Hostinger &gt; <strong>Bancos de Dados MySQL</strong> &gt; <strong>Entrar no phpMyAdmin</strong>.</li>
                    <li>Clique no nome do seu banco de dados no menu à esquerda.</li>
                    <li>Clique na aba superior <strong>SQL</strong>, cole o código abaixo e clique em <strong>Executar (Go)</strong>.</li>
                  </ol>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-neutral-950 text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-x-auto max-h-80 select-all leading-relaxed">
                  {sqlScript || 'Carregando script SQL...'}
                </pre>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition backdrop-blur-md"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">
                Contém DDL para todas as tabelas do blog com ENGINE=InnoDB utf8mb4
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? 'Copiado para Área de Transferência!' : 'Copiar Todo o Script'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-bold rounded-xl transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button Bar */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Todas as Configurações</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
