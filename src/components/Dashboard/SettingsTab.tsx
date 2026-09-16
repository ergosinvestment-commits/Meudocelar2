import React, { useState, useEffect } from 'react';
import { StoreConfig, StoreUser, UserRole } from '../../types';
import { updateStoreConfig } from '../../api/client';
import { Settings, MessageCircle, Send, Share2, Shield, Activity, Check, Eye, EyeOff, KeyRound, Sparkles, Users, UserPlus, Edit2, Trash2, UserCheck, UserX, Crown, ShieldCheck, X, Key, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface SettingsTabProps {
  storeSlug: string;
  config: StoreConfig;
  onRefresh: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80&fm=webp'
];

export default function SettingsTab({ storeSlug, config, onRefresh }: SettingsTabProps) {
  const [formData, setFormData] = useState<StoreConfig>({ ...config });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Users management state inside Security section
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<StoreUser | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // User form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('ADMIN');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formAvatar, setFormAvatar] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const res = await fetch(`/api/admin/store/${storeSlug}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [storeSlug]);

  function handleOpenCreateUser() {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('ADMIN');
    setFormAtivo(true);
    setFormAvatar(PRESET_AVATARS[0]);
    setShowUserPassword(false);
    setUserFeedback(null);
    setIsUserModalOpen(true);
  }

  function handleOpenEditUser(user: StoreUser) {
    setEditingUser(user);
    setFormName(user.nome || '');
    setFormEmail(user.email || '');
    setFormUsername(user.username || '');
    setFormPassword('');
    setFormRole(user.role || 'ADMIN');
    setFormAtivo(user.ativo !== false);
    setFormAvatar(user.avatar || '');
    setShowUserPassword(false);
    setUserFeedback(null);
    setIsUserModalOpen(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setSavingUser(true);
    setUserFeedback(null);

    const payload: Partial<StoreUser> = {
      nome: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      username: formUsername.trim().toLowerCase(),
      role: formRole,
      ativo: formAtivo,
      avatar: formAvatar.trim()
    };

    if (formPassword.trim()) {
      if (formPassword.trim().length < 4) {
        setUserFeedback({ type: 'error', message: 'A senha deve ter no mínimo 4 caracteres.' });
        setSavingUser(false);
        return;
      }
      payload.password = formPassword.trim();
    }

    try {
      let res;
      if (editingUser) {
        res = await fetch(`/api/admin/store/${storeSlug}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        if (!formPassword.trim()) {
          setUserFeedback({ type: 'error', message: 'A senha é obrigatória para criar um novo usuário.' });
          setSavingUser(false);
          return;
        }
        res = await fetch(`/api/admin/store/${storeSlug}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setUserFeedback({ type: 'error', message: data.error || 'Erro ao salvar usuário.' });
        setSavingUser(false);
        return;
      }

      setUserFeedback({
        type: 'success',
        message: editingUser ? 'Usuário atualizado com sucesso!' : 'Novo usuário criado com sucesso!'
      });
      setIsUserModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setUserFeedback({ type: 'error', message: err?.message || 'Erro de conexão.' });
    } finally {
      setSavingUser(false);
    }
  }

  async function handleConfirmDeleteUser() {
    if (!userToDelete) return;
    setIsDeletingId(userToDelete.id);
    try {
      const res = await fetch(`/api/admin/store/${storeSlug}/users/${userToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir usuário.');
        return;
      }
      setUserToDelete(null);
      loadUsers();
    } catch (err) {
      alert('Erro de conexão ao excluir usuário.');
    } finally {
      setIsDeletingId(null);
    }
  }

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, adminPassword: pass }));
    setShowPassword(true);
  }

  function generateUserRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pass);
    setShowUserPassword(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
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
      window.dispatchEvent(new CustomEvent('store-config-updated', { detail: cleanedData }));
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

      {/* Security & Admin Credentials & User Management */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Segurança & Credenciais do Administrador
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">Gerencie os acessos mestres e crie/edite operadores e usuários do sistema.</p>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-medium">
            Sincronizado com MySQL & Stores
          </span>
        </div>

        {/* Master Admin Credentials Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Usuário Mestre (Login)
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
              E-mail do Administrador Mestre
            </label>
            <input
              type="email"
              placeholder="admin@meudocelar.com.br"
              value={formData.adminEmail || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Também pode ser usado no login.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Nova Senha Mestra
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Criptografada com Bcrypt ao salvar.</p>
          </div>
        </div>

        {/* Embedded Users Creation & Editing Section */}
        <div className="pt-4 border-t border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Criação e Edição de Usuários & Operadores ({users.length})
              </h4>
            </div>
            <button
              type="button"
              id="btn-settings-add-user"
              onClick={handleOpenCreateUser}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white transition shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Usuário</span>
            </button>
          </div>

          <p className="text-xs text-neutral-500">
            Adicione novos administradores, gerentes ou editores com senhas dedicadas para operar esta loja.
          </p>

          {loadingUsers ? (
            <div className="py-6 text-center text-xs text-neutral-400">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-400 bg-neutral-50 rounded-xl border border-neutral-100">
              Nenhum usuário adicional cadastrado. Clique em "Novo Usuário" para começar.
            </div>
          ) : (
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Usuário</th>
                    <th className="py-2.5 px-3">E-mail / Login</th>
                    <th className="py-2.5 px-3">Papel</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.nome} className="w-7 h-7 rounded-full object-cover border border-neutral-200" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-xs">
                              {u.nome?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-neutral-900">{u.nome}</div>
                            <div className="text-[11px] text-neutral-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 font-medium">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          u.role === 'GERENTE' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {u.role === 'ADMIN' && <Crown className="w-2.5 h-2.5 text-emerald-600" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.ativo !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {u.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                            title="Editar usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      {/* User Create / Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-200 shadow-2xl">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-emerald-700">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-neutral-900">
                  {editingUser ? 'Editar Usuário do Sistema' : 'Cadastrar Novo Usuário'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {userFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  userFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  {userFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{userFeedback.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 outline-none focus:bg-white focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    placeholder="joao@loja.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Nome de Usuário (Login) *</label>
                  <input
                    type="text"
                    required
                    placeholder="joaosilva"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 outline-none focus:bg-white focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-700">
                    {editingUser ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <button
                    type="button"
                    onClick={generateUserRandomPassword}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Gerar Senha Segura</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    placeholder={editingUser ? 'Deixe em branco para manter a atual' : 'Mínimo de 4 caracteres'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Nível de Permissão (Papel)</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex flex-col p-2.5 rounded-xl border text-center cursor-pointer transition ${
                    formRole === 'ADMIN' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                  }`}>
                    <input type="radio" name="role" value="ADMIN" checked={formRole === 'ADMIN'} onChange={() => setFormRole('ADMIN')} className="sr-only" />
                    <Crown className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs">Admin</span>
                  </label>
                  <label className={`flex flex-col p-2.5 rounded-xl border text-center cursor-pointer transition ${
                    formRole === 'GERENTE' ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                  }`}>
                    <input type="radio" name="role" value="GERENTE" checked={formRole === 'GERENTE'} onChange={() => setFormRole('GERENTE')} className="sr-only" />
                    <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                    <span className="text-xs">Gerente</span>
                  </label>
                  <label className={`flex flex-col p-2.5 rounded-xl border text-center cursor-pointer transition ${
                    formRole === 'EDITOR' ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                  }`}>
                    <input type="radio" name="role" value="EDITOR" checked={formRole === 'EDITOR'} onChange={() => setFormRole('EDITOR')} className="sr-only" />
                    <Edit2 className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <span className="text-xs">Editor</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Usuário Ativo</div>
                  <div className="text-[11px] text-neutral-500">Permite ou bloqueia o acesso ao painel.</div>
                </div>
                <input
                  type="checkbox"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Avatar de Perfil</label>
                <div className="flex items-center gap-2 mb-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormAvatar(url)}
                      className={`rounded-full p-0.5 transition cursor-pointer ${formAvatar === url ? 'ring-2 ring-neutral-900 scale-105' : 'opacity-70'}`}
                    >
                      <img src={url} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  disabled={savingUser}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingUser ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Excluir Usuário</h3>
              <p className="text-xs text-neutral-600">
                Tem certeza que deseja excluir o usuário <strong className="text-neutral-900">{userToDelete.nome}</strong> ({userToDelete.email})?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingId !== null}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md"
              >
                {isDeletingId ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

