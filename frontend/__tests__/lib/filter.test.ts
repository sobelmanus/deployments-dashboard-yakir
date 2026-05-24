import { describe, it, expect } from 'vitest';
import { applyFilters } from '@/lib/filter';
import type { Deployment, FilterState } from '@/types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    deployment_id: 'dep-001',
    version: '1.0.0',
    status: 'active',
    type: 'web_service',
    environment: 'production',
    attributes: { name: 'my-app', description: 'A test app', team: 'platform' },
    created_at: '2024-01-01T00:00:00.000000Z',
    created_by: 'alice',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
    ...overrides,
  };
}

const defaultFilterState: FilterState = {
  chips: [],
  status: [],
  type: [],
  environment: [],
  view: 'existing',
  sort: 'created_at',
  order: 'desc',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyFilters', () => {
  describe('view filter', () => {
    it('view=existing filters out deleted deployments', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', deleted_at: null }),
        makeDeployment({ deployment_id: 'dep-002', deleted_at: '2024-05-01T00:00:00.000000Z' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, view: 'existing' });
      expect(result).toHaveLength(1);
      expect(result[0].deployment_id).toBe('dep-001');
    });

    it('view=deleted shows only deleted deployments', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', deleted_at: null }),
        makeDeployment({ deployment_id: 'dep-002', deleted_at: '2024-05-01T00:00:00.000000Z' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, view: 'deleted' });
      expect(result).toHaveLength(1);
      expect(result[0].deployment_id).toBe('dep-002');
    });

    it('view=all shows all deployments regardless of deleted_at', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', deleted_at: null }),
        makeDeployment({ deployment_id: 'dep-002', deleted_at: '2024-05-01T00:00:00.000000Z' }),
        makeDeployment({ deployment_id: 'dep-003', deleted_at: null }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, view: 'all' });
      expect(result).toHaveLength(3);
    });
  });

  describe('status filter', () => {
    it('filters by single status value', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', status: 'active' }),
        makeDeployment({ deployment_id: 'dep-002', status: 'failed' }),
        makeDeployment({ deployment_id: 'dep-003', status: 'stopped' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, status: ['active'] });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });

    it('filters by multiple status values', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', status: 'active' }),
        makeDeployment({ deployment_id: 'dep-002', status: 'failed' }),
        makeDeployment({ deployment_id: 'dep-003', status: 'stopped' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, status: ['active', 'failed'] });
      expect(result).toHaveLength(2);
      const statuses = result.map((d) => d.status);
      expect(statuses).toContain('active');
      expect(statuses).toContain('failed');
    });

    it('empty status array returns all deployments', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', status: 'active' }),
        makeDeployment({ deployment_id: 'dep-002', status: 'failed' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, status: [] });
      expect(result).toHaveLength(2);
    });
  });

  describe('type filter', () => {
    it('filters by type', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', type: 'web_service' }),
        makeDeployment({ deployment_id: 'dep-002', type: 'worker' }),
        makeDeployment({ deployment_id: 'dep-003', type: 'cron_job' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, type: ['worker'] });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('worker');
    });
  });

  describe('environment filter', () => {
    it('filters by environment', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', environment: 'production' }),
        makeDeployment({ deployment_id: 'dep-002', environment: 'staging' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, environment: ['staging'] });
      expect(result).toHaveLength(1);
      expect(result[0].environment).toBe('staging');
    });
  });

  describe('chip search', () => {
    it('chip with field=all searches across deployment_id', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001' }),
        makeDeployment({ deployment_id: 'dep-002' }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [{ field: 'all', value: 'dep-001' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].deployment_id).toBe('dep-001');
    });

    it('chip with field=all searches across created_by', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', created_by: 'alice' }),
        makeDeployment({ deployment_id: 'dep-002', created_by: 'bob' }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [{ field: 'all', value: 'alice' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].deployment_id).toBe('dep-001');
    });

    it('chip with field=all searches across version', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', version: '1.0.0' }),
        makeDeployment({ deployment_id: 'dep-002', version: '2.0.0' }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [{ field: 'all', value: '2.0.0' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].deployment_id).toBe('dep-002');
    });

    it('chip with field=all searches across attribute values', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', attributes: { name: 'api-service', description: 'Main API' } }),
        makeDeployment({ deployment_id: 'dep-002', attributes: { name: 'batch-worker', description: 'Batch job' } }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [{ field: 'all', value: 'api-service' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].deployment_id).toBe('dep-001');
    });

    it('chip with specific field matches that field only', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', version: '1.0.0' }),
        makeDeployment({ deployment_id: 'dep-002', version: '2.0.0' }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [{ field: 'version', value: '1.0.0' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe('1.0.0');
    });

    it('multiple chips are ANDed together', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', status: 'active', version: '1.0.0' }),
        makeDeployment({ deployment_id: 'dep-002', status: 'active', version: '2.0.0' }),
        makeDeployment({ deployment_id: 'dep-003', status: 'failed', version: '1.0.0' }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [
          { field: 'status', value: 'active' },
          { field: 'version', value: '1.0.0' },
        ],
      });
      // Only dep-001 matches both chips
      expect(result).toHaveLength(1);
      expect(result[0].deployment_id).toBe('dep-001');
    });

    it('chip search is case-insensitive', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', attributes: { name: 'API-Service' } }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [{ field: 'all', value: 'api-service' }],
      });
      expect(result).toHaveLength(1);
    });

    it('chip with empty value matches all', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001' }),
        makeDeployment({ deployment_id: 'dep-002' }),
      ];
      const result = applyFilters(data, {
        ...defaultFilterState,
        chips: [{ field: 'all', value: '' }],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('sorting', () => {
    it('sorts asc by a field', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', version: '3.0.0' }),
        makeDeployment({ deployment_id: 'dep-002', version: '1.0.0' }),
        makeDeployment({ deployment_id: 'dep-003', version: '2.0.0' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, sort: 'version', order: 'asc' });
      const versions = result.map((d) => d.version);
      expect(versions).toEqual(['1.0.0', '2.0.0', '3.0.0']);
    });

    it('sorts desc by a field', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', version: '1.0.0' }),
        makeDeployment({ deployment_id: 'dep-002', version: '3.0.0' }),
        makeDeployment({ deployment_id: 'dep-003', version: '2.0.0' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, sort: 'version', order: 'desc' });
      const versions = result.map((d) => d.version);
      expect(versions).toEqual(['3.0.0', '2.0.0', '1.0.0']);
    });

    it('sorts by attribute path', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001', attributes: { name: 'zzz' } }),
        makeDeployment({ deployment_id: 'dep-002', attributes: { name: 'aaa' } }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, sort: 'attributes.name', order: 'asc' });
      expect(result[0].attributes.name).toBe('aaa');
      expect(result[1].attributes.name).toBe('zzz');
    });
  });

  describe('empty filterState', () => {
    it('returns all items when no filters applied and view=all', () => {
      const data = [
        makeDeployment({ deployment_id: 'dep-001' }),
        makeDeployment({ deployment_id: 'dep-002', deleted_at: '2024-05-01T00:00:00.000000Z' }),
      ];
      const result = applyFilters(data, { ...defaultFilterState, view: 'all' });
      expect(result).toHaveLength(2);
    });
  });
});
