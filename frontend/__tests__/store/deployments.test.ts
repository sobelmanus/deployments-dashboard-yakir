import { describe, it, expect, beforeEach } from 'vitest';
import { useDeploymentsStore } from '@/store/deployments';
import type { Deployment, FilterState } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    deployment_id: 'dep-001',
    version: '1.0.0',
    status: 'active',
    type: 'web_service',
    environment: 'production',
    attributes: { name: 'my-app', description: 'desc' },
    created_at: '2024-01-01T00:00:00.000000Z',
    created_by: 'alice',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
    ...overrides,
  };
}

const DEFAULT_FILTER_STATE: FilterState = {
  chips: [],
  status: [],
  type: [],
  environment: [],
  view: 'existing',
  sort: 'created_at',
  order: 'desc',
};

// ---------------------------------------------------------------------------
// Reset store before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useDeploymentsStore.setState(
    {
      rawData: [],
      fieldConfig: null,
      prefetchComplete: false,
      lastFetchedAt: null,
      fetchError: null,
      filterState: { ...DEFAULT_FILTER_STATE },
      viewData: [],
      openPanelId: null,
      activeEdits: new Set(),
    },
  );
});

// ---------------------------------------------------------------------------
// setRawData
// ---------------------------------------------------------------------------

describe('setRawData', () => {
  it('sets rawData', () => {
    const dep = makeDeployment();
    useDeploymentsStore.getState().setRawData([dep]);
    expect(useDeploymentsStore.getState().rawData).toHaveLength(1);
    expect(useDeploymentsStore.getState().rawData[0].deployment_id).toBe('dep-001');
  });

  it('derives viewData using current filterState', () => {
    const active = makeDeployment({ deployment_id: 'dep-001', deleted_at: null });
    const deleted = makeDeployment({
      deployment_id: 'dep-002',
      deleted_at: '2024-05-01T00:00:00.000000Z',
    });
    useDeploymentsStore.getState().setRawData([active, deleted]);
    // Default view=existing, so deleted should be excluded
    const { viewData } = useDeploymentsStore.getState();
    expect(viewData).toHaveLength(1);
    expect(viewData[0].deployment_id).toBe('dep-001');
  });

  it('replaces previous rawData entirely', () => {
    const dep1 = makeDeployment({ deployment_id: 'dep-001' });
    const dep2 = makeDeployment({ deployment_id: 'dep-002' });
    useDeploymentsStore.getState().setRawData([dep1]);
    useDeploymentsStore.getState().setRawData([dep2]);
    expect(useDeploymentsStore.getState().rawData).toHaveLength(1);
    expect(useDeploymentsStore.getState().rawData[0].deployment_id).toBe('dep-002');
  });
});

// ---------------------------------------------------------------------------
// mergeRawData
// ---------------------------------------------------------------------------

describe('mergeRawData', () => {
  it('appends a new deployment not in rawData', () => {
    const existing = makeDeployment({ deployment_id: 'dep-001' });
    useDeploymentsStore.getState().setRawData([existing]);

    const newDep = makeDeployment({ deployment_id: 'dep-002' });
    useDeploymentsStore.getState().mergeRawData([newDep]);

    expect(useDeploymentsStore.getState().rawData).toHaveLength(2);
    const ids = useDeploymentsStore.getState().rawData.map((d) => d.deployment_id);
    expect(ids).toContain('dep-002');
  });

  it('merges updated fields for an existing deployment', () => {
    const original = makeDeployment({ version: '1.0.0' });
    useDeploymentsStore.getState().setRawData([original]);

    const updated = makeDeployment({ version: '2.0.0' });
    useDeploymentsStore.getState().mergeRawData([updated]);

    const { rawData } = useDeploymentsStore.getState();
    expect(rawData).toHaveLength(1);
    expect(rawData[0].version).toBe('2.0.0');
  });

  it('protects field in activeEdits from being overwritten', () => {
    const original = makeDeployment({ attributes: { name: 'original-name', description: 'desc' } });
    useDeploymentsStore.getState().setRawData([original]);

    // Register the field as being edited
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.name');

    // Merge an update that changes name
    const updated = makeDeployment({
      attributes: { name: 'server-name', description: 'new-desc' },
    });
    useDeploymentsStore.getState().mergeRawData([updated]);

    const { rawData } = useDeploymentsStore.getState();
    // name should be protected (still original), description should be updated
    expect(rawData[0].attributes.name).toBe('original-name');
    expect(rawData[0].attributes.description).toBe('new-desc');
  });

  it('updates viewData after merge', () => {
    const dep1 = makeDeployment({ deployment_id: 'dep-001', version: '1.0.0' });
    useDeploymentsStore.getState().setRawData([dep1]);

    const updated = makeDeployment({ deployment_id: 'dep-001', version: '2.0.0' });
    useDeploymentsStore.getState().mergeRawData([updated]);

    const { viewData } = useDeploymentsStore.getState();
    expect(viewData[0].version).toBe('2.0.0');
  });
});

// ---------------------------------------------------------------------------
// updateRecord
// ---------------------------------------------------------------------------

describe('updateRecord', () => {
  it('replaces an existing record', () => {
    const original = makeDeployment({ version: '1.0.0' });
    useDeploymentsStore.getState().setRawData([original]);

    const updated = makeDeployment({ version: '99.0.0' });
    useDeploymentsStore.getState().updateRecord(updated);

    const { rawData } = useDeploymentsStore.getState();
    expect(rawData).toHaveLength(1);
    expect(rawData[0].version).toBe('99.0.0');
  });

  it('appends a new record if not in rawData', () => {
    const dep1 = makeDeployment({ deployment_id: 'dep-001' });
    useDeploymentsStore.getState().setRawData([dep1]);

    const dep2 = makeDeployment({ deployment_id: 'dep-002' });
    useDeploymentsStore.getState().updateRecord(dep2);

    expect(useDeploymentsStore.getState().rawData).toHaveLength(2);
  });

  it('updates viewData after updateRecord', () => {
    const dep = makeDeployment({ version: '1.0.0' });
    useDeploymentsStore.getState().setRawData([dep]);

    const updated = makeDeployment({ version: '5.0.0' });
    useDeploymentsStore.getState().updateRecord(updated);

    expect(useDeploymentsStore.getState().viewData[0].version).toBe('5.0.0');
  });
});

// ---------------------------------------------------------------------------
// setFilterState
// ---------------------------------------------------------------------------

describe('setFilterState', () => {
  it('updates filterState', () => {
    const newFilter: FilterState = { ...DEFAULT_FILTER_STATE, view: 'deleted' };
    useDeploymentsStore.getState().setFilterState(newFilter);
    expect(useDeploymentsStore.getState().filterState.view).toBe('deleted');
  });

  it('rederives viewData based on new filterState', () => {
    const active = makeDeployment({ deployment_id: 'dep-001', deleted_at: null });
    const deleted = makeDeployment({
      deployment_id: 'dep-002',
      deleted_at: '2024-05-01T00:00:00.000000Z',
    });
    useDeploymentsStore.getState().setRawData([active, deleted]);

    // Initially view=existing, so only active is visible
    expect(useDeploymentsStore.getState().viewData).toHaveLength(1);

    // Switch to view=all
    useDeploymentsStore.getState().setFilterState({ ...DEFAULT_FILTER_STATE, view: 'all' });
    expect(useDeploymentsStore.getState().viewData).toHaveLength(2);
  });

  it('applies status filter to viewData', () => {
    const dep1 = makeDeployment({ deployment_id: 'dep-001', status: 'active' });
    const dep2 = makeDeployment({ deployment_id: 'dep-002', status: 'failed' });
    useDeploymentsStore.getState().setRawData([dep1, dep2]);

    useDeploymentsStore.getState().setFilterState({
      ...DEFAULT_FILTER_STATE,
      status: ['active'],
    });
    expect(useDeploymentsStore.getState().viewData).toHaveLength(1);
    expect(useDeploymentsStore.getState().viewData[0].status).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// registerEdit / unregisterEdit / isFieldBeingEdited
// ---------------------------------------------------------------------------

describe('registerEdit / unregisterEdit / isFieldBeingEdited', () => {
  it('isFieldBeingEdited returns false before any registration', () => {
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-001', 'attributes.name')).toBe(false);
  });

  it('isFieldBeingEdited returns true after registerEdit', () => {
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.name');
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-001', 'attributes.name')).toBe(true);
  });

  it('isFieldBeingEdited returns false after unregisterEdit', () => {
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.name');
    useDeploymentsStore.getState().unregisterEdit('dep-001:attributes.name');
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-001', 'attributes.name')).toBe(false);
  });

  it('can track multiple fields simultaneously', () => {
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.name');
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.description');
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-001', 'attributes.name')).toBe(true);
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-001', 'attributes.description')).toBe(true);
  });

  it('unregistering one field does not affect others', () => {
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.name');
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.description');
    useDeploymentsStore.getState().unregisterEdit('dep-001:attributes.name');
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-001', 'attributes.name')).toBe(false);
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-001', 'attributes.description')).toBe(true);
  });

  it('different deployment_ids are tracked independently', () => {
    useDeploymentsStore.getState().registerEdit('dep-001:attributes.name');
    expect(useDeploymentsStore.getState().isFieldBeingEdited('dep-002', 'attributes.name')).toBe(false);
  });
});
