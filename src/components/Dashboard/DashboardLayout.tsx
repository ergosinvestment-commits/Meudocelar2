import React, { useState, useEffect } from 'react';
import { StoreConfig, Product } from '../../types';
import { fetchStoreConfig, fetchAdminProducts } from '../../api/client';
import { FALLBACK_STORE_CONFIG, FALLBACK_PRODUCTS } from '../../data/defaultData';
import ProductsTab from './ProductsTab';
import AppearanceTab from './AppearanceTab';
import SettingsTab from './SettingsTab';
import ReportsTab from './ReportsTab';
import DatabaseTab from './DatabaseTab';
import UsersTab from './UsersTab';
import BlogTab from './BlogTab';
import BlogSettingsView from './Blog/BlogSettingsView';
import { PriceMonitorTab } from './PriceMonitorTab';
import {
  Package,
  Palette,
  Layout,
  Settings,
  BarChart3,
  ExternalLink,
  Store,
  ChevronDown,
  RefreshCw,
  Plus,
  LogOut,
  ShieldCheck,
  Server,
  Users,
  TrendingUp,
  BookOpen
} from 'lucide-react';

interface DashboardLayoutProps {
  currentStoreSlug: string;
  onSelectStoreSlug: (slug: string) => void;
  onOpenStoreFront: () => void;
  onLogout?: () => void;
}

type TabType = 'products' | 'price-monitor' | 'blog' | 'appearance' | 'blog-appearance' | 'settings' | 'reports' | 'database' | 'users';

export default function DashboardLayout({
  currentStoreSlug,
  onSelectStoreSlug,
  onOpenStoreFront,
  onLogout
}: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [config, setConfig] = useState<StoreConfig>({ ...FALLBACK_STORE_CONFIG, slug: currentStoreSlug });
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreConfig[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [cfg, prods, allStoresRes] = await Promise.all([
        fetchStoreConfig(currentStoreSlug),
        fetchAdminProducts(currentStoreSlug),
        fetch('/api/admin/stores').then(r => r.json()).catch(() => [])
      ]);
      if (cfg) {
        setConfig(cfg);
      }
      if (Array.isArray(prods)) {
        setProducts(prods);
      }
      if (Array.isArray(allStoresRes) && allStoresRes.length > 0) {
        setStores(allStoresRes);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentStoreSlug]);

  const primaryColor = config?.corPrimaria || '#2A5C3F';

  return (
    <div className="min-h-screen bg-[#F4F4F2] text-[#1B1B1B] font-['DM_Sans',sans-serif] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-neutral-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1300px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Store Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                P
              </div>
              <span className="font-bold text-base tracking-tight text-neutral-900 hidden sm:inline">
                Planiloja
              </span>
            </div>

            <div className="h-5 w-[1px] bg-neutral-200 hidden sm:block" />

            {/* Store switcher */}
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-neutral-400" />
              <select
                value={currentStoreSlug}
                onChange={(e) => onSelectStoreSlug(e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-800 outline-none cursor-pointer transition"
              >
                {stores.length > 0 ? (
                  stores.map(s => (
                    <option key={s.slug} value={s.slug}>
                      {s.storeName || s.slug}
                    </option>
                  ))
                ) : (
                  <option value={currentStoreSlug}>{config?.storeName || currentStoreSlug}</option>
                )}
              </select>
            </div>
          </div>

          {/* Quick Actions (Open Live Store View & Logout) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStoreFront}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2A5C3F] hover:bg-[#1E4530] text-white transition shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Vitrine</span>
            </button>

            {onLogout && (
              <button
                id="btn-admin-logout"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 transition border border-rose-200 shadow-xs cursor-pointer"
                title="Encerrar sessão e bloquear o painel administrativo"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Sair / Bloquear</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-[1300px] mx-auto px-4 md:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-neutral-100">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catálogo & Produtos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100 text-neutral-700 font-bold">
              {products.length}
            </span>
          </button>

          <button
            id="tab-price-monitor"
            onClick={() => setActiveTab('price-monitor')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'price-monitor'
                ? 'border-pink-600 text-pink-600 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-pink-600" />
            <span>Monitor de Preços</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-pink-100 text-pink-700 font-bold">
              Novo
            </span>
          </button>

          <button
            id="tab-blog"
            onClick={() => setActiveTab('blog')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'blog'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Blog &amp; Artigos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              Artigos
            </span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Aparência da Loja</span>
          </button>

          <button
            id="tab-blog-appearance"
            onClick={() => setActiveTab('blog-appearance')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'blog-appearance'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/40'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Layout className="w-4 h-4 text-emerald-600" />
            <span>Aparência do Blog</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              Topo &amp; Menu
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações & Canais</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Relatórios & Métricas</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'database'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Banco & Hostinger</span>
          </button>

          <button
            id="tab-users"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Usuários & Acessos</span>
          </button>
        </div>
      </header>

      {/* Dashboard Main Area */}
      <main className="max-w-[1300px] mx-auto px-4 md:px-6 py-6 md:py-8 w-full flex-1">
        {loading && !config ? (
          <div className="py-20 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Carregando painel...</p>
          </div>
        ) : (
          <>
            {activeTab === 'products' && (
              <ProductsTab
                storeSlug={currentStoreSlug}
                products={products}
                onRefresh={loadData}
                primaryColor={primaryColor}
              />
            )}

            {activeTab === 'price-monitor' && (
              <PriceMonitorTab
                storeSlug={currentStoreSlug}
                products={products}
                onProductsUpdated={loadData}
              />
            )}

            {activeTab === 'blog' && (
              <BlogTab storeSlug={currentStoreSlug} />
            )}

            {activeTab === 'appearance' && config && (
              <AppearanceTab
                storeSlug={currentStoreSlug}
                config={config}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'blog-appearance' && (
              <BlogSettingsView
                storeSlug={currentStoreSlug}
                onSaved={() => {
                  if (typeof loadData === 'function') loadData();
                }}
              />
            )}

            {activeTab === 'settings' && config && (
              <SettingsTab
                storeSlug={currentStoreSlug}
                config={config}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsTab storeSlug={currentStoreSlug} />
            )}

            {activeTab === 'database' && (
              <DatabaseTab storeSlug={currentStoreSlug} />
            )}

            {activeTab === 'users' && (
              <UsersTab
                storeSlug={currentStoreSlug}
                primaryColor={primaryColor}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 bg-white py-4 px-6 text-center text-xs text-neutral-400">
        Planiloja — Painel de Controle de Vitrine de Afiliados
      </footer>
    </div>
  );
}
