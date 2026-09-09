import React, { useState, useEffect } from 'react';
import { StoreMetrics } from '../../types';
import { fetchStoreMetrics } from '../../api/client';
import { BarChart3, Eye, MousePointerClick, TrendingUp, Tag, Globe, RefreshCw } from 'lucide-react';

interface ReportsTabProps {
  storeSlug: string;
}

export default function ReportsTab({ storeSlug }: ReportsTabProps) {
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number | undefined>(7);

  async function loadMetrics() {
    try {
      setLoading(true);
      const data = await fetchStoreMetrics(storeSlug, selectedDays);
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, [storeSlug, selectedDays]);

  if (loading && !metrics) {
    return (
      <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold">Carregando métricas e relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Métricas & Relatório de Cliques</h2>
          <p className="text-xs text-neutral-500">Acompanhe o desempenho de cliques, produtos mais quentes e canais de conversão.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="bg-white border border-neutral-200 rounded-xl p-1 flex items-center shadow-xs">
            <button
              onClick={() => setSelectedDays(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDays === 1 ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setSelectedDays(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDays === 7 ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setSelectedDays(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDays === 30 ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setSelectedDays(undefined)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDays === undefined ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos
            </button>
          </div>

          <button
            onClick={loadMetrics}
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition border border-neutral-200"
            title="Atualizar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Total Views */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Visualizações</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {metrics?.views.toLocaleString('pt-BR') || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Acessos à vitrine</div>
        </div>

        {/* Total Clicks */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cliques Afiliados</span>
            <MousePointerClick className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {metrics?.totalClicks.toLocaleString('pt-BR') || 0}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">Cliques no botão Ver Oferta</div>
        </div>

        {/* CTR */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">CTR Estimado</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {metrics?.ctr || 0}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Taxa de conversão por visita</div>
        </div>

        {/* Coupon Copies */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cupons Copiados</span>
            <Tag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {metrics?.couponCopies || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Interações com cupons</div>
        </div>
      </div>

      {/* Main Breakdown: Top Products & Platforms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Clicked Products (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neutral-600" />
              Produtos Mais Clicados
            </h3>
            <span className="text-xs text-neutral-400">Ranking por interesse</span>
          </div>

          <div className="space-y-3">
            {(!metrics?.topProducts || metrics.topProducts.length === 0) ? (
              <p className="text-xs text-neutral-400 py-6 text-center">Nenhum clique registrado no período.</p>
            ) : (
              metrics.topProducts.map((p, idx) => {
                const maxClicks = metrics.topProducts[0]?.cliques || 1;
                const percent = Math.round((p.cliques / maxClicks) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-neutral-800 truncate">{p.nome}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600 flex-shrink-0">
                          {p.plataforma}
                        </span>
                      </div>
                      <span className="font-bold text-neutral-900 flex-shrink-0 font-mono">
                        {p.cliques} clique{p.cliques !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Platform & Category Distribution (1 col) */}
        <div className="space-y-6">
          {/* Platforms */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2">
              Cliques por Plataforma
            </h3>
            <div className="space-y-2.5">
              {metrics?.platforms.map((plat) => (
                <div key={plat.plataforma} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">{plat.plataforma}</span>
                    <span className="font-bold text-neutral-900">{plat.count} ({plat.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${plat.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2">
              Cliques por Categoria
            </h3>
            <div className="space-y-2.5">
              {metrics?.categories.map((cat) => (
                <div key={cat.categoria} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">{cat.categoria}</span>
                    <span className="font-bold text-neutral-900">{cat.count} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${cat.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Sources, UTMs & Recent Clicks Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UTMs & Traffic Origins */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-neutral-500" />
            Origem do Tráfego (UTMs)
          </h3>
          <div className="space-y-2">
            {(!metrics?.utms || metrics.utms.length === 0) ? (
              <p className="text-xs text-neutral-400 py-4 text-center">Nenhum parâmetro de tráfego capturado ainda.</p>
            ) : (
              metrics.utms.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-50 text-xs">
                  <span className="font-medium text-neutral-700">{u.source}</span>
                  <span className="font-bold text-neutral-900 font-mono">{u.count} cliques</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Click Log */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-neutral-500" />
            Registro de Cliques em Tempo Real
          </h3>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {(!metrics?.recentClicks || metrics.recentClicks.length === 0) ? (
              <p className="text-xs text-neutral-400 py-4 text-center">Nenhum clique registrado recentemente.</p>
            ) : (
              metrics.recentClicks.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100 text-xs flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 truncate max-w-[200px]">{c.produto}</span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="font-semibold text-emerald-700">{c.plataforma}</span>
                    <span>·</span>
                    <span>{c.categoria}</span>
                    <span>·</span>
                    <span className="truncate">{c.origem || 'Direto'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
