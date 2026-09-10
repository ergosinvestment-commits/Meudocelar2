import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  DollarSign, 
  Percent, 
  ShieldCheck, 
  Layers, 
  Search, 
  History, 
  Play, 
  Check, 
  X, 
  PackageX, 
  Zap,
  Globe,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  Product, 
  PriceMonitorSettings, 
  PriceCheckResult, 
  PriceLogRecord, 
  PriceMarkupType, 
  OutOfStockAction 
} from '../../types';
import { 
  fetchPriceMonitorSettings, 
  savePriceMonitorSettings, 
  checkSupplierUrl, 
  scanCatalogPrices, 
  applyPriceUpdates, 
  fetchPriceLogs 
} from '../../api/client';

interface PriceMonitorTabProps {
  storeSlug: string;
  products: Product[];
  onProductsUpdated?: () => void;
}

export const PriceMonitorTab: React.FC<PriceMonitorTabProps> = ({
  storeSlug,
  products,
  onProductsUpdated
}) => {
  // Settings state
  const [settings, setSettings] = useState<PriceMonitorSettings>({
    storeId: '',
    enabled: true,
    autoApply: false,
    disableOn404: true,
    frequencyHours: 12,
    markupType: 'direct',
    markupValue: 0,
    outOfStockAction: 'pause',
    notifyPriceChanges: true
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<PriceCheckResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [isApplyingUpdates, setIsApplyingUpdates] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Quick single URL test
  const [testUrl, setTestUrl] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<PriceCheckResult | null>(null);

  // History logs
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState<PriceLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Filter state for results
  const [resultFilter, setResultFilter] = useState<'all' | 'changes' | 'out_of_stock' | 'not_found' | 'errors'>('all');

  // Load initial settings
  useEffect(() => {
    loadSettings();
  }, [storeSlug]);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const data = await fetchPriceMonitorSettings(storeSlug);
      if (data) {
        setSettings({
          ...data,
          disableOn404: data.disableOn404 !== undefined ? data.disableOn404 : true
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações de monitoramento:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSavingSettings(true);
      const saved = await savePriceMonitorSettings(storeSlug, settings);
      setSettings(saved);
      setShowSettingsModal(false);
      setStatusMessage({ text: 'Configurações de monitoramento salvas com sucesso!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: 'Erro ao salvar configurações: ' + (err?.message || 'Falha'), type: 'error' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Run full catalog scan
  const handleStartScan = async () => {
    try {
      setIsScanning(true);
      setStatusMessage({ text: 'Iniciando verificação de preços nos fornecedores... Isso pode levar alguns segundos.', type: 'info' });
      setScanResults([]);
      setSelectedResults([]);

      const data = await scanCatalogPrices(storeSlug, undefined, settings.autoApply);
      
      setScanResults(data.results || []);
      
      // Auto select items that have price changes, are out of stock, or returned 404
      const selectableIds = (data.results || [])
        .filter(r => r.productId && (r.status === 'up' || r.status === 'down' || r.status === 'out_of_stock' || r.status === 'not_found' || r.is404))
        .map(r => r.productId as string);
      setSelectedResults(selectableIds);

      if (data.appliedCount > 0 || (data.disabled404Count && data.disabled404Count > 0)) {
        setStatusMessage({
          text: data.message || `Varredura concluída! ${data.appliedCount} produtos atualizados.`,
          type: 'success'
        });
        if (onProductsUpdated) onProductsUpdated();
      } else {
        setStatusMessage({
          text: `Varredura concluída em ${data.scannedCount} produto(s). Revise as alterações abaixo.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: 'Erro na varredura: ' + (err?.message || 'Falha de conexão'), type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  // Test single URL
  const handleTestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) return;

    try {
      setIsTestingUrl(true);
      setTestResult(null);
      const result = await checkSupplierUrl(testUrl.trim(), settings.markupType, settings.markupValue);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        url: testUrl,
        platform: 'Desconhecido',
        supplierPrice: null,
        supplierPromo: null,
        calculatedPrice: null,
        calculatedPromo: null,
        inStock: false,
        currency: 'BRL',
        diffPercent: 0,
        status: 'error',
        message: err?.message || 'Falha ao consultar fornecedor',
        checkedAt: new Date().toISOString()
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Apply selected price changes
  const handleApplySelected = async () => {
    if (selectedResults.length === 0) return;

    const updatesToApply: any[] = [];
    scanResults.forEach(res => {
      if (res.productId && selectedResults.includes(res.productId)) {
        const is404 = res.status === 'not_found' || res.is404 || res.httpStatus === 404;
        const item: any = {
          productId: res.productId,
          newSupplierPrice: res.supplierPrice,
          newSupplierPromo: res.supplierPromo,
          stockStatus: res.inStock ? 'in_stock' : 'out_of_stock'
        };

        if (is404) {
          item.ativo = false;
          item.stockStatus = 'out_of_stock';
        } else {
          if (res.calculatedPrice && res.calculatedPrice > 0) {
            item.newPrice = res.calculatedPrice;
          }
          if (res.calculatedPromo !== undefined) {
            item.newPromo = res.calculatedPromo;
          }
          if (!res.inStock && settings.outOfStockAction === 'pause') {
            item.ativo = false;
          }
        }

        updatesToApply.push(item);
      }
    });

    if (updatesToApply.length === 0) return;

    try {
      setIsApplyingUpdates(true);
      const result = await applyPriceUpdates(storeSlug, updatesToApply);
      setStatusMessage({ text: result.message, type: 'success' });
      if (onProductsUpdated) onProductsUpdated();
      // Remove applied items from selection
      setSelectedResults([]);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: 'Erro ao aplicar alterações: ' + (err?.message || 'Falha'), type: 'error' });
    } finally {
      setIsApplyingUpdates(false);
    }
  };

  // Load history logs
  const handleOpenLogs = async () => {
    setShowLogsModal(true);
    try {
      setIsLoadingLogs(true);
      const data = await fetchPriceLogs(storeSlug, 50);
      setLogs(data || []);
    } catch (err) {
      console.warn('Erro ao carregar logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const monitoredProductsCount = products.filter(p => !!p.linkAfiliado).length;

  const filteredResults = scanResults.filter(r => {
    if (resultFilter === 'changes') return r.status === 'up' || r.status === 'down';
    if (resultFilter === 'out_of_stock') return (r.status === 'out_of_stock' || !r.inStock) && r.status !== 'not_found' && !r.is404;
    if (resultFilter === 'not_found') return r.status === 'not_found' || r.is404 || r.httpStatus === 404;
    if (resultFilter === 'errors') return (r.status === 'error' || r.status === 'not_found' || r.is404);
    return true;
  });

  const changedCount = scanResults.filter(r => r.status === 'up' || r.status === 'down').length;
  const outOfStockCount = scanResults.filter(r => (r.status === 'out_of_stock' || !r.inStock) && r.status !== 'not_found' && !r.is404).length;
  const notFoundCount = scanResults.filter(r => r.status === 'not_found' || r.is404 || r.httpStatus === 404).length;
  const errorCount = scanResults.filter(r => r.status === 'error' && !r.is404 && r.status !== 'not_found').length;

  return (
    <div id="price-monitor-tab" className="space-y-6">
      {/* Top Banner / Status Overview */}
      <div id="price-monitor-header" className="bg-white rounded-xl shadow-xs border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">Monitor de Preços e Fornecedores</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                settings.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
              }`}>
                {settings.enabled ? '● Monitor Ativo' : '○ Monitor Desativado'}
              </span>
              {settings.autoApply && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Auto-Sincronização
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Rastreamento automático de preços, ofertas e estoque em lojas parceiras (Hotmart, Shopee, AliExpress, Magalu, Amazon, Kiwify, etc.).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-open-logs"
              onClick={handleOpenLogs}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <History className="w-4 h-4 text-gray-500" />
              Histórico
            </button>

            <button
              id="btn-open-settings"
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-500" />
              Regras e Lucro
            </button>

            <button
              id="btn-start-catalog-scan"
              onClick={handleStartScan}
              disabled={isScanning || monitoredProductsCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 active:bg-pink-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Varrendo Catálogo...' : 'Verificar Preços Agora'}
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="bg-gray-50/80 rounded-lg p-3.5 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Produtos Monitorados</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{monitoredProductsCount} / {products.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">com links de afiliados</p>
          </div>

          <div className="bg-gray-50/80 rounded-lg p-3.5 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Regra de Precificação</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {settings.markupType === 'percentage' && `+${settings.markupValue}% Lucro`}
              {settings.markupType === 'fixed' && `+R$ ${Number(settings.markupValue).toFixed(2)} Lucro`}
              {settings.markupType === 'direct' && 'Preço Fornecedor (1:1)'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">aplicado no catálogo</p>
          </div>

          <div className="bg-gray-50/80 rounded-lg p-3.5 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Frequência Automática</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {settings.frequencyHours > 0 ? `A cada ${settings.frequencyHours}h` : 'Apenas Manual'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">rotina em background</p>
          </div>

          <div className="bg-gray-50/80 rounded-lg p-3.5 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Última Sincronização</p>
            <p className="text-sm font-bold text-gray-900 mt-1 truncate">
              {settings.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleString('pt-BR') : 'Nunca sincronizado'}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {settings.autoApply ? 'Atualização direta' : 'Aprovação manual'}
            </p>
          </div>
        </div>

        {/* Supported Platforms Tag Strip */}
        <div className="mt-4 pt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span className="font-medium text-gray-700 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-pink-600" /> Fornecedores Rastreados:
          </span>
          {['Hotmart', 'AliExpress', 'Magalu', 'Shopee', 'Kiwify', 'Amazon', 'Mercado Livre', 'Braip', 'Eduzz', 'Shein'].map(plat => (
            <span key={plat} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
              {plat}
            </span>
          ))}
        </div>
      </div>

      {/* Status Message Alert */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' :
          'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
            {statusMessage.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Test Tool for Single URL */}
      <div id="quick-url-test-card" className="bg-white rounded-xl shadow-xs border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-pink-600" />
          Testar Link Individual de Fornecedor
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Cole qualquer link de produto de afiliados (Hotmart, Shopee, AliExpress, Magalu, Amazon, Kiwify, etc.) para extrair o preço e disponibilidade em tempo real.
        </p>

        <form onSubmit={handleTestUrl} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="input-test-url"
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="Cole o link do produto aqui (ex: https://shopee.com.br/..., https://hotmart.com/...)"
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:bg-white"
            />
          </div>
          <button
            id="btn-test-url-submit"
            type="submit"
            disabled={isTestingUrl || !testUrl.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            {isTestingUrl ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Consultando Fornecedor...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Extrair Preço
              </>
            )}
          </button>
        </form>

        {/* Test Result Card */}
        {testResult && (
          <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {testResult.detectedImage ? (
                  <img
                    src={testResult.detectedImage}
                    alt={testResult.detectedName || 'Produto'}
                    className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {testResult.platform}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs font-semibold rounded">
                      {testResult.platform}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      testResult.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {testResult.inStock ? 'Em Estoque' : 'Esgotado / Indisponível'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">
                    {testResult.detectedName || 'Produto Detectado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-400">Preço Fornecedor</p>
                  <p className="text-base font-bold text-gray-900">
                    {testResult.supplierPrice ? `R$ ${testResult.supplierPrice.toFixed(2)}` : 'Não detectado'}
                  </p>
                </div>
                {testResult.calculatedPrice && (
                  <div className="pl-4 border-l border-gray-200">
                    <p className="text-xs text-pink-600 font-semibold">Preço c/ Margem</p>
                    <p className="text-base font-bold text-pink-600">
                      R$ {testResult.calculatedPrice.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {testResult.message && (
              <p className={`text-xs mt-3 ${testResult.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                {testResult.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Catalog Scan Results & Action Table */}
      <div id="catalog-scan-results" className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-600" />
              Resultado da Varredura de Preços
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {scanResults.length > 0
                ? `${scanResults.length} produtos analisados. Selecione as alterações que deseja aplicar ao seu catálogo.`
                : 'Execute uma varredura para comparar os preços do seu catálogo com os fornecedores.'}
            </p>
          </div>

          {/* Filter Pills & Apply Button */}
          {scanResults.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setResultFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    resultFilter === 'all' ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Todos ({scanResults.length})
                </button>
                <button
                  onClick={() => setResultFilter('changes')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    resultFilter === 'changes' ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Oscilaram ({changedCount})
                </button>
                <button
                  onClick={() => setResultFilter('out_of_stock')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    resultFilter === 'out_of_stock' ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Esgotados ({outOfStockCount})
                </button>
                {notFoundCount > 0 && (
                  <button
                    onClick={() => setResultFilter('not_found')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      resultFilter === 'not_found' ? 'bg-red-600 text-white shadow-xs font-semibold' : 'text-red-700 hover:text-red-900'
                    }`}
                  >
                    404 Quebrados ({notFoundCount})
                  </button>
                )}
              </div>

              <button
                id="btn-apply-selected-updates"
                onClick={handleApplySelected}
                disabled={isApplyingUpdates || selectedResults.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isApplyingUpdates ? 'Atualizando...' : `Aplicar Selecionados (${selectedResults.length})`}
              </button>
            </div>
          )}
        </div>

        {/* Results Table */}
        {scanResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3.5 pl-6 w-10">
                    <input
                      type="checkbox"
                      checked={selectedResults.length > 0 && selectedResults.length === filteredResults.filter(r => !!r.productId).length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedResults(filteredResults.map(r => r.productId as string).filter(Boolean));
                        } else {
                          setSelectedResults([]);
                        }
                      }}
                      className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="p-3.5">Produto</th>
                  <th className="p-3.5">Plataforma</th>
                  <th className="p-3.5">Preço Atual</th>
                  <th className="p-3.5">Preço Fornecedor</th>
                  <th className="p-3.5">Preço Calculado</th>
                  <th className="p-3.5">Oscilação</th>
                  <th className="p-3.5">Status Fornecedor</th>
                  <th className="p-3.5 pr-6 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResults.map((result, idx) => {
                  const isSelected = result.productId ? selectedResults.includes(result.productId) : false;
                  return (
                    <tr key={idx} className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-pink-50/20' : ''}`}>
                      <td className="p-3.5 pl-6">
                        {result.productId && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResults([...selectedResults, result.productId as string]);
                              } else {
                                setSelectedResults(selectedResults.filter(id => id !== result.productId));
                              }
                            }}
                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                          />
                        )}
                      </td>
                      <td className="p-3.5 font-medium text-gray-900 max-w-xs">
                        <div className="flex items-center gap-2">
                          {result.detectedImage && (
                            <img
                              src={result.detectedImage}
                              alt=""
                              className="w-8 h-8 rounded object-cover shrink-0 border border-gray-100"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="truncate" title={result.productName || result.detectedName}>
                            {result.productName || result.detectedName || 'Produto'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                          {result.platform}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-gray-700">
                        {result.currentCatalogPrice ? `R$ ${result.currentCatalogPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3.5 font-semibold text-gray-900">
                        {result.supplierPrice ? `R$ ${result.supplierPrice.toFixed(2)}` : (
                          <span className="text-gray-400 italic">Não detectado</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-pink-600">
                        {result.calculatedPrice ? `R$ ${result.calculatedPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3.5">
                        {result.status === 'not_found' || result.is404 || result.httpStatus === 404 ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100/80 px-2 py-0.5 rounded border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" /> Erro 404 (Desabilitar)
                          </span>
                        ) : result.status === 'up' ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                            <TrendingUp className="w-3.5 h-3.5" /> +{result.diffPercent}%
                          </span>
                        ) : result.status === 'down' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <TrendingDown className="w-3.5 h-3.5" /> -{result.diffPercent}%
                          </span>
                        ) : result.status === 'unchanged' ? (
                          <span className="text-gray-400 font-medium">Inalterado</span>
                        ) : result.status === 'out_of_stock' ? (
                          <span className="inline-flex items-center gap-1 text-orange-600 font-bold">
                            <PackageX className="w-3.5 h-3.5" /> Esgotado
                          </span>
                        ) : (
                          <span className="text-red-500 font-medium">Erro na leitura</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {result.status === 'not_found' || result.is404 || result.httpStatus === 404 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                            404 - Não Encontrado
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            result.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {result.inStock ? 'Disponível' : 'Indisponível'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-gray-400 hover:text-pink-600 transition-colors"
                          title="Abrir no Fornecedor"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Nenhuma varredura recente</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
              Clique no botão "Verificar Preços Agora" acima para escanear todos os {monitoredProductsCount} produtos com links de afiliados cadastrados no seu catálogo.
            </p>
            <button
              onClick={handleStartScan}
              disabled={isScanning || monitoredProductsCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Iniciar Varredura de Catálogo
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-600" />
                Regras de Monitoramento e Lucro
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 mt-4 text-sm">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Ativar Monitoramento</p>
                  <p className="text-xs text-gray-500">Habilita a checagem periódica nos fornecedores</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5 text-pink-600 rounded border-gray-300 focus:ring-pink-500"
                />
              </div>

              {/* Auto apply toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Atualização Automática</p>
                  <p className="text-xs text-gray-500">Aplica novos preços direto na loja sem precisar aprovar</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoApply}
                  onChange={(e) => setSettings({ ...settings, autoApply: e.target.checked })}
                  className="w-5 h-5 text-pink-600 rounded border-gray-300 focus:ring-pink-500"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Frequência de Verificação</label>
                <select
                  value={settings.frequencyHours}
                  onChange={(e) => setSettings({ ...settings, frequencyHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-pink-500"
                >
                  <option value={0}>Apenas Manual (Sob demanda)</option>
                  <option value={6}>A cada 6 horas</option>
                  <option value={12}>A cada 12 horas (Recomendado)</option>
                  <option value={24}>A cada 24 horas (Diário)</option>
                </select>
              </div>

              {/* Markup Type & Value */}
              <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-3">
                <label className="block font-semibold text-gray-900">Regra de Margem de Lucro (Markup)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, markupType: 'direct' })}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-all ${
                      settings.markupType === 'direct'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    1:1 Direto
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, markupType: 'percentage' })}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-all ${
                      settings.markupType === 'percentage'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    % Porcentagem
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, markupType: 'fixed' })}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-all ${
                      settings.markupType === 'fixed'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    R$ Valor Fixo
                  </button>
                </div>

                {settings.markupType !== 'direct' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {settings.markupType === 'percentage' ? 'Acréscimo percentual (%) sobre o fornecedor:' : 'Acréscimo fixo em Reais (R$) sobre o fornecedor:'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.markupValue}
                        onChange={(e) => setSettings({ ...settings, markupValue: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-pink-500"
                      />
                      <span className="absolute left-2.5 top-2 text-gray-400 text-sm">
                        {settings.markupType === 'percentage' ? '%' : 'R$'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Out of stock action */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Quando o produto esgotar no fornecedor:</label>
                <select
                  value={settings.outOfStockAction}
                  onChange={(e) => setSettings({ ...settings, outOfStockAction: e.target.value as OutOfStockAction })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-pink-500"
                >
                  <option value="pause">Pausar / Ocultar produto da loja automaticamente</option>
                  <option value="keep">Manter ativo e apenas sinalizar no painel</option>
                  <option value="notify">Apenas gerar registro no histórico</option>
                </select>
              </div>

              {/* Disable on 404 toggle */}
              <div className="flex items-center justify-between p-3.5 bg-red-50/70 rounded-xl border border-red-200">
                <div className="pr-3">
                  <p className="font-semibold text-red-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    Desabilitar produto em caso de Erro 404
                  </p>
                  <p className="text-xs text-red-800/80 mt-0.5">
                    Se o link do fornecedor retornar 404 (página ou produto inexistente/removido), o produto será desativado da sua loja automaticamente para não exibir links quebrados aos clientes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.disableOn404 !== false}
                  onChange={(e) => setSettings({ ...settings, disableOn404: e.target.checked })}
                  className="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? 'Salvando...' : 'Salvar Regras'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-pink-600" />
                Histórico de Alterações de Preços
              </h3>
              <button onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4">
              {isLoadingLogs ? (
                <div className="py-12 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-pink-600" />
                  Carregando registros...
                </div>
              ) : logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{log.productName}</span>
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded font-semibold text-[10px]">
                            {log.platform}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                            log.actionTaken === 'updated' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {log.actionTaken === 'updated' ? 'Preço Atualizado' : 'Pausado'}
                          </span>
                        </div>
                        <p className="text-gray-500 mt-1">
                          De R$ {log.oldPrice.toFixed(2)} → Para R$ {log.appliedPrice.toFixed(2)} (Fornecedor: R$ {log.newSupplierPrice.toFixed(2)})
                        </p>
                      </div>
                      <span className="text-gray-400 shrink-0">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  Nenhuma alteração de preço registrada no histórico ainda.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 text-right">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
