import type { Deployment, FieldConfig } from '@/types';

export const DEPLOYMENTS: Deployment[] = [
  {
    deployment_id: 'dep-001',
    version: '1.0.0',
    status: 'active',
    type: 'web_service',
    environment: 'production',
    attributes: { name: 'api-service', description: 'Main API', team: 'platform' },
    created_at: '2024-01-01T00:00:00.000000Z',
    created_by: 'alice',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    deployment_id: 'dep-002',
    version: '2.0.0',
    status: 'failed',
    type: 'worker',
    environment: 'staging',
    attributes: { name: 'batch-worker', description: 'Batch processor', team: 'data' },
    created_at: '2024-01-02T00:00:00.000000Z',
    created_by: 'bob',
    updated_at: '2024-01-02T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    deployment_id: 'dep-003',
    version: '1.5.0',
    status: 'stopped',
    type: 'cron_job',
    environment: 'development',
    attributes: { name: 'data-sync', description: 'Sync cron', team: 'data' },
    created_at: '2024-01-03T00:00:00.000000Z',
    created_by: 'carol',
    updated_at: '2024-01-03T00:00:00.000000Z',
    deleted_at: '2024-01-04T00:00:00.000000Z',
  },
];

export const FIELD_CONFIG: FieldConfig = {
  system: [
    { path: 'deployment_id', label: 'Deployment Id' },
    { path: 'version', label: 'Version' },
    { path: 'status', label: 'Status' },
    { path: 'type', label: 'Type' },
    { path: 'environment', label: 'Environment' },
    { path: 'created_by', label: 'Created By' },
    { path: 'created_at', label: 'Created At' },
    { path: 'attributes.name', label: 'Name' },
    { path: 'attributes.description', label: 'Description' },
    { path: 'attributes.team', label: 'Team' },
    { path: 'attributes.region', label: 'Region' },
  ],
  custom: [],
};

export function mockAllApis(
  page: import('@playwright/test').Page,
  overrides?: {
    deployments?: Deployment[];
    fieldConfig?: FieldConfig;
  }
) {
  const deployments = overrides?.deployments ?? DEPLOYMENTS;
  const fieldConfig = overrides?.fieldConfig ?? FIELD_CONFIG;

  return Promise.all([
    page.route('**/api/field-config', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fieldConfig),
      })
    ),

    // List / query route (lower priority — registered first)
    page.route('**/api/deployments*', (route) => {
      const url = new URL(route.request().url());

      if (url.searchParams.has('updated_since')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, pages: 1 }),
        });
        return;
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: deployments,
          total: deployments.length,
          page: 1,
          pages: 1,
        }),
      });
    }),

    // ID-specific route (higher priority — registered last, wins for /deployments/<id>)
    page.route('**/api/deployments/**', (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (url.includes('/restore') && method === 'POST') {
        const id = url.match(/deployments\/([^/]+)\/restore/)?.[1];
        const dep = deployments.find((d) => d.deployment_id === id);
        const updated = dep ? { ...dep, deleted_at: null } : null;
        route.fulfill({
          status: updated ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(updated ?? { detail: 'Not found' }),
        });
      } else if (method === 'DELETE') {
        const id = url.match(/deployments\/([^/]+)$/)?.[1];
        const dep = deployments.find((d) => d.deployment_id === id);
        const updated = dep ? { ...dep, deleted_at: new Date().toISOString() } : null;
        route.fulfill({
          status: updated ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(updated ?? { detail: 'Not found' }),
        });
      } else if (method === 'PATCH') {
        const id = url.match(/deployments\/([^/]+)$/)?.[1];
        const dep = deployments.find((d) => d.deployment_id === id);
        if (dep) {
          // postDataJSON() is synchronous
          const body = route.request().postDataJSON() as Record<string, string>;
          const updated: Deployment = { ...dep, attributes: { ...dep.attributes } };
          Object.entries(body).forEach(([k, v]) => {
            if (k.startsWith('attributes.')) {
              updated.attributes[k.slice('attributes.'.length)] = v;
            }
          });
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(updated),
          });
        } else {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Not found' }),
          });
        }
      } else {
        // GET /api/deployments/<id> — return individual deployment
        const id = url.match(/deployments\/([^/]+)$/)?.[1];
        const dep = deployments.find((d) => d.deployment_id === id);
        route.fulfill({
          status: dep ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(dep ?? { detail: 'Not found' }),
        });
      }
    }),
  ]);
}
