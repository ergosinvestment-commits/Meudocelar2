import React, { useState, useEffect, useRef } from 'react';
import { StoreConfig, Product, Category, Platform } from '../types';
import { fetchStoreConfig, fetchStoreProducts, fetchStoreCategories, fetchStorePlatforms, recordProductClick, recordStoreView } from '../api/client';
import { Search, X, MessageCircle, Send, ExternalLink, Share2, ArrowUp, Check, Copy, ChevronDown, ChevronRight, Menu, Plus, Minus, LayoutGrid, Layers, Tag, Home, Globe, Lock, Image as ImageIcon, BookOpen } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { normalizeImageUrl, getProxiedImageUrl } from '../utils';
import { getSocialLinks } from '../utils/social';

interface StoreFrontProps {
  storeSlug: string;
  onOpenDashboard?: () => void;
  onNavigateToBlog?: () => void;
}

export default function StoreFront({ storeSlug, onOpenDashboard, onNavigateToBlog }: StoreFrontProps) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [departamentosOpen, setDepartamentosOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [expandedMobileCats, setExpandedMobileCats] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState<number>(24);
  const departamentosRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeModalImg, setActiveModalImg] = useState<string>('');
  const [couponCopied, setCouponCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Back to top & Toast
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close Departamentos dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (departamentosRef.current && !departamentosRef.current.contains(e.target as Node)) {
        setDepartamentosOpen(false);
        setHoveredCategory(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDepartamentosOpen(false);
        setHoveredCategory(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [storeCfg, storeProds, storeCats, storePlats] = await Promise.all([
          fetchStoreConfig(storeSlug),
          fetchStoreProducts(storeSlug),
          fetchStoreCategories(storeSlug).catch(() => []),
          fetchStorePlatforms(storeSlug).catch(() => [])
        ]);
        setConfig(storeCfg);
        setProducts(storeProds);
        setCategories(storeCats);
        setPlatforms(storePlats);
        recordStoreView(storeSlug);

        // Check if there is a ?produto=slug in the URL to open product modal automatically
        const urlParams = new URLSearchParams(window.location.search);
        const prodParam = urlParams.get('produto');
        const catParam = urlParams.get('categoria') || urlParams.get('departamento');
        const subParam = urlParams.get('subcategoria');

        if (catParam) {
          const matched = storeCats.find(c => toSlug(c.nome) === toSlug(catParam) || c.nome.toLowerCase() === catParam.toLowerCase());
          if (matched) {
            setActiveCategory(matched.nome);
          } else {
            const prodCat = storeProds.find(p => toSlug(p.categoria) === toSlug(catParam));
            if (prodCat) setActiveCategory(prodCat.categoria);
          }
        }
        if (subParam) {
          setActiveSubcategory(subParam);
        }

        if (prodParam) {
          const found = storeProds.find(p => toSlug(p.nome) === prodParam);
          if (found) {
            setTimeout(() => openModal(found), 200);
          }
        }
      } catch (err: any) {
        console.error('Failed to load store:', err);
        setError(err?.message || 'Erro ao carregar dados da loja');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [storeSlug]);

  // Scroll listener for back to top
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update dynamic CSS variables based on store primary color
  useEffect(() => {
    if (!config?.corPrimaria) return;
    const hex = config.corPrimaria.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) || 42;
    const g = parseInt(hex.substr(2, 2), 16) || 92;
    const b = parseInt(hex.substr(4, 2), 16) || 63;

    document.documentElement.style.setProperty('--primary', config.corPrimaria);
    document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty('--primary-light', `rgba(${r}, ${g}, ${b}, 0.08)`);
    document.documentElement.style.setProperty('--primary-hover', `rgb(${Math.max(0, r - 25)}, ${Math.max(0, g - 25)}, ${Math.max(0, b - 25)})`);
  }, [config?.corPrimaria]);

  // Reset pagination when category, subcategory or search query changes
  useEffect(() => {
    setVisibleCount(24);
  }, [activeCategory, activeSubcategory, searchQuery]);

  function toSlug(text: string) {
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatPrice(val: number | null | undefined): string {
    if (!val || isNaN(val)) return '0,00';
    return val.toFixed(2).replace('.', ',');
  }

  function optimizeImage(url: string | undefined, width = 450): string {
    if (!url) return '';
    const clean = normalizeImageUrl(url);
    if (clean.startsWith('data:image/')) return clean;
    if (clean.includes('images.unsplash.com')) {
      const baseUrl = clean.split('?')[0];
      return `${baseUrl}?w=${width}&auto=format&fit=crop&q=80&fm=webp`;
    }
    return clean;
  }

  function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl?: string) {
    const target = e.currentTarget;
    if (!target.dataset.triedProxy && originalUrl && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
      target.dataset.triedProxy = 'true';
      target.src = getProxiedImageUrl(originalUrl);
      return;
    }
    target.onerror = null;
    target.style.opacity = '0.3';
  }

  // Category helper lists
  const allCategoriesList: Category[] = React.useMemo(() => {
    return [...categories].sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
  }, [categories]);

  // Categories selected to appear directly on the main horizontal navigation bar
  const menuCategories = React.useMemo(() => {
    return allCategoriesList.filter(c => {
      if ((c as any).mostrarNoMenu !== undefined && (c as any).mostrarNoMenu !== null) {
        return Boolean((c as any).mostrarNoMenu);
      }
      if ((c as any).exibirNoMenu !== undefined && (c as any).exibirNoMenu !== null) {
        return Boolean((c as any).exibirNoMenu);
      }
      return true;
    });
  }, [allCategoriesList]);

  function getSubcategories(catName: string): string[] {
    const catObj = allCategoriesList.find(c => c.nome.trim().toLowerCase() === catName.trim().toLowerCase());
    if (catObj && Array.isArray(catObj.subcategorias)) {
      return catObj.subcategorias.filter(s => typeof s === 'string' && s.trim().length > 0);
    }
    return [];
  }

  function handleSelectCategory(cat: string, sub?: string) {
    setActiveCategory(cat);
    setActiveSubcategory(sub || null);
    setDepartamentosOpen(false);
    setHoveredCategory(null);
    setSearchQuery('');

    // Update URL query parameters cleanly
    try {
      const url = new URL(window.location.href);
      if (cat === 'Todos') {
        url.searchParams.delete('categoria');
        url.searchParams.delete('departamento');
        url.searchParams.delete('subcategoria');
      } else {
        url.searchParams.set('categoria', toSlug(cat));
        if (sub) {
          url.searchParams.set('subcategoria', sub);
        } else {
          url.searchParams.delete('subcategoria');
        }
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // ignore
    }

    // Scroll smoothly to products area
    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  function handleCopyCategoryLink(catName: string) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('categoria', toSlug(catName));
      url.searchParams.delete('subcategoria');
      navigator.clipboard.writeText(url.toString());
      showToastNotification(`Link da página "${catName}" copiado!`);
    } catch (e) {
      showToastNotification('Link copiado!');
    }
  }

  function handleBannerClick(link: string) {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank');
      return;
    }
    // Category or Subcategory link
    if (link.includes('>')) {
      const [c, s] = link.split('>').map(p => p.trim());
      setActiveCategory(c);
      setActiveSubcategory(s);
    } else {
      setActiveCategory(link.trim());
      setActiveSubcategory(null);
    }
  }

  function openModal(prod: Product) {
    setSelectedProduct(prod);
    const validImages = [prod.img1, prod.img2, prod.img3, prod.img4]
      .filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
    setActiveModalImg(validImages[0] || prod.img1 || '');
    setCouponCopied(false);
    setLinkCopied(false);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    setSelectedProduct(null);
    document.body.style.overflow = '';
  }

  function handleCtaClick(prod: Product) {
    recordProductClick(storeSlug, prod, 'Vitrine Modal CTA');
    if (prod.linkAfiliado) {
      window.open(prod.linkAfiliado, '_blank');
    }
  }

  function handleCopyCoupon(code: string) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCouponCopied(true);
    showToastNotification(`Cupom "${code}" copiado!`);
    setTimeout(() => setCouponCopied(false), 2500);
  }

  function handleCopyProductLink(prod: Product) {
    const slug = toSlug(prod.nome);
    const url = `${window.location.origin}${window.location.pathname}?produto=${slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    showToastNotification('Link do achadinho copiado para a área de transferência!');
    setTimeout(() => setLinkCopied(false), 2500);
  }

  function showToastNotification(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }

  function getYouTubeEmbedUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    if (!p.ativo) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.nome.toLowerCase().includes(q);
      const matchDesc = (p.descricao || '').toLowerCase().includes(q);
      const matchCat = (p.categoria || '').toLowerCase().includes(q);
      const matchSub = (p.subcategoria || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat && !matchSub) return false;
    }
    if (activeCategory !== 'Todos' && (p.categoria || '').trim().toLowerCase() !== activeCategory.trim().toLowerCase()) return false;
    if (activeSubcategory && (p.subcategoria || '').trim().toLowerCase() !== activeSubcategory.trim().toLowerCase()) return false;
    return true;
  }).sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

  // Chunked visible products for 60fps mobile scrolling and instant FCP
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  // Progressive infinite scroll loading via IntersectionObserver for smooth 60fps mobile scrolling
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 24);
      }
    }, { rootMargin: '350px' });

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filteredProducts.length]);

  // Featured products
  const featuredProducts = products.filter(p => p.ativo && p.destaque)
    .sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

  // Fast Instant Skeleton Loading (Zero Layout Shift)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] animate-pulse">
        {/* Header Skeleton */}
        <header className="bg-white border-b border-neutral-200 h-[64px] px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neutral-200 rounded-xl" />
            <div className="w-32 h-5 bg-neutral-200 rounded-md" />
          </div>
          <div className="hidden sm:block w-72 h-9 bg-neutral-100 rounded-full" />
          <div className="w-24 h-8 bg-neutral-200 rounded-full" />
        </header>

        {/* Categories Bar Skeleton */}
        <div className="bg-white border-b border-neutral-200 px-4 md:px-6 py-2.5 flex items-center gap-2 overflow-hidden">
          <div className="w-28 h-8 bg-neutral-200 rounded-xl" />
          <div className="w-20 h-8 bg-neutral-100 rounded-xl" />
          <div className="w-24 h-8 bg-neutral-100 rounded-xl" />
          <div className="w-20 h-8 bg-neutral-100 rounded-xl" />
        </div>

        {/* Banner Skeleton */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 mt-4">
          <div className="w-full h-36 sm:h-52 bg-neutral-200 rounded-2xl" />
        </div>

        {/* Product Cards Skeleton Grid */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8">
          <div className="w-48 h-6 bg-neutral-200 rounded-md mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-neutral-200 p-3 space-y-3">
                <div className="aspect-square w-full bg-neutral-100 rounded-xl" />
                <div className="w-16 h-3 bg-neutral-100 rounded" />
                <div className="w-full h-4 bg-neutral-200 rounded" />
                <div className="w-24 h-5 bg-neutral-200 rounded" />
                <div className="w-full h-8 bg-neutral-100 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Maintenance Screen
  if (config && config.lojaAtiva === false) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#E0DED9] shadow-sm">
          <div className="w-16 h-16 bg-[#2A5C3F]/10 rounded-full flex items-center justify-center mx-auto mb-5 text-[#2A5C3F]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1B1B1B] mb-2">{config.storeName || 'Nossa Loja'}</h1>
          <p className="text-sm text-[#6B6760] leading-relaxed mb-6">
            {config.msgManutencao || 'Estamos atualizando nosso catálogo de promoções. Volte em breve!'}
          </p>
          {config.canalWhatsapp?.trim() && (
            <a
              href={config.canalWhatsapp.trim().startsWith('http') ? config.canalWhatsapp.trim() : `https://${config.canalWhatsapp.trim()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-semibold text-sm transition shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Entrar no Canal de Ofertas
            </a>
          )}
          {onOpenDashboard && (
            <div className="mt-6 pt-6 border-t border-neutral-100">
              <button
                onClick={onOpenDashboard}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline"
              >
                Acessar Painel de Controle
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#E0DED9] shadow-sm">
          <h2 className="text-lg font-bold text-[#1B1B1B] mb-2">Carregando catálogo de produtos...</h2>
          <p className="text-sm text-[#6B6760] mb-6">Estamos conectando ao catálogo de promoções.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2A5C3F] text-white text-sm font-semibold rounded-lg hover:bg-[#234e35] transition"
            >
              Recarregar Página
            </button>
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-semibold rounded-lg hover:bg-neutral-50 transition"
              >
                Painel Admin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const social = getSocialLinks(config);
  const primaryColor = config.corPrimaria || '#2A5C3F';
  const bannerImages = [selectedProduct?.img1, selectedProduct?.img2, selectedProduct?.img3, selectedProduct?.img4].filter(Boolean) as string[];
  const hasPromo = selectedProduct && selectedProduct.precoPromo && selectedProduct.precoPromo > 0 && selectedProduct.preco > 0 && selectedProduct.precoPromo < selectedProduct.preco;
  const channelUrl = social.whatsapp || social.telegram || '';
  const isTelegram = !social.whatsapp && Boolean(social.telegram);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B1B1B] selection:bg-[#2A5C3F]/20 font-['DM_Sans',sans-serif] flex flex-col justify-between">
      {/* Top Announcement Bar */}
      {config.mensagemTopo?.trim() && (
        <div
          className="px-4 py-2 text-center text-xs md:text-sm font-medium tracking-wide text-white transition-all shadow-inner"
          style={{ backgroundColor: config.corBarraTopo || primaryColor }}
        >
          {config.mensagemTopo}
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-[#E0DED9] sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-[64px] md:h-[68px] flex items-center justify-between gap-3 md:gap-4">
          {/* Logo & Store Name */}
          <div
            onClick={() => { setActiveCategory('Todos'); setActiveSubcategory(null); setSearchQuery(''); }}
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 min-w-0"
          >
            {config.logo ? (
              <img
                src={config.logo}
                alt={config.storeName}
                referrerPolicy="no-referrer"
                className="max-h-[38px] md:max-h-[44px] max-w-[140px] md:max-w-[160px] object-contain rounded-md"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
              />
            ) : null}
            <span className="font-bold text-base md:text-lg text-[#1B1B1B] tracking-tight truncate max-w-[160px] sm:max-w-[240px]">
              {config.storeName || 'Meudocelar'}
            </span>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden sm:block flex-1 max-w-[420px] relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A49C]" />
            <input
              type="text"
              placeholder="Buscar produtos e ofertas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-[#F7F7F5] focus:bg-white border border-[#E0DED9] focus:border-[#2A5C3F] rounded-full text-sm text-[#1B1B1B] placeholder:text-[#A8A49C] outline-none transition shadow-xs focus:ring-3 focus:ring-[#2A5C3F]/15"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#E0DED9] text-[#6B6760] flex items-center justify-center text-[10px] hover:bg-[#C8C5BE]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2 text-[#4A4740] hover:text-[#1B1B1B] rounded-lg hover:bg-neutral-100 transition cursor-pointer"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* WhatsApp / Telegram Channel Button */}
            {channelUrl && (
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs md:text-sm font-semibold text-white transition shadow-xs ${
                  isTelegram ? 'bg-[#229ED9] hover:bg-[#1e8cc0]' : 'bg-[#25D366] hover:bg-[#20bd5a]'
                }`}
              >
                {isTelegram ? <Send className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                <span>Canal de Ofertas</span>
              </a>
            )}

            {/* Ver o Blog Button */}
            {onNavigateToBlog && (
              <button
                id="btn-store-to-blog"
                onClick={onNavigateToBlog}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs md:text-sm font-bold text-white transition shadow-xs hover:opacity-90 active:scale-98 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
                title="Acessar o Blog de Dicas & Artigos"
              >
                <BookOpen className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
                <span>Ver o Blog</span>
              </button>
            )}

            {/* Admin Switcher Button */}
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs cursor-pointer"
                title="Abrir Painel Administrativo"
              >
                <span className="hidden sm:inline">Painel</span> ⚙️
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {mobileSearchOpen && (
          <div className="sm:hidden px-4 py-2.5 bg-white border-t border-[#E0DED9] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A49C]" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar no Meudocelar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-[#F7F7F5] border border-[#E0DED9] rounded-full text-sm text-[#1B1B1B] outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#E0DED9] text-[#6B6760] flex items-center justify-center text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Category Navigation Bar */}
      <nav className="bg-white border-b border-[#EFEFEC] sticky top-[64px] md:top-[68px] z-30 shadow-xs">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 flex items-center gap-2 py-1.5">
          {/* Departamentos Dropdown Menu Button & Menu Container */}
          <div className="relative flex-shrink-0" ref={departamentosRef}>
            <button
              id="btn-departamentos-menu"
              type="button"
              onClick={() => {
                setDepartamentosOpen(!departamentosOpen);
                setHoveredCategory(null);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-bold tracking-wide uppercase whitespace-nowrap rounded-xl transition cursor-pointer shadow-xs ${
                departamentosOpen || activeCategory !== 'Todos'
                  ? 'bg-[#2A5C3F] text-white ring-2 ring-[#2A5C3F]/20'
                  : 'bg-[#F2F1ED] hover:bg-[#E7E5DF] text-[#1B1B1B]'
              }`}
              style={
                departamentosOpen || activeCategory !== 'Todos'
                  ? { backgroundColor: primaryColor, color: '#ffffff' }
                  : {}
              }
            >
              <Menu className="w-4 h-4 stroke-[2.5]" />
              <span>Departamentos</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${departamentosOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu (Directly Below Departamentos Button) */}
            {departamentosOpen && (
              <div
                id="departamentos-dropdown-menu"
                className="absolute left-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-80 max-w-[340px] bg-white rounded-2xl shadow-2xl border border-neutral-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 select-none"
              >
                {/* List of Departments / Categories */}
                <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-neutral-200/80">
                  {allCategoriesList.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-neutral-500">
                      Nenhum departamento cadastrado.
                    </div>
                  ) : (
                    allCategoriesList.map((cat) => {
                      const isCatActive = activeCategory === cat.nome;
                      const subs = getSubcategories(cat.nome);
                      const hasSubs = subs.length > 0;
                      const isHovered = hoveredCategory === cat.nome;
                      const isExpanded = !!expandedMobileCats[cat.nome];

                      const handleCategoryClick = () => {
                        if (hasSubs) {
                          setExpandedMobileCats(prev => ({
                            ...prev,
                            [cat.nome]: !prev[cat.nome]
                          }));
                          setHoveredCategory(cat.nome);
                        } else {
                          handleSelectCategory(cat.nome);
                        }
                      };

                      return (
                        <div
                          key={cat.id || cat.nome}
                          className="relative group"
                          onMouseEnter={() => setHoveredCategory(cat.nome)}
                        >
                          {/* Department Row */}
                          <div
                            onClick={handleCategoryClick}
                            className={`w-full flex items-center justify-between px-4 py-3 transition cursor-pointer select-none ${
                              isCatActive
                                ? 'bg-[#2A5C3F]/10 font-black'
                                : 'hover:bg-neutral-50'
                            }`}
                          >
                            {/* Category Name */}
                            <div
                              className={`flex items-center gap-2.5 text-left flex-1 min-w-0 text-xs sm:text-sm font-bold tracking-wide uppercase transition ${
                                isCatActive
                                  ? 'text-[#2A5C3F]'
                                  : 'text-neutral-800 group-hover:text-[#2A5C3F]'
                              }`}
                              style={isCatActive || isHovered ? { color: primaryColor } : {}}
                            >
                              <DynamicIcon icon={cat.icone} className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{cat.nome}</span>
                            </div>

                            {/* Submenu Indicator: '+' (expand) / '-' (collapse) if has subs; none if no subs */}
                            {hasSubs ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCategoryClick();
                                }}
                                className="p-1 -mr-1 rounded-md text-neutral-600 hover:text-[#2A5C3F] hover:bg-neutral-200/60 transition cursor-pointer flex items-center justify-center font-bold"
                                style={isHovered || isExpanded ? { color: primaryColor } : {}}
                                title={isExpanded ? `Recolher subcategorias de ${cat.nome}` : `Ver subcategorias de ${cat.nome}`}
                              >
                                {isExpanded ? (
                                  <Minus className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                  <Plus className="w-4 h-4 stroke-[2.5]" />
                                )}
                              </button>
                            ) : null}
                          </div>

                          {/* Desktop Flyout Sub-menu (Hover Panel to the Right) */}
                          {hasSubs && isHovered && (
                            <div
                              className="hidden md:block absolute left-full top-0 ml-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 py-3 px-2 z-50 animate-in fade-in slide-in-from-left-1 duration-150"
                              onMouseEnter={() => setHoveredCategory(cat.nome)}
                            >
                              <div className="px-3 pb-2 mb-2 border-b border-neutral-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <DynamicIcon icon={cat.icone} className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="text-xs font-black uppercase text-neutral-900 tracking-wider truncate">
                                    {cat.nome}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  {subs.length} sub-menus
                                </span>
                              </div>

                              {/* Subcategory links */}
                              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                                {subs.map((sub) => {
                                  const isSubActive = (activeCategory || '').trim().toLowerCase() === cat.nome.trim().toLowerCase() && (activeSubcategory || '').trim().toLowerCase() === sub.trim().toLowerCase();
                                  const subCount = products.filter(p => p.ativo && (p.categoria || '').trim().toLowerCase() === cat.nome.trim().toLowerCase() && (p.subcategoria || '').trim().toLowerCase() === sub.trim().toLowerCase()).length;
                                  return (
                                    <button
                                      key={sub}
                                      type="button"
                                      onClick={() => handleSelectCategory(cat.nome, sub)}
                                      className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-xl transition flex items-center justify-between cursor-pointer ${
                                        isSubActive
                                          ? 'bg-[#2A5C3F]/10 text-[#2A5C3F] font-bold'
                                          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                                      }`}
                                      style={isSubActive ? { color: primaryColor } : {}}
                                    >
                                      <span className="truncate">{sub}</span>
                                      <span className="text-[10px] text-neutral-400 font-mono flex-shrink-0 ml-2">
                                        {subCount}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Link: Ver tudo na categoria */}
                              <div className="pt-2 mt-2 border-t border-neutral-100">
                                <button
                                  type="button"
                                  onClick={() => handleSelectCategory(cat.nome)}
                                  className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition flex items-center justify-between cursor-pointer"
                                >
                                  <span>Ver tudo em {cat.nome}</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Accordion Sub-menu (Expanded under category) */}
                          {hasSubs && isExpanded && (
                            <div className="bg-neutral-50/90 px-4 py-2.5 border-t border-b border-neutral-200/80 space-y-1 animate-in fade-in duration-150">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectCategory(cat.nome);
                                }}
                                className="w-full py-1.5 px-2 text-left text-xs font-bold text-[#2A5C3F] hover:bg-white rounded-lg flex items-center justify-between transition cursor-pointer"
                                style={{ color: primaryColor }}
                              >
                                <span>Ver todos em {cat.nome}</span>
                                <span>→</span>
                              </button>
                              {subs.map((sub) => {
                                const isSubActive = (activeCategory || '').trim().toLowerCase() === cat.nome.trim().toLowerCase() && (activeSubcategory || '').trim().toLowerCase() === sub.trim().toLowerCase();
                                const subCount = products.filter(p => p.ativo && (p.categoria || '').trim().toLowerCase() === cat.nome.trim().toLowerCase() && (p.subcategoria || '').trim().toLowerCase() === sub.trim().toLowerCase()).length;
                                return (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectCategory(cat.nome, sub);
                                    }}
                                    className={`w-full py-1.5 px-2 text-left text-xs rounded-lg flex items-center justify-between transition cursor-pointer ${
                                      isSubActive
                                        ? 'bg-[#2A5C3F]/15 text-[#2A5C3F] font-bold'
                                        : 'text-neutral-700 hover:text-neutral-950 hover:bg-white font-medium'
                                    }`}
                                    style={isSubActive ? { color: primaryColor } : {}}
                                  >
                                    <span>• {sub}</span>
                                    <span className="text-[10px] text-neutral-400 font-mono">
                                      {subCount}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Horizontal Menu Categories */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {/* Botão Início (Todos os produtos) */}
            <button
              id="btn-nav-inicio"
              type="button"
              onClick={() => handleSelectCategory('Todos')}
              className={`px-3 py-2 text-xs md:text-sm whitespace-nowrap rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer font-bold ${
                activeCategory === 'Todos' && !searchQuery
                  ? 'text-[#2A5C3F] bg-[#2A5C3F]/10 ring-1 ring-[#2A5C3F]/20'
                  : 'text-[#6B6760] font-medium hover:text-[#1B1B1B] hover:bg-neutral-100'
              }`}
              style={activeCategory === 'Todos' && !searchQuery ? { color: primaryColor, backgroundColor: `${primaryColor}18` } : {}}
            >
              <Home className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Início</span>
            </button>

            {menuCategories.map((cat) => {
              const isActive = activeCategory === cat.nome;
              return (
                <button
                  key={cat.id || cat.nome}
                  onClick={() => handleSelectCategory(cat.nome)}
                  className={`px-3 py-2 text-xs md:text-sm whitespace-nowrap rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-[#2A5C3F] font-bold bg-[#2A5C3F]/10'
                      : 'text-[#6B6760] font-medium hover:text-[#1B1B1B] hover:bg-neutral-100'
                  }`}
                  style={isActive ? { color: primaryColor, backgroundColor: `${primaryColor}18` } : {}}
                >
                  <DynamicIcon icon={cat.icone} className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{cat.nome}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Hero Banner (When in "Todos" and no search) */}
      {config.bannerUrl && !searchQuery && activeCategory === 'Todos' && (
        <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-5 md:mt-6 w-full">
          <div
            onClick={() => config.bannerLink && handleBannerClick(config.bannerLink)}
            className={`relative w-full h-[180px] xs:h-[210px] sm:h-[260px] md:h-[300px] lg:h-[340px] rounded-2xl overflow-hidden shadow-sm bg-neutral-100 group ${
              config.bannerLink ? 'cursor-pointer' : ''
            }`}
          >
            <img
              src={optimizeImage(config.bannerUrl, 1600)}
              alt={config.bannerTitulo || 'Banner Principal'}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              onError={(e) => handleImageError(e, config.bannerUrl)}
            />
            {(config.bannerTitulo || config.bannerSubtitulo || config.bannerTag) && (
              <div
                className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-12 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 28%, rgba(0,0,0,0.15) 50%, transparent 68%)'
                }}
              >
                <div className="max-w-md sm:max-w-lg">
                  {config.bannerTag && (
                    <div className="text-[11px] font-bold tracking-widest text-white/95 uppercase drop-shadow-md mb-1 inline-block">
                      {config.bannerTag}
                    </div>
                  )}
                  {config.bannerTitulo && (
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mb-1 drop-shadow-md">
                      {config.bannerTitulo}
                    </h1>
                  )}
                  {config.bannerSubtitulo && (
                    <p className="text-xs sm:text-sm text-white/95 drop-shadow-md">
                      {config.bannerSubtitulo}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8 w-full flex-1">
        {/* Dedicated Category Page Banner / Header */}
        {activeCategory !== 'Todos' && (
          <div className="mb-6 p-5 sm:p-6 bg-gradient-to-r from-neutral-50 to-white rounded-2xl border border-neutral-200/80 shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-1.5">
                  <button
                    onClick={() => handleSelectCategory('Todos')}
                    className="hover:text-neutral-900 transition cursor-pointer"
                  >
                    Início
                  </button>
                  <span>›</span>
                  <span className="text-neutral-400">Departamentos</span>
                  <span>›</span>
                  <span className="text-neutral-900 font-bold">{activeCategory}</span>
                  {activeSubcategory && (
                    <>
                      <span>›</span>
                      <span className="text-emerald-700 font-bold">{activeSubcategory}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 shadow-2xs flex items-center justify-center text-2xl">
                    <DynamicIcon icon={allCategoriesList.find(c => c.nome === activeCategory)?.icone} className="w-6 h-6 text-neutral-800" fallback="📁" />
                  </span>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                      {activeCategory}
                    </h1>
                    {allCategoriesList.find(c => c.nome === activeCategory)?.descricao ? (
                      <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                        {allCategoriesList.find(c => c.nome === activeCategory)?.descricao}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {filteredProducts.length} achadinho{filteredProducts.length !== 1 ? 's' : ''} nesta categoria
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => handleCopyCategoryLink(activeCategory)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
                  title="Copiar link desta página de categoria"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar Categoria</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectCategory('Todos')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <span>Ver todas as ofertas</span>
                </button>
              </div>
            </div>

            {/* Subcategories list inside category page */}
            {getSubcategories(activeCategory).length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200/60 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-1">
                  Filtrar por subcategoria:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectCategory(activeCategory, undefined)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    !activeSubcategory
                      ? 'bg-[#2A5C3F] text-white shadow-xs'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                  style={!activeSubcategory ? { backgroundColor: primaryColor } : {}}
                >
                  Todas ({products.filter(p => p.ativo && (p.categoria || '').trim().toLowerCase() === activeCategory.trim().toLowerCase()).length})
                </button>
                {getSubcategories(activeCategory).map((sub) => {
                  const isSubActive = (activeSubcategory || '').trim().toLowerCase() === sub.trim().toLowerCase();
                  const count = products.filter(p => p.ativo && (p.categoria || '').trim().toLowerCase() === activeCategory.trim().toLowerCase() && (p.subcategoria || '').trim().toLowerCase() === sub.trim().toLowerCase()).length;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleSelectCategory(activeCategory, sub)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                        isSubActive
                          ? 'bg-[#2A5C3F] text-white shadow-xs'
                          : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                      }`}
                      style={isSubActive ? { backgroundColor: primaryColor } : {}}
                    >
                      <span>{sub}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSubActive ? 'bg-white/25 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Featured Products Highlight Section (When in "Todos" and no search) */}
        {activeCategory === 'Todos' && !activeSubcategory && !searchQuery && featuredProducts.length > 0 && (
          <section className="mb-10 p-5 md:p-6 rounded-2xl border border-[#2A5C3F]/15 bg-[#2A5C3F]/5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-base md:text-lg font-bold text-[#2A5C3F] tracking-tight flex items-center gap-2" style={{ color: primaryColor }}>
                ⭐ Destaques da Semana
              </h2>
              <span className="text-xs text-[#6B6760]">
                {featuredProducts.length} selecionado{featuredProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
              {featuredProducts.map((p) => renderProductCard(p))}
            </div>
          </section>
        )}

        {/* Section Header */}
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[#1B1B1B] tracking-tight">
              {searchQuery
                ? `Resultados para "${searchQuery}"`
                : activeCategory === 'Todos'
                ? 'Todos os Produtos'
                : `Ofertas em ${activeCategory}`}
            </h2>
            {activeSubcategory && (
              <p className="text-xs text-[#6B6760] mt-0.5">Subcategoria selecionada: <span className="font-semibold text-neutral-900">{activeSubcategory}</span></p>
            )}
          </div>
          <span className="text-xs md:text-sm text-[#87837A] font-medium">
            {filteredProducts.length} oferta{filteredProducts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#EFEFEC]">
            <Search className="w-12 h-12 text-[#C8C5BE] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#1B1B1B] mb-1">Nenhum achadinho encontrado</h3>
            <p className="text-sm text-[#87837A] max-w-sm mx-auto mb-4">
              Tente buscar por outro termo ou selecione uma categoria diferente no menu.
            </p>
            {(searchQuery || activeCategory !== 'Todos') && (
              <button
                onClick={() => { setSearchQuery(''); handleSelectCategory('Todos'); }}
                className="px-4 py-2 bg-[#2A5C3F] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                Limpar filtros e ver tudo
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {visibleProducts.map((p) => renderProductCard(p))}
            </div>

            {/* Progressive Loading Controls */}
            {visibleCount < filteredProducts.length && (
              <div className="mt-8 text-center flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="px-6 py-2.5 bg-white hover:bg-neutral-50 active:scale-98 text-neutral-800 font-bold text-xs md:text-sm rounded-xl border border-neutral-200 shadow-xs hover:shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Carregar mais ofertas</span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-mono">
                    +{Math.min(24, filteredProducts.length - visibleCount)} de {filteredProducts.length - visibleCount}
                  </span>
                </button>
                <div ref={loadMoreRef} className="h-4 w-full pointer-events-none" />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E0DED9] text-[#6B6760] flex items-center justify-center transition shadow-sm"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Column: Image Gallery */}
              <div className="flex flex-col bg-[#F7F7F5] border-b md:border-b-0 md:border-r border-[#EFEFEC]">
                <div className="aspect-square w-full overflow-hidden bg-[#F7F7F5] flex items-center justify-center relative">
                  {activeModalImg ? (
                    <img
                      src={optimizeImage(activeModalImg, 800)}
                      alt={selectedProduct.nome}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageError(e, activeModalImg)}
                    />
                  ) : (
                    <div className="text-neutral-400 text-xs">Sem foto</div>
                  )}

                  {/* Promo badge */}
                  {hasPromo && (
                    <span className="absolute top-3 left-3 bg-[#E53E3E] text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      -{Math.round((1 - (selectedProduct.precoPromo! / selectedProduct.preco)) * 100)}%
                    </span>
                  )}

                  {/* Platform badge */}
                  {selectedProduct.plataforma && (() => {
                    const matchedPlat = platforms.find(pl => pl.nome.toLowerCase() === selectedProduct.plataforma.toLowerCase());
                    return (
                      <span
                        className="absolute top-3 right-3 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs"
                        style={{ backgroundColor: matchedPlat?.corBadge || 'rgba(0, 0, 0, 0.75)' }}
                      >
                        <DynamicIcon icon={matchedPlat?.icone} className="w-3.5 h-3.5 flex-shrink-0" fallback="🛍️" />
                        <span>{selectedProduct.plataforma}</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Thumbnails */}
                {bannerImages.length > 1 && (
                  <div className="flex gap-2 p-3 justify-center bg-white border-t border-[#EFEFEC] overflow-x-auto">
                    {bannerImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveModalImg(img)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition flex-shrink-0 bg-neutral-100 ${
                          activeModalImg === img
                            ? 'border-[#2A5C3F] opacity-100 scale-105 shadow-xs'
                            : 'border-neutral-200 opacity-60 hover:opacity-100'
                        }`}
                        style={activeModalImg === img ? { borderColor: primaryColor } : {}}
                      >
                        <img
                          src={optimizeImage(img, 120)}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => handleImageError(e, img)}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Product Details */}
              <div className="p-5 md:p-7 flex flex-col justify-between">
                <div>
                  {/* Category breadcrumb */}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#2A5C3F] mb-1.5" style={{ color: primaryColor }}>
                    {[selectedProduct.plataforma, selectedProduct.tipo === 'DIGITAL' ? 'Digital' : null, selectedProduct.categoria, selectedProduct.subcategoria]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg md:text-xl font-bold text-[#1B1B1B] leading-snug mb-3">
                    {selectedProduct.nome}
                  </h2>

                  {/* Price */}
                  {selectedProduct.preco > 0 && (
                    <div className="flex items-baseline gap-2 mb-4">
                      {selectedProduct.tipo !== 'DIGITAL' && (
                        <span className="text-xs text-[#6B6760] font-medium">a partir de</span>
                      )}
                      <span className="text-2xl font-extrabold text-[#2A5C3F]" style={{ color: primaryColor }}>
                        R$ {formatPrice(hasPromo ? selectedProduct.precoPromo : selectedProduct.preco)}
                      </span>
                      {hasPromo && (
                        <span className="text-sm text-[#A8A49C] line-through">
                          R$ {formatPrice(selectedProduct.preco)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {selectedProduct.descricao && (
                    <div className="text-xs md:text-sm text-[#6B6760] leading-relaxed mb-5 whitespace-pre-line max-h-40 overflow-y-auto pr-1">
                      {selectedProduct.descricao}
                    </div>
                  )}

                  {/* Coupon Box */}
                  {selectedProduct.cupom && (
                    <div className="flex items-center justify-between p-3 rounded-xl border-1.5 border-dashed border-[#2A5C3F] bg-[#2A5C3F]/8 mb-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[#6B6760] tracking-wider">
                          Cupom de desconto
                        </div>
                        <div className="text-base font-bold text-[#2A5C3F] font-mono" style={{ color: primaryColor }}>
                          {selectedProduct.cupom}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCoupon(selectedProduct.cupom)}
                        className="px-3.5 py-1.5 rounded-md text-xs font-bold text-white bg-[#2A5C3F] hover:bg-[#1E4530] transition flex items-center gap-1.5 shadow-xs"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {couponCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {couponCopied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  )}

                  {/* YouTube Video Player Embed */}
                  {selectedProduct.video && getYouTubeEmbedUrl(selectedProduct.video) && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mb-4 shadow-sm">
                      <iframe
                        src={getYouTubeEmbedUrl(selectedProduct.video)!}
                        title="Vídeo do produto"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-[#EFEFEC]">
                  <button
                    onClick={() => handleCtaClick(selectedProduct)}
                    className="w-full py-3.5 px-4 bg-[#2A5C3F] hover:bg-[#1E4530] text-white font-bold text-sm md:text-base rounded-xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>
                      {selectedProduct.textoBotao ||
                        (selectedProduct.tipo === 'DIGITAL'
                          ? 'Quero conhecer →'
                          : selectedProduct.plataforma
                          ? `Ver oferta na ${selectedProduct.plataforma} →`
                          : 'Ver oferta →')}
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  {/* Price Disclaimer */}
                  {config.avisoPrecos && selectedProduct.preco > 0 && (
                    <p className="text-[11px] text-[#87837A] text-center mt-2.5">
                      {config.avisoPrecos}
                    </p>
                  )}

                  {/* Share Link */}
                  <button
                    onClick={() => handleCopyProductLink(selectedProduct)}
                    className="flex items-center justify-center gap-1.5 text-xs text-[#6B6760] hover:text-[#2A5C3F] mx-auto mt-3 py-1 font-medium transition"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{linkCopied ? 'Link Copiado!' : 'Compartilhar produto'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Channel Button (WhatsApp / Telegram) */}
      {config.botaoCanalFlutuante && channelUrl && (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`fixed bottom-6 left-6 z-40 w-13 h-13 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition duration-200 ${
            isTelegram ? 'bg-[#229ED9] hover:bg-[#1e8cc0]' : 'bg-[#25D366] hover:bg-[#20bd5a]'
          }`}
          title="Canal de Ofertas no WhatsApp/Telegram"
        >
          {isTelegram ? <Send className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </a>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed z-40 w-11 h-11 rounded-full bg-white border border-[#E0DED9] text-[#6B6760] hover:text-white hover:bg-[#2A5C3F] flex items-center justify-center shadow-lg transition duration-200 ${
            config.botaoCanalFlutuante ? 'bottom-22 left-7' : 'bottom-6 left-6'
          }`}
          title="Voltar ao topo"
          style={{ ':hover': { backgroundColor: primaryColor } } as any}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-[#E0DED9] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs md:text-sm font-medium text-[#1B1B1B] animate-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer
        className="text-center py-10 px-4 mt-12 transition-colors"
        style={{
          backgroundColor: config.corSecundaria || '#1B1B1B',
          color: 'rgba(255, 255, 255, 0.6)'
        }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-base font-bold text-white mb-3">
            {config.storeName || 'Meudocelar'}
          </div>

          {/* Social Icons */}
          {social.hasAny && (
            <div className="flex justify-center flex-wrap gap-3 mb-5">
              {social.whatsapp && (
                <a
                  href={social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#25D366] text-white/80 hover:text-white flex items-center justify-center transition"
                  title="Canal do WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {social.telegram && (
                <a
                  href={social.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#229ED9] text-white/80 hover:text-white flex items-center justify-center transition"
                  title="Canal do Telegram"
                >
                  <Send className="w-4 h-4" />
                </a>
              )}
              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#E1306C] text-white/80 hover:text-white flex items-center justify-center transition"
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
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#1877F2] text-white/80 hover:text-white flex items-center justify-center transition"
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
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#000000] text-white/80 hover:text-white flex items-center justify-center transition"
                  title="TikTok"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Business info */}
          {(config.endereco?.trim() || config.cnpj?.trim() || config.email?.trim()) && (
            <div className="text-xs text-white/50 space-y-1 mb-4">
              {config.endereco?.trim() && <div>{config.endereco}</div>}
              {config.cnpj?.trim() && <div>CNPJ: {config.cnpj}</div>}
              {config.email?.trim() && (
                <div>
                  <a href={`mailto:${config.email}`} className="text-white/60 hover:underline">
                    {config.email}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Legal disclosures */}
          {config.textoDisclosure?.trim() && (
            <div className="max-w-xl mx-auto text-[11px] leading-relaxed text-white/40 mb-2">
              {config.textoDisclosure}
            </div>
          )}
          {config.avisoPrecos?.trim() && (
            <div className="max-w-xl mx-auto text-[11px] leading-relaxed text-white/40 mb-4">
              {config.avisoPrecos}
            </div>
          )}

          <div className="text-[11px] text-white/30 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div>
              Feito com <span className="font-semibold text-white/50">Meudocelar</span>
            </div>
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-1 text-[11px] text-white/20 hover:text-white/60 transition cursor-pointer"
                title="Acesso restrito ao administrador da loja"
              >
                <Lock className="w-3 h-3" />
                <span>Área do Lojista</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );

  // Helper renderer for product card
  function renderProductCard(p: Product) {
    const isPromo = p.precoPromo && p.precoPromo > 0 && p.preco > 0 && p.precoPromo < p.preco;
    const discountPercent = isPromo ? Math.round((1 - (p.precoPromo! / p.preco)) * 100) : 0;

    return (
      <div
        key={p.id}
        onClick={() => openModal(p)}
        className="bg-white rounded-2xl overflow-hidden border border-[#EFEFEC] hover:border-[#E0DED9] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col justify-between group"
      >
        {/* Card Image */}
        <div className="aspect-square w-full relative overflow-hidden bg-[#F7F7F5] flex items-center justify-center">
          {p.img1 ? (
            <img
              src={optimizeImage(p.img1, 450)}
              alt={p.nome}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-104 transition duration-300"
              onError={(e) => handleImageError(e, p.img1)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 text-neutral-300 p-4 text-center">
              <ImageIcon className="w-10 h-10 opacity-30" />
              <span className="text-[11px] font-medium text-neutral-400">Sem imagem</span>
            </div>
          )}

          {/* Promo Badge */}
          {isPromo && (
            <span className="absolute top-2.5 left-2.5 bg-[#E53E3E] text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              -{discountPercent}%
            </span>
          )}

          {/* Platform Badge */}
          {p.plataforma && (() => {
            const matchedPlat = platforms.find(pl => pl.nome.toLowerCase() === p.plataforma.toLowerCase());
            return (
              <span
                className="absolute top-2.5 right-2.5 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full max-w-[55%] truncate shadow-xs flex items-center gap-1"
                style={{ backgroundColor: matchedPlat?.corBadge || 'rgba(0, 0, 0, 0.7)' }}
              >
                <DynamicIcon icon={matchedPlat?.icone} className="w-3 h-3 flex-shrink-0" fallback="🛍️" />
                <span className="truncate">{p.plataforma}</span>
              </span>
            );
          })()}

          {/* Coupon Mini Badge */}
          {p.cupom && (
            <span className="absolute bottom-2.5 left-2.5 bg-[#2A5C3F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
              🎟️ Cupom
            </span>
          )}
        </div>

        {/* Card Info */}
        <div className="p-3.5 md:p-4 flex flex-col flex-1 justify-between">
          <div>
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-[#87837A] font-semibold mb-1 truncate">
              {p.categoria} {p.subcategoria ? `· ${p.subcategoria}` : ''}
            </div>
            <h3 className="font-semibold text-xs md:text-sm text-[#1B1B1B] leading-snug mb-2 line-clamp-2">
              {p.nome}
            </h3>
          </div>

          <div>
            {p.preco > 0 && (
              <div className="flex items-baseline gap-1.5 flex-wrap mb-3">
                {p.tipo !== 'DIGITAL' && (
                  <span className="text-[10px] text-[#87837A] font-medium">a partir de</span>
                )}
                <span className="text-sm md:text-base font-extrabold text-[#2A5C3F]" style={{ color: primaryColor }}>
                  R$ {formatPrice(isPromo ? p.precoPromo : p.preco)}
                </span>
                {isPromo && (
                  <span className="text-[11px] text-[#A8A49C] line-through">
                    R$ {formatPrice(p.preco)}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); openModal(p); }}
              className="w-full py-2 bg-[#F7F7F5] group-hover:bg-[#2A5C3F] border border-[#E0DED9] group-hover:border-[#2A5C3F] text-[#1B1B1B] group-hover:text-white rounded-xl text-xs font-semibold transition duration-150 text-center"
              style={{ ':hover': { backgroundColor: primaryColor, borderColor: primaryColor } } as any}
            >
              Ver Detalhes
            </button>
          </div>
        </div>
      </div>
    );
  }
}
