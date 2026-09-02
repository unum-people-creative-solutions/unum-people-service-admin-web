'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { isAbsoluteHttpUrl, type SiteUrlItem } from '@/lib/siteUrls';

type SiteUrlsFormValues = {
  site_urls: SiteUrlItem[];
};

export function SiteUrlsFieldArray() {
  const {
    control,
    register,
    getValues,
    formState: { errors },
  } = useFormContext<SiteUrlsFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'site_urls',
  });

  return (
    <fieldset className="space-y-3 md:col-span-2">
      <legend className="text-sm font-semibold text-slate-700">URLs dos sites</legend>
      <p className="text-xs text-slate-400">Opcional. Lista vazia é válida — o tenant fica sem site.</p>

      <div className="space-y-3">
        {fields.map((field, index) => {
          const fieldError = errors.site_urls?.[index]?.url;
          return (
            <div key={field.id} className="space-y-1">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <label htmlFor={`site-url-${index}`} className="sr-only">
                    URL do site {index + 1}
                  </label>
                  <input
                    id={`site-url-${index}`}
                    {...register(`site_urls.${index}.url`, {
                      validate: {
                        httpUrl: (value) => {
                          const trimmed = (value ?? '').trim();
                          if (!trimmed) return true;
                          return isAbsoluteHttpUrl(trimmed) || 'Informe uma URL absoluta http ou https';
                        },
                        unique: (value) => {
                          const trimmed = (value ?? '').trim();
                          if (!trimmed) return true;
                          const urls = (getValues('site_urls') ?? []).map((item) => item.url.trim());
                          return urls.filter((url) => url === trimmed).length <= 1 || 'URL duplicada';
                        },
                      },
                    })}
                    placeholder="https://meusite.com.br"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remover site ${index + 1}`}
                  className="mt-0.5 p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
              {fieldError?.message && (
                <span role="alert" className="text-red-500 text-xs">{fieldError.message}</span>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => append({ url: '' })}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        <Plus size={16} aria-hidden="true" />
        Adicionar site
      </button>
    </fieldset>
  );
}
