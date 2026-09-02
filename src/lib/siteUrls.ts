export type SiteUrlItem = { url: string };

export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function toSiteUrlItems(urls: string[]): SiteUrlItem[] {
  return urls.map((url) => ({ url }));
}

export function fromSiteUrlItems(items: SiteUrlItem[] | undefined): string[] {
  return (items ?? [])
    .map((item) => item.url.trim())
    .filter((url) => url.length > 0);
}
