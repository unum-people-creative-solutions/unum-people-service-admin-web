export interface Term {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface TermVersion {
  term_id: string;
  version_number: number;
  content_md_s3_key: string;
  content_html_s3_key: string;
  content_hash: string;
  published_by: string;
  published_at: string;
  changelog: string;
  content_html_url?: string;
}

export interface CreateTermInput {
  name: string;
  description: string;
}

export interface UpdateTermInput {
  name: string;
  description: string;
  is_active: boolean;
}

export interface PublishTermVersionInput {
  content_md: string;
  changelog?: string;
}
