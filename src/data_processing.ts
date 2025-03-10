import TurndownService from "turndown";

/**
 * Converts raw HTML to Markdown using TurndownService
 * Removes script tags for security and cleaner output
 * @param html Raw HTML string to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  // Remove script tags and their content before conversion
  const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
    emDelimiter: '_'
  });

  return turndownService.turndown(cleanHtml);
}


