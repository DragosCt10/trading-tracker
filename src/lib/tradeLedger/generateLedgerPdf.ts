import type { ReportConfig } from './reportConfig';

export interface GenerateLedgerPdfResult {
  ok: true;
  blob: Blob;
  referenceCode: string;
  hashHex: string;
  filename: string;
}

export interface GenerateLedgerPdfError {
  ok: false;
  status: number;
  error: string;
  message?: string;
}

/**
 * Client helper: POSTs config to the server API route and downloads the
 * returned PDF. Throwing is avoided in favour of a result-shape so callers
 * can show toasts / inline errors without try/catch boilerplate.
 */
export async function generateLedgerPdf(
  config: ReportConfig,
  options: { signal?: AbortSignal } = {},
): Promise<GenerateLedgerPdfResult | GenerateLedgerPdfError> {
  let response: Response;
  try {
    response = await fetch('/api/trade-ledger/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: options.signal,
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: 'network_error',
      message: err instanceof Error ? err.message : 'Network request failed',
    };
  }

  if (!response.ok) {
    let error = 'server_error';
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      if (body.error) error = body.error;
      if (body.message) message = body.message;
    } catch {
      // ignore — fall through with defaults
    }
    return { ok: false, status: response.status, error, message };
  }

  const blob = await response.blob();
  const referenceCode = response.headers.get('X-TradeLedger-Ref') ?? 'report';
  const hashHex = response.headers.get('X-TradeLedger-Hash') ?? '';
  const filename = `alpha-stats-${referenceCode}.pdf`;
  return { ok: true, blob, referenceCode, hashHex, filename };
}

/** Triggers a browser download for a generated blob. */
export function triggerPdfDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on next tick — Safari needs the URL live when the click fires.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
