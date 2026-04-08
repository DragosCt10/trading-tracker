/**
 * Shared chainable Supabase mock builder.
 *
 * Creates a mock Supabase client that routes `.from(table)` calls by table name
 * and returns configured data/errors. Supports the full chain depth used by
 * server actions: `.from().select().eq().order().limit().or().in().single()`.
 *
 * For tables that are queried multiple times per function call (e.g. `notes`
 * for both the main query and an ownership check), use `selectResponses` to
 * provide a queue of responses — each `.from(table)` call pops the next one.
 */
import { vi } from 'vitest';

export interface TableConfig {
  /** Default response for SELECT-style chains (terminal: implicit await or .single()) */
  selectData?: any;
  selectError?: any;

  /**
   * Queue of responses for successive `.from(table)` calls that end in a
   * SELECT chain. First call gets index 0, second gets index 1, etc.
   * If exhausted, falls back to `selectData`/`selectError`.
   */
  selectResponses?: Array<{ data?: any; error?: any }>;

  /** Response for `.single()` terminal (ownership checks, single-row fetches) */
  singleData?: any;
  singleError?: any;

  /** Response for `.insert()` chains */
  insertData?: any;
  insertError?: any;

  /** Response for `.update()` chains */
  updateData?: any;
  updateError?: any;

  /** Response for `.delete()` chains */
  deleteError?: any;
}

export type MockSupabaseConfig = Record<string, TableConfig>;

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  /** Spy for the last insert call — use to assert on inserted data */
  _insertSpy: ReturnType<typeof vi.fn>;
  /** Spy for the last update call — use to assert on updated data */
  _updateSpy: ReturnType<typeof vi.fn>;
  /** Spy for the last delete call — use to assert on deleted data */
  _deleteSpy: ReturnType<typeof vi.fn>;
}

/**
 * Build a chainable mock that returns `this` for every method except the
 * terminal, which resolves with `{ data, error }`.
 */
function buildChain(terminal: { data?: any; error?: any }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'in', 'or', 'order', 'limit', 'gt', 'lt', 'gte', 'lte', 'is', 'not', 'contains', 'cs', 'maybeSingle'];

  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }

  // `.single()` is always a terminal that resolves to { data, error }
  chain.single = vi.fn(() => Promise.resolve({ data: terminal.data ?? null, error: terminal.error ?? null }));

  // Make the chain itself thenable so `await supabase.from(...).select(...)...` works
  chain.then = (resolve: any, reject: any) => {
    return Promise.resolve({ data: terminal.data ?? null, error: terminal.error ?? null }).then(resolve, reject);
  };

  return chain;
}

export function createMockSupabaseClient(config: MockSupabaseConfig = {}): MockSupabaseClient {
  const insertSpy = vi.fn();
  const updateSpy = vi.fn();
  const deleteSpy = vi.fn();

  // Track call counts per table for selectResponses queues
  const callCounts = new Map<string, number>();

  const fromFn = vi.fn((table: string) => {
    const cfg = config[table] ?? {};
    const count = callCounts.get(table) ?? 0;
    callCounts.set(table, count + 1);

    // Determine SELECT response (queue or default)
    let selectResponse: { data?: any; error?: any };
    if (cfg.selectResponses && count < cfg.selectResponses.length) {
      selectResponse = cfg.selectResponses[count];
    } else {
      selectResponse = { data: cfg.selectData ?? null, error: cfg.selectError ?? null };
    }

    // SELECT chain (default)
    const selectChain = buildChain(selectResponse);

    // Override .single() on the select chain if singleData/singleError is configured
    // and this is the first call (ownership checks are typically .single())
    if (cfg.singleData !== undefined || cfg.singleError !== undefined) {
      selectChain.single = vi.fn(() =>
        Promise.resolve({ data: cfg.singleData ?? null, error: cfg.singleError ?? null })
      );
    }

    // INSERT chain — captures the inserted data via spy
    const insertChain = buildChain({ data: cfg.insertData ?? null, error: cfg.insertError ?? null });

    // UPDATE chain
    const updateChain = buildChain({ data: cfg.updateData ?? null, error: cfg.updateError ?? null });

    // DELETE chain
    const deleteChain = buildChain({ data: null, error: cfg.deleteError ?? null });

    return {
      select: vi.fn((...args: any[]) => selectChain),
      insert: vi.fn((data: any) => {
        insertSpy(data);
        return insertChain;
      }),
      update: vi.fn((data: any) => {
        updateSpy(data);
        return updateChain;
      }),
      delete: vi.fn(() => {
        deleteSpy();
        return deleteChain;
      }),
    };
  });

  return {
    from: fromFn,
    _insertSpy: insertSpy,
    _updateSpy: updateSpy,
    _deleteSpy: deleteSpy,
  };
}
