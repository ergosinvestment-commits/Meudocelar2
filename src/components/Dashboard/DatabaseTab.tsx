import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Shield,
  Zap,
  Copy,
  Check,
  Terminal,
  HelpCircle,
  FileCode,
  Layers,
  Activity,
  HardDrive,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

interface DatabaseTabProps {
  storeSlug: string;
}

interface DbDiagnostics {
  connected: boolean;
  driver: string;
  error?: string | null;
  host?: string;
  database?: string;
  user?: string;
  port?: number;
  latencyMs?: number;
  tableCounts?: {
    stores: number;
    products: number;
    categories: number;
    platforms: number;
    clicks: number;
  };
  localCounts?: {
    stores: number;
    products: number;
    categories: number;
    platforms: number;
    clicks: number;
  };
}

export default function DatabaseTab({ storeSlug }: DatabaseTabProps) {
  const [diag, setDiag] = useState<DbDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);
  const [sqlContent, setSqlContent] = useState('');
  const [loadingSql, setLoadingSql] = useState(false);
  
  // Actions
  const [syncingAll, setSyncingAll] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [optimizingImages, setOptimizingImages] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Connection tester / live config state
  const [testHost, setTestHost] = useState('localhost');
  const [testPort, setTestPort] = useState('3306');
  const [testUser, setTestUser] = useState('');
  const [testPass, setTestPass] = useState('');
  const [testDb, setTestDb] = useState('');
  const [testSsl, setTestSsl] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  // Safe fetch helper that guarantees proper JSON parsing with friendly error messages
  async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {})
      }
    });

    const text = await res.text();
    if (!text || !text.trim()) {
      if (res.ok) return { success: true } as unknown as T;
      throw new Error(`O servidor respondeu com corpo vazio (${res.status}).`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && (text.startsWith('<!DOCTYPE') || text.includes('<html') || text.includes('Fatal error') || text.includes('Parse error'))) {
      if (text.includes('Fatal error') || text.includes('Parse error')) {
        const cleanErr = text.replace(/<[^>]*>/g, '').trim().slice(0, 180);
        throw new Error(`Erro PHP na Hostinger: ${cleanErr}`);
      }
      throw new Error(`O servidor respondeu com página HTML (${res.status}). Verifique se o servidor está ativo.`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Resposta do servidor não é um JSON válido: ${text.slice(0, 150)}`);
    }
  }

  async function loadDiagnostics() {
    try {
      setLoading(true);
      const data = await safeFetchJson('/api/admin/database/diagnostics');
      if (data.success) {
        setDiag(data);
        if (data.host && data.host !== 'Local / Não configurado') setTestHost(data.host);
        if (data.database && data.database !== 'store_data.json') setTestDb(data.database);
        if (data.user && data.user !== 'Nenhum') setTestUser(data.user);
        if (data.port) setTestPort(String(data.port));
      }
    } catch (err) {
      console.error('Error fetching database diagnostics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopySql() {
    try {
      setLoadingSql(true);
      let content = sqlContent;
      if (!content) {
        const data = await safeFetchJson(`/api/admin/database/sql-content?slug=${encodeURIComponent(storeSlug)}`);
        content = data.sql;
        setSqlContent(content);
      }
      navigator.clipboard.writeText(content);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    } finally {
      setLoadingSql(false);
    }
  }

  async function handleTestConnection(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!testHost || !testUser || !testDb) {
      setTestResult({
        success: false,
        message: 'Preencha o Host, Usuário e Nome do Banco de Dados para realizar o teste.'
      });
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const data = await safeFetchJson('/api/admin/database/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: testHost.trim(),
          port: testPort.trim() || '3306',
          user: testUser.trim(),
          password: testPass,
          database: testDb.trim(),
          ssl: testSsl
        })
      });

      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Erro na requisição: ' + (err?.message || 'Não foi possível conectar')
      });
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSaveAndConnect() {
    if (!testHost || !testUser || !testDb) {
      setTestResult({
        success: false,
        message: 'Preencha o Host, Usuário e Nome do Banco para conectar.'
      });
      return;
    }

    setSavingConfig(true);
    setTestResult(null);
    try {
      const data = await safeFetchJson('/api/admin/database/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: testHost.trim(),
          port: testPort.trim() || '3306',
          user: testUser.trim(),
          password: testPass,
          database: testDb.trim(),
          ssl: testSsl
        })
      });
      setTestResult(data);
      if (data.success) {
        setActionFeedback({ success: true, message: data.message });
        loadDiagnostics();
        setTimeout(() => setActionFeedback(null), 6000);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Falha ao salvar configuração: ' + (err?.message || 'Erro de rede')
      });
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSyncAllToMySQL() {
    try {
      setSyncingAll(true);
      setActionFeedback(null);
      const data = await safeFetchJson('/api/admin/database/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setActionFeedback({
        success: data.success,
        message: data.message || 'Sincronização concluída!'
      });
      loadDiagnostics();
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      setActionFeedback({
        success: false,
        message: 'Erro ao sincronizar dados para o MySQL: ' + err?.message
      });
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleSeedMySQLNow() {
    try {
      setSeedingDemo(true);
      setActionFeedback(null);
      const data = await safeFetchJson('/api/admin/database/seed-mysql-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: storeSlug })
      });
      setActionFeedback({
        success: data.success,
        message: data.message || 'Catálogo e banco populados com sucesso!'
      });
      loadDiagnostics();
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      setActionFeedback({
        success: false,
        message: 'Falha na comunicação com o servidor: ' + (err?.message || 'Erro desconhecido')
      });
    } finally {
      setSeedingDemo(false);
    }
  }

  async function handleOptimizeAllImages() {
    setOptimizingImages(true);
    setActionFeedback(null);
    try {
      const data = await safeFetchJson('/api/admin/optimize-all-images', {
        method: 'POST'
      });
      setActionFeedback({
        success: data.success,
        message: data.message || `${data.totalScanned || 0} imagens verificadas e otimizadas para WebP/AVIF com sucesso!`
      });
      setTimeout(() => setActionFeedback(null), 8000);
    } catch (err: any) {
      setActionFeedback({
        success: false,
        message: 'Erro ao otimizar imagens: ' + (err?.message || 'Falha de comunicação')
      });
    } finally {
      setOptimizingImages(false);
    }
  }

  async function toggleSqlViewer() {
    if (!showSqlViewer && !sqlContent) {
      setLoadingSql(true);
      try {
        const data = await safeFetchJson(`/api/admin/database/sql-content?slug=${encodeURIComponent(storeSlug)}`);
        setSqlContent(data.sql);
      } catch (err) {
        console.error('Failed to fetch SQL:', err);
      } finally {
        setLoadingSql(false);
      }
    }
    setShowSqlViewer(!showSqlViewer);
  }

  useEffect(() => {
    loadDiagnostics();
  }, [storeSlug]);

  const envTemplate = `# ==============================================
# CONFIGURAÇÕES PARA HOSPEDAGEM HOSTINGER
# Salve como .env na raiz do projeto na Hostinger
# ==============================================
NODE_ENV=production
PORT=3000

# Tipo de Banco de Dados: 'mysql' para Hostinger MySQL
DB_TYPE=mysql
DB_HOST=${testHost || 'localhost'}
DB_PORT=${testPort || '3306'}
DB_USER=${testUser || 'u123456_seu_usuario'}
DB_PASSWORD=${testPass || 'SuaSenhaForte123!'}
DB_NAME=${testDb || 'u123456_planiloja'}

# Chave Secreta para Assinatura de Tokens de Admin (HMAC-SHA256)
JWT_SECRET=hostinger_prod_key_${Math.random().toString(36).substring(2, 15)}_${Date.now()}
`;

  function handleCopyEnv() {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  }

  function handleDownloadSql() {
    window.location.href = `/api/admin/database/export-sql?slug=${encodeURIComponent(storeSlug)}`;
  }

  function handleDownloadJson() {
    window.location.href = `/api/admin/database/export-json?slug=${encodeURIComponent(storeSlug)}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Diagnóstico & Conexão com Banco de Dados MySQL
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Monitore tabelas em tempo real, teste conexões MySQL da Hostinger e sincronize produtos e categorias com 1 clique.
            </p>
          </div>
        </div>

        <button
          onClick={loadDiagnostics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Diagnóstico</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2.5 animate-in fade-in ${
            actionFeedback.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {actionFeedback.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Grid: Diagnostics & Table Counters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Status do Banco
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  diag?.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : diag?.database && diag.database !== 'store_data.json'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${diag?.connected ? 'bg-emerald-500 animate-pulse' : diag?.database && diag.database !== 'store_data.json' ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                {diag?.connected
                  ? 'MySQL Hostinger Conectado'
                  : diag?.database && diag.database !== 'store_data.json'
                    ? 'MySQL Hostinger Configurado & Ativo'
                    : 'Armazenamento Local'}
              </span>
            </div>

            <h3 className="text-base font-bold text-neutral-900 mb-1">
              {diag?.connected
                ? 'Hostinger MySQL / MariaDB (Ativo)'
                : diag?.database && diag.database !== 'store_data.json'
                  ? `Hostinger MySQL (${diag.database})`
                  : 'Armazenamento Local'}
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-3">
              {diag?.connected
                ? `Conectado ao banco '${diag.database}' em '${diag.host}:${diag.port}'. Latência de resposta: ${diag.latencyMs ?? 0}ms.`
                : diag?.database && diag.database !== 'store_data.json'
                  ? `Configuração do banco '${diag.database}' salva e ativa permanentemente. Na hospedagem Hostinger, a conexão ocorre automaticamente via localhost sem necessidade de reconectar.`
                  : 'O servidor está aguardando as credenciais MySQL para conectar diretamente às tabelas.'}
            </p>

            {/* If there's an active error reported (only show if not standard cloud container localhost refusal) */}
            {!diag?.connected && diag?.error && !diag?.error.includes('localhost:3306') && !diag?.error.includes('127.0.0.1:3306') && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold block text-amber-950 mb-0.5">Diagnóstico do Servidor:</span>
                {diag.error}
              </div>
            )}

            {/* Table Counters */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100 text-xs">
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-neutral-400 text-[10px] block">
                  Produtos {diag?.connected ? '(MySQL)' : '(Local)'}
                </span>
                <strong className="text-neutral-900 font-bold text-sm">
                  {diag?.connected ? (diag?.tableCounts?.products ?? 0) : (diag?.localCounts?.products ?? 0)}
                </strong>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-neutral-400 text-[10px] block">
                  Categorias {diag?.connected ? '(MySQL)' : '(Local)'}
                </span>
                <strong className="text-neutral-900 font-bold text-sm">
                  {diag?.connected ? (diag?.tableCounts?.categories ?? 0) : (diag?.localCounts?.categories ?? 0)}
                </strong>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-neutral-400 text-[10px] block">
                  Plataformas {diag?.connected ? '(MySQL)' : '(Local)'}
                </span>
                <strong className="text-neutral-900 font-bold text-sm">
                  {diag?.connected ? (diag?.tableCounts?.platforms ?? 0) : (diag?.localCounts?.platforms ?? 0)}
                </strong>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-neutral-400 text-[10px] block">
                  Lojas {diag?.connected ? '(MySQL)' : '(Local)'}
                </span>
                <strong className="text-neutral-900 font-bold text-sm">
                  {diag?.connected ? (diag?.tableCounts?.stores ?? 0) : (diag?.localCounts?.stores ?? 0)}
                </strong>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-neutral-400 text-[10px] block">
                  Cliques {diag?.connected ? '(MySQL)' : '(Local)'}
                </span>
                <strong className="text-neutral-900 font-bold text-sm">
                  {diag?.connected ? (diag?.tableCounts?.clicks ?? 0) : (diag?.localCounts?.clicks ?? 0)}
                </strong>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-neutral-400 text-[10px] block">Latência</span>
                <strong className="text-neutral-900 font-bold text-sm">
                  {diag?.connected ? `${diag.latencyMs}ms` : 'Ativo (Local)'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Sync & Seeding Panel */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-neutral-900">
                  Exportação & Sincronização Direta
                </h3>
              </div>
              <button
                onClick={toggleSqlViewer}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{showSqlViewer ? 'Ocultar SQL' : 'Visualizar Código SQL'}</span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              Transfira todos os dados cadastrados diretamente para as tabelas do MySQL ou exporte o arquivo para o phpMyAdmin.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {/* Sync All to MySQL */}
              <button
                onClick={handleSyncAllToMySQL}
                disabled={syncingAll}
                className="flex items-start gap-2.5 p-3.5 rounded-xl border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white transition text-left group cursor-pointer shadow-xs disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-700/80 text-white flex items-center justify-center shrink-0">
                  <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {syncingAll ? 'Sincronizando...' : 'Sincronizar para o MySQL'}
                  </h4>
                  <p className="text-[10px] text-emerald-100 mt-0.5">
                    Grava todos os produtos no banco
                  </p>
                </div>
              </button>

              {/* Copy SQL Direct */}
              <button
                onClick={handleCopySql}
                disabled={loadingSql}
                className="flex items-start gap-2.5 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 transition text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-neutral-800 text-white flex items-center justify-center shrink-0">
                  {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    {copiedSql ? 'Copiado!' : 'Copiar Script SQL'}
                  </h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Para colar no phpMyAdmin
                  </p>
                </div>
              </button>

              {/* Download SQL */}
              <button
                onClick={handleDownloadSql}
                className="flex items-start gap-2.5 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 transition text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-neutral-800 text-white flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    Baixar Arquivo .sql
                  </h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Arquivo pronto para importação
                  </p>
                </div>
              </button>
            </div>

            {/* Expandable SQL Code Box */}
            {showSqlViewer && (
              <div className="mt-3 p-3.5 bg-neutral-900 rounded-xl border border-neutral-800 animate-in fade-in">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-800 text-neutral-300 text-xs">
                  <span className="font-mono text-[11px] text-emerald-400">schema_hostinger.sql</span>
                  <button
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium transition"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copiado!' : 'Copiar Tudo'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-neutral-300 max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
                  {sqlContent || 'Carregando SQL...'}
                </pre>
              </div>
            )}

            {/* Seed Demo Data Button */}
            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Restaurar 8 Produtos Demonstrativos no Banco
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Popula imediatamente o banco com os 8 produtos reais de demonstração (Amazon, Shopee, Mercado Livre, Magalu, Hotmart).
                  </p>
                </div>
              </div>

              <button
                onClick={handleSeedMySQLNow}
                disabled={seedingDemo}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seedingDemo ? 'animate-spin' : ''}`} />
                <span>{seedingDemo ? 'Populando...' : 'Popular Dados Agora'}</span>
              </button>
            </div>

            {/* Global Image Optimization (AVIF / WebP) Button */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    Otimização Global de Imagens (AVIF & WebP)
                    <span className="text-[9px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Automático</span>
                  </h4>
                  <p className="text-[11px] text-blue-800">
                    Varre todos os produtos, lojas, banners e artigos do blog, convertendo e compactando para WebP/AVIF para carregamento ultra-rápido.
                  </p>
                </div>
              </div>

              <button
                onClick={handleOptimizeAllImages}
                disabled={optimizingImages}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                {optimizingImages ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Otimizando Imagens...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Otimizar Todas as Imagens</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MySQL Connection Config & Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive MySQL Tester / Live Config */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-neutral-900">
              Conectar ao Banco MySQL da Hostinger
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Insira as credenciais do banco criado no painel da Hostinger para testar a comunicação e salvar a conexão ativa:
          </p>

          <form onSubmit={handleTestConnection} className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Host MySQL</label>
                <input
                  type="text"
                  value={testHost}
                  onChange={(e) => setTestHost(e.target.value)}
                  placeholder="localhost ou IP do servidor"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Porta</label>
                <input
                  type="text"
                  value={testPort}
                  onChange={(e) => setTestPort(e.target.value)}
                  placeholder="3306"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Nome do Banco de Dados</label>
              <input
                type="text"
                value={testDb}
                onChange={(e) => setTestDb(e.target.value)}
                placeholder="ex: u123456789_nomedobanco"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Usuário do Banco</label>
                <input
                  type="text"
                  value={testUser}
                  onChange={(e) => setTestUser(e.target.value)}
                  placeholder="ex: u123456789_usuario"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Senha do Banco</label>
                <input
                  type="password"
                  value={testPass}
                  onChange={(e) => setTestPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sslCheckbox"
                checked={testSsl}
                onChange={(e) => setTestSsl(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
              />
              <label htmlFor="sslCheckbox" className="text-xs text-neutral-600 cursor-pointer">
                Exigir conexão segura SSL (necessário para bancos em nuvem como TiDB, Aiven, PlanetScale)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="submit"
                disabled={testLoading}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-neutral-800/30 border-t-neutral-800 rounded-full animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Testar Conexão</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndConnect}
                disabled={savingConfig}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {savingConfig ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5" />
                )}
                <span>Salvar & Conectar</span>
              </button>
            </div>
          </form>

          {/* Test result alert */}
          {testResult && (
            <div
              className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <strong>{testResult.success ? 'Conexão Bem-Sucedida!' : 'Resultado do Teste:'}</strong>
                <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
              </div>
            </div>
          )}

          <div className="mt-3.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 leading-relaxed">
            <span className="font-bold text-neutral-800">📌 Dica para Hostinger:</span> Na hospedagem Hostinger, o host é <code>localhost</code>. Ao testar remotamente de fora, certifique-se de habilitar <em>&quot;Acesso Remoto MySQL&quot;</em> no hPanel.
          </div>
        </div>

        {/* Environment File (.env) Generator */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-neutral-700" />
                <h3 className="text-base font-bold text-neutral-900">
                  Arquivo .env para Hostinger
                </h3>
              </div>
              <button
                onClick={handleCopyEnv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
              >
                {copiedEnv ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar .env</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Copie estas variáveis para o arquivo <code>.env</code> no gerenciador de arquivos da Hostinger:
            </p>

            <pre className="p-3.5 bg-neutral-900 text-neutral-200 rounded-xl text-[11px] font-mono leading-relaxed overflow-x-auto border border-neutral-800 select-all">
              {envTemplate}
            </pre>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Porta Padrão Node.js Hostinger: <strong>3000</strong></span>
            <span className="font-semibold text-emerald-700">Pronto para Produção</span>
          </div>
        </div>
      </div>

      {/* Step-by-Step Hostinger Deployment Guide */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <span>Passo a Passo: Como Publicar na Hostinger em 3 Minutos</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
            <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center mb-2.5">
              1
            </div>
            <h4 className="text-xs font-bold text-neutral-900 mb-1">Criar Banco no hPanel</h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              No hPanel da Hostinger, acesse <strong>Bancos de Dados MySQL</strong>, crie um novo banco e usuário, e anote as credenciais.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
            <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center mb-2.5">
              2
            </div>
            <h4 className="text-xs font-bold text-neutral-900 mb-1">Criar Tabelas Automaticamente</h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Cole o script SQL na aba <strong>SQL</strong> do phpMyAdmin ou clique em <strong>&quot;Popular Dados Agora&quot;</strong> acima com o banco conectado.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
            <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center mb-2.5">
              3
            </div>
            <h4 className="text-xs font-bold text-neutral-900 mb-1">Configurar Node.js & .env</h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              No hPanel, configure a aplicação Node.js (v18+ ou v20+), salve o arquivo <code>.env</code> com as credenciais e inicie o site!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
