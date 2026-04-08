import { describe, it, expect } from 'vitest';
import { getPreview } from '@/utils/markdownPreview';

describe('getPreview', () => {
  it('strips h1 headers', () => {
    expect(getPreview('# Hello World')).toBe('Hello World');
  });

  it('strips h2-h6 headers', () => {
    expect(getPreview('## Heading 2')).toBe('Heading 2');
    expect(getPreview('### Heading 3')).toBe('Heading 3');
    expect(getPreview('###### Heading 6')).toBe('Heading 6');
  });

  it('strips bold syntax', () => {
    expect(getPreview('This is **bold** text')).toBe('This is bold text');
  });

  it('strips italic syntax', () => {
    expect(getPreview('This is *italic* text')).toBe('This is italic text');
  });

  it('strips links keeping the text', () => {
    expect(getPreview('Click [here](https://example.com) now')).toBe('Click here now');
  });

  it('strips inline code backticks', () => {
    expect(getPreview('Use `console.log` for debug')).toBe('Use console.log for debug');
  });

  it('strips fenced code blocks', () => {
    expect(getPreview('Before\n```\nconst x = 1;\n```\nAfter')).toBe('Before\n\nAfter');
  });

  it('preserves plain text unchanged', () => {
    expect(getPreview('Just plain text')).toBe('Just plain text');
  });

  it('returns empty string for empty input', () => {
    expect(getPreview('')).toBe('');
  });

  it('handles nested markdown (bold inside content with headers)', () => {
    const input = '## My **bold** heading\nSome *italic* [link](url) text';
    const result = getPreview(input);
    expect(result).toBe('My bold heading\nSome italic link text');
  });
});
