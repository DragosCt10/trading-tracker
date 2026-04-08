/**
 * Strip markdown syntax and return plain text for preview display.
 */
export function getPreview(content: string): string {
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Code blocks (must run before inline code)
    .replace(/#{1,6}\s+/g, '') // Headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .trim();

  return plainText;
}
