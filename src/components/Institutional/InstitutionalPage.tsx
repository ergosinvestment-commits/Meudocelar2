import React, { useState } from 'react';
import { StoreConfig } from '../../types';
import {
  FileText,
  ShieldCheck,
  Info,
  Lock,
  ExternalLink,
  Store,
  ChevronRight,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface InstitutionalPageProps {
  config: StoreConfig | null;
  initialTab?: string;
  onNavigateToStore: () => void;
  onNavigateToBlog: () => void;
  onNavigateToContact: () => void;
}

type InstTab = 'sobre' | 'termos' | 'privacidade' | 'afiliados';

export default function InstitutionalPage({
  config,
  initialTab = 'sobre',
  onNavigateToStore,
  onNavigateToBlog,
  onNavigateToContact
}: InstitutionalPageProps) {
  const [activeTab, setActiveTab] = useState<InstTab>(
    (initialTab as InstTab) || 'sobre'
  );
  const [liveConfig, setLiveConfig] = useState<StoreConfig | null>(config);
  const [liveBlogSettings, setLiveBlogSettings] = useState<any | null>(null);

  React.useEffect(() => {
    setLiveConfig(config);
  }, [config]);

  React.useEffect(() => {
    const storeSlug = config?.slug || 'achadinhos-da-maria';
    import('../../api/client').then(({ fetchPublicBlogSettings }) => {
      fetchPublicBlogSettings(storeSlug).then(bs => {
        if (bs) setLiveBlogSettings(bs);
      }).catch(() => null);
    });
  }, [config?.slug]);

  React.useEffect(() => {
    function handleUpdate(e: any) {
      if (e?.detail) {
        setLiveConfig(prev => ({ ...(prev || {}), ...e.detail } as StoreConfig));
      }
    }
    function handleBlogUpdate(e: any) {
      if (e?.detail) {
        setLiveBlogSettings(e.detail);
      }
    }
    window.addEventListener('store-config-updated', handleUpdate as EventListener);
    window.addEventListener('blog-settings-updated', handleBlogUpdate as EventListener);
    return () => {
      window.removeEventListener('store-config-updated', handleUpdate as EventListener);
      window.removeEventListener('blog-settings-updated', handleBlogUpdate as EventListener);
    };
  }, []);

  const activeCfg = liveConfig || config;
  const primaryColor = activeCfg?.corPrimaria || '#2A5C3F';
  const storeName = activeCfg?.storeName || liveBlogSettings?.storeName || 'Meu Doce Lar';
  const email = activeCfg?.email || liveBlogSettings?.email || 'contato@meudocelar.com.br';
  const cnpj = activeCfg?.cnpj?.trim() || liveBlogSettings?.cnpj?.trim() || '';
  const endereco = activeCfg?.endereco?.trim() || liveBlogSettings?.endereco?.trim() || '';
  const sobreNos = activeCfg?.sobreNos || liveBlogSettings?.sobreNos || '';
  const textoDisclosure = activeCfg?.textoDisclosure || liveBlogSettings?.textoDisclosure || '';
  const termosUso = activeCfg?.termosUso || liveBlogSettings?.termosUso || '';
  const politicaPrivacidade = activeCfg?.politicaPrivacidade || liveBlogSettings?.politicaPrivacidade || '';

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1B1B1B] font-['DM_Sans',sans-serif]">
      {/* Header Banner */}
      <section className="bg-neutral-900 text-white py-12 px-4 md:px-6">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-300 border border-neutral-700/80 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transparência, Segurança &amp; Informações Legais</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Portal Institucional
          </h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-xl mx-auto">
            Conheça nossos princípios de curadoria, termos de serviço e compromisso com a sua privacidade.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 md:py-14">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-6 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('sobre')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'sobre'
                ? 'text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50'
            }`}
            style={{ backgroundColor: activeTab === 'sobre' ? primaryColor : undefined }}
          >
            <Info className="w-4 h-4" />
            <span>Quem Somos</span>
          </button>

          <button
            onClick={() => setActiveTab('afiliados')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'afiliados'
                ? 'text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50'
            }`}
            style={{ backgroundColor: activeTab === 'afiliados' ? primaryColor : undefined }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Aviso de Afiliados</span>
          </button>

          <button
            onClick={() => setActiveTab('termos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'termos'
                ? 'text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50'
            }`}
            style={{ backgroundColor: activeTab === 'termos' ? primaryColor : undefined }}
          >
            <FileText className="w-4 h-4" />
            <span>Termos de Uso</span>
          </button>

          <button
            onClick={() => setActiveTab('privacidade')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'privacidade'
                ? 'text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50'
            }`}
            style={{ backgroundColor: activeTab === 'privacidade' ? primaryColor : undefined }}
          >
            <Lock className="w-4 h-4" />
            <span>Privacidade &amp; LGPD</span>
          </button>
        </div>

        {/* Tab Content Box */}
        <div className="mt-8 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-10 shadow-xs">
          {/* 1. QUEM SOMOS */}
          {activeTab === 'sobre' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Sobre o {storeName}
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Nossa história, missão e o processo rigoroso de curadoria de produtos.
                </p>
              </div>

              <div className="prose prose-neutral text-neutral-700 leading-relaxed text-sm sm:text-base space-y-4">
                {sobreNos ? (
                  <div className="whitespace-pre-line text-neutral-700 space-y-3">
                    {sobreNos}
                  </div>
                ) : (
                  <>
                    <p>
                      O <strong>{storeName}</strong> nasceu com um propósito simples: ajudar você a garimpar os melhores produtos para a sua casa e rotina, poupando tempo de busca e garantindo compras com a máxima economia e segurança.
                    </p>
                    <p>
                      Diariamente, nossa equipe monitora promoções, cupons de desconto, lançamentos e avaliações em grandes plataformas como <strong>Amazon, Shopee, Mercado Livre, Magazine Luiza</strong> e outros parceiros oficiais.
                    </p>
                  </>
                )}

                <h3 className="text-lg font-bold text-neutral-900 pt-4">Nossos Pilares de Curadoria:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 not-prose mt-3">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mb-2" />
                    <h4 className="font-bold text-xs text-neutral-900">1. Reputação &amp; Avaliações</h4>
                    <p className="text-xs text-neutral-600 mt-1">Só indicamos itens com alto índice de aprovação por compradores reais.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mb-2" />
                    <h4 className="font-bold text-xs text-neutral-900">2. Menor Preço Histórico</h4>
                    <p className="text-xs text-neutral-600 mt-1">Pesquisamos preços em tempo real para apontar as ofertas que realmente valem a pena.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mb-2" />
                    <h4 className="font-bold text-xs text-neutral-900">3. Lojas e Vendedores Oficiais</h4>
                    <p className="text-xs text-neutral-600 mt-1">Links diretos e seguros com proteção de entrega e devolução garantida.</p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-neutral-900 pt-4">Dados da Empresa / Contato:</h3>
                <ul className="text-xs sm:text-sm text-neutral-600 space-y-1">
                  <li><strong>Razão / Identificação:</strong> {storeName}</li>
                  {cnpj && <li><strong>CNPJ:</strong> {cnpj}</li>}
                  {endereco && <li><strong>Endereço:</strong> {endereco}</li>}
                  <li><strong>E-mail de Contato:</strong> {email}</li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. DECLARAÇÃO DE AFILIADOS */}
          {activeTab === 'afiliados' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Declaração de Afiliado &amp; Transparência
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Esclarecimento ético sobre monetização e parcerias comerciais.
                </p>
              </div>

              <div className="prose prose-neutral text-neutral-700 leading-relaxed text-sm sm:text-base space-y-4">
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                  <strong>Aviso Importante:</strong> {textoDisclosure || `O ${storeName} é um canal independente de curadoria e recomendações. Não somos a loja vendedora direta nem estocamos produtos físicos.`}
                </div>

                <p>
                  Nosso site participa de programas de associados e afiliados de grandes marketplaces, incluindo o <strong>Programa de Associados da Amazon, Programa de Afiliados Shopee, Mercado Livre Afiliados, Magalu e outros</strong>.
                </p>

                <h3 className="text-lg font-bold text-neutral-900 pt-2">Como funcionam os links de afiliados?</h3>
                <p>
                  Quando você clica em um botão de "Ver Oferta", "Pegar Cupom" ou "Comprar na Loja" em nosso site ou blog, você é redirecionado diretamente para o site oficial da respectiva loja parceira.
                </p>
                <p>
                  Se você concluir uma compra qualificada, o <em>{storeName}</em> poderá receber uma pequena porcentagem de comissão pela indicação. <strong>Isso não altera em nenhum centavo o valor final que você paga pelo produto.</strong> Em muitos casos, inclusive, você economiza aplicando os cupons que garimpamos.
                </p>

                <h3 className="text-lg font-bold text-neutral-900 pt-2">Independência Editorial</h3>
                <p>
                  Todas as nossas recomendações no Blog e na Loja são baseadas na qualidade, custo-benefício e testes dos produtos. Nenhuma marca ou parceiro tem controle sobre nossas opiniões e análises.
                </p>
              </div>
            </div>
          )}

          {/* 3. TERMOS DE USO */}
          {activeTab === 'termos' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Termos e Condições de Uso
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Última atualização: {new Date().getFullYear()}
                </p>
              </div>

              <div className="prose prose-neutral text-neutral-700 leading-relaxed text-sm sm:text-base space-y-4">
                {termosUso ? (
                  <div className="whitespace-pre-line text-neutral-700 space-y-3">
                    {termosUso}
                  </div>
                ) : (
                  <>
                    <p>
                      Ao acessar e utilizar o site <strong>{storeName}</strong>, você concorda com os seguintes termos e condições:
                    </p>

                    <h3 className="text-base font-bold text-neutral-900">1. Natureza do Serviço</h3>
                    <p>
                      O {storeName} é uma plataforma de conteúdo informativo, reviews e catálogo de ofertas de terceiros. Não realizamos venda direta, faturamento, emissão de nota fiscal, nem entrega de mercadorias físicas anunciadas.
                    </p>

                    <h3 className="text-base font-bold text-neutral-900">2. Preços, Estoques e Cupons</h3>
                    <p>
                      Os preços, cupons de desconto, frete e disponibilidade de estoque dos produtos exibidos estão sujeitos a alterações a qualquer momento pelas lojas vendedoras, sem aviso prévio. O preço final válido é sempre o apresentado na página de checkout da loja parceira.
                    </p>

                    <h3 className="text-base font-bold text-neutral-900">3. Garantia, Devoluções e Atendimento pós-venda</h3>
                    <p>
                      Qualquer solicitação referente a entrega, rastreamento, cancelamento, defeito ou troca de mercadoria deve ser realizada diretamente com a loja onde a compra foi efetivada (ex: Amazon, Shopee, etc.), seguindo a política de cada plataforma e o Código de Defesa do Consumidor.
                    </p>

                    <h3 className="text-base font-bold text-neutral-900">4. Propriedade Intelectual</h3>
                    <p>
                      O conteúdo dos artigos, textos, identidade visual e layout criados pela equipe do {storeName} são protegidos por direitos autorais. As marcas registradas, logotipos e nomes de produtos de terceiros pertencem aos seus respectivos proprietários.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 4. PRIVACIDADE E LGPD */}
          {activeTab === 'privacidade' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Política de Privacidade &amp; LGPD
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Como tratamos e protegemos seus dados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                </p>
              </div>

              <div className="prose prose-neutral text-neutral-700 leading-relaxed text-sm sm:text-base space-y-4">
                {politicaPrivacidade ? (
                  <div className="whitespace-pre-line text-neutral-700 space-y-3">
                    {politicaPrivacidade}
                  </div>
                ) : (
                  <>
                    <p>
                      Sua privacidade é prioridade fundamental para o <strong>{storeName}</strong>. Esta política detalha como coletamos, usamos e protegemos quaisquer informações quando você visita nossa página.
                    </p>

                    <h3 className="text-base font-bold text-neutral-900">1. Coleta de Informações</h3>
                    <p>
                      Nosso site não exige cadastro obrigatório para navegar pelos artigos e produtos. Coletamos dados apenas quando você:
                    </p>
                    <ul>
                      <li>Envia uma mensagem voluntária através do nosso formulário de contato (Nome, E-mail e Conteúdo da mensagem).</li>
                      <li>Acessa nossos canais de atendimento ou redes informadas no site.</li>
                    </ul>

                    <h3 className="text-base font-bold text-neutral-900">2. Cookies e Rastreamento Anônimo</h3>
                    <p>
                      Podemos utilizar cookies de métricas (como Google Analytics) e pixels anônimos para entender quais categorias e artigos são mais lidos, otimizando a velocidade e a relevância do site. Ao clicar em links de afiliados, cookies de rastreamento da respectiva loja parceira são utilizados para registrar a indicação da compra.
                    </p>

                    <h3 className="text-base font-bold text-neutral-900">3. Segurança dos Dados</h3>
                    <p>
                      Nunca comercializamos, alugamos ou compartilhamos dados de contato de nossos visitantes com terceiros para fins de spam ou publicidade não solicitada.
                    </p>

                    <h3 className="text-base font-bold text-neutral-900">4. Direitos do Titular (LGPD)</h3>
                    <p>
                      Você tem o direito de solicitar a confirmação, correção ou exclusão de qualquer informação enviada por meio de nossos canais de contato a qualquer momento pelo e-mail <strong>{email}</strong>.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick CTA Box */}
        <div className="mt-12 bg-neutral-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-neutral-900">Ficou com alguma dúvida específica?</h4>
            <p className="text-xs text-neutral-600 mt-0.5">Nossa equipe está disponível para tirar qualquer dúvida sobre as ofertas ou artigos.</p>
          </div>
          <button
            onClick={onNavigateToContact}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-98 cursor-pointer shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            Fale Conosco
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 border-t border-neutral-800 py-8 px-4 text-center text-xs">
        <p>© {new Date().getFullYear()} {storeName}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
