import { headers } from 'next/headers';

type JsonLdPayload = Record<string, unknown> | Array<Record<string, unknown>>;

// Serialize for a <script type="application/ld+json"> tag. Must escape `<`
// characters or a payload containing `</script>` will break out of the tag.
// Also guards against cyclic refs that would throw from JSON.stringify.
function safeStringify(payload: JsonLdPayload): string | null {
  try {
    return JSON.stringify(payload).replace(/</g, '\\u003c');
  } catch (err) {
    // Payload couldn't be serialized (cyclic ref, BigInt, etc). Log for
    // observability and skip emission — never 500 the whole page for schema.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[JsonLd] failed to stringify payload:', err);
    }
    return null;
  }
}

/**
 * Renders a JSON-LD <script> tag with nonce-based CSP support.
 *
 * JSON-LD is parsed as data, not executable JS — the nonce is belt-and-
 * suspenders to match the policy style set by the middleware. If the nonce
 * header is missing, we still render (CSP would then block if strict, which
 * is correct behavior for a misconfigured middleware).
 */
export async function JsonLd({ payload }: { payload: JsonLdPayload }) {
  const serialized = safeStringify(payload);
  if (!serialized) return null;

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serialized }}
      // Browsers strip `nonce` from the DOM after parse for security, so React's
      // hydration diff sees server=`""` vs client=`"<real-nonce>"`. The attribute
      // is still applied correctly; just silence the false-positive warning.
      suppressHydrationWarning
    />
  );
}

// Exported for testing.
export const __test = { safeStringify };
