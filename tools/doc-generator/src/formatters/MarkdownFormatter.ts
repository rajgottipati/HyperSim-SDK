import { GeneratedDocument } from '../types';
import { BaseFormatter } from './BaseFormatter';

/**
 * Formats documents as Markdown
 */
export class MarkdownFormatter extends BaseFormatter {
  async format(document: GeneratedDocument): Promise<string> {
    let content = document.content;
    
    // Add metadata header
    content = this.addMetadataHeader(document) + content;
    
    // Process live examples
    content = this.processLiveExamples(content);
    
    // Add navigation
    content = this.addNavigation(document) + content;
    
    // Add table of contents if needed
    content = this.addTableOfContents(content);
    
    return content;
  }

  getExtension(): string {
    return 'md';
  }

  private addMetadataHeader(document: GeneratedDocument): string {
    return `---
title: "${document.title}"
type: ${document.type}
languages: [${document.languages.join(', ')}]
complexity: ${document.complexity}
generated: ${document.metadata.generated}
version: ${document.metadata.version}
---

`;
  }

  private processLiveExamples(content: string): string {
    if (!this.config.output.liveExamples) {
      return content;
    }

    // Convert live example markers to interactive blocks
    const liveExampleRegex = /<!-- LIVE_EXAMPLE:(\w+):([A-Za-z0-9+/=]+) -->/g;
    return content.replace(liveExampleRegex, (match, language, encodedCode) => {
      const code = Buffer.from(encodedCode, 'base64').toString('utf-8');
      return `
\n<div class="live-example" data-language="${language}">
  <div class="live-example-toolbar">
    <button class="live-example-run">Run Example</button>
    <button class="live-example-copy">Copy Code</button>
  </div>
  <pre class="live-example-code"><code class="language-${language}">${this.escapeHtml(code)}</code></pre>
  <div class="live-example-output"></div>
</div>

`;
    });
  }

  private addNavigation(document: GeneratedDocument): string {
    const breadcrumb = this.generateBreadcrumb(document);
    const langSwitcher = this.generateLanguageSwitcher(document);
    
    return `<div class="doc-navigation">
  <div class="breadcrumb">${breadcrumb}</div>
  ${document.languages.length > 1 ? `<div class="language-switcher">${langSwitcher}</div>` : ''}
</div>

`;
  }

  private generateBreadcrumb(document: GeneratedDocument): string {
    const parts = document.outputPath.split('/');
    const breadcrumbParts = ['Home'];
    
    let path = '';
    for (const part of parts) {
      path += path ? `/${part}` : part;
      breadcrumbParts.push(`<a href="/${path}">${this.capitalize(part)}</a>`);
    }
    
    return breadcrumbParts.join(' / ');
  }

  private generateLanguageSwitcher(document: GeneratedDocument): string {
    return document.languages.map(lang => 
      `<a href="${document.outputPath}?lang=${lang}" class="lang-${lang}">${this.capitalize(lang)}</a>`
    ).join(' | ');
  }

  private addTableOfContents(content: string): string {
    const headings = this.extractHeadings(content);
    if (headings.length < 3) {
      return content; // Don't add TOC for short documents
    }

    const toc = this.generateTableOfContents(headings);
    
    // Insert TOC after the first paragraph or heading
    const firstHeadingIndex = content.search(/^#+\s/m);
    if (firstHeadingIndex !== -1) {
      const nextParagraphIndex = content.indexOf('\n\n', firstHeadingIndex);
      if (nextParagraphIndex !== -1) {
        return content.slice(0, nextParagraphIndex) + '\n\n' + toc + '\n\n' + content.slice(nextParagraphIndex + 2);
      }
    }
    
    return toc + '\n\n' + content;
  }

  private extractHeadings(content: string): Array<{level: number, text: string, id: string}> {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = this.generateHeadingId(text);
      headings.push({ level, text, id });
    }
    
    return headings;
  }

  private generateTableOfContents(headings: Array<{level: number, text: string, id: string}>): string {
    let toc = '## Table of Contents\n\n';
    
    for (const heading of headings) {
      if (heading.level <= 4) { // Only include up to h4
        const indent = '  '.repeat(heading.level - 1);
        toc += `${indent}- [${heading.text}](#${heading.id})\n`;
      }
    }
    
    return toc;
  }

  private generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return text.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }
}