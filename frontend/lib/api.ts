import type { Deployment, FieldConfig, PaginatedResponse } from '@/types';

const API_BASE = '/api';

export interface FetchDeploymentsParams {
  page?: number;
  limit?: number;
  view?: 'existing' | 'deleted' | 'all';
  status?: string[];
  type?: string[];
  environment?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
  updated_since?: string;
}

export async function fetchDeployments(
  params: FetchDeploymentsParams = {}
): Promise<PaginatedResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.view) qs.set('view', params.view);
  if (params.sort) qs.set('sort', params.sort);
  if (params.order) qs.set('order', params.order);
  if (params.updated_since) qs.set('updated_since', params.updated_since);
  params.status?.forEach((s) => qs.append('status', s));
  params.type?.forEach((t) => qs.append('type', t));
  params.environment?.forEach((e) => qs.append('environment', e));

  const res = await fetch(`${API_BASE}/deployments?${qs.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch deployments: ${res.status}`);
  return res.json();
}

export async function fetchDeployment(id: string): Promise<Deployment> {
  const res = await fetch(`${API_BASE}/deployments/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch deployment: ${res.status}`);
  return res.json();
}

export async function patchDeployment(
  id: string,
  body: Record<string, string>
): Promise<Deployment> {
  const res = await fetch(`${API_BASE}/deployments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'PATCH failed');
  }
  return res.json();
}

export async function putDeployment(
  id: string,
  attributes: Record<string, string>
): Promise<Deployment> {
  const res = await fetch(`${API_BASE}/deployments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attributes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'PUT failed');
  }
  return res.json();
}

export async function deleteDeployment(id: string): Promise<Deployment> {
  const res = await fetch(`${API_BASE}/deployments/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'DELETE failed');
  }
  return res.json();
}

export async function restoreDeployment(id: string): Promise<Deployment> {
  const res = await fetch(`${API_BASE}/deployments/${id}/restore`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Restore failed');
  }
  return res.json();
}

export async function fetchFieldConfig(): Promise<FieldConfig> {
  const res = await fetch(`${API_BASE}/field-config`);
  if (!res.ok) throw new Error(`Failed to fetch field config: ${res.status}`);
  return res.json();
}
