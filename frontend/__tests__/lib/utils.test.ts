import { describe, it, expect } from 'vitest';
import { getFieldValue } from '@/lib/utils';
import type { Deployment } from '@/types';

function makeDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    deployment_id: 'dep-001',
    version: '1.0.0',
    status: 'active',
    type: 'web_service',
    environment: 'production',
    attributes: {
      name: 'my-app',
      description: 'A test app',
      team: 'platform',
      region: 'us-east-1',
    },
    created_at: '2024-01-01T00:00:00.000000Z',
    created_by: 'alice',
    updated_at: '2024-01-02T00:00:00.000000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('getFieldValue', () => {
  const dep = makeDeployment();

  it('returns deployment_id', () => {
    expect(getFieldValue(dep, 'deployment_id')).toBe('dep-001');
  });

  it('returns version', () => {
    expect(getFieldValue(dep, 'version')).toBe('1.0.0');
  });

  it('returns status', () => {
    expect(getFieldValue(dep, 'status')).toBe('active');
  });

  it('returns type', () => {
    expect(getFieldValue(dep, 'type')).toBe('web_service');
  });

  it('returns environment', () => {
    expect(getFieldValue(dep, 'environment')).toBe('production');
  });

  it('returns created_by', () => {
    expect(getFieldValue(dep, 'created_by')).toBe('alice');
  });

  it('returns created_at', () => {
    expect(getFieldValue(dep, 'created_at')).toBe('2024-01-01T00:00:00.000000Z');
  });

  it('returns updated_at', () => {
    expect(getFieldValue(dep, 'updated_at')).toBe('2024-01-02T00:00:00.000000Z');
  });

  it('returns attributes.name', () => {
    expect(getFieldValue(dep, 'attributes.name')).toBe('my-app');
  });

  it('returns attributes.description', () => {
    expect(getFieldValue(dep, 'attributes.description')).toBe('A test app');
  });

  it('returns attributes.team', () => {
    expect(getFieldValue(dep, 'attributes.team')).toBe('platform');
  });

  it('returns attributes.region', () => {
    expect(getFieldValue(dep, 'attributes.region')).toBe('us-east-1');
  });

  it('returns empty string for unknown top-level path', () => {
    expect(getFieldValue(dep, 'nonexistent_field')).toBe('');
  });

  it('returns empty string for unknown attribute path', () => {
    expect(getFieldValue(dep, 'attributes.nonexistent')).toBe('');
  });

  it('returns empty string for missing attribute key', () => {
    const depWithoutTeam = makeDeployment({ attributes: { name: 'app' } });
    expect(getFieldValue(depWithoutTeam, 'attributes.team')).toBe('');
  });

  it('handles empty attributes object', () => {
    const depEmpty = makeDeployment({ attributes: {} });
    expect(getFieldValue(depEmpty, 'attributes.name')).toBe('');
  });

  it('returns custom attribute value', () => {
    const depCustom = makeDeployment({ attributes: { name: 'app', my_custom: 'hello' } });
    expect(getFieldValue(depCustom, 'attributes.my_custom')).toBe('hello');
  });
});
