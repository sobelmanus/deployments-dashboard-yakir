export interface Deployment {
  deployment_id: string;
  version: string;
  status: 'active' | 'failed' | 'stopped';
  type: 'web_service' | 'worker' | 'cron_job';
  environment: 'production' | 'staging' | 'development';
  attributes: Record<string, string>;
  created_at: string;
  created_by: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FieldEntry {
  path: string;
  label: string;
}

export interface FieldConfig {
  system: FieldEntry[];
  custom: FieldEntry[];
}

export interface PaginatedResponse {
  items: Deployment[];
  total: number;
  page: number;
  pages: number;
}

export interface FilterState {
  chips: Array<{ field: string; value: string }>;
  status: string[];
  type: string[];
  environment: string[];
  view: 'existing' | 'deleted' | 'all';
  sort: string;
  order: 'asc' | 'desc';
}

export interface ColumnConfig {
  path: string;
  label: string;
  visible: boolean;
  section: 'system' | 'custom';
}
