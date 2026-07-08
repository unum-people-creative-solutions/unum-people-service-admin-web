"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, PenTool, Eye, Bold, Italic, Heading2, Heading3, List, Link2 } from 'lucide-react';
import { termService } from '@/services/termService';
import { UpdateTermInput, PublishTermVersionInput } from '@/types/term';
import { VersionHistoryList } from '../_components/VersionHistoryList';
import { cn } from '@/lib/utils';

// Mesmos elementos que o backend permite na sanitização (bluemonday) — o
// preview nunca deve mostrar algo (imagem, tabela, bloco de código) que
// seria removido na publicação real.
const ALLOWED_PREVIEW_ELEMENTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'del', 'a'];

export default function TermEditPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: terms, isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: termService.list,
  });
  const term = terms?.find((t) => t.id === id);

  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaSuccess, setMetaSuccess] = useState(false);
  const metaForm = useForm<UpdateTermInput>({ defaultValues: { name: '', description: '', is_active: true } });

  useEffect(() => {
    if (term) {
      metaForm.reset({ name: term.name, description: term.description, is_active: term.is_active });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term?.id]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateTermInput) => termService.update(id, input),
    onSuccess: () => {
      setMetaError(null);
      setMetaSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
    onError: (error: any) => {
      setMetaSuccess(false);
      setMetaError(error?.message || 'Falha ao salvar as informações do termo.');
    },
  });

  const onMetaSubmit = (values: UpdateTermInput) => {
    setMetaError(null);
    setMetaSuccess(false);
    updateMutation.mutate(values);
  };

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [publishError, setPublishError] = useState<string | null>(null);
  const contentForm = useForm<PublishTermVersionInput>({ defaultValues: { content_md: '', changelog: '' } });
  const contentMD = contentForm.watch('content_md');

  const publishMutation = useMutation({
    mutationFn: (input: PublishTermVersionInput) => termService.publishVersion(id, input),
    onSuccess: () => {
      setPublishError(null);
      queryClient.invalidateQueries({ queryKey: ['term-versions', id] });
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      contentForm.reset({ content_md: '', changelog: '' });
    },
    onError: (error: any) => {
      setPublishError(error?.message || 'Falha ao publicar a versão. Tente novamente.');
    },
  });

  const onPublishSubmit = (values: PublishTermVersionInput) => {
    setPublishError(null);
    publishMutation.mutate(values);
  };

  const insertMarkdown = (before: string, after: string) => {
    const textarea = document.getElementById('term-content-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    contentForm.setValue('content_md', newText, { shouldDirty: true });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  if (isLoading) return <div className="p-8 animate-pulse">Carregando termo...</div>;

  if (!term) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Link href="/terms" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
            <ArrowLeft size={20} />
            Voltar para Termos
          </Link>
          <p className="text-red-600">Termo não encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/terms" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={20} />
          Voltar para Termos
        </Link>

        {/* Informações do termo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">{term.name}</h1>
            <span className="text-xs text-slate-400">Versão atual: v{term.current_version}</span>
          </div>
          <form onSubmit={metaForm.handleSubmit(onMetaSubmit)} className="space-y-4">
            <div>
              <label htmlFor="meta-name" className="block text-sm font-semibold mb-1">Nome</label>
              <input
                id="meta-name"
                {...metaForm.register('name', { required: true })}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="meta-description" className="block text-sm font-semibold mb-1">Descrição</label>
              <textarea
                id="meta-description"
                {...metaForm.register('description')}
                className="w-full border p-2 rounded"
                placeholder="Descrição interna do termo"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="meta-is-active" {...metaForm.register('is_active')} />
              <label htmlFor="meta-is-active" className="text-sm font-semibold">Ativo</label>
            </div>
            {metaError && <p role="alert" className="text-red-600 text-sm">{metaError}</p>}
            {metaSuccess && <p className="text-green-600 text-sm">Informações salvas.</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar informações'}
              </button>
            </div>
          </form>
        </div>

        {/* Editor de conteúdo — ocupa toda a largura útil da tela, com abas
            Editor/Preview em vez de um drawer lateral confinado. */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={contentForm.handleSubmit(onPublishSubmit)}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 bg-slate-50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    activeTab === 'editor' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <PenTool size={14} />
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    activeTab === 'preview' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Eye size={14} />
                  Visualizar Preview
                </button>
              </div>

              {activeTab === 'editor' && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => insertMarkdown('**', '**')} title="Negrito" className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"><Bold size={14} /></button>
                  <button type="button" onClick={() => insertMarkdown('*', '*')} title="Itálico" className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"><Italic size={14} /></button>
                  <button type="button" onClick={() => insertMarkdown('## ', '')} title="Título 2" className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"><Heading2 size={14} /></button>
                  <button type="button" onClick={() => insertMarkdown('### ', '')} title="Título 3" className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"><Heading3 size={14} /></button>
                  <button type="button" onClick={() => insertMarkdown('- ', '')} title="Lista" className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"><List size={14} /></button>
                  <button type="button" onClick={() => insertMarkdown('[texto](', ')')} title="Link" className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"><Link2 size={14} /></button>
                </div>
              )}
            </div>

            {activeTab === 'editor' ? (
              <textarea
                id="term-content-textarea"
                {...contentForm.register('content_md', { required: true })}
                placeholder="## Termo de Contratação de Serviço..."
                rows={20}
                className="w-full min-h-[500px] p-6 font-mono text-sm outline-none resize-y"
              />
            ) : (
              <div className="min-h-[500px] p-6 prose max-w-none overflow-y-auto">
                {contentMD ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} allowedElements={ALLOWED_PREVIEW_ELEMENTS} unwrapDisallowed>
                    {contentMD}
                  </ReactMarkdown>
                ) : (
                  <p className="text-slate-400 text-sm italic">Escreva algo no editor para visualizar o preview.</p>
                )}
              </div>
            )}

            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div>
                <label htmlFor="changelog" className="block text-sm font-semibold mb-1">Changelog</label>
                <input
                  id="changelog"
                  {...contentForm.register('changelog')}
                  className="w-full border p-2 rounded"
                  placeholder="O que mudou nesta versão (opcional)"
                />
              </div>
              {publishError && <p role="alert" className="text-red-600 text-sm">{publishError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={publishMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50"
                >
                  {publishMutation.isPending ? 'Publicando...' : 'Publicar versão'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Histórico de versões */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <VersionHistoryList term={term} />
        </div>
      </div>
    </div>
  );
}
