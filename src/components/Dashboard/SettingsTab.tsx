import React, { useState } from 'react';
import { StoreConfig } from '../../types';
import { updateStoreConfig } from '../../api/client';
import { Settings, MessageCircle, Send, Share2, Shield, Activity, Check, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';

interface SettingsTabProps {
  storeSlug: string;
  config: StoreConfig;
  onRefresh: () => void;
}

export default function SettingsTab({ storeSlug, config, onRefresh }: SettingsTabProps) {
  const [formData, setFormData] = useState<StoreConfig>({ ...config });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, adminPassword: pass }));
    setShowPassword(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Clean and sanitize fields so empty fields or standalone '@' are stored as empty strings
      const cleanedData: StoreConfig = {
        ...formData,
        canalWhatsapp: (formData.canalWhatsapp || '').trim(),
        canalTelegram: (formData.canalTelegram || '').trim(),
        instagram: (formData.instagram || '').replace(/^@+/, '').trim()
          ? `@${(formData.instagram || '').replace(/^@+/, '').trim()}`
          : '',
        facebook: (formData.facebook || '').trim(),
        tiktok: (formData.tiktok || '').replace(/^@+/, '').trim()
          ? `@${(formData.tiktok || '').replace(/^@+/, '').trim()}`
          : '',
        pixelFacebook: (formData.pixelFacebook || '').trim(),
        googleAnalytics: (formData.googleAnalytics || '').trim(),
        googleAds: (formData.googleAds || '').trim(),
        cnpj: (formData.cnpj || '').trim(),
        endereco: (formData.endereco || '').trim(),
        email: (formData.email || '').trim(),
        mensagemTopo: (formData.mensagemTopo || '').trim(),
        textoDisclosure: (formData.textoDisclosure || '').trim(),
        avisoPrecos: (formData.avisoPrecos || '').trim(),
        msgManutencao: (formData.msgManutencao || '').trim(),
      };

      await updateStoreConfig(storeSlug, cleanedData);
      setFormData(cleanedData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
      onRefresh();
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Grid of Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Affiliate Channels (WhatsApp & Telegram) */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Canais de Ofertas (Comunidades)
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Canal do WhatsApp (Link de Convite)
            </label>
            <input
              type="url"
              placeholder="https://whatsapp.com/channel/... (deixe vazio para não exibir)"
              value={formData.canalWhatsapp || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, canalWhatsapp: e.target.value.trim() }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Exibido no cabeçalho e rodapé. Se não preenchido, os botões não aparecem.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Canal do Telegram (Link)
            </label>
            <input
              type="url"
              placeholder="https://t.me/seucanal (deixe vazio para não exibir)"
              value={formData.canalTelegram || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, canalTelegram: e.target.value.trim() }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Se não preenchido, o botão do Telegram não aparece no rodapé.</p>
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.botaoCanalFlutuante)}
                onChange={(e) => setFormData(prev => ({ ...prev, botaoCanalFlutuante: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <div>
                <div className="text-xs font-bold text-neutral-800">Exibir Botão Flutuante na Vitrine</div>
                <div className="text-[11px] text-neutral-400">Mostra o ícone fixo no canto inferior esquerdo da tela</div>
              </div>
            </label>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-pink-600" />
            Redes Sociais
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Instagram
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">@</span>
              <input
                type="text"
                placeholder="seuperfil (deixe vazio para não exibir)"
                value={(formData.instagram || '').replace(/^@+/, '')}
                onChange={(e) => {
                  const val = e.target.value.replace(/^@+/, '').trim();
                  setFormData(prev => ({ ...prev, instagram: val ? `@${val}` : '' }));
                }}
                className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Se não preenchido, o botão do Instagram não aparece.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Facebook (URL ou Página)
            </label>
            <input
              type="text"
              placeholder="facebook.com/suapagina (deixe vazio para não exibir)"
              value={formData.facebook || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value.trim() }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Se não preenchido, o botão do Facebook não aparece.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              TikTok
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">@</span>
              <input
                type="text"
                placeholder="seutiktok (deixe vazio para não exibir)"
                value={(formData.tiktok || '').replace(/^@+/, '')}
                onChange={(e) => {
                  const val = e.target.value.replace(/^@+/, '').trim();
                  setFormData(prev => ({ ...prev, tiktok: val ? `@${val}` : '' }));
                }}
                className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Se não preenchido, o botão do TikTok não aparece.</p>
          </div>
        </div>

        {/* Marketing & Tracking Pixels */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Marketing & Pixels de Conversão
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Facebook Pixel ID
            </label>
            <input
              type="text"
              placeholder="Ex: 123456789012345"
              value={formData.pixelFacebook || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, pixelFacebook: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Dispara eventos automáticos de PageView, ViewContent e Lead (clique no afiliado).</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Google Analytics ID (GA4)
            </label>
            <input
              type="text"
              placeholder="Ex: G-XXXXXXXXXX"
              value={formData.googleAnalytics || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, googleAnalytics: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Google Ads Conversion ID
            </label>
            <input
              type="text"
              placeholder="Ex: AW-123456789/AbCdEfGhIjK"
              value={formData.googleAds || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, googleAds: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>
        </div>

        {/* Business Data & Contacts */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-neutral-600" />
            Dados da Empresa & Rodapé
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              CNPJ (Opcional)
            </label>
            <input
              type="text"
              placeholder="00.000.000/0001-00"
              value={formData.cnpj || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Endereço / Localização
            </label>
            <input
              type="text"
              placeholder="Ex: São Paulo, SP - Brasil"
              value={formData.endereco || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              E-mail de Contato
            </label>
            <input
              type="email"
              placeholder="contato@sualoja.com.br"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>
        </div>
      </div>

      {/* Security & Admin Credentials */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-2">
          <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Segurança & Credenciais do Administrador
          </h3>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-medium">
            Sincronizado com tabela Users & Stores
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Usuário do Admin (Login)
            </label>
            <input
              type="text"
              placeholder="admin"
              value={formData.adminUser || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, adminUser: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400 font-mono"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Login principal para entrar no painel.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              E-mail do Administrador
            </label>
            <input
              type="email"
              placeholder="admin@meudocelar.com.br"
              value={formData.adminEmail || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Também pode ser usado no campo de login.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Nova Senha de Acesso
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Gerar
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite a nova senha..."
                value={formData.adminPassword || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">A senha será criptografada com Bcrypt ao salvar.</p>
          </div>
        </div>
      </div>

      {/* Operation & Legal Disclosures */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
          <Settings className="w-4 h-4 text-neutral-600" />
          Status da Operação & Avisos Legais
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.lojaAtiva !== false}
                  onChange={(e) => setFormData(prev => ({ ...prev, lojaAtiva: e.target.checked }))}
                  className="w-5 h-5 rounded text-emerald-600"
                />
                <div>
                  <div className="text-sm font-bold text-neutral-900">Loja Ativa (Online)</div>
                  <div className="text-xs text-neutral-500">Se desmarcado, a vitrine exibirá a tela de manutenção.</div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Mensagem de Manutenção (Quando inativa)
              </label>
              <input
                type="text"
                placeholder="Estamos atualizando as ofertas. Volte em breve!"
                value={formData.msgManutencao || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, msgManutencao: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Texto do Disclosure de Afiliado (Transparência)
              </label>
              <textarea
                rows={2}
                value={formData.textoDisclosure || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, textoDisclosure: e.target.value }))}
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Aviso Legal de Preços e Disponibilidade
              </label>
              <input
                type="text"
                value={formData.avisoPrecos || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, avisoPrecos: e.target.value }))}
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {savedSuccess && (
          <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4" /> Configurações salvas com sucesso!
          </span>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold rounded-xl transition shadow-md disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </form>
  );
}
