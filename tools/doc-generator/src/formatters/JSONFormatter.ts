import { GeneratedDocument } from '../types';
import { BaseFormatter } from './BaseFormatter';

/**
 * Formats documents as structured JSON
 */
export class JSONFormatter extends BaseFormatter {
  async format(document: GeneratedDocument): Promise<string> {
    this.validateDocument(document);
    
    const jsonDocument = {
      title: document.title,
      type: document.type,
      languages: document.languages,
      complexity: document.complexity,
      content: {
        raw: document.content,
        text: this.extractTextContent(document.content),
        headings: this.extractHeadings(document.content),
        codeBlocks: this.extractCodeBlocks(document.content),
        liveExamples: this.extractLiveExamples(document.content)
      },
      metadata: {
        ...document.metadata,
        wordCount: this.getWordCount(document.content),
        readingTime: this.estimateReadingTime(document.content),
        lastUpdated: new Date().toISOString()
      },
      navigation: {
        outputPath: document.outputPath,
        breadcrumb: this.generateBreadcrumb(document.outputPath),
        relatedDocuments: this.findRelatedDocuments(document)
      },
      search: {
        keywords: this.extractKeywords(document.content),
        searchableText: this.generateSearchableText(document.content)
      },
      analytics: {
        category: document.type,
        tags: this.generateTags(document),
        difficulty: this.getDifficultyLevel(document.complexity)
      }
    };
    
    return JSON.stringify(jsonDocument, null, 2);
  }

  getExtension(): string {
    return 'json';
  }

  private extractHeadings(content: string): Array<{level: number, text: string, id: string}> {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = this.generateId(text);
      headings.push({ level, text, id });
    }
    
    return headings;
  }

  private extractCodeBlocks(content: string): Array<{language: string, code: string, title?: string}> {
    const codeBlockRegex = /```(\w+)(?:\s+(.*))?\n([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1],
        title: match[2]?.trim() || undefined,
        code: match[3]
      });
    }
    
    return codeBlocks;
  }

  private extractLiveExamples(content: string): Array<{language: string, code: string}> {
    const liveExampleRegex = /<!-- LIVE_EXAMPLE:(\w+):([A-Za-z0-9+/=]+) -->/g;
    const liveExamples = [];
    let match;
    
    while ((match = liveExampleRegex.exec(content)) !== null) {
      const language = match[1];
      const code = Buffer.from(match[2], 'base64').toString('utf-8');
      liveExamples.push({ language, code });
    }
    
    return liveExamples;
  }

  private getWordCount(content: string): number {
    const textContent = this.extractTextContent(content);
    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  }

  private estimateReadingTime(content: string): number {
    const wordCount = this.getWordCount(content);
    const wordsPerMinute = 200; // Average reading speed
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private generateBreadcrumb(outputPath: string): string[] {
    const parts = outputPath.split('/').filter(part => part.length > 0);
    const breadcrumb = ['Home'];
    
    for (const part of parts) {
      breadcrumb.push(this.capitalize(part));
    }
    
    return breadcrumb;
  }

  private findRelatedDocuments(document: GeneratedDocument): string[] {
    // Simple heuristic - documents in the same category or with overlapping languages
    const related = [];
    
    // Add documents of the same type
    if (document.type !== 'api-reference') {
      related.push(`${document.type}/index`);
    }
    
    // Add language-specific documents
    for (const language of document.languages) {
      related.push(`api-reference/${language}/index`);
      related.push(`tutorials/language-guides/${language}`);
    }
    
    return [...new Set(related)].filter(path => path !== document.outputPath);
  }

  private extractKeywords(content: string): string[] {
    const textContent = this.extractTextContent(content).toLowerCase();
    
    // Common SDK and blockchain terms to look for
    const importantTerms = [
      'hypersim', 'sdk', 'simulation', 'blockchain', 'transaction', 'hyperevm',
      'hypercore', 'api', 'client', 'async', 'error', 'configuration', 'plugin',
      'streaming', 'websocket', 'ai', 'analysis', 'gas', 'optimization', 'batch',
      'real-time', 'cross-layer', 'integration', 'performance', 'security'
    ];
    
    const foundKeywords = [];
    for (const term of importantTerms) {
      if (textContent.includes(term)) {
        foundKeywords.push(term);
      }
    }
    
    // Extract code-related terms
    const codeBlocks = this.extractCodeBlocks(content);
    for (const block of codeBlocks) {
      foundKeywords.push(block.language);
    }
    
    return [...new Set(foundKeywords)];
  }

  private generateSearchableText(content: string): string {
    const textContent = this.extractTextContent(content);
    const headings = this.extractHeadings(content);
    const codeBlocks = this.extractCodeBlocks(content);
    
    // Combine text content with headings and code comments
    let searchableText = textContent;
    
    // Add headings with extra weight
    searchableText += ' ' + headings.map(h => h.text).join(' ');
    
    // Add code block languages and titles
    for (const block of codeBlocks) {
      searchableText += ` ${block.language}`;
      if (block.title) {
        searchableText += ` ${block.title}`;
      }
    }
    
    return searchableText.toLowerCase();
  }

  private generateTags(document: GeneratedDocument): string[] {
    const tags = new Set<string>();
    
    // Add type tag
    tags.add(document.type);
    
    // Add language tags
    document.languages.forEach(lang => tags.add(lang));
    
    // Add complexity tag
    tags.add(`complexity-${document.complexity}`);
    
    // Add path-based tags
    const pathParts = document.outputPath.split('/').filter(part => part.length > 0);
    pathParts.forEach(part => tags.add(part));
    
    return Array.from(tags);
  }

  private getDifficultyLevel(complexity: number): string {
    const levels = {
      1: 'beginner',
      2: 'easy',
      3: 'intermediate', 
      4: 'advanced',
      5: 'expert'
    };
    return levels[complexity as keyof typeof levels] || 'intermediate';
  }

  private generateId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }
}