import { describe, it, expect } from 'vitest';
import { __test } from '@/components/seo/JsonLd';

const { safeStringify } = __test;

describe('JsonLd safeStringify', () => {
  it('serializes a simple payload as JSON', () => {
    const result = safeStringify({ '@type': 'Organization', name: 'AlphaStats' });
    expect(result).toBe('{"@type":"Organization","name":"AlphaStats"}');
  });

  it('escapes `<` to prevent </script> breakout', () => {
    const payload = { description: 'malicious</script><script>alert(1)</script>' };
    const result = safeStringify(payload);
    expect(result).not.toBeNull();
    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003c/script>');
  });

  it('escapes all `<` occurrences, not just `</script>`', () => {
    const result = safeStringify({ note: '<b>bold</b> and <i>italic</i>' });
    expect(result).not.toBeNull();
    expect(result!.indexOf('<')).toBe(-1);
    expect(result).toContain('\\u003cb>');
    expect(result).toContain('\\u003c/i>');
  });

  it('returns null for payloads containing a circular reference', () => {
    type Cyclic = { name: string; self?: Cyclic };
    const cyclic: Cyclic = { name: 'root' };
    cyclic.self = cyclic;
    const result = safeStringify(cyclic as unknown as Record<string, unknown>);
    expect(result).toBeNull();
  });

  it('returns null for payloads containing BigInt', () => {
    const result = safeStringify({ value: BigInt(42) } as unknown as Record<string, unknown>);
    expect(result).toBeNull();
  });

  it('accepts an array of payloads (multi-schema pages)', () => {
    const result = safeStringify([
      { '@type': 'Organization' },
      { '@type': 'Product' },
    ]);
    expect(result).toBe('[{"@type":"Organization"},{"@type":"Product"}]');
  });
});
