import React, { useState, useEffect } from 'react';
import { BlogPost, StoreConfig, BlogSettings } from './types';
import { fetchStoreConfig, fetchPublicBlogSettings } from './api/client';
import { FALLBACK_STORE_CONFIG } from './data/defaultData';
import Navbar from './components/Navbar';
import BlogHome from './components/Blog/BlogHome';
import ArticleView from './components/Blog/ArticleView';
import StoreFront from './components/StoreFront';
import InstitutionalPage from './components/Institutional/InstitutionalPage';
import ContactPage from './components/Contact/ContactPage';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import AdminLoginModal from './components/AdminLoginModal';
import { Store, LayoutDashboard, Lock, ShieldCheck, BookOpen } from 'lucide-react';

type PageMode = 'blog' | 'store' | 'institutional' | 'contact' | 'dashboard';

export default function App() {
  const [storeSlug, setStoreSlug] = useState<string>('achadinhos-da-maria');
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [viewMode, setViewMode] = useState<PageMode>('blog');
  const [selectedArticle, setSelectedArticle] = useState<BlogPost | null>(null);
  const [institutionalTab, setInstitutionalTab] = useState<string>('sobre');

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      const stored =
        localStorage.getItem('planiloja_admin_session') ||
        sessionStorage.getItem('planiloja_admin_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Boolean(parsed?.authenticated);
      }
    } catch {
      return false;
    }
    return false;
  });
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [blogSettings, setBlogSettings] = useState<BlogSettings | null>(null);

  // Fetch Store Configuration & Blog Settings for branding
  useEffect(() => {
    async function loadConfig() {
      try {
        const [cfg, bs] = await Promise.all([
          fetchStoreConfig(storeSlug).catch(() => null),
          fetchPublicBlogSettings(storeSlug).catch(() => null)
        ]);
        if (cfg) setConfig(cfg);
        if (bs) setBlogSettings(bs);
      } catch {
        setConfig({ ...FALLBACK_STORE_CONFIG, slug: storeSlug });
      }
    }
    loadConfig();
  }, [storeSlug]);

  // Listen for blog appearance settings updates across the app
  useEffect(() => {
    function handleBlogSettingsUpdated(e: any) {
      if (e?.detail) {
        setBlogSettings(e.detail);
      } else {
        fetchPublicBlogSettings(storeSlug).then(bs => {
          if (bs) setBlogSettings(bs);
        }).catch(() => null);
      }
    }
    window.addEventListener('blog-settings-updated', handleBlogSettingsUpdated as EventListener);
    return () => window.removeEventListener('blog-settings-updated', handleBlogSettingsUpdated as EventListener);
  }, [storeSlug]);

  // Listen for store configuration & institutional updates across the app
  useEffect(() => {
    function handleStoreConfigUpdated(e: any) {
      if (e?.detail) {
        setConfig(prev => ({ ...(prev || FALLBACK_STORE_CONFIG), ...e.detail }));
      } else {
        fetchStoreConfig(storeSlug).then(cfg => {
          if (cfg) setConfig(cfg);
        }).catch(() => null);
      }
    }
    window.addEventListener('store-config-updated', handleStoreConfigUpdated as EventListener);
    return () => window.removeEventListener('store-config-updated', handleStoreConfigUpdated as EventListener);
  }, [storeSlug]);

  // Handle URL mode and query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode') || params.get('view') || params.get('page');
    const storeParam = params.get('loja') || params.get('store');

    if (storeParam) {
      setStoreSlug(storeParam);
    }

    if (modeParam === 'dashboard' || modeParam === 'admin') {
      if (isAdminLoggedIn) {
        setViewMode('dashboard');
      } else {
        setViewMode('blog');
        setLoginModalOpen(true);
      }
    } else if (modeParam === 'store' || modeParam === 'loja') {
      setViewMode('store');
    } else if (modeParam === 'institucional' || modeParam === 'institutional') {
      setViewMode('institutional');
    } else if (modeParam === 'contato' || modeParam === 'contact') {
      setViewMode('contact');
    }
  }, [isAdminLoggedIn]);

  function handleNavigation(page: 'blog' | 'store' | 'institutional' | 'contact') {
    setViewMode(page);
    setSelectedArticle(null);
    fetchStoreConfig(storeSlug).then(cfg => {
      if (cfg) setConfig(cfg);
    }).catch(() => null);
    fetchPublicBlogSettings(storeSlug).then(bs => {
      if (bs) setBlogSettings(bs);
    }).catch(() => null);
    const url = new URL(window.location.href);
    if (page === 'blog') {
      url.searchParams.delete('mode');
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', page);
      url.searchParams.delete('mode');
    }
    window.history.replaceState({}, '', url.toString());
  }

  function handleRequestDashboard() {
    if (isAdminLoggedIn) {
      setViewMode('dashboard');
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'dashboard');
      window.history.replaceState({}, '', url.toString());
    } else {
      setLoginModalOpen(true);
    }
  }

  function handleLoginSuccess() {
    setIsAdminLoggedIn(true);
    setLoginModalOpen(false);
    setViewMode('dashboard');
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'dashboard');
    window.history.replaceState({}, '', url.toString());
  }

  function handleLogout() {
    try {
      localStorage.removeItem('planiloja_admin_session');
      sessionStorage.removeItem('planiloja_admin_session');
    } catch (err) {
      console.error('Error clearing session:', err);
    }
    setIsAdminLoggedIn(false);
    setViewMode('blog');
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.delete('page');
    window.history.replaceState({}, '', url.toString());
  }

  return (
    <div className="min-h-screen relative font-['DM_Sans',sans-serif] bg-[#FBFBFA]">
      {/* Floating Mode Switcher Bar - ONLY visible when Admin is logged in */}
      {isAdminLoggedIn && (
        <div className="fixed top-2 right-2 sm:right-6 z-50 flex items-center gap-1 bg-neutral-900/95 text-white p-1 rounded-full shadow-2xl backdrop-blur-md border border-neutral-700/80 transition text-xs font-semibold animate-in fade-in">
          <button
            onClick={() => handleNavigation('blog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              viewMode === 'blog'
                ? 'bg-white text-neutral-900 shadow-xs font-bold'
                : 'text-neutral-300 hover:text-white'
            }`}
            title="Ver o Blog Principal"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Blog</span>
          </button>

          <button
            onClick={() => handleNavigation('store')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              viewMode === 'store'
                ? 'bg-white text-neutral-900 shadow-xs font-bold'
                : 'text-neutral-300 hover:text-white'
            }`}
            title="Ver a Loja de Produtos"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Loja</span>
          </button>

          <button
            id="btn-admin-access"
            onClick={handleRequestDashboard}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              viewMode === 'dashboard'
                ? 'bg-white text-neutral-900 shadow-xs font-bold'
                : 'text-neutral-300 hover:text-white'
            }`}
            title="Painel Administrativo"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Painel</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 transition"
            title="Encerrar sessão de administrador"
          >
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      )}

      {/* Public Pages View */}
      {viewMode !== 'dashboard' && (
        <>
          {/* Top Universal Navbar (Shown for Blog, Institutional and Contact pages - hidden in StoreFront) */}
          {viewMode !== 'store' && (
            <Navbar
              config={config}
              blogSettings={blogSettings}
              activeNav={viewMode as 'blog' | 'store' | 'institutional' | 'contact'}
              onNavigate={(page) => handleNavigation(page)}
              onOpenAdminModal={() => setLoginModalOpen(true)}
            />
          )}

          {/* PAGE 1: BLOG (Home) */}
          {viewMode === 'blog' && (
            <>
              {selectedArticle ? (
                <ArticleView
                  post={selectedArticle}
                  storeSlug={storeSlug}
                  config={config}
                  blogSettings={blogSettings}
                  onBackToBlog={() => setSelectedArticle(null)}
                  onNavigateToStore={() => handleNavigation('store')}
                  onSelectPost={(post) => setSelectedArticle(post)}
                  onNavigateToInstitutional={() => handleNavigation('institutional')}
                  onNavigateToContact={() => handleNavigation('contact')}
                />
              ) : (
                <BlogHome
                  storeSlug={storeSlug}
                  config={config}
                  blogSettings={blogSettings}
                  onSelectPost={(post) => setSelectedArticle(post)}
                  onNavigateToStore={() => handleNavigation('store')}
                  onNavigateToInstitutional={(tab) => {
                    if (tab) setInstitutionalTab(tab);
                    handleNavigation('institutional');
                  }}
                  onNavigateToContact={() => handleNavigation('contact')}
                />
              )}
            </>
          )}

          {/* PAGE 2: STORE FRONT (Loja de Achadinhos) */}
          {viewMode === 'store' && (
            <StoreFront
              storeSlug={storeSlug}
              onOpenDashboard={handleRequestDashboard}
              onNavigateToBlog={() => handleNavigation('blog')}
            />
          )}

          {/* PAGE 3: INSTITUTIONAL (Sobre, Termos, Privacidade, Afiliados) */}
          {viewMode === 'institutional' && (
            <InstitutionalPage
              config={config}
              initialTab={institutionalTab}
              onNavigateToStore={() => handleNavigation('store')}
              onNavigateToBlog={() => handleNavigation('blog')}
              onNavigateToContact={() => handleNavigation('contact')}
            />
          )}

          {/* PAGE 4: CONTACT (Formulário de Contato & FAQ) */}
          {viewMode === 'contact' && (
            <ContactPage
              storeSlug={storeSlug}
              config={config}
              onNavigateToStore={() => handleNavigation('store')}
              onNavigateToBlog={() => handleNavigation('blog')}
            />
          )}
        </>
      )}

      {/* Admin Dashboard View */}
      {viewMode === 'dashboard' && (
        <DashboardLayout
          currentStoreSlug={storeSlug}
          onSelectStoreSlug={(slug) => setStoreSlug(slug)}
          onOpenStoreFront={() => handleNavigation('store')}
          onLogout={handleLogout}
        />
      )}

      {/* Admin Login Popup Modal */}
      <AdminLoginModal
        isOpen={loginModalOpen}
        storeSlug={storeSlug}
        onSuccess={handleLoginSuccess}
        onCancel={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
