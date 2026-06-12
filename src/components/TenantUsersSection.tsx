import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useAuthStore } from '@/store/useAuthStore';
import { TenantUserRole, AddTenantUserInput, TenantUser } from '@/types/tenant';
import { Plus, Loader2, Edit2, Key } from 'lucide-react';

interface TenantUsersSectionProps {
  tenantId: string;
}

export function TenantUsersSection({ tenantId }: TenantUsersSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const loggedInEmail = user?.email;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TenantUserRole>('user');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<TenantUserRole>('user');
  const [editBlocked, setEditBlocked] = useState(false);

  const { data: users = [], isLoading, error } = useQuery<TenantUser[]>({
    queryKey: ['tenant-users', tenantId],
    queryFn: () => tenantService.listUsers(tenantId),
  });

  const addUserMutation = useMutation({
    mutationFn: (data: AddTenantUserInput) => tenantService.addUser(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      setIsModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewRole('user');
      setErrors({});
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (email: string) => tenantService.removeUser(tenantId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: TenantUserRole }) =>
      tenantService.updateUserRole(tenantId, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ email, isBlocked }: { email: string; isBlocked: boolean }) =>
      tenantService.blockUser(tenantId, email, isBlocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    },
  });

  const updateUserNameMutation = useMutation({
    mutationFn: ({ email, name }: { email: string; name: string }) =>
      tenantService.updateUserName(tenantId, email, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    },
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: ({ tenantId, email }: { tenantId: string; email: string }) =>
      tenantService.resetUserPassword(tenantId, email),
    onSuccess: () => {
      alert("Código de recuperação enviado com sucesso!");
    },
  });

  const handleSave = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const newErrors: { name?: string; email?: string } = {};
    if (!newName.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!newEmail.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    addUserMutation.mutate({
      name: newName,
      email: newEmail,
      role: newRole,
    });
  };

  const handleRemove = (email: string) => {
    if (window.confirm('Tem certeza de que deseja remover este usuário?')) {
      removeUserMutation.mutate(email);
    }
  };

  const handleEditSave = () => {
    if (!editingUser) return;
    
    // Dispara as mutations sequencialmente ou apenas a que mudou
    if (editingUser.name !== editName) {
      updateUserNameMutation.mutate({ email: editingUser.email, name: editName });
    }
    if (editingUser.role !== editRole) {
      updateUserRoleMutation.mutate({ email: editingUser.email, role: editRole });
    }
    if (editingUser.is_blocked !== editBlocked) {
      blockUserMutation.mutate({ email: editingUser.email, isBlocked: editBlocked });
    }
    setEditingUser(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mt-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Usuários</h2>
          <p className="text-slate-500 text-sm">Gerencie os usuários e permissões vinculados a este tenant.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          Adicionar Usuário
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      ) : error ? (
        <div className="text-red-500 py-4 text-center">
          Erro ao carregar usuários.
        </div>
      ) : users.length === 0 ? (
        <div className="text-slate-500 py-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
          Nenhum usuário cadastrado ainda
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table role="table" className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700">
              <tr role="row">
                <th scope="col" className="px-6 py-3">Nome</th>
                <th scope="col" className="px-6 py-3">Email</th>
                <th scope="col" className="px-6 py-3">Perfil</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 border-t border-slate-100">
              {users.map((userItem) => (
                <tr role="row" key={userItem.email} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {userItem.name}
                  </td>
                  <td className="px-6 py-4">{userItem.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${userItem.role === 'admin' ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {userItem.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${userItem.is_blocked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                      {userItem.is_blocked ? 'Bloqueado' : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(userItem);
                        setEditName(userItem.name);
                        setEditRole(userItem.role);
                        setEditBlocked(userItem.is_blocked);
                      }}
                      className="text-primary-600 hover:text-primary-900 font-medium flex items-center gap-1 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(userItem.email)}
                      disabled={userItem.email === loggedInEmail}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:hover:text-red-600 font-medium flex items-center gap-1 transition-colors"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Adicionar Usuário ao Tenant</h3>
            <div 
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label htmlFor="new_name" className="text-sm font-semibold text-slate-700">Nome</label>
                <input
                  id="new_name"
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="Nome do usuário"
                />
                {errors.name && <span className="text-red-500 text-xs">{errors.name}</span>}
              </div>

              <div className="space-y-1">
                <label htmlFor="new_email" className="text-sm font-semibold text-slate-700">E-mail</label>
                <input
                  id="new_email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="email@empresa.com"
                />
                {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
              </div>

              <div className="space-y-1">
                <label htmlFor="new_role" className="text-sm font-semibold text-slate-700">Perfil</label>
                <select
                  id="new_role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as TenantUserRole)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="admin">Administrador (Admin)</option>
                  <option value="user">Usuário Comum (User)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewName('');
                    setNewEmail('');
                    setNewRole('user');
                    setErrors({});
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={addUserMutation.isPending}
                  className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {addUserMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Editar Usuário</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Nome</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">E-mail</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="edit_role" className="text-sm font-semibold text-slate-700">Perfil</label>
                <select
                  id="edit_role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as TenantUserRole)}
                  disabled={editingUser.email === loggedInEmail}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="admin">Administrador (Admin)</option>
                  <option value="user">Usuário Comum (User)</option>
                </select>
                {editingUser.email === loggedInEmail && (
                  <p className="text-xs text-amber-600 mt-1">Você não pode alterar seu próprio perfil.</p>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block">Bloquear Usuário</label>
                  <span className="text-xs text-slate-500">Impede o login no sistema.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editBlocked}
                    onChange={(e) => setEditBlocked(e.target.checked)}
                    disabled={editingUser.email === loggedInEmail}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${editBlocked ? 'bg-red-600' : 'bg-slate-200'} ${editingUser.email === loggedInEmail ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Deseja enviar um código de recuperação de senha para o e-mail deste usuário?")) {
                      resetUserPasswordMutation.mutate({ tenantId, email: editingUser.email });
                    }
                  }}
                  disabled={resetUserPasswordMutation.isPending}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 bg-slate-50 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {resetUserPasswordMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                  Resetar Senha
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditSave()}
                    disabled={updateUserRoleMutation.isPending || blockUserMutation.isPending || updateUserNameMutation.isPending}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {(updateUserRoleMutation.isPending || blockUserMutation.isPending || updateUserNameMutation.isPending) && <Loader2 className="animate-spin" size={16} />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
