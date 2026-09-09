import React, { useState } from 'react';
import { StoreConfig } from '../../types';
import { submitContactMessage } from '../../api/client';
import {
  Mail,
  MessageCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  ExternalLink,
  Instagram
} from 'lucide-react';
import { getSocialLinks } from '../../utils/social';

interface ContactPageProps {
  storeSlug: string;
  config: StoreConfig | null;
  onNavigateToStore: () => void;
  onNavigateToBlog: () => void;
}

const FAQS = [
  {
    q: 'Como compro os produtos indicados no site ou blog?',
    a: 'Basta clicar no botão "Ver Oferta", "Comprar" ou no link do produto no artigo. Você será direcionado imediatamente para a página oficial do produto no marketplace parceiro (Amazon, Shopee, Mercado Livre, etc.) onde poderá realizar a compra com total segurança.'
  },
  {
    q: 'O site Meu Doce Lar cobra alguma taxa pelo acesso ou cupons?',
    a: 'Não! Nosso site, artigos, dicas e cupons são 100% gratuitos para todos os usuários. Nossa remuneração vem de pequenas comissões pagas pelas lojas parceiras através de seus programas de afiliados oficiais, sem nenhum custo extra para você.'
  },
  {
    q: 'Como sei se o preço mostrado ainda é válido?',
    a: 'Nossa plataforma monitora os preços e cupons constantemente. No entanto, as lojas parceiras podem alterar promoções ou esgotar estoques a qualquer momento. O valor final válido é sempre o exibido no carrinho da loja vendedora.'
  },
  {
    q: 'Como rastreio minha encomenda ou peço devolução?',
    a: 'O faturamento e envio são feitos diretamente pelo marketplace onde a compra foi concluída. Para rastrear, basta acessar o aplicativo ou site da respectiva loja (ex: Amazon, Shopee) e entrar na seção "Meus Pedidos".'
  }
];

export default function ContactPage({
  storeSlug,
  config,
  onNavigateToStore,
  onNavigateToBlog
}: ContactPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const social = getSocialLinks(config);
  const primaryColor = config?.corPrimaria || '#2A5C3F';
  const storeName = config?.storeName || 'Meu Doce Lar';
  const supportEmail = config?.email?.trim() || 'contato@meudocelar.com.br';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMessage('Por favor, preencha os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await submitContactMessage(storeSlug, {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || 'Dúvida Geral',
        message: message.trim()
      });

      if (res.success) {
        setSuccess(true);
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setErrorMessage(res.message || 'Erro ao enviar mensagem.');
      }
    } catch {
      setErrorMessage('Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1B1B1B] font-['DM_Sans',sans-serif]">
      {/* Hero Header */}
      <section className="bg-neutral-900 text-white py-12 px-4 md:px-6">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-300 border border-neutral-700/80 mb-3">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Atendimento &amp; Suporte</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Fale com a Equipe {storeName}
          </h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-xl mx-auto">
            Tem sugestões de produtos, dúvidas sobre algum artigo ou propostas de parcerias? Envie sua mensagem abaixo.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Contact Form (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight mb-2">
              Envie uma Mensagem
            </h2>
            <p className="text-xs text-neutral-500 mb-6">
              Respondemos habitualmente em até 24 horas úteis.
            </p>

            {success ? (
              <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-emerald-950">
                  Mensagem enviada com sucesso!
                </h3>
                <p className="text-xs text-emerald-800 mt-1 max-w-sm mx-auto">
                  Agradecemos seu contato. Nossa equipe revisará sua solicitação e responderá no e-mail informado o mais breve possível.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-5 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs md:text-sm text-neutral-900 focus:bg-white focus:border-neutral-800 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Seu Melhor E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs md:text-sm text-neutral-900 focus:bg-white focus:border-neutral-800 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Dúvida sobre artigo de organizadores"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs md:text-sm text-neutral-900 focus:bg-white focus:border-neutral-800 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Mensagem *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escreva aqui sua mensagem detalhada..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs md:text-sm text-neutral-900 focus:bg-white focus:border-neutral-800 focus:outline-none transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs transition hover:opacity-90 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? (
                    <span>Enviando mensagem...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensagem</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Side Info & FAQ (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Direct Channels Box */}
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-wider">
                Canais Diretos de Atendimento
              </h3>

              {social.whatsapp && (
                <a
                  href={social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Comunidade no WhatsApp</span>
                      <span className="block text-[11px] text-emerald-700">Canal oficial de ofertas diárias</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-emerald-700" />
                </a>
              )}

              {social.telegram && (
                <a
                  href={social.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 hover:bg-sky-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#229ED9] flex items-center justify-center text-white shrink-0">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Canal no Telegram</span>
                      <span className="block text-[11px] text-sky-700">Alertas rápidos de promoções</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-sky-700" />
                </a>
              )}

              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-pink-50 border border-pink-200 text-pink-900 hover:bg-pink-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E1306C] flex items-center justify-center text-white shrink-0">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Perfil no Instagram</span>
                      <span className="block text-[11px] text-pink-700">Dicas, achadinhos e bastidores</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-pink-700" />
                </a>
              )}

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-800">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold">E-mail de Suporte</span>
                  <span className="block text-[11px] text-neutral-600">{supportEmail}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-800">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold">Horário de Análise</span>
                  <span className="block text-[11px] text-neutral-600">Segunda a Sexta das 09h às 18h</span>
                </div>
              </div>
            </div>

            {/* FAQ Accordion */}
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <HelpCircle className="w-4 h-4 text-neutral-700" />
                <h3 className="font-bold text-sm text-neutral-900">
                  Perguntas Frequentes (FAQ)
                </h3>
              </div>

              <div className="space-y-2 pt-2">
                {FAQS.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-neutral-100 overflow-hidden bg-neutral-50/50"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full text-left p-3.5 flex items-center justify-between gap-2 text-xs font-bold text-neutral-800 hover:text-neutral-950 transition cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="p-3.5 pt-0 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100/80 bg-white">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 border-t border-neutral-800 py-8 px-4 text-center text-xs">
        <p>© {new Date().getFullYear()} {storeName}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
