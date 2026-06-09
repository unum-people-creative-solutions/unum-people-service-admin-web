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
    </div>
  );
}
