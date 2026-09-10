import React, { useState, useEffect } from 'react';
import { StoreUser, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Trash2,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Lock,
  RefreshCw,
  X,
  Mail,
  User as UserIcon,
  Crown
} from 'lucide-react';

interface UsersTabProps {
  storeSlug: string;
  primaryColor?: string;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80&fm=webp'
];

export default function UsersTab({ storeSlug, primaryColor = '#2A5C3F' }: UsersTabProps) {
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<StoreUser | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Form States
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('ADMIN');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formAvatar, setFormAvatar] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedPassMsg, setCopiedPassMsg] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/store/${storeSlug}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setFeedback({ type: 'error', message: 'Falha ao buscar usuários do servidor.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [storeSlug]);

  function handleOpenCreate() {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('ADMIN');
    setFormAtivo(true);
    setFormAvatar(PRESET_AVATARS[0]);
    setShowPassword(false);
    setFeedback(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(user: StoreUser) {
    setEditingUser(user);
    setFormName(user.nome || '');
    setFormEmail(user.email || '');
    setFormUsername(user.username || '');
    setFormPassword(''); // leave empty to indicate unchanged
    setFormRole(user.role || 'ADMIN');
    setFormAtivo(user.ativo !== false);
    setFormAvatar(user.avatar || '');
    setShowPassword(false);
    setFeedback(null);
    setIsModalOpen(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

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
        setFeedback({ type: 'error', message: 'A senha deve ter no mínimo 4 caracteres.' });
        setSaving(false);
        return;
      }
      payload.password = formPassword.trim();
      (payload as any).senha = formPassword.trim();
      (payload as any).newPassword = formPassword.trim();
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
          setFeedback({ type: 'error', message: 'A senha é obrigatória para criar um novo usuário.' });
          setSaving(false);
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
        setFeedback({ type: 'error', message: data.error || 'Não foi possível salvar o usuário.' });
        setSaving(false);
        return;
      }

      const hasNewPassword = Boolean(formPassword.trim());
      setFeedback({
        type: 'success',
        message: editingUser
          ? (hasNewPassword ? 'Usuário e nova senha atualizados com sucesso!' : 'Usuário atualizado com sucesso!')
          : 'Novo usuário criado com sucesso!'
      });

      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro de conexão com o servidor.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeleteUser() {
    if (!userToDelete) return;
    const id = userToDelete.id;

    setIsDeletingId(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/store/${storeSlug}/users/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Não foi possível excluir o usuário.' });
        return;
      }

      setFeedback({ type: 'success', message: 'Usuário removido com sucesso.' });
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao comunicar com o servidor.' });
    } finally {
      setIsDeletingId(null);
    }
  }

  async function handleToggleStatus(user: StoreUser) {
    const newStatus = !user.ativo;
    try {
      const res = await fetch(`/api/admin/store/${storeSlug}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: newStatus })
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Erro ao alterar status do usuário.' });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Usuário ${user.nome} ${newStatus ? 'ativado' : 'desativado'} com sucesso.`
      });
      loadUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao comunicar com o servidor.' });
    }
  }

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pass);
    setShowPassword(true);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pass).catch(() => {});
      setCopiedPassMsg(true);
      setTimeout(() => setCopiedPassMsg(false), 3000);
    }
  }

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase().trim();
    const matchSearch =
      !term ||
      u.nome.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term);

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.ativo !== false) ||
      (statusFilter === 'INACTIVE' && u.ativo === false);

    return matchSearch && matchRole && matchStatus;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Crown className="w-3 h-3 text-emerald-600" />
            Administrador
          </span>
        );
      case 'GERENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <ShieldCheck className="w-3 h-3 text-sky-600" />
            Gerente
          </span>
        );
      case 'EDITOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Edit2 className="w-3 h-3 text-amber-600" />
            Editor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-neutral-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
                Gestão de Usuários & Acessos
              </h1>
              <p className="text-xs md:text-sm text-neutral-500 font-medium">
                Crie novos operadores, gerencie permissões e controle quem pode acessar o painel da vitrine.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            id="btn-refresh-users"
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition cursor-pointer"
            title="Recarregar usuários"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-add-user"
            onClick={handleOpenCreate}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-white shadow-xs transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs md:text-sm font-medium flex items-center justify-between gap-3 border shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role Explanation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
              <Crown className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-neutral-900">Administrador (ADMIN)</span>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Acesso total: gerencia produtos, aparência, integrações MySQL, configurações da loja e gestão de outros usuários.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded-lg bg-sky-100 text-sky-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-neutral-900">Gerente (GERENTE)</span>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Controle operacional: cadastra e edita produtos, gerencia categorias, plataformas de afiliados e analisa relatórios de cliques.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded-lg bg-amber-100 text-amber-700">
              <Edit2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-neutral-900">Editor (EDITOR)</span>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Focado no catálogo: adiciona links de afiliados, cadastra novos produtos e mantém os preços atualizados.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, usuário ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500">Papel:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 outline-none"
            >
              <option value="ALL">Todos os Papéis</option>
              <option value="ADMIN">Administradores</option>
              <option value="GERENTE">Gerentes</option>
              <option value="EDITOR">Editores</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="INACTIVE">Apenas Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table / List */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="p-4 md:p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-bold text-neutral-900">
              Usuários Cadastrados
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">
              {filteredUsers.length}
            </span>
          </div>
          <span className="text-xs text-neutral-400">
            Total na loja: {users.length}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Carregando usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-neutral-400">
            <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-neutral-700">Nenhum usuário encontrado</p>
            <p className="text-xs text-neutral-400 mt-1">
              {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Tente ajustar os filtros de busca acima.'
                : 'Clique no botão "Novo Usuário" para cadastrar o primeiro operador.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 md:px-6">Usuário</th>
                  <th className="py-3.5 px-4">Login & Contato</th>
                  <th className="py-3.5 px-4">Papel / Nível</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Último Acesso</th>
                  <th className="py-3.5 px-4 md:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50/80 transition-colors">
                    {/* User Profile */}
                    <td className="py-4 px-4 md:px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.nome}
                              className="w-10 h-10 rounded-full object-cover border border-neutral-200 shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 font-bold text-sm">
                              {user.nome.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                              user.ativo !== false ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}
                            title={user.ativo !== false ? 'Ativo' : 'Inativo'}
                          />
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                            <span>{user.nome}</span>
                          </div>
                          <div className="text-xs text-neutral-500 flex items-center gap-1">
                            <span>@{user.username}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email & Contact */}
                    <td className="py-4 px-4">
                      <div className="text-neutral-800 font-medium">{user.email}</div>
                      <div className="text-[11px] text-neutral-400">ID: {user.id.slice(0, 14)}</div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      {getRoleBadge(user.role || 'ADMIN')}
                    </td>

                    {/* Status with 1-click toggle */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          user.ativo !== false
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                        }`}
                        title="Clique para alternar o status"
                      >
                        {user.ativo !== false ? (
                          <>
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 text-neutral-500" />
                            <span>Inativo</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Last Access */}
                    <td className="py-4 px-4 hidden lg:table-cell text-xs text-neutral-500">
                      {user.ultimoAcesso ? (
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{new Date(user.ultimoAcesso).toLocaleString('pt-BR')}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">Nunca acessou</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 md:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`btn-edit-user-${user.id}`}
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                          title="Editar usuário"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-delete-user-${user.id}`}
                          onClick={() => setUserToDelete(user)}
                          disabled={isDeletingId === user.id}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer disabled:opacity-50"
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

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-200 shadow-2xl">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-neutral-900">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {/* Feedback within modal */}
              {feedback && feedback.type === 'error' && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-900 outline-none"
                />
              </div>

              {/* E-mail & Login */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    E-mail de Contato / Login *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="maria@loja.com.br"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="maria"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-900 outline-none"
                  />
                </div>
              </div>

              {/* Password Field with Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-700">
                    {editingUser ? 'Alterar Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <div className="flex items-center gap-2">
                    {copiedPassMsg && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Copiada!
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Gerar Senha Segura</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      editingUser
                        ? 'Deixe em branco para manter a senha atual'
                        : 'Mínimo de 4 caracteres'
                    }
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {editingUser && !formPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Senha atual protegida com hash Bcrypt. Preencha apenas para alterá-la.</span>
                  </div>
                )}

                {formPassword && (
                  <div className="mt-2 p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
                      <Key className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Nova senha pronta ({formPassword.length} caracteres). Será criptografada ao salvar.</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      formPassword.length >= 8 ? 'bg-emerald-200 text-emerald-900' : formPassword.length >= 5 ? 'bg-amber-200 text-amber-900' : 'bg-rose-200 text-rose-900'
                    }`}>
                      {formPassword.length >= 8 ? 'Forte' : formPassword.length >= 5 ? 'Média' : 'Curta'}
                    </span>
                  </div>
                )}
              </div>

              {/* Papel / Nível de Acesso */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nível de Permissão (Papel)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex flex-col p-3 rounded-xl border text-center cursor-pointer transition ${
                      formRole === 'ADMIN'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={formRole === 'ADMIN'}
                      onChange={() => setFormRole('ADMIN')}
                      className="sr-only"
                    />
                    <Crown className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs">Admin</span>
                    <span className="text-[10px] text-neutral-400 font-normal mt-0.5">Total</span>
                  </label>

                  <label
                    className={`flex flex-col p-3 rounded-xl border text-center cursor-pointer transition ${
                      formRole === 'GERENTE'
                        ? 'border-sky-600 bg-sky-50/50 text-sky-950 font-bold'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="GERENTE"
                      checked={formRole === 'GERENTE'}
                      onChange={() => setFormRole('GERENTE')}
                      className="sr-only"
                    />
                    <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                    <span className="text-xs">Gerente</span>
                    <span className="text-[10px] text-neutral-400 font-normal mt-0.5">Operação</span>
                  </label>

                  <label
                    className={`flex flex-col p-3 rounded-xl border text-center cursor-pointer transition ${
                      formRole === 'EDITOR'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="EDITOR"
                      checked={formRole === 'EDITOR'}
                      onChange={() => setFormRole('EDITOR')}
                      className="sr-only"
                    />
                    <Edit2 className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <span className="text-xs">Editor</span>
                    <span className="text-[10px] text-neutral-400 font-normal mt-0.5">Catálogo</span>
                  </label>
                </div>
              </div>

              {/* Status Ativo Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Usuário Ativo no Sistema</div>
                  <div className="text-[11px] text-neutral-500">
                    Usuários inativos não conseguem fazer login no painel.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Avatar Selector & URL */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Foto de Perfil (Avatar)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {PRESET_AVATARS.map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormAvatar(presetUrl)}
                      className={`relative rounded-full p-0.5 transition cursor-pointer ${
                        formAvatar === presetUrl ? 'ring-2 ring-neutral-900 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={presetUrl}
                        alt={`Avatar ${idx + 1}`}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  placeholder="Ou cole a URL da imagem (opcional)"
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-900 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-neutral-900">Excluir Usuário</h3>
              <p className="text-xs text-neutral-600">
                Tem certeza que deseja excluir o usuário <strong className="text-neutral-900">{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
              <p className="text-[11px] text-neutral-400">
                Esta ação não pode ser desfeita. O acesso do usuário será revogado imediatamente.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingId !== null}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingId !== null}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isDeletingId ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
