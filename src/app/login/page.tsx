'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { jwtDecode } from 'jwt-decode';
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

import { loginSchema, type LoginFormValues } from '@/lib/validations';
import { userPool } from '@/lib/cognito';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    const authDetails = new AuthenticationDetails({
      Username: data.email.toLowerCase().trim(),
      Password: data.password,
    });

    const cognitoUser = new CognitoUser({
      Username: data.email.toLowerCase().trim(),
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        const decoded: any = jwtDecode(idToken);
        const groups = decoded['cognito:groups'] || [];

        // Verifica se é Admin
        if (!groups.includes('Admins') && !groups.includes('GlobalAdmin')) {
          setError('Acesso negado. Apenas administradores globais podem acessar este painel.');
          setLoading(false);
          return;
        }

        setAuth(
          {
            email: decoded.email,
            groups: groups,
          },
          idToken
        );

        router.push('/dashboard');
      },
      onFailure: (err) => {
        setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
        setLoading(false);
      },
      newPasswordRequired: () => {
        setError('Uma nova senha é necessária. Por favor, utilize o portal principal para atualizar sua senha.');
        setLoading(false);
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="p-8 bg-slate-900 text-white flex flex-col items-center">
            <div className="bg-indigo-600 p-3 rounded-xl mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Central</h1>
            <p className="text-slate-400 text-sm mt-1">Unum People Services</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block" htmlFor="email">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    {...register('email')}
                    id="email"
                    type="email"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="admin@exemplo.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block" htmlFor="password">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    {...register('password')}
                    id="password"
                    type="password"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:bg-indigo-400 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  'Entrar no Painel'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Acesso restrito a administradores. Todas as ações são auditadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
