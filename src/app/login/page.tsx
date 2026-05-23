'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { jwtDecode } from 'jwt-decode';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

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
        // Usa ID Token (getIdToken) para autenticacao com o API Gateway JWT Authorizer
        const idToken = result.getIdToken().getJwtToken();
        const refreshToken = result.getRefreshToken().getToken();
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
          idToken,
          refreshToken
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border-t-4 border-primary-600">
        <div className="flex flex-col items-center mb-10 text-center">
          <Image 
            src="/images/logo_simbolo.png" 
            alt="Unum People" 
            width={60} 
            height={60} 
            className="object-contain mb-4"
            priority 
          />
          <h1 className="text-3xl font-black text-primary-900 uppercase tracking-tighter">
            Unum People <span className="text-primary-600 font-black">Admin</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 opacity-60">
            Painel Central de Administração
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block" htmlFor="email">
              E-mail Administrativo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                {...register('email')}
                id="email"
                type="email"
                className="block w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                placeholder="admin@unum.com.br"
              />
            </div>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block" htmlFor="password">
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
                className="block w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Entrar no Painel Seguro'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
            Acesso restrito &bull; Ações auditadas
          </p>
        </div>
      </div>
    </div>
  );
}
