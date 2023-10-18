export function escapeReplacement(string: string): string {
  return string.replace(/\$/g, '$$$$')
}
