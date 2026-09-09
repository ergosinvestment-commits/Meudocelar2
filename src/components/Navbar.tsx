import React, { useState } from 'react';
import { StoreConfig, BlogSettings } from '../types';
import {
  BookOpen,
  Store,
  FileText,
  Mail,
  Search,
  Menu,
  X,
  MessageCircle,
  Instagram,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Send
} from 'lucide-react';
import { normalizeImageUrl } from '../utils';
import { getSocialLinks } from '../utils/social';

interface NavbarProps {
  config: StoreConfig | null;
  blogSettings?: BlogSettings | null;
  activeNav: 'blog' | 'store' | 'institutional' | 'contact';
  onNavigate: (page: 'blog' | 'store' | 'institutional' | 'contact') => void;
  onOpenAdminModal?: () => void;
}

export default function Navbar({
  config,
  blogSettings,
  activeNav,
  onNavigate,
  onOpenAdminModal
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const social = getSocialLinks(config);
  const primaryColor = blogSettings?.blogPrimaryColor || config?.corPrimaria || '#2A5C3F';
  const storeName = blogSettings?.blogStoreName || config?.storeName || 'Meu Doce Lar';
  const tagline = blogSettings?.blogTagline || 'Blog & Achadinhos Verificados';
  const logoUrl = blogSettings?.blogLogo 
    ? normalizeImageUrl(blogSettings.blogLogo) 
    : (config?.logo ? normalizeImageUrl(config.logo) : '');

  // Menu customization
  const homeLabel = blogSettings?.menuHomeLabel || 'Início (Blog)';
  const storeLabel = blogSettings?.menuStoreLabel || 'Loja & Achadinhos';
  const storeBadge = blogSettings?.menuStoreBadge ?? 'Ofertas';
  const showStore = blogSettings?.menuShowStore !== false;
  const institutionalLabel = blogSettings?.menuInstitutionalLabel || 'Institucional';
  const showInstitutional = blogSettings?.menuShowInstitutional !== false;
  const contactLabel = blogSettings?.menuContactLabel || 'Contato';
  const showContact = blogSettings?.menuShowContact !== false;
  const showWhatsApp = blogSettings?.menuShowWhatsApp !== false;
  const showVitrineBtn = blogSettings?.menuShowVitrineBtn !== false;
  const vitrineBtnText = blogSettings?.menuVitrineBtnText || 'Ver Vitrine';

  // Top Bar configuration
  const isBlog = activeNav === 'blog';
  const blogTopBarActive = Boolean(blogSettings?.topBarEnabled && blogSettings?.topBarText?.trim());
  const showTopBar = isBlog
    ? blogTopBarActive
    : Boolean(blogTopBarActive || config?.mensagemTopo?.trim());
  const topBarText = isBlog
    ? (blogTopBarActive ? blogSettings?.topBarText : '')
    : (blogTopBarActive ? blogSettings?.topBarText : config?.mensagemTopo);
  const topBarBg = isBlog
    ? (blogSettings?.topBarBgColor || primaryColor)
    : (blogTopBarActive ? (blogSettings?.topBarBgColor || primaryColor) : (config?.corBarraTopo || primaryColor));
  const topBarTextColor = isBlog
    ? (blogSettings?.topBarTextColor || '#FFFFFF')
    : (blogTopBarActive ? (blogSettings?.topBarTextColor || '#FFFFFF') : '#FFFFFF');
  const topBarLink = isBlog
    ? (blogSettings?.topBarLink || '')
    : (blogTopBarActive ? (blogSettings?.topBarLink || '') : '');

  function handleNav(page: 'blog' | 'store' | 'institutional' | 'contact') {
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs">
      {/* Top Notification Announcement Bar if configured */}
      {showTopBar && topBarText?.trim() && (
        <div
          className="text-xs font-semibold py-2 px-4 text-center tracking-wide transition-all shadow-xs flex items-center justify-center gap-2"
          style={{ backgroundColor: topBarBg, color: topBarTextColor }}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-300" />
          {topBarLink ? (
            <a
              href={topBarLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-1 truncate"
            >
              <span>{topBarText}</span>
              <ExternalLink className="w-3 h-3 shrink-0 inline opacity-80" />
            </a>
          ) : (
            <span className="truncate">{topBarText}</span>
          )}
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-[1300px] mx-auto px-4 md:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => handleNav('blog')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              referrerPolicy="no-referrer"
              className="h-10 w-auto max-w-[150px] object-contain transition-transform group-hover:scale-105 rounded-md"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {storeName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-neutral-900 leading-tight">
              {storeName}
            </span>
            <span className="text-[11px] font-medium text-neutral-500 hidden sm:inline leading-none">
              {tagline}
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-100/80 p-1.5 rounded-2xl border border-neutral-200/60">
          <button
            id="nav-home-blog"
            onClick={() => handleNav('blog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeNav === 'blog'
                ? 'bg-white text-neutral-900 shadow-xs scale-102'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
          >
            <BookOpen
              className="w-4 h-4"
              style={{ color: activeNav === 'blog' ? primaryColor : undefined }}
            />
            <span>{homeLabel}</span>
          </button>

          {showStore && (
            <button
              id="nav-store"
              onClick={() => handleNav('store')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                activeNav === 'store'
                  ? 'bg-white text-neutral-900 shadow-xs scale-102 font-extrabold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              <Store
                className="w-4 h-4"
                style={{ color: activeNav === 'store' ? primaryColor : undefined }}
              />
              <span>{storeLabel}</span>
              {storeBadge && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                  {storeBadge}
                </span>
              )}
            </button>
          )}

          {showInstitutional && (
            <button
              id="nav-institutional"
              onClick={() => handleNav('institutional')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'institutional'
                  ? 'bg-white text-neutral-900 shadow-xs scale-102'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              <FileText
                className="w-4 h-4"
                style={{ color: activeNav === 'institutional' ? primaryColor : undefined }}
              />
              <span>{institutionalLabel}</span>
            </button>
          )}

          {showContact && (
            <button
              id="nav-contact"
              onClick={() => handleNav('contact')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'contact'
                  ? 'bg-white text-neutral-900 shadow-xs scale-102'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              <Mail
                className="w-4 h-4"
                style={{ color: activeNav === 'contact' ? primaryColor : undefined }}
              />
              <span>{contactLabel}</span>
            </button>
          )}
        </nav>

        {/* Right Actions: WhatsApp & CTA */}
        <div className="flex items-center gap-2.5">
          {showWhatsApp && social.whatsapp && (
            <a
              href={social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
              title="Acessar Canal do WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          )}

          {showVitrineBtn && (
            <button
              onClick={() => handleNav('store')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm hover:opacity-90 active:scale-98"
              style={{ backgroundColor: primaryColor }}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{vitrineBtnText}</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-lg">
          <button
            onClick={() => handleNav('blog')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition ${
              activeNav === 'blog'
                ? 'bg-neutral-100 text-neutral-900 border-l-4'
                : 'text-neutral-600 hover:bg-neutral-50'
            }`}
            style={{ borderLeftColor: activeNav === 'blog' ? primaryColor : undefined }}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4" style={{ color: primaryColor }} />
              <span>{homeLabel}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {showStore && (
            <button
              onClick={() => handleNav('store')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition ${
                activeNav === 'store'
                  ? 'bg-neutral-100 text-neutral-900 border-l-4'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
              style={{ borderLeftColor: activeNav === 'store' ? primaryColor : undefined }}
            >
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4" style={{ color: primaryColor }} />
                <span>{storeLabel}</span>
              </div>
              {storeBadge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {storeBadge}
                </span>
              )}
            </button>
          )}

          {showInstitutional && (
            <button
              onClick={() => handleNav('institutional')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition ${
                activeNav === 'institutional'
                  ? 'bg-neutral-100 text-neutral-900 border-l-4'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
              style={{ borderLeftColor: activeNav === 'institutional' ? primaryColor : undefined }}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-neutral-500" />
                <span>{institutionalLabel}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          )}

          {showContact && (
            <button
              onClick={() => handleNav('contact')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition ${
                activeNav === 'contact'
                  ? 'bg-neutral-100 text-neutral-900 border-l-4'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
              style={{ borderLeftColor: activeNav === 'contact' ? primaryColor : undefined }}
            >
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-neutral-500" />
                <span>{contactLabel}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          )}

          {showWhatsApp && social.whatsapp && (
            <a
              href={social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 p-3 mt-2 rounded-xl text-sm font-bold bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Acessar Canal do WhatsApp</span>
            </a>
          )}
        </div>
      )}
    </header>
  );
}
