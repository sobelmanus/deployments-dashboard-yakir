import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineEditCell from '@/components/table/InlineEditCell';
import { useDeploymentsStore } from '@/store/deployments';
import type { Deployment, FilterState } from '@/types';

// ---------------------------------------------------------------------------
// Mock @/lib/api
// ---------------------------------------------------------------------------

vi.mock('@/lib/api', () => ({
  patchDeployment: vi.fn(),
}));

import { patchDeployment } from '@/lib/api';
const mockPatch = patchDeployment as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Sample deployment
// ---------------------------------------------------------------------------

const dep: Deployment = {
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
};

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
// Reset store and mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  useDeploymentsStore.setState(
    {
      rawData: [dep],
      fieldConfig: null,
      prefetchComplete: false,
      lastFetchedAt: null,
      fetchError: null,
      filterState: { ...DEFAULT_FILTER_STATE },
      viewData: [dep],
      openPanelId: null,
      activeEdits: new Set(),
    }
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCell(
  fieldPath: 'attributes.name' | 'attributes.description' = 'attributes.name',
  deployment = dep,
  onTabNext?: () => void
) {
  return render(
    <InlineEditCell deployment={deployment} fieldPath={fieldPath} onTabNext={onTabNext} />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InlineEditCell', () => {
  it('renders current value in view mode', () => {
    renderCell('attributes.name');
    expect(screen.getByText('my-app')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders "—" span when value is empty', () => {
    const depWithEmpty: Deployment = {
      ...dep,
      attributes: { name: '', description: 'desc' },
    };
    renderCell('attributes.name', depWithEmpty);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('click activates edit mode with current value in input', async () => {
    const user = userEvent.setup();
    renderCell('attributes.name');

    await user.click(screen.getByText('my-app'));
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('my-app');
  });

  it('Escape cancels without saving', async () => {
    const user = userEvent.setup();
    renderCell('attributes.name');

    await user.click(screen.getByText('my-app'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'new-value');
    await user.keyboard('{Escape}');

    // Input gone, original value shown
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('my-app')).toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('Enter commits: calls patchDeployment with correct args', async () => {
    const updatedDep: Deployment = {
      ...dep,
      attributes: { ...dep.attributes, name: 'new-name' },
    };
    mockPatch.mockResolvedValueOnce(updatedDep);

    const user = userEvent.setup();
    renderCell('attributes.name');

    await user.click(screen.getByText('my-app'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'new-name');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('dep-001', { 'attributes.name': 'new-name' });
    });
  });

  it('Blur commits the value', async () => {
    const updatedDep: Deployment = {
      ...dep,
      attributes: { ...dep.attributes, name: 'blurred-name' },
    };
    mockPatch.mockResolvedValueOnce(updatedDep);

    const user = userEvent.setup();
    renderCell('attributes.name');

    await user.click(screen.getByText('my-app'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'blurred-name');
    await user.tab(); // causes blur

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('dep-001', { 'attributes.name': 'blurred-name' });
    });
  });

  it('optimistic update: updateRecord called before API resolves', async () => {
    let resolvePatch!: (dep: Deployment) => void;
    mockPatch.mockReturnValueOnce(
      new Promise<Deployment>((resolve) => {
        resolvePatch = resolve;
      })
    );

    const updateRecordSpy = vi.spyOn(useDeploymentsStore.getState(), 'updateRecord');

    const user = userEvent.setup();
    renderCell('attributes.name');

    await user.click(screen.getByText('my-app'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'optimistic-name');
    await user.keyboard('{Enter}');

    // updateRecord should have been called optimistically before patch resolves
    await waitFor(() => {
      expect(updateRecordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({ name: 'optimistic-name' }),
        })
      );
    });

    // Resolve the API
    resolvePatch({ ...dep, attributes: { ...dep.attributes, name: 'optimistic-name' } });
  });

  it('API error reverts to original value', async () => {
    mockPatch.mockRejectedValueOnce(new Error('Server error'));

    const user = userEvent.setup();
    renderCell('attributes.name');

    await user.click(screen.getByText('my-app'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'will-fail');
    await user.keyboard('{Enter}');

    // After error the store should be reverted to the original deployment
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalled();
    });

    // The store updateRecord should eventually be called with the original dep (revert)
    await waitFor(() => {
      const storeRaw = useDeploymentsStore.getState().rawData;
      const storedDep = storeRaw.find((d) => d.deployment_id === 'dep-001');
      // After revert, the name should be back to original
      expect(storedDep?.attributes.name).toBe('my-app');
    });
  });

  it('onTabNext is called after Tab keypress', async () => {
    const updatedDep: Deployment = { ...dep, attributes: { ...dep.attributes, name: 'tabbed' } };
    mockPatch.mockResolvedValueOnce(updatedDep);
    const onTabNext = vi.fn();

    const user = userEvent.setup();
    renderCell('attributes.name', dep, onTabNext);

    await user.click(screen.getByText('my-app'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tabbed');
    await user.keyboard('{Tab}');

    await waitFor(() => {
      expect(onTabNext).toHaveBeenCalled();
    });
  });

  it('click stops propagation — parent onClick not called', async () => {
    const parentClick = vi.fn();
    const user = userEvent.setup();

    render(
      <div onClick={parentClick}>
        <InlineEditCell deployment={dep} fieldPath="attributes.name" />
      </div>
    );

    await user.click(screen.getByText('my-app'));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('description field renders its value', () => {
    renderCell('attributes.description');
    expect(screen.getByText('desc')).toBeInTheDocument();
  });

  it('does not call patchDeployment when value unchanged after commit', async () => {
    mockPatch.mockResolvedValueOnce(dep);
    const user = userEvent.setup();

    renderCell('attributes.name');
    await user.click(screen.getByText('my-app'));
    // Don't change the value, just press Enter
    await user.keyboard('{Enter}');

    expect(mockPatch).not.toHaveBeenCalled();
  });
});
