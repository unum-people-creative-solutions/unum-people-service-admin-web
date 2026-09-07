import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { tenantService } from '@/services/tenantService';
import { Site } from '@/types/tenant';
import { Loader2, ExternalLink, Code2, X } from 'lucide-react';

interface TenantSitesSectionProps {
  tenantId: string;
}

const statusLabels: Record<Site['status'], string> = {
  DRAFT: 'Rascunho',
  AGUARDANDO_ATIVACAO: 'Aguardando Ativação',
  PUBLISHED: 'Publicado',
};

const statusStyles: Record<Site['status'], string> = {
  DRAFT: 'bg-slate-50 text-slate-700 border border-slate-200',
  AGUARDANDO_ATIVACAO: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  PUBLISHED: 'bg-green-50 text-green-700 border border-green-200',
};

export function TenantSitesSection({ tenantId }: TenantSitesSectionProps) {
  const { data: sites = [], isLoading, error } = useQuery<Site[]>({
    queryKey: ['tenant-sites', tenantId],
    queryFn: () => tenantService.listSites(tenantId),
  });
  const [openSiteId, setOpenSiteId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
        <h2 className="font-bold text-slate-800">Sites (LP Builder)</h2>
        <p className="text-slate-500 text-sm">Páginas configuradas pelo cliente no autoatendimento.</p>
      </div>

      <div className="p-8">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : error ? (
          <div className="text-red-500 py-4 text-center">Erro ao carregar sites.</div>
        ) : sites.length === 0 ? (
          <div className="text-slate-500 py-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
            Nenhum site do LP Builder para este tenant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-500">
              <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Slug</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Layout / Tema</th>
                  <th scope="col" className="px-6 py-3">Criado em</th>
                  <th scope="col" className="px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                {sites.map((site) => (
                  <tr key={site.site_id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{site.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[site.status]}`}>
                        {statusLabels[site.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{site.layout_id} / {site.theme_id}</td>
                    <td className="px-6 py-4">
                      {site.created_at ? new Date(site.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-900 font-medium flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={16} />Abrir site
                        </a>
                        <button
                          type="button"
                          onClick={() => setOpenSiteId(site.site_id)}
                          className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Code2 size={16} />Ver config
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

      <SiteConfigDialog
        tenantId={tenantId}
        siteId={openSiteId}
        onClose={() => setOpenSiteId(null)}
      />
    </div>
  );
}

interface SiteConfigDialogProps {
  tenantId: string;
  siteId: string | null;
  onClose: () => void;
}

function SiteConfigDialog({ tenantId, siteId, onClose }: SiteConfigDialogProps) {
  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['tenant-site-detail', tenantId, siteId],
    queryFn: () => tenantService.getSite(tenantId, siteId as string),
    enabled: !!siteId,
  });

  return (
    <Dialog.Root open={!!siteId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[90]" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-[100] w-full max-w-2xl max-h-[80vh] translate-x-[-50%] translate-y-[-50%] bg-white rounded-2xl shadow-lg flex flex-col outline-none"
          aria-describedby={undefined}
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
            <Dialog.Title className="font-bold text-slate-900">
              Configuração do site {detail ? `— ${detail.slug}` : ''}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-primary-600" size={32} />
              </div>
            ) : error ? (
              <div className="text-red-500 py-4 text-center">Erro ao carregar a configuração do site.</div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block">Layout</span>
                    <span className="text-slate-800 font-medium">{detail.layout_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tema</span>
                    <span className="text-slate-800 font-medium">{detail.theme_id}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-sm mb-1">Conteúdo (content)</span>
                  <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(detail.content, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-slate-400 block text-sm mb-1">Contato (contact)</span>
                  <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(detail.contact, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-slate-400 block text-sm mb-1">SEO</span>
                  <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(detail.seo, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
