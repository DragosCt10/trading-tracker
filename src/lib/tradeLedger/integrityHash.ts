import type { ReportConfig } from './reportConfig';

const SCHEMA_VERSION = 1;

/**
 * A canonicalized JSON string for a report. Deterministic: feed the same
 * config + sorted tradeIds in and the same byte-for-byte string comes out.
 *
 * Format commitments (do NOT change without bumping SCHEMA_VERSION, or prior
 * integrity hashes become unverifiable):
 *   - Object keys sorted ascending at every depth.
 *   - Arrays emitted in input order, except tradeIds which are sorted ascending.
 *   - JSON.stringify with no whitespace.
 */
export function buildCanonicalPayload(
  config: ReportConfig,
  tradeIds: readonly string[],
  generatedAt: Date,
): string {
  const canonical = {
    config: sortKeys(config),
    generatedAt: generatedAt.toISOString(),
    schemaVersion: SCHEMA_VERSION,
    tradeIds: [...tradeIds].sort(),
  };
  return JSON.stringify(canonical);
}

/** Sort object keys recursively. Arrays keep their order. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, sortKeys(v)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

/**
 * SHA-256 hex digest via WebCrypto (`crypto.subtle`). Throws explicitly when
 * unavailable rather than silently returning a bad hash — the caller is the
 * one who knows how to surface "this browser can't verify reports".
 */
export async function sha256Hex(input: string): Promise<string> {
  const subtle = getSubtle();
  const bytes = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getSubtle(): SubtleCrypto {
  const g = globalThis as typeof globalThis & {
    crypto?: { subtle?: SubtleCrypto };
  };
  if (!g.crypto?.subtle) {
    throw new Error(
      'TradeLedger: crypto.subtle is unavailable in this environment',
    );
  }
  return g.crypto.subtle;
}

/**
 * Human-readable reference code shown in the PDF footer.
 * Example: TL-20260418-001-A3F2B7C9
 */
export function buildReferenceCode(
  hashHex: string,
  generatedAt: Date,
  seqForDay: number,
): string {
  const yyyy = generatedAt.getUTCFullYear().toString().padStart(4, '0');
  const mm = (generatedAt.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = generatedAt.getUTCDate().toString().padStart(2, '0');
  const seq = seqForDay.toString().padStart(3, '0');
  const tail = hashHex.slice(0, 8).toUpperCase();
  return `TL-${yyyy}${mm}${dd}-${seq}-${tail}`;
}
