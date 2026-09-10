import React, { useState, useEffect, useMemo } from 'react';
import { BlogPost, StoreConfig, Product, BlogSettings, BlogEditor, ArticleFooterAd } from '../../types';
import { recordBlogPostView, fetchPublicBlogPosts, fetchStoreProducts, fetchPublicBlogSettings, fetchPublicBlogEditors } from '../../api/client';
import { normalizeImageUrl } from '../../utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Share2,
  Check,
  Copy,
  Tag,
  BookOpen,
  Store,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ThumbsUp,
  Heart,
  Megaphone,
  UserCheck,
  Facebook,
  Instagram,
  MessageCircle,
  ShoppingBag
} from 'lucide-react';

interface ArticleViewProps {
  post: BlogPost;
  storeSlug: string;
  config: StoreConfig | null;
  blogSettings?: BlogSettings | null;
  onBackToBlog: () => void;
  onNavigateToStore: (category?: string) => void;
  onSelectPost: (post: BlogPost) => void;
  onNavigateToInstitutional: () => void;
  onNavigateToContact: () => void;
}

export default function ArticleView({
  post,
  storeSlug,
  config,
  blogSettings: initialBlogSettings,
  onBackToBlog,
  onNavigateToStore,
  onSelectPost,
  onNavigateToInstitutional,
  onNavigateToContact
}: ArticleViewProps) {
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [blogSettings, setBlogSettings] = useState<BlogSettings | null>(initialBlogSettings || null);
  const [blogEditors, setBlogEditors] = useState<BlogEditor[]>([]);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      }
    }
    window.addEventListener('blog-settings-updated', handleBlogSettingsUpdated as EventListener);
    return () => window.removeEventListener('blog-settings-updated', handleBlogSettingsUpdated as EventListener);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    recordBlogPostView(storeSlug, post.id);

    async function loadExtra() {
      try {
        const [postsRes, prodsRes, settingsRes, editorsRes] = await Promise.all([
          fetchPublicBlogPosts(storeSlug),
          fetchStoreProducts(storeSlug).catch(() => []),
          fetchPublicBlogSettings(storeSlug).catch(() => null),
          fetchPublicBlogEditors(storeSlug).catch(() => [])
        ]);
        setAllPosts(postsRes || []);
        setAllProducts(prodsRes || []);
        setBlogSettings(settingsRes);
        setBlogEditors(editorsRes || []);
      } catch (err) {
        console.error('Error loading related items:', err);
      }
    }
    loadExtra();
  }, [post.id, storeSlug]);

  function getShareUrl(): string {
    if (typeof window !== 'undefined' && window.location.href) {
      return window.location.href;
    }
    return '';
  }

  function handleCopyLink() {
    try {
      const url = getShareUrl();
      navigator.clipboard.writeText(url);
      setCopied(true);
      setToastMessage('Link do artigo copiado com sucesso!');
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 3000);
    } catch {
      setToastMessage('Não foi possível copiar o link.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  }

  function handleShareWhatsApp() {
    const url = getShareUrl();
    const text = encodeURIComponent(`*${post.title}*\n\nConfira este artigo imperdível: ${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  function handleShareFacebook() {
    const url = getShareUrl();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(post.title)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=620,height=550');
  }

  async function handleShareInstagram() {
    const url = getShareUrl();

    // 1. If Web Share API is available (native mobile share sheet which includes Instagram)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `Confira este artigo: ${post.title}`,
          url: url
        });
        return;
      } catch (err: any) {
        // If aborted by user, do nothing; otherwise fallback to copy & open
        if (err?.name === 'AbortError') return;
      }
    }

    // 2. Fallback: Copy link so user can paste into Instagram Stories or Direct
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setToastMessage('Link copiado! Cole no seu Story ou Direct do Instagram.');
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 4000);
    } catch {
      setToastMessage('Compartilhe no Instagram: ' + url);
      setTimeout(() => setToastMessage(null), 3000);
    }

    // Open Instagram app or web
    const igAccount = config?.instagram;
    const igUrl = igAccount
      ? (igAccount.startsWith('http') ? igAccount : `https://www.instagram.com/${igAccount.replace(/^@+/, '')}`)
      : 'https://www.instagram.com';
    window.open(igUrl, '_blank', 'noopener,noreferrer');
  }

  // 5 Most Recent Articles for sidebar
  const recentArticles = useMemo(() => {
    return allPosts
      .filter(p => p.id !== post.id)
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 5);
  }, [allPosts, post.id]);

  // Related Articles (3 articles in the same category)
  const relatedArticles = useMemo(() => {
    const sameCat = allPosts.filter(
      p => p.id !== post.id && p.category?.trim().toLowerCase() === post.category?.trim().toLowerCase()
    );
    if (sameCat.length >= 3) {
      return sameCat.slice(0, 3);
    }
    const others = allPosts.filter(p => p.id !== post.id && !sameCat.includes(p));
    return [...sameCat, ...others].slice(0, 3);
  }, [allPosts, post.id, post.category]);

  // Products linked or matching category
  const linkedProducts = allProducts
    .filter(p => {
      if (post.linkedProductIds && post.linkedProductIds.includes(p.id)) return true;
      return p.categoria.toLowerCase() === post.category.toLowerCase();
    })
    .slice(0, 3);

  // Find author details
  const matchedEditor = blogEditors.find(e => e.id === post.authorId || e.name === post.author);
  const authorName = post.author || matchedEditor?.name || storeName;
  const authorAvatar = post.authorAvatar || matchedEditor?.avatar;
  const authorRole = post.authorRole || matchedEditor?.role || 'Redator & Curador';
  const authorBio = post.authorBio || matchedEditor?.bio;

  // Simple Markdown-to-HTML parser for article content
  function renderContent(rawText: string) {
    if (!rawText) return null;

    const paragraphs = rawText.split('\n\n');
    return paragraphs.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Heading 3
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-xl md:text-2xl font-extrabold text-neutral-900 mt-8 mb-3 tracking-tight">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }

      // Heading 2
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-2xl md:text-3xl font-extrabold text-neutral-900 mt-10 mb-4 tracking-tight border-b border-neutral-100 pb-2">
            {trimmed.replace('## ', '')}
          </h2>
        );
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote
            key={idx}
            className="p-4 my-6 rounded-2xl bg-neutral-50 border-l-4 text-neutral-700 italic text-sm md:text-base leading-relaxed"
            style={{ borderLeftColor: primaryColor }}
          >
            {trimmed.replace('> ', '')}
          </blockquote>
        );
      }

      // Unordered list
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').filter(i => i.trim().startsWith('- ') || i.trim().startsWith('* '));
        return (
          <ul key={idx} className="space-y-2 my-4 pl-2 list-none">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="flex items-start gap-2.5 text-sm md:text-base text-neutral-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: primaryColor }} />
                <span>{item.replace(/^[-*]\s+/, '')}</span>
              </li>
            ))}
          </ul>
        );
      }

      // Numbered list
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split('\n').filter(i => /^\d+\.\s/.test(i.trim()));
        return (
          <ol key={idx} className="space-y-3 my-4 pl-1 list-none">
            {items.map((item, iIdx) => {
              const numMatch = item.match(/^(\d+)\.\s*(.*)/);
              const num = numMatch ? numMatch[1] : `${iIdx + 1}`;
              const text = numMatch ? numMatch[2] : item;
              return (
                <li key={iIdx} className="flex items-start gap-3 text-sm md:text-base text-neutral-700 leading-relaxed">
                  <span
                    className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {num}
                  </span>
                  <span>{text}</span>
                </li>
              );
            })}
          </ol>
        );
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-base md:text-lg text-neutral-700 leading-relaxed my-4">
          {trimmed}
        </p>
      );
    });
  }

  const formattedDate = post.publishedAt || post.createdAt
    ? new Date(post.publishedAt || post.createdAt || '').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : 'Recentemente';

  // Helper to normalize strings for robust category matching (handles accents, casing, spacing, and & vs e)
  const normalizeCategoryString = (str?: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents: e.g. organização -> organizacao
      .replace(/&/g, 'e') // & -> e: e.g. Casa & Cozinha -> Casa e Cozinha
      .replace(/[^a-z0-9]/g, '') // strip punctuation, dashes, spaces
      .trim();
  };

  // RESOLVE CATEGORY-SPECIFIC AD:
  // Requirements:
  // 1. Only show if an ad is created and enabled in the dashboard.
  // 2. Only show in the article if the ad matches the article's category (with robust normalization).
  // 3. If the article's category does not have an ad created or active, nothing appears in the article.
  const activeAd = useMemo<ArticleFooterAd | null>(() => {
    const postCat = (post.category || '').trim();
    if (!postCat) return null;

    const normPostCat = normalizeCategoryString(postCat);

    const isAdFilled = (ad: ArticleFooterAd) => {
      if (!ad || ad.enabled === false) return false;
      if (ad.type === 'html') {
        return !!(ad.htmlCode && ad.htmlCode.trim());
      }
      if (ad.type === 'product') {
        return !!(
          ad.productId ||
          ad.bannerLinkUrl?.trim() ||
          ad.link?.trim() ||
          ad.title?.trim() ||
          ad.bannerImageUrl?.trim()
        );
      }
      return !!(
        (ad.bannerImageUrl && ad.bannerImageUrl.trim()) ||
        (ad.imageUrl && ad.imageUrl.trim()) ||
        (ad.title && ad.title.trim()) ||
        (ad.bannerAlt && ad.bannerAlt.trim()) ||
        (ad.description && ad.description.trim()) ||
        (ad.bannerLinkUrl && ad.bannerLinkUrl.trim()) ||
        (ad.link && ad.link.trim())
      );
    };

    const isCategoryMatch = (adCategory?: string) => {
      if (!adCategory) return false;
      const trimCat = adCategory.trim();
      return (
        trimCat.toLowerCase() === postCat.toLowerCase() ||
        normalizeCategoryString(trimCat) === normPostCat
      );
    };

    // 1. Check in articleFooterAds list (multi-category ads)
    const adsList: ArticleFooterAd[] = (blogSettings?.articleFooterAds || []).filter(isAdFilled);
    const matchFromList = adsList.find((ad) => isCategoryMatch(ad.category));
    if (matchFromList) return matchFromList;

    // 2. Check in single articleFooterAd (backward compatibility)
    const singleAd = blogSettings?.articleFooterAd;
    if (singleAd && isAdFilled(singleAd) && isCategoryMatch(singleAd.category)) {
      return singleAd;
    }

    // If the category does not have an ad created, return null (nothing appears!)
    return null;
  }, [blogSettings, post.category]);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1B1B1B] font-['DM_Sans',sans-serif]">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumbs & Back Bar */}
      <div className="bg-white border-b border-neutral-200/80 py-3 px-4 md:px-6">
        <div className="max-w-[900px] mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBackToBlog}
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar aos Artigos</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToStore()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span className="hidden sm:inline">Ver Loja</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition cursor-pointer"
              title="Copiar link do artigo"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
              title="Compartilhar no WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Article & Sidebar Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Article Content */}
          <main className="lg:col-span-8 bg-white rounded-3xl border border-neutral-200/90 shadow-xs p-6 sm:p-10 space-y-8">
        {/* Category & Meta */}
        <div className="flex items-center gap-3 text-xs font-bold mb-4">
          <span
            className="px-3 py-1 rounded-lg text-white font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {post.category}
          </span>
          <span className="text-neutral-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {post.readTime || '4 min de leitura'}
          </span>
          <span className="text-neutral-400 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {post.views || 0} visualizações
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight mb-6">
          {post.title}
        </h1>

        {/* Excerpt / Lead */}
        {post.excerpt && (
          <p className="text-lg md:text-xl text-neutral-600 leading-relaxed font-medium mb-8 border-l-4 border-neutral-300 pl-4 py-1 italic">
            {post.excerpt}
          </p>
        )}

        {/* Author Bio Bar */}
        <div className="flex items-center justify-between py-4 border-y border-neutral-200 mb-8">
          <div className="flex items-center gap-3">
            {authorAvatar ? (
              <img
                src={normalizeImageUrl(authorAvatar)}
                alt={authorName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-neutral-200 shadow-xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-sm">
                {(authorName || 'A').charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-neutral-900">
                  {authorName}
                </span>
                {authorRole && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                    {authorRole}
                  </span>
                )}
              </div>
              <span className="block text-[11px] text-neutral-400 mt-0.5">
                Publicado em {formattedDate}
              </span>
            </div>
          </div>


        </div>

        {/* Big Cover Image */}
        <div className="rounded-3xl overflow-hidden mb-10 bg-neutral-100 shadow-md">
          <img
            src={normalizeImageUrl(post.coverImage)}
            alt={post.title}
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[500px] object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80&fm=webp';
            }}
          />
        </div>

        {/* Content Body */}
        <article className="prose prose-neutral max-w-none mb-8">
          {renderContent(post.content)}
        </article>

        {/* ========================================================================= */}
        {/* BANNER PROMOCIONAL DO ARTIGO (FILTRADO POR CATEGORIA) */}
        {/* Só aparece se configurado no painel e tiver a mesma categoria do artigo */}
        {/* ========================================================================= */}
        {activeAd && (
          <div className="my-8 rounded-2xl sm:rounded-3xl overflow-hidden border border-amber-300/80 bg-white shadow-sm">
            {activeAd.type === 'html' && activeAd.htmlCode ? (
              <div className="p-4 sm:p-6 w-full flex justify-center overflow-x-auto bg-neutral-50">
                <div dangerouslySetInnerHTML={{ __html: activeAd.htmlCode }} />
              </div>
            ) : activeAd.type === 'product' ? (
              /* PRODUTO DA LOJA COM LINK DIRETO */
              (() => {
                const articleCat = (post.category || '').trim().toLowerCase();
                const catProducts = allProducts.filter(p => {
                  if (p.ativo === false) return false;
                  const pCat = (p.categoria || '').trim().toLowerCase();
                  return pCat === articleCat || normalizeCategoryString(pCat) === normalizeCategoryString(articleCat);
                });

                let selectedProduct = null;
                if (catProducts.length > 0) {
                  const hash = (post.id || '1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const index = hash % catProducts.length;
                  selectedProduct = catProducts[index];
                } else {
                  selectedProduct = allProducts.find(p => p.id === activeAd.productId) || null;
                }

                const directLink = selectedProduct?.linkAfiliado || activeAd.bannerLinkUrl || activeAd.link || '#';
                const prodImg = selectedProduct?.img1 || activeAd.bannerImageUrl || activeAd.imageUrl || '';
                const prodTitle = selectedProduct?.nome || activeAd.title || 'Oferta em Destaque';
                const prodBadge = activeAd.bannerBadge || (selectedProduct?.plataforma ? `ACHADINHO NA ${selectedProduct.plataforma.toUpperCase()}` : 'OFERTA DA LOJA');
                const prodBtn = activeAd.bannerButtonText || activeAd.buttonText || (selectedProduct?.plataforma ? `Ver Oferta na ${selectedProduct.plataforma} →` : 'Aproveitar Oferta →');
                const regPrice = selectedProduct?.preco ?? activeAd.productPrice;
                const promoPrice = selectedProduct?.precoPromo ?? activeAd.productPromoPrice;
                const hasPromo = promoPrice && regPrice && promoPrice < regPrice;
                const coupon = selectedProduct?.cupom || activeAd.productCoupon;

                return (
                  <a
                    href={directLink}
                    target={activeAd.openInNewTab !== false ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="block group p-5 sm:p-7 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/40 hover:from-emerald-50 hover:to-amber-50/70 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-7">
                      {/* Product Image */}
                      {prodImg && (
                        <div className="relative w-full sm:w-44 h-44 rounded-2xl overflow-hidden bg-white border border-neutral-200/80 shrink-0 shadow-xs group-hover:scale-102 transition-transform duration-300">
                          <img
                            src={normalizeImageUrl(prodImg)}
                            alt={prodTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {prodBadge && (
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                              {prodBadge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                            <ShoppingBag className="w-3 h-3" />
                            <span>Recomendação do Artigo</span>
                          </span>
                          {coupon && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <Tag className="w-3 h-3" />
                              Cupom: {coupon}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-xl font-extrabold text-neutral-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
                          {prodTitle}
                        </h3>

                        {activeAd.bannerAlt && activeAd.bannerAlt !== prodTitle && (
                          <p className="text-xs sm:text-sm text-neutral-600 line-clamp-2">
                            {activeAd.bannerAlt}
                          </p>
                        )}

                        {/* Price Display */}
                        {(regPrice !== undefined || promoPrice !== undefined) && (
                          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                            {hasPromo ? (
                              <>
                                <span className="text-xs sm:text-sm text-neutral-400 line-through">
                                  R$ {regPrice!.toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-lg sm:text-xl font-black text-emerald-700">
                                  R$ {promoPrice!.toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-[11px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                                  -{Math.round(((regPrice! - promoPrice!) / regPrice!) * 100)}%
                                </span>
                              </>
                            ) : regPrice !== undefined ? (
                              <span className="text-lg sm:text-xl font-black text-emerald-700">
                                R$ {regPrice.toFixed(2).replace('.', ',')}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* CTA Button */}
                      <div className="shrink-0 w-full sm:w-auto">
                        <div className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold text-neutral-950 bg-amber-400 group-hover:bg-amber-300 transition shadow-sm flex items-center justify-center gap-2">
                          <span>{prodBtn}</span>
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] text-center text-neutral-400 mt-1.5 font-medium">
                          Link oficial verificado
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })()
            ) : (
              <div className="flex flex-col">
                {/* Banner de imagem em destaque com link direto */}
                {(activeAd.bannerImageUrl || activeAd.imageUrl) && (
                  <a
                    href={activeAd.bannerLinkUrl || activeAd.link || '#'}
                    target={activeAd.openInNewTab !== false ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="block group relative overflow-hidden bg-neutral-950 cursor-pointer"
                  >
                    <img
                      src={normalizeImageUrl(activeAd.bannerImageUrl || activeAd.imageUrl)}
                      alt={activeAd.bannerAlt || activeAd.title || `Banner da categoria ${post.category}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[420px] object-cover group-hover:scale-101 transition-transform duration-300"
                    />
                    {activeAd.bannerBadge && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-neutral-950 shadow-md">
                        {activeAd.bannerBadge}
                      </span>
                    )}
                  </a>
                )}

                {/* Bloco de chamada / texto / botão */}
                {(activeAd.title || activeAd.bannerAlt || activeAd.description || activeAd.bannerButtonText || activeAd.buttonText) && (
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-amber-200/60">
                    <div className="space-y-1 text-center sm:text-left">
                      {!activeAd.bannerImageUrl && !activeAd.imageUrl && activeAd.bannerBadge && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 mb-1">
                          <Megaphone className="w-3 h-3" />
                          <span>{activeAd.bannerBadge}</span>
                        </div>
                      )}
                      {activeAd.title && (
                        <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 leading-tight">
                          {activeAd.title}
                        </h3>
                      )}
                      {(activeAd.description || activeAd.bannerAlt) && (
                        <p className="text-xs sm:text-sm text-neutral-600">
                          {activeAd.description || activeAd.bannerAlt}
                        </p>
                      )}
                    </div>

                    {(activeAd.bannerLinkUrl || activeAd.link) && (
                      <a
                        href={activeAd.bannerLinkUrl || activeAd.link}
                        target={activeAd.openInNewTab !== false ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        className="shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-neutral-950 bg-amber-400 hover:bg-amber-300 transition shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>{activeAd.bannerButtonText || activeAd.buttonText || 'Aproveitar Oferta →'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Callout: Products Mentioned in this article */}
        {linkedProducts.length > 0 && (
          <div className="bg-amber-50/70 border-2 border-amber-200/80 rounded-3xl p-6 sm:p-8 mb-12">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-lg mb-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3>Achadinhos Recomendados neste Artigo</h3>
            </div>
            <p className="text-xs sm:text-sm text-amber-800/80 mb-6">
              Selecionamos os modelos com os melhores preços e avaliações encontrados para você:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {linkedProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl p-4 border border-amber-200/60 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 rounded-xl overflow-hidden bg-neutral-100 mb-3 border border-neutral-100">
                      <img
                        src={normalizeImageUrl(prod.img1)}
                        alt={prod.nome}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block truncate">
                      {prod.plataforma}
                    </span>
                    <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 mt-1">
                      {prod.nome}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-900">
                      R$ {(prod.precoPromo || prod.preco).toFixed(2).replace('.', ',')}
                    </span>

                    <a
                      href={prod.linkAfiliado}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white flex items-center gap-1 shadow-xs hover:opacity-90 transition"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>Ver</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-6 border-t border-neutral-200">
            <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 mr-2">
              <Tag className="w-3.5 h-3.5" />
              Tags:
            </span>
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Author Detailed Card */}
        {authorBio && (
          <div className="my-8 p-6 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {authorAvatar ? (
              <img
                src={normalizeImageUrl(authorAvatar)}
                alt={authorName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/20 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xl shrink-0">
                {(authorName || 'A').charAt(0)}
              </div>
            )}
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <h4 className="font-extrabold text-sm text-neutral-900">{authorName}</h4>
                {authorRole && <span className="text-xs text-emerald-700 font-bold">({authorRole})</span>}
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">{authorBio}</p>
            </div>
          </div>
        )}

        {/* Feedback / Share Bar */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 my-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-neutral-900">
                Esse artigo ajudou na sua busca?
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Compartilhe com alguém que também está organizando ou decorando a casa!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* WhatsApp Shortcut */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-95 transition shadow-xs cursor-pointer"
                title="Compartilhar no WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              {/* Facebook Shortcut */}
              <button
                type="button"
                onClick={handleShareFacebook}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] active:scale-95 transition shadow-xs cursor-pointer"
                title="Compartilhar no Facebook"
              >
                <Facebook className="w-4 h-4" />
                <span>Facebook</span>
              </button>

              {/* Instagram Shortcut */}
              <button
                type="button"
                onClick={handleShareInstagram}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 active:scale-95 transition shadow-xs cursor-pointer"
                title="Compartilhar no Instagram"
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram</span>
              </button>

              {/* Copy Link Shortcut */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition border border-neutral-200/80 cursor-pointer"
                title="Copiar link do artigo"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              {/* Like Post Button */}
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  liked
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
                title="Gostei deste post"
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{liked ? 'Gostei!' : 'Gostei'}</span>
              </button>
            </div>
          </div>
        </div>

          </main>

          {/* Sidebar Column */}
          <aside className="lg:col-span-4 space-y-6 sticky top-24">
            {/* 1. 5 Most Recent Articles Card */}
            <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs p-5 space-y-4">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-3">
                <BookOpen className="w-4 h-4" style={{ color: primaryColor }} />
                <span>Artigos Mais Recentes</span>
              </h3>
              {recentArticles.length === 0 ? (
                <p className="text-xs text-neutral-400 py-3 text-center">Nenhum outro artigo recente.</p>
              ) : (
                <div className="space-y-4">
                  {recentArticles.map(rel => (
                    <div
                      key={rel.id}
                      onClick={() => onSelectPost(rel)}
                      className="group flex items-center gap-3.5 p-2 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
                    >
                      {rel.coverImage && (
                        <img
                          src={normalizeImageUrl(rel.coverImage)}
                          alt={rel.title}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-lg object-cover shrink-0 border border-neutral-200 group-hover:scale-105 transition"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: primaryColor }}>
                          {rel.category || 'Dicas'}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 mt-0.5 group-hover:opacity-85 transition">
                          {rel.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Vertical Sidebar Banner Card (Strictly Per Article) */}
            {(() => {
              // Exibe ESTRITAMENTE se este artigo específico tiver um banner configurado e ativo
              const currentLivePost = allPosts.find(p => p.id === post.id || p.slug === post.slug) || post;
              const rawBanner = currentLivePost.sidebarBanner?.imageUrl ? currentLivePost.sidebarBanner : (post.sidebarBanner?.imageUrl ? post.sidebarBanner : null);
              const banner = (rawBanner && rawBanner.imageUrl && rawBanner.enabled !== false)
                ? rawBanner
                : null;

              if (!banner?.imageUrl) return null;

              return (
                <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden group">
                  <div className="relative h-80 sm:h-96 bg-neutral-950 overflow-hidden flex flex-col justify-end">
                    <a
                      href={banner.linkUrl || '#'}
                      target={banner.openInNewTab !== false ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      className="absolute inset-0 block w-full h-full"
                    >
                      <img
                        src={normalizeImageUrl(banner.imageUrl)}
                        alt={banner.altText || banner.title || post.title || 'Banner Lateral'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent pointer-events-none" />
                    </a>

                    {banner.badge ? (
                      <div className="absolute top-3 left-3 z-10 pointer-events-none">
                        <span className="px-2.5 py-1 bg-amber-500 text-neutral-950 text-[10px] font-black tracking-widest uppercase rounded-md shadow-md">
                          {banner.badge}
                        </span>
                      </div>
                    ) : null}

                    <div className="relative z-10 p-4 sm:p-5 space-y-2 pointer-events-auto">
                      {banner.title ? (
                        <h4 className="text-sm sm:text-base font-extrabold text-white leading-tight drop-shadow-sm">
                          {banner.title}
                        </h4>
                      ) : null}
                      {banner.description ? (
                        <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed drop-shadow-xs">
                          {banner.description}
                        </p>
                      ) : null}
                      {banner.linkUrl && (
                        <a
                          href={banner.linkUrl}
                          target={banner.openInNewTab !== false ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black rounded-xl transition shadow-md flex items-center justify-center gap-1.5 mt-2"
                        >
                          <span>{banner.buttonText || 'Quero Conhecer →'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </aside>
        </div>

        {/* Artigos Relacionados (3 articles in same category) at bottom */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-neutral-200">
            <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900 mb-6 flex items-center gap-2.5">
              <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
              <span>Artigos Relacionados</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <article
                  key={rel.id}
                  onClick={() => onSelectPost(rel)}
                  className="group bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 overflow-hidden bg-neutral-100">
                      <img
                        src={normalizeImageUrl(rel.coverImage)}
                        alt={rel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 sm:p-5">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md text-emerald-800 bg-emerald-50 mb-2">
                        {rel.category || post.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-2 group-hover:text-emerald-700 transition">
                        {rel.title}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 pt-0 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 group-hover:underline">
                      <span>Ler Artigo</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 border-t border-neutral-800 py-10 px-4 md:px-6 mt-16">
        <div className="max-w-[900px] mx-auto text-center space-y-4">
          <span className="text-white font-extrabold text-base tracking-tight block">
            {storeName}
          </span>
          <p className="text-xs text-neutral-400 max-w-lg mx-auto leading-relaxed">
            {config?.textoDisclosure || 'Participamos de programas de afiliados e podemos receber comissões pelas compras qualificadas.'}
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-neutral-300 font-semibold pt-2">
            <button onClick={onBackToBlog} className="hover:text-white transition cursor-pointer">
              Todos os Artigos
            </button>
            <button onClick={() => onNavigateToStore()} className="hover:text-white transition cursor-pointer">
              Vitrine de Ofertas
            </button>
            <button onClick={onNavigateToInstitutional} className="hover:text-white transition cursor-pointer">
              Institucional
            </button>
            <button onClick={onNavigateToContact} className="hover:text-white transition cursor-pointer">
              Contato
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 pt-4">
            © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
