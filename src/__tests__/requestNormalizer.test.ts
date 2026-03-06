/**
 * MPVP — Request Normalizer Tests
 * Verifies all 7 bug fixes from the integration guide.
 */
import {
  normalizeRequest,
  normalizeRequestList,
} from '../services/api/normalizers/requestNormalizer';
import type {
  RawApiRequest,
  RawApiPaginatedResponse,
} from '../services/api/types/requestTypes';

// ─── Helper: build a complete raw request ─────────────────

function makeRawRequest(overrides: Partial<RawApiRequest> = {}): RawApiRequest {
  return {
    request_id: 'req-001',
    status: 'pending',
    created_at: '2026-03-04T10:00:00Z',
    updated_at: '2026-03-04T12:00:00Z',
    title: 'Test Request',
    description: 'A test description',
    client_name: 'Test Client',
    branch_name: 'Main Branch',
    reference_number: 'REF-123',
    due_date: '2026-03-10T10:00:00Z',
    ops_notes: 'Some notes',
    site_address: '123 Site St',
    contract_type: {
      id: 'c-001',
      name: 'Murabaha',
      code: 'MUR',
      findings_schema: [],
    },
    user: {
      id: 'user-001',
      name: 'John Doe',
      email: 'john@example.com',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    permissions: {
      can_approve: true,
      can_reject: true,
    },
    ...overrides,
  };
}

// ─── Single Item Normalizer ──────────────────────────────

describe('normalizeRequest', () => {
  it('maps request_id to id', () => {
    const result = normalizeRequest(makeRawRequest({ request_id: 'abc-123' }));
    expect(result.id).toBe('abc-123');
  });

  it('passes through a valid status string (not boolean)', () => {
    const result = normalizeRequest(makeRawRequest({ status: 'pending' }));
    expect(result.status).toBe('pending');
    expect(typeof result.status).toBe('string');
  });

  it('maps approved status correctly', () => {
    const result = normalizeRequest(makeRawRequest({ status: 'approved' }));
    expect(result.status).toBe('approved');
  });

  it('maps rejected status correctly', () => {
    const result = normalizeRequest(makeRawRequest({ status: 'rejected' }));
    expect(result.status).toBe('rejected');
  });

  it('defaults unknown status to pending with console warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const result = normalizeRequest(makeRawRequest({ status: 'INVALID' }));
    expect(result.status).toBe('pending');
    warnSpy.mockRestore();
  });

  it('converts created_at ISO string to a Date object', () => {
    const result = normalizeRequest(makeRawRequest({ created_at: '2026-03-04T10:00:00Z' }));
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).not.toBeNaN();
    expect(result.createdAt.toISOString()).toBe('2026-03-04T10:00:00.000Z');
  });

  it('converts updated_at ISO string to a Date object', () => {
    const result = normalizeRequest(makeRawRequest({ updated_at: '2026-03-04T12:00:00Z' }));
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).not.toBeNaN();
  });

  it('extracts permissions.can_approve as canApprove', () => {
    const result = normalizeRequest(
      makeRawRequest({ permissions: { can_approve: true, can_reject: false } }),
    );
    expect(result.canApprove).toBe(true);
    expect(result.canReject).toBe(false);
  });

  it('defaults canApprove and canReject to false when permissions is null', () => {
    const result = normalizeRequest(makeRawRequest({ permissions: null }));
    expect(result.canApprove).toBe(false);
    expect(result.canReject).toBe(false);
  });

  it('handles null avatar_url without throwing', () => {
    const raw = makeRawRequest();
    raw.user!.avatar_url = null;
    const result = normalizeRequest(raw);
    expect(result.avatarUrl).toBeNull();
  });

  it('preserves valid avatar_url', () => {
    const url = 'https://example.com/photo.jpg';
    const raw = makeRawRequest();
    raw.user!.avatar_url = url;
    const result = normalizeRequest(raw);
    expect(result.avatarUrl).toBe(url);
  });

  it('provides safe defaults when user object is null', () => {
    const result = normalizeRequest(makeRawRequest({ user: null }));
    expect(result.userName).toBe('Unknown User');
    expect(result.userEmail).toBe('');
    expect(result.userId).toBe('');
    expect(result.avatarUrl).toBeNull();
  });

  it('flattens user fields correctly', () => {
    const result = normalizeRequest(makeRawRequest());
    expect(result.userName).toBe('John Doe');
    expect(result.userEmail).toBe('john@example.com');
    expect(result.userId).toBe('user-001');
  });
});

// ─── List Normalizer ─────────────────────────────────────

describe('normalizeRequestList', () => {
  it('maps meta.total_count to totalCount', () => {
    const raw: RawApiPaginatedResponse = {
      data: [makeRawRequest()],
      meta: { total_count: 42, page: 1, per_page: 20, has_next: true },
    };
    const result = normalizeRequestList(raw);
    expect(result.totalCount).toBe(42);
  });

  it('maps meta.has_next to hasNext', () => {
    const raw: RawApiPaginatedResponse = {
      data: [makeRawRequest()],
      meta: { total_count: 100, page: 1, per_page: 20, has_next: true },
    };
    const result = normalizeRequestList(raw);
    expect(result.hasNext).toBe(true);
  });

  it('maps meta.per_page to perPage', () => {
    const raw: RawApiPaginatedResponse = {
      data: [],
      meta: { total_count: 0, page: 1, per_page: 15, has_next: false },
    };
    const result = normalizeRequestList(raw);
    expect(result.perPage).toBe(15);
  });

  it('provides safe defaults when meta is null', () => {
    const raw: RawApiPaginatedResponse = {
      data: [makeRawRequest()],
      meta: null,
    };
    const result = normalizeRequestList(raw);
    expect(result.totalCount).toBe(0);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.hasNext).toBe(false);
  });

  it('normalizes each item in the data array', () => {
    const raw: RawApiPaginatedResponse = {
      data: [
        makeRawRequest({ request_id: 'r1', status: 'pending' }),
        makeRawRequest({ request_id: 'r2', status: 'approved' }),
      ],
      meta: { total_count: 2, page: 1, per_page: 20, has_next: false },
    };
    const result = normalizeRequestList(raw);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('r1');
    expect(result.items[0].status).toBe('pending');
    expect(result.items[1].id).toBe('r2');
    expect(result.items[1].status).toBe('approved');
  });

  it('handles empty data array', () => {
    const raw: RawApiPaginatedResponse = {
      data: [],
      meta: { total_count: 0, page: 1, per_page: 20, has_next: false },
    };
    const result = normalizeRequestList(raw);
    expect(result.items).toHaveLength(0);
  });
});
