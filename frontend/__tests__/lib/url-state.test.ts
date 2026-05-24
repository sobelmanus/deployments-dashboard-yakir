import { describe, it, expect } from 'vitest';
import { parseUrlState, buildUrlParams } from '@/lib/url-state';
import type { FilterState } from '@/types';

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
// parseUrlState
// ---------------------------------------------------------------------------

describe('parseUrlState', () => {
  it('empty string returns defaults', () => {
    const { filterState, openPanelId } = parseUrlState('');
    expect(filterState.view).toBe('existing');
    expect(filterState.sort).toBe('created_at');
    expect(filterState.order).toBe('desc');
    expect(filterState.chips).toEqual([]);
    expect(filterState.status).toEqual([]);
    expect(filterState.type).toEqual([]);
    expect(filterState.environment).toEqual([]);
    expect(openPanelId).toBeNull();
  });

  it('parses multiple status values', () => {
    const { filterState } = parseUrlState('?status=active&status=failed');
    expect(filterState.status).toEqual(['active', 'failed']);
  });

  it('parses single status value', () => {
    const { filterState } = parseUrlState('?status=active');
    expect(filterState.status).toEqual(['active']);
  });

  it('parses view=deleted', () => {
    const { filterState } = parseUrlState('?view=deleted');
    expect(filterState.view).toBe('deleted');
  });

  it('parses view=all', () => {
    const { filterState } = parseUrlState('?view=all');
    expect(filterState.view).toBe('all');
  });

  it('parses sort and order', () => {
    const { filterState } = parseUrlState('?sort=version&order=asc');
    expect(filterState.sort).toBe('version');
    expect(filterState.order).toBe('asc');
  });

  it('parses search with colon as field:value chip', () => {
    const { filterState } = parseUrlState('?search=all:foo');
    expect(filterState.chips).toHaveLength(1);
    expect(filterState.chips[0]).toEqual({ field: 'all', value: 'foo' });
  });

  it('parses search with specific field chip', () => {
    const { filterState } = parseUrlState('?search=status:active');
    expect(filterState.chips).toHaveLength(1);
    expect(filterState.chips[0]).toEqual({ field: 'status', value: 'active' });
  });

  it('parses search without colon as all:value chip', () => {
    const { filterState } = parseUrlState('?search=foo');
    expect(filterState.chips).toHaveLength(1);
    expect(filterState.chips[0]).toEqual({ field: 'all', value: 'foo' });
  });

  it('parses multiple search chips', () => {
    const { filterState } = parseUrlState('?search=all:foo&search=status:active');
    expect(filterState.chips).toHaveLength(2);
  });

  it('parses deployment panel id', () => {
    const { openPanelId } = parseUrlState('?deployment=dep-001');
    expect(openPanelId).toBe('dep-001');
  });

  it('invalid order value defaults to desc', () => {
    const { filterState } = parseUrlState('?order=sideways');
    expect(filterState.order).toBe('desc');
  });

  it('invalid view value defaults to existing', () => {
    const { filterState } = parseUrlState('?view=invalid');
    expect(filterState.view).toBe('existing');
  });

  it('parses type filter', () => {
    const { filterState } = parseUrlState('?type=worker');
    expect(filterState.type).toEqual(['worker']);
  });

  it('parses environment filter', () => {
    const { filterState } = parseUrlState('?environment=staging');
    expect(filterState.environment).toEqual(['staging']);
  });

  it('handles colon in value (only first colon is separator)', () => {
    const { filterState } = parseUrlState('?search=all:foo:bar');
    expect(filterState.chips[0]).toEqual({ field: 'all', value: 'foo:bar' });
  });
});

// ---------------------------------------------------------------------------
// buildUrlParams
// ---------------------------------------------------------------------------

describe('buildUrlParams', () => {
  it('default filter state produces empty params', () => {
    const params = buildUrlParams(DEFAULT_FILTER_STATE, null);
    expect(params.toString()).toBe('');
  });

  it('non-default sort includes sort key', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, sort: 'version' }, null);
    expect(params.get('sort')).toBe('version');
  });

  it('non-default order includes order key', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, order: 'asc' }, null);
    expect(params.get('order')).toBe('asc');
  });

  it('non-default view includes view key', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, view: 'deleted' }, null);
    expect(params.get('view')).toBe('deleted');
  });

  it('default sort not included in params', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, sort: 'created_at' }, null);
    expect(params.has('sort')).toBe(false);
  });

  it('default order not included in params', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, order: 'desc' }, null);
    expect(params.has('order')).toBe(false);
  });

  it('default view not included in params', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, view: 'existing' }, null);
    expect(params.has('view')).toBe(false);
  });

  it('chips appear as search params', () => {
    const params = buildUrlParams(
      { ...DEFAULT_FILTER_STATE, chips: [{ field: 'all', value: 'foo' }] },
      null
    );
    expect(params.getAll('search')).toContain('all:foo');
  });

  it('chips with empty value are omitted', () => {
    const params = buildUrlParams(
      { ...DEFAULT_FILTER_STATE, chips: [{ field: 'all', value: '' }] },
      null
    );
    expect(params.getAll('search')).toHaveLength(0);
  });

  it('openPanelId appears as deployment param', () => {
    const params = buildUrlParams(DEFAULT_FILTER_STATE, 'dep-001');
    expect(params.get('deployment')).toBe('dep-001');
  });

  it('null openPanelId not included in params', () => {
    const params = buildUrlParams(DEFAULT_FILTER_STATE, null);
    expect(params.has('deployment')).toBe(false);
  });

  it('status values appear as status params', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, status: ['active', 'failed'] }, null);
    expect(params.getAll('status')).toEqual(['active', 'failed']);
  });

  it('type values appear as type params', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, type: ['worker'] }, null);
    expect(params.getAll('type')).toEqual(['worker']);
  });

  it('environment values appear as environment params', () => {
    const params = buildUrlParams({ ...DEFAULT_FILTER_STATE, environment: ['staging'] }, null);
    expect(params.getAll('environment')).toEqual(['staging']);
  });

  it('roundtrip: buildUrlParams output can be parsed back', () => {
    const original: FilterState = {
      chips: [{ field: 'all', value: 'test' }],
      status: ['active'],
      type: ['worker'],
      environment: ['staging'],
      view: 'deleted',
      sort: 'version',
      order: 'asc',
    };
    const params = buildUrlParams(original, 'dep-001');
    const { filterState, openPanelId } = parseUrlState(`?${params.toString()}`);
    expect(filterState.view).toBe('deleted');
    expect(filterState.sort).toBe('version');
    expect(filterState.order).toBe('asc');
    expect(filterState.status).toEqual(['active']);
    expect(openPanelId).toBe('dep-001');
  });
});
