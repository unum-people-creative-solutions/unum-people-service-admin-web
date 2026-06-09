'use client';

import { useState, useEffect } from 'react';
import { 
  Save, 
  Mail, 
  Globe, 
  CheckCircle, 
  Loader2, 
  Copy, 
  Check,
  ArrowRight
} from 'lucide-react';
import { settingsService, GlobalSettingsResponse } from '@/services/settingsService';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function SettingsPage() {
  const [data, setData] = useState<GlobalSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [redirectionEmail, setRedirectionEmail] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const resp = await settingsService.getSettings();
      console.log('Settings data received:', resp);
      
      if (resp && resp.settings) {
        setData(resp);
        setInstitutionalEmail(resp.settings.institutional_email || '');
        setRedirectionEmail(resp.settings.redirection_email || '');
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações', error);
      alert('Não foi possível carregar as configurações do servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.updateSettings({ 
        institutional_email: institutionalEmail,
        redirection_email: redirectionEmail 
      });
      await fetchSettings();
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações Globais</h1>
        <p className="text-slate-500">Gerencie as preferências institucionais e parâmetros de rede da plataforma.</p>
      </div>

      {/* Seção E-mail Institucional e Redirecionamento */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Mail size={20} className="text-primary-600" />
          <h2 className="font-semibold text-slate-800">Comunicação e E-mail</h2>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-mail Institucional (Remetente)
              </label>
              <input 
                type="email" 
                value={institutionalEmail}
                onChange={(e) => setInstitutionalEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                placeholder="noreply@unumpeople.com.br"
                required
              />
              <p className="mt-2 text-xs text-slate-500">
                Endereço oficial usado para enviar notificações e convites.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-mail de Redirecionamento (Destino)
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  value={redirectionEmail}
                  onChange={(e) => setRedirectionEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="unumpeople@gmail.com.br"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Para onde os e-mails recebidos em @{data?.dns.domain} serão encaminhados.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-50">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </section>

      {/* Seção Configuração de DNS */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-primary-600" />
            <h2 className="font-semibold text-slate-800">Configuração de DNS</h2>
          </div>
          <div className="flex items-center gap-2">
            {['Success', 'Verified'].includes(data?.dns.status || '') ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                <CheckCircle size={14} /> Verificado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                <Loader2 size={14} className="animate-spin" /> Pendente
              </span>
            )}
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6">
            Para que o envio e recebimento de e-mails funcione corretamente no domínio <strong>{data?.dns.domain}</strong>, 
            adicione os registros abaixo no seu provedor de DNS.
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 font-semibold text-slate-700">Tipo</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Nome/Host</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Valor/Destino</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.dns.records.map((record, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs break-all max-w-[200px]">
                      {record.name}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs break-all max-w-[300px]">
                      {record.value}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => copyToClipboard(record.value, idx)}
                        className="p-2 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-md transition-all text-slate-400 hover:text-primary-600"
                        title="Copiar Valor"
                      >
                        {copiedIndex === idx ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-4 bg-primary-50 rounded-lg border border-primary-100">
            <h3 className="text-sm font-semibold text-primary-800 mb-2">Instruções de Recebimento</h3>
            <ul className="text-xs text-primary-700 space-y-1.5 list-disc list-inside">
              <li>O registro <strong>MX</strong> é obrigatório para que o SES possa receber e-mails em seu nome.</li>
              <li>Os registros <strong>DKIM (CNAME)</strong> garantem que seus e-mails não caiam no SPAM.</li>
              <li>O registro <strong>SPF (TXT)</strong> autoriza a AWS a enviar e-mails pelo seu domínio.</li>
              <li>A propagação do DNS pode levar até 48 horas após a configuração.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Seção Configuração do Gmail */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Image 
            src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
            alt="Google" 
            width={20} 
            height={20} 
          />
          <h2 className="font-semibold text-slate-800">Responder pelo Gmail com @{data?.dns.domain}</h2>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600">
            Siga os passos abaixo para configurar seu Gmail e responder mensagens usando seu domínio profissional.
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">1</div>
              <div className="text-sm text-slate-700">
                <p className="font-semibold">Obtenha as Credenciais SMTP</p>
                <p className="text-slate-500 text-xs mt-1">
                  {"No console AWS, acesse o SES -> SMTP Settings e clique em \"Create SMTP Credentials\"."}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">2</div>
              <div className="text-sm text-slate-700">
                <p className="font-semibold">Configuração no Gmail</p>
                <p className="text-slate-500 text-xs mt-1">
                  {"No Gmail: Configurações -> Ver todas as configurações -> Contas e Importação -> "}
                  <strong>Enviar e-mail como</strong>
                  {" -> Adicionar outro endereço de e-mail."}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">3</div>
              <div className="text-sm text-slate-700">
                <p className="font-semibold">Parâmetros do Servidor</p>
                <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider">Servidor SMTP</span>
                    <span className="text-slate-700">email-smtp.us-east-1.amazonaws.com</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider">Porta / Conexão</span>
                    <span className="text-slate-700">587 (TLS)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">4</div>
              <div className="text-sm text-slate-700">
                <p className="font-semibold">Usuário e Senha</p>
                <p className="text-slate-500 text-xs mt-1">Utilize as credenciais geradas no Passo 1.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Nota Importante:</strong> Para que o Gmail aceite o envio, seu domínio deve estar com o status <strong>Verificado</strong> na seção de DNS acima.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
