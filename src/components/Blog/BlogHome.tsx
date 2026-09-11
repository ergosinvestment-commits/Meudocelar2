import React, { useState, useEffect } from 'react';
import { BlogPost, StoreConfig, Product, BlogSettings, BlogCategory } from '../../types';
import { fetchPublicBlogPosts, fetchStoreProducts, fetchPublicBlogSettings, fetchPublicBlogCategories, getCachedData } from '../../api/client';
import { normalizeImageUrl } from '../../utils';
import {
  Search,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  ArrowRight,
  Sparkles,
  Tag,
  Store,
  ChevronRight,
  ChevronDown,
  Menu,
  TrendingUp,
  Share2,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  ImageIcon,
  Send
} from 'lucide-react';
import { getSocialLinks } from '../../utils/social';

interface BlogHomeProps {
  storeSlug: string;
  config: StoreConfig | null;
  blogSettings?: BlogSettings | null;
  onSelectPost: (post: BlogPost) => void;
  onNavigateToStore: (category?: string) => void;
  onNavigateToInstitutional: (tab?: string) => void;
  onNavigateToContact: () => void;
  maxMenuCategories?: number;
}

export default function BlogHome({
  storeSlug,
  config,
  blogSettings: initialBlogSettings,
  onSelectPost,
  onNavigateToStore,
  onNavigateToInstitutional,
  onNavigateToContact
}: BlogHomeProps) {
  const cachedPosts = getCachedData<BlogPost[]>(`public_blog_posts_${storeSlug}`);
  const cachedProds = getCachedData<Product[]>(`store_products_${storeSlug}`);
  const cachedCats = getCachedData<BlogCategory[]>(`public_blog_categories_${storeSlug}`);

  const [posts, setPosts] = useState<BlogPost[]>(() => cachedPosts || []);
  const [products, setProducts] = useState<Product[]>(() => cachedProds || []);
  const [blogSettings, setBlogSettings] = useState<BlogSettings | null>(initialBlogSettings || null);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>(() => cachedCats || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedPosts || cachedPosts.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const categoriasRef = React.useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoriasRef.current && !categoriasRef.current.contains(e.target as Node)) {
        setCategoriasOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const social = getSocialLinks(config);
  const primaryColor = blogSettings?.blogPrimaryColor || config?.corPrimaria || '#2A5C3F';
  const storeName = blogSettings?.blogStoreName || config?.storeName || 'Meu Doce Lar';

  useEffect(() => {
    if (initialBlogSettings) {
      setBlogSettings(initialBlogSettings);
    }
  }, [initialBlogSettings]);

  useEffect(() => {
    function handleBlogSettingsUpdated(e: any) {
      if (e?.detail) {
        setBlogSettings(e.detail);
      } else {
        fetchPublicBlogSettings(storeSlug).then(res => {
          if (res) setBlogSettings(res);
        }).catch(() => null);
      }
    }
    function handlePostUpdated(e: any) {
      const updatedPost = e?.detail as BlogPost;
      if (updatedPost) {
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
      }
    }
    function handleCatsUpdated(e: any) {
      fetchPublicBlogCategories(storeSlug).then(cats => {
        if (cats) setBlogCategories(cats);
      }).catch(() => {});
    }
    window.addEventListener('blog-settings-updated', handleBlogSettingsUpdated as EventListener);
    window.addEventListener('blog-post-updated', handlePostUpdated as EventListener);
    window.addEventListener('blog-posts-updated', handlePostUpdated as EventListener);
    window.addEventListener('blog-categories-updated', handleCatsUpdated as EventListener);
    return () => {
      window.removeEventListener('blog-settings-updated', handleBlogSettingsUpdated as EventListener);
      window.removeEventListener('blog-post-updated', handlePostUpdated as EventListener);
      window.removeEventListener('blog-posts-updated', handlePostUpdated as EventListener);
      window.removeEventListener('blog-categories-updated', handleCatsUpdated as EventListener);
    };
  }, [storeSlug]);

  useEffect(() => {
    async function loadData() {
      try {
        if (!cachedPosts || cachedPosts.length === 0) {
          setLoading(true);
        }
        const [postsRes, prodsRes, settingsRes, catsRes] = await Promise.all([
          fetchPublicBlogPosts(storeSlug),
          fetchStoreProducts(storeSlug).catch(() => []),
          fetchPublicBlogSettings(storeSlug).catch(() => null),
          fetchPublicBlogCategories(storeSlug).catch(() => [])
        ]);
        if (postsRes) setPosts(postsRes);
        if (prodsRes) setProducts(prodsRes);
        if (settingsRes) setBlogSettings(settingsRes);
        if (catsRes) setBlogCategories(catsRes);
      } catch (err) {
        console.error('Error loading blog home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [storeSlug]);

  // Extract unique categories combining configured categories and posts
  const configuredCatNames = blogCategories.filter(c => c.active !== false).map(c => c.name);
  const postCatNames = posts.map(p => p.category).filter(Boolean);
  const categories = ['Todos', ...Array.from(new Set([...configuredCatNames, ...postCatNames]))];
  
  // Categories limited for top menu (max 5)
  const topMenuCatNames = blogCategories
    .filter(c => c.mostrarNoMenu !== false && (c as any).mostrarNoMenu !== 0 && (c as any).mostrarNoMenu !== '0' && (c as any).mostrarNoMenu !== 'false')
    .sort((a, b) => (b.order || 1) - (a.order || 1))
    .slice(0, 5)
    .map(c => c.name);

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesCat = activeCategory === 'Todos' || post.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags && post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  // Featured post for Hero section
  const featuredPost = posts.find(p => p.destaque) || posts[0];
  const regularPosts = featuredPost
    ? filteredPosts.filter(p => p.id !== featuredPost.id)
    : filteredPosts;

  // Curated products for the sidebar
  const featuredProducts = products.slice(0, 4);

  // Hero Image calculation
  const heroBgImage = blogSettings?.heroBackgroundImage;
  const overlayOpacity = typeof blogSettings?.heroOverlayOpacity === 'number' 
    ? blogSettings.heroOverlayOpacity / 100 
    : 0.65;

  const heroTitle = blogSettings?.heroTitle || 'Dicas, Achadinhos & Soluções para seu Lar';
  const heroSubtitle = blogSettings?.heroSubtitle || 'Artigos práticos com testes reais, truques de organização e seleções dos melhores produtos para transformar sua rotina com economia.';

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1B1B1B] font-['DM_Sans',sans-serif]">
      {/* Blog Hero Header with optional custom background image */}
      <section className="relative text-white overflow-hidden py-14 md:py-20 px-4 md:px-6 bg-neutral-950">
        {/* Background Image if configured */}
        {heroBgImage && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={normalizeImageUrl(heroBgImage)}
              alt="Hero Background"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transform scale-105"
            />
            {/* Dynamic darkness overlay */}
            <div
              className="absolute inset-0 bg-black transition-opacity"
              style={{ opacity: overlayOpacity }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/40" />
          </div>
        )}

        {/* Fallback subtle background glow if no hero image */}
        {!heroBgImage && (
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ backgroundColor: primaryColor }}
          />
        )}

        <div className="max-w-[1300px] mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-white border border-white/20 mb-3.5 shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>{blogSettings?.heroBadge || 'Blog & Guias Práticos'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] drop-shadow-md">
                {heroTitle}
              </h1>
              <p className="text-sm md:text-base text-neutral-200 mt-3 max-w-2xl leading-relaxed drop-shadow-xs">
                {heroSubtitle}
              </p>
            </div>

            {/* Quick action button to Store */}
            {blogSettings?.heroShowCta !== false && (
              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={() => {
                    const target = blogSettings?.heroCtaTarget || 'store';
                    if (target === 'store') {
                      onNavigateToStore();
                    } else if (target === '#artigos' || target.startsWith('#')) {
                      const el = document.getElementById('articles-section') || (target.startsWith('#') ? document.querySelector(target) : null);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        window.scrollTo({ top: 500, behavior: 'smooth' });
                      }
                    } else if (target.startsWith('http')) {
                      window.open(target, '_blank');
                    } else {
                      onNavigateToStore();
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold bg-white text-neutral-900 hover:bg-neutral-100 transition shadow-xl hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <Store className="w-4 h-4" style={{ color: primaryColor }} />
                  <span>{blogSettings?.heroCtaText || 'Explorar Vitrine de Ofertas'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Search bar inside Hero */}
          {blogSettings?.heroShowSearch !== false && (
            <div className="mt-6 max-w-xl">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-300 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={blogSettings?.heroSearchPlaceholder || 'Buscar artigos por tema (ex: Air Fryer, Cozinha, Organização)...'}
                  className="w-full pl-11 pr-4 py-3 bg-neutral-900/80 backdrop-blur-md text-white placeholder-neutral-300 text-xs md:text-sm rounded-xl border border-white/20 focus:border-white focus:outline-none transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-xs text-neutral-300 hover:text-white px-2 py-1 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main id="articles-section" className="max-w-[1300px] mx-auto px-4 md:px-6 py-10 md:py-14 scroll-mt-6">
        {/* Category Navigation Bar with Categorias Dropdown */}
        {blogSettings?.showCategoriesBar !== false && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-8">
            {/* Categorias Dropdown Button */}
            <div className="relative shrink-0" ref={categoriasRef}>
              <button
                type="button"
                onClick={() => setCategoriasOpen(!categoriasOpen)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-bold uppercase whitespace-nowrap rounded-xl transition cursor-pointer shadow-xs ${
                  categoriasOpen || activeCategory !== 'Todos'
                    ? 'text-white'
                    : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/80'
                }`}
                style={
                  categoriasOpen || activeCategory !== 'Todos'
                    ? { backgroundColor: primaryColor, color: '#ffffff' }
                    : {}
                }
              >
                <Menu className="w-4 h-4 stroke-[2.5]" />
                <span>Categorias</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${categoriasOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {categoriasOpen && (
                <div className="absolute left-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-80 max-w-[340px] bg-white rounded-2xl shadow-2xl border border-neutral-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory('Todos');
                        setCategoriasOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-xs sm:text-sm font-bold uppercase transition text-left cursor-pointer ${
                        activeCategory === 'Todos' ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-neutral-50 text-neutral-800'
                      }`}
                    >
                      <span>Todas as Categorias</span>
                      <span className="text-[10px] font-normal text-neutral-400">({posts.length})</span>
                    </button>
                    {blogCategories
                      .filter(c => {
                        const val = c.active ?? (c as any).ativo;
                        return val !== false && val !== 0 && val !== '0' && val !== 'false';
                      })
                      .map((cat) => {
                        const isSelected = activeCategory === cat.name;
                        const inTopMenu = cat.mostrarNoMenu !== false && (cat as any).mostrarNoMenu !== 0 && (cat as any).mostrarNoMenu !== '0' && (cat as any).mostrarNoMenu !== 'false';
                        return (
                          <button
                            key={cat.id || cat.name}
                            type="button"
                            onClick={() => {
                              setActiveCategory(cat.name);
                              setCategoriasOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-xs sm:text-sm font-bold uppercase transition text-left cursor-pointer ${
                              isSelected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-neutral-50 text-neutral-800'
                            }`}
                            style={isSelected ? { color: primaryColor } : {}}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="text-base">{cat.icon || '📑'}</span>
                              <span className="truncate">{cat.name}</span>
                            </div>
                            {!inTopMenu && (
                              <span className="text-[9px] font-semibold bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded tracking-normal">Apenas em Categorias</span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* 'Todos' Button */}
            <button
              onClick={() => setActiveCategory('Todos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeCategory === 'Todos'
                  ? 'text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50'
              }`}
              style={{
                backgroundColor: activeCategory === 'Todos' ? primaryColor : undefined
              }}
            >
              Todos
            </button>

            {/* Top Bar Categories (mostrarNoMenu !== false) */}
            {topMenuCatNames
              .map((categoryName) => blogCategories.find(cat => cat.name === categoryName))
              .filter((cat): cat is BlogCategory => Boolean(cat))
              .map((cat) => (
                <button
                  key={cat.id || cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeCategory === cat.name
                      ? 'text-white shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50'
                  }`}
                  style={{
                    backgroundColor: activeCategory === cat.name ? primaryColor : undefined
                  }}
                >
                  <span>{cat.icon || '📑'}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
          </div>
        )}

        {/* Featured Post Card (Hero Highlight) */}
        {!searchQuery && activeCategory === 'Todos' && featuredPost && (
          <div className="mb-12">
            <div
              onClick={() => onSelectPost(featuredPost)}
              className="group bg-white rounded-3xl border border-neutral-200/90 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 cursor-pointer"
            >
              {/* Cover Image */}
              <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto overflow-hidden bg-neutral-100">
                <img
                  src={normalizeImageUrl(featuredPost.coverImage)}
                  alt={featuredPost.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80&fm=webp';
                  }}
                />
                <div className="absolute top-4 left-4 bg-amber-500 text-neutral-950 px-3 py-1.5 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Destaque Principal</span>
                </div>
              </div>

              {/* Content Box */}
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-neutral-500 mb-3">
                    <span
                      className="px-2.5 py-1 rounded-lg text-white font-bold text-[11px]"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {featuredPost.readTime || '4 min'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight leading-snug group-hover:text-[#2A5C3F] transition">
                    {featuredPost.title}
                  </h2>

                  <p className="text-sm text-neutral-600 mt-3 line-clamp-3 leading-relaxed">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {featuredPost.authorAvatar ? (
                      <img
                        src={normalizeImageUrl(featuredPost.authorAvatar)}
                        alt={featuredPost.author || 'Autor'}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-neutral-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700">
                        {(featuredPost.author || 'A').charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-neutral-800">
                      {featuredPost.author || storeName}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2A5C3F] group-hover:translate-x-1 transition-transform">
                    <span>Ler Artigo</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layout: Articles Grid + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Articles List (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80">
              <h2 className="text-lg md:text-xl font-extrabold text-neutral-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-neutral-700" />
                <span>
                  {searchQuery
                    ? `Resultados para "${searchQuery}"`
                    : activeCategory === 'Todos'
                    ? 'Artigos Mais Recentes'
                    : `Artigos em ${activeCategory}`}
                </span>
              </h2>
              <span className="text-xs font-bold text-neutral-400">
                {regularPosts.length} artigo{regularPosts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="py-20 text-center text-neutral-400">
                <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold">Carregando artigos...</p>
              </div>
            ) : regularPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
                <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-neutral-800">Nenhum artigo encontrado</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  Tente buscar por outras palavras-chave ou selecione outra categoria acima.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('Todos');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition cursor-pointer"
                >
                  Ver todos os artigos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regularPosts.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => onSelectPost(post)}
                    className="group bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-48 sm:h-52 overflow-hidden bg-neutral-100">
                      <img
                        src={normalizeImageUrl(post.coverImage)}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80&fm=webp';
                        }}
                      />
                      <span className="absolute top-3 left-3 bg-neutral-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        {post.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-medium mb-2">
                          <Clock className="w-3 h-3" />
                          <span>{post.readTime || '3 min'}</span>
                          <span>•</span>
                          <Eye className="w-3 h-3" />
                          <span>{post.views || 0} leituras</span>
                        </div>

                        <h3 className="font-bold text-base text-neutral-900 group-hover:text-[#2A5C3F] transition line-clamp-2 leading-snug">
                          {post.title}
                        </h3>

                        <p className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-700 truncate max-w-[140px]">
                          {post.author || storeName}
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2A5C3F] group-hover:translate-x-1 transition-transform">
                          <span>Ler</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Area (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Ofertas Widget Box (Links directly to Store) */}
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-600" />
                  <h3 className="font-bold text-sm text-neutral-900">
                    Ofertas em Destaque
                  </h3>
                </div>
                <button
                  onClick={() => onNavigateToStore()}
                  className="text-xs font-bold text-[#2A5C3F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver loja</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {featuredProducts.length > 0 ? (
                <div className="space-y-3">
                  {featuredProducts.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => onNavigateToStore()}
                      className="group/item flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                        <img
                          src={normalizeImageUrl(prod.img1)}
                          alt={prod.nome}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/item:scale-105 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80&fm=webp';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block truncate">
                          {prod.plataforma} • {prod.categoria}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-800 truncate group-hover/item:text-[#2A5C3F] transition">
                          {prod.nome}
                        </h4>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xs font-extrabold text-neutral-900">
                            R$ {(prod.precoPromo || prod.preco).toFixed(2).replace('.', ',')}
                          </span>
                          {prod.precoPromo && (
                            <span className="text-[10px] text-neutral-400 line-through">
                              R$ {prod.preco.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 py-2 text-center">Nenhum produto cadastrado.</p>
              )}

              <button
                onClick={() => onNavigateToStore()}
                className="w-full mt-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-98 shadow-xs cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Explorar Todos os Produtos</span>
              </button>
            </div>

            {/* Institutional Quick Links Card */}
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200/80 p-5 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                Sobre a Plataforma
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Nossa equipe analisa e valida cada produto e oferta antes de publicar, garantindo links oficiais de lojas seguras como Amazon, Shopee e Mercado Livre.
              </p>
              <div className="pt-2 flex flex-col gap-1.5 text-xs font-bold text-neutral-700">
                <button
                  onClick={() => onNavigateToInstitutional('sobre')}
                  className="text-left hover:text-neutral-950 transition flex items-center justify-between py-1 cursor-pointer"
                >
                  <span>• Quem Somos &amp; Curadoria</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
                <button
                  onClick={() => onNavigateToInstitutional('afiliados')}
                  className="text-left hover:text-neutral-950 transition flex items-center justify-between py-1 cursor-pointer"
                >
                  <span>• Declaração de Transparência</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
                <button
                  onClick={() => onNavigateToContact()}
                  className="text-left hover:text-neutral-950 transition flex items-center justify-between py-1 cursor-pointer"
                >
                  <span>• Fale com nossa Equipe</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 border-t border-neutral-800 py-10 px-4 md:px-6">
        <div className="max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <span className="text-white font-extrabold text-base tracking-tight block mb-2">
              {storeName}
            </span>
            <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
              Portal de conteúdo e curadoria de achadinhos. Todos os preços, promoções e cupons são verificados junto aos maiores e-commerces do Brasil.
            </p>

            {/* Social Links if configured */}
            {social.hasAny && (
              <div className="flex items-center gap-2.5 mt-4">
                {social.whatsapp && (
                  <a
                    href={social.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-[#25D366] text-neutral-300 hover:text-white flex items-center justify-center transition"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                {social.telegram && (
                  <a
                    href={social.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-[#229ED9] text-neutral-300 hover:text-white flex items-center justify-center transition"
                    title="Telegram"
                  >
                    <Send className="w-4 h-4" />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-[#E1306C] text-neutral-300 hover:text-white flex items-center justify-center transition"
                    title="Instagram"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                )}
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-[#1877F2] text-neutral-300 hover:text-white flex items-center justify-center transition"
                    title="Facebook"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
                {social.tiktok && (
                  <a
                    href={social.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-[#000000] text-neutral-300 hover:text-white flex items-center justify-center transition"
                    title="TikTok"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {config?.textoDisclosure?.trim() && (
              <p className="text-[11px] text-neutral-500 mt-3 max-w-md italic">
                {config.textoDisclosure}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition cursor-pointer">
                  Início (Blog)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToStore()} className="hover:text-white transition cursor-pointer">
                  Loja &amp; Vitrine de Ofertas
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToInstitutional('sobre')} className="hover:text-white transition cursor-pointer">
                  Quem Somos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToContact()} className="hover:text-white transition cursor-pointer">
                  Contato &amp; Suporte
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Termos &amp; Segurança
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigateToInstitutional('termos')} className="hover:text-white transition cursor-pointer">
                  Termos de Uso
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToInstitutional('privacidade')} className="hover:text-white transition cursor-pointer">
                  Política de Privacidade &amp; LGPD
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToInstitutional('afiliados')} className="hover:text-white transition cursor-pointer">
                  Aviso Legal de Afiliados
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1300px] mx-auto mt-8 pt-6 border-t border-neutral-800/80 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>{blogSettings?.footerText || `© ${new Date().getFullYear()} ${storeName}. Todos os direitos reservados.`}</span>
          {config?.cnpj?.trim() && <span>CNPJ: {config.cnpj}</span>}
        </div>
      </footer>
    </div>
  );
}
