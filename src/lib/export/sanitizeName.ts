/** Safe file / folder name from template title */
export function sanitizeExportName(name: string): string {
  const trimmed = name.trim() || 'email-template';
  const sanitized = trimmed
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return sanitized || 'email-template';
}
