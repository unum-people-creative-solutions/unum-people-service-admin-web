import { api } from '@/lib/api';
import { Term, TermVersion, CreateTermInput, UpdateTermInput, PublishTermVersionInput } from '@/types/term';

export const termService = {
  list: (): Promise<Term[]> => api.get('/admin/terms'),

  create: (input: CreateTermInput): Promise<Term> => api.post('/admin/terms', input),

  update: (id: string, input: UpdateTermInput): Promise<Term> => api.put(`/admin/terms/${id}`, input),

  remove: (id: string): Promise<void> => api.delete(`/admin/terms/${id}`),

  listVersions: (id: string): Promise<TermVersion[]> => api.get(`/admin/terms/${id}/versions`),

  publishVersion: (id: string, input: PublishTermVersionInput): Promise<TermVersion> =>
    api.post(`/admin/terms/${id}/versions`, input),

  deleteVersion: (id: string, version: number): Promise<void> =>
    api.delete(`/admin/terms/${id}/versions/${version}`),
};
