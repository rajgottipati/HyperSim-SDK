import { DocGeneratorConfig } from '../types';

/**
 * Base class for document formatters
 */
export abstract class BaseFormatter {
  constructor(protected config: DocGeneratorConfig) {}

  /**
   * Format a document into the target format
   */
  abstract format(document: any): Promise<string>;

  /**
   * Get the file extension for this format
   */
  abstract getExtension(): string;

  /**
   * Get MIME type for this format
   */
  getMimeType(): string {
    const mimeTypes: Record<string, string> = {
      'md': 'text/markdown',
      'html': 'text/html',
      'json': 'application/json',
      'pdf': 'application/pdf'
    };
    return mimeTypes[this.getExtension()] || 'text/plain';
  }

  /**
   * Validate document before formatting
   */
  protected validateDocument(document: any): void {
    if (!document) {
      throw new Error('Document is required');
    }
    if (!document.title) {
      throw new Error('Document title is required');
    }
    if (!document.content) {
      throw new Error('Document content is required');
    }
  }

  /**
   * Clean and normalize content
   */
  protected normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim();
  }

  /**
   * Extract and clean text content
   */
  protected extractTextContent(content: string): string {
    return content
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}