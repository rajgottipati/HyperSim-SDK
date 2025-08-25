import * as MarkdownIt from 'markdown-it';
import * as hljs from 'highlight.js';
import { GeneratedDocument } from '../types';
import { BaseFormatter } from './BaseFormatter';

/**
 * Formats documents as HTML with enhanced features
 */
export class HTMLFormatter extends BaseFormatter {
  private md: MarkdownIt;

  constructor(config: any) {
    super(config);
    
    this.md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
      highlight: (str: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value;
          } catch (__) {}
        }
        return '';
      }
    });
  }

  async format(document: GeneratedDocument): Promise<string> {
    this.validateDocument(document);
    
    const normalizedContent = this.normalizeContent(document.content);
    const processedContent = this.processSpecialElements(normalizedContent);
    const htmlContent = this.md.render(processedContent);
    
    return this.wrapInFullHTML(document, htmlContent);
  }

  getExtension(): string {
    return 'html';
  }

  private processSpecialElements(content: string): string {
    let processed = content;
    
    // Process live examples
    processed = this.processLiveExamples(processed);
    
    // Process comparison tables
    processed = this.processComparisonTables(processed);
    
    // Process callouts and admonitions
    processed = this.processCallouts(processed);
    
    return processed;
  }

  private processLiveExamples(content: string): string {
    if (!this.config.output.liveExamples) {
      return content;
    }

    const liveExampleRegex = /<!-- LIVE_EXAMPLE:(\w+):([A-Za-z0-9+/=]+) -->/g;
    return content.replace(liveExampleRegex, (match, language, encodedCode) => {
      const code = Buffer.from(encodedCode, 'base64').toString('utf-8');
      return `
<div class="live-example" data-language="${language}">
  <div class="live-example-header">
    <span class="live-example-language">${language}</span>
    <div class="live-example-controls">
      <button class="btn-primary live-example-run" data-action="run">▶ Run</button>
      <button class="btn-secondary live-example-copy" data-action="copy">📋 Copy</button>
      <button class="btn-secondary live-example-download" data-action="download">💾 Download</button>
    </div>
  </div>
  <div class="live-example-editor">
    <pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>
  </div>
  <div class="live-example-output" style="display: none;">
    <div class="output-header">Output:</div>
    <div class="output-content"></div>
  </div>
  <div class="live-example-error" style="display: none;">
    <div class="error-header">Error:</div>
    <div class="error-content"></div>
  </div>
</div>
`;
    });
  }

  private processComparisonTables(content: string): string {
    const comparisonRegex = /<!-- COMPARISON_TABLE:([^>]+) -->/g;
    return content.replace(comparisonRegex, (match, languages) => {
      const langArray = languages.split(',');
      return `
<div class="comparison-table-wrapper">
  <div class="comparison-table-controls">
    <label>Compare: </label>
    ${langArray.map(lang => 
      `<label class="checkbox-label">
        <input type="checkbox" value="${lang.trim()}" checked> ${lang.trim().charAt(0).toUpperCase() + lang.trim().slice(1)}
      </label>`
    ).join('')}
  </div>
  <div class="comparison-table" data-languages="${languages}">
    <!-- Comparison content will be populated by JavaScript -->
  </div>
</div>
`;
    });
  }

  private processCallouts(content: string): string {
    // Process note callouts
    content = content.replace(/^> \*\*Note:\*\* (.+)$/gm, 
      '<div class="callout callout-note"><div class="callout-title">📝 Note</div><div class="callout-content">$1</div></div>');
    
    // Process warning callouts
    content = content.replace(/^> \*\*Warning:\*\* (.+)$/gm, 
      '<div class="callout callout-warning"><div class="callout-title">⚠️ Warning</div><div class="callout-content">$1</div></div>');
    
    // Process tip callouts
    content = content.replace(/^> \*\*Tip:\*\* (.+)$/gm, 
      '<div class="callout callout-tip"><div class="callout-title">💡 Tip</div><div class="callout-content">$1</div></div>');
    
    return content;
  }

  private wrapInFullHTML(document: GeneratedDocument, htmlContent: string): string {
    const title = this.escapeHtml(document.title);
    const description = this.extractDescription(document.content);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | HyperSim SDK Documentation</title>
    <meta name="description" content="${this.escapeHtml(description)}">
    <meta name="keywords" content="hypersim, sdk, ${document.languages.join(', ')}, blockchain, simulation">
    
    <!-- Styles -->
    ${this.generateStylesheets()}
    
    <!-- Structured Data -->
    ${this.generateStructuredData(document)}
</head>
<body class="doc-page">
    <header class="doc-header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <h1><a href="/">HyperSim SDK</a></h1>
                </div>
                <nav class="main-nav">
                    <a href="/api-reference">API Reference</a>
                    <a href="/tutorials">Tutorials</a>
                    <a href="/examples">Examples</a>
                    <a href="/troubleshooting">Troubleshooting</a>
                </nav>
                <div class="header-actions">
                    ${this.generateLanguageSelector(document)}
                    <div class="theme-toggle">
                        <button id="theme-toggle" aria-label="Toggle theme">🌙</button>
                    </div>
                </div>
            </div>
        </div>
    </header>
    
    <main class="doc-main">
        <div class="container">
            <div class="doc-layout">
                <aside class="doc-sidebar">
                    ${this.generateSidebar(document)}
                </aside>
                <article class="doc-content">
                    <div class="doc-metadata">
                        <div class="doc-type">${document.type}</div>
                        <div class="doc-complexity">Complexity: ${'★'.repeat(document.complexity)}${'☆'.repeat(5 - document.complexity)}</div>
                        <div class="doc-languages">
                            Languages: ${document.languages.map(lang => `<span class="lang-tag">${lang}</span>`).join(' ')}
                        </div>
                    </div>
                    ${htmlContent}
                    
                    <footer class="doc-footer">
                        <div class="doc-meta">
                            <p>Generated on ${new Date(document.metadata.generated).toLocaleDateString()}</p>
                            <p>Version: ${document.metadata.version}</p>
                        </div>
                        <div class="doc-actions">
                            <button class="btn-secondary" onclick="window.print()">🖨️ Print</button>
                            <button class="btn-secondary" onclick="navigator.share && navigator.share({title: document.title, url: window.location.href})">📤 Share</button>
                        </div>
                    </footer>
                </article>
                <aside class="doc-toc">
                    <div class="toc-container">
                        <h4>On This Page</h4>
                        <nav class="table-of-contents"></nav>
                    </div>
                </aside>
            </div>
        </div>
    </main>
    
    <!-- Scripts -->
    ${this.generateScripts()}
</body>
</html>`;
  }

  private generateStylesheets(): string {
    return `
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/highlight.css">
    <link rel="stylesheet" href="/assets/css/live-examples.css">
    <style>
        ${this.getInlineStyles()}
    </style>`;
  }

  private generateScripts(): string {
    return `
    <script src="/assets/js/main.js"></script>
    <script src="/assets/js/live-examples.js"></script>
    <script src="/assets/js/comparison-tables.js"></script>
    <script>
        ${this.getInlineScripts()}
    </script>`;
  }

  private generateStructuredData(document: GeneratedDocument): string {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": document.title,
      "description": this.extractDescription(document.content),
      "datePublished": document.metadata.generated,
      "dateModified": document.metadata.generated,
      "author": {
        "@type": "Organization",
        "name": "HyperSim SDK Team"
      },
      "publisher": {
        "@type": "Organization",
        "name": "HyperSim"
      },
      "programmingLanguage": document.languages
    };
    
    return `<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`;
  }

  private generateLanguageSelector(document: GeneratedDocument): string {
    if (document.languages.length <= 1) {
      return '';
    }
    
    return `
    <div class="language-selector">
        <select id="language-select" onchange="switchLanguage(this.value)">
            ${document.languages.map(lang => 
              `<option value="${lang}">${lang.charAt(0).toUpperCase() + lang.slice(1)}</option>`
            ).join('')}
        </select>
    </div>`;
  }

  private generateSidebar(document: GeneratedDocument): string {
    return `
    <div class="sidebar-content">
        <div class="sidebar-section">
            <h4>Navigation</h4>
            <nav class="doc-nav">
                <!-- Navigation will be populated by JavaScript -->
            </nav>
        </div>
        
        <div class="sidebar-section">
            <h4>Related</h4>
            <div class="related-links">
                <!-- Related links will be populated -->
            </div>
        </div>
        
        <div class="sidebar-section">
            <h4>Feedback</h4>
            <div class="feedback-section">
                <button class="btn-secondary feedback-btn" data-type="helpful">👍 Helpful</button>
                <button class="btn-secondary feedback-btn" data-type="not-helpful">👎 Not Helpful</button>
                <a href="#" class="feedback-link">📝 Edit This Page</a>
            </div>
        </div>
    </div>`;
  }

  private getInlineStyles(): string {
    return `
        /* Critical CSS for immediate rendering */
        .doc-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .doc-header { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 1rem 0; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .doc-layout { display: grid; grid-template-columns: 250px 1fr 200px; gap: 2rem; margin-top: 2rem; }
        .live-example { border: 1px solid #e0e0e0; border-radius: 8px; margin: 1rem 0; }
        .live-example-header { background: #f5f5f5; padding: 0.5rem 1rem; display: flex; justify-content: space-between; align-items: center; }
        .callout { margin: 1rem 0; padding: 1rem; border-left: 4px solid; border-radius: 4px; }
        .callout-note { background: #f0f7ff; border-color: #0066cc; }
        .callout-warning { background: #fff8e1; border-color: #ff9800; }
        .callout-tip { background: #f0f8e7; border-color: #4caf50; }
        @media (max-width: 768px) {
            .doc-layout { grid-template-columns: 1fr; }
            .doc-sidebar, .doc-toc { display: none; }
        }
    `;
  }

  private getInlineScripts(): string {
    return `
        // Critical JavaScript for immediate functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Generate table of contents
            const tocContainer = document.querySelector('.table-of-contents');
            if (tocContainer) {
                generateTableOfContents(tocContainer);
            }
            
            // Initialize live examples
            initializeLiveExamples();
            
            // Theme toggle
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', toggleTheme);
            }
        });
        
        function generateTableOfContents(container) {
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const tocList = document.createElement('ul');
            
            headings.forEach(function(heading) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#' + (heading.id || generateId(heading.textContent));
                a.textContent = heading.textContent;
                li.appendChild(a);
                tocList.appendChild(li);
                
                if (!heading.id) {
                    heading.id = generateId(heading.textContent);
                }
            });
            
            container.appendChild(tocList);
        }
        
        function generateId(text) {
            return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        }
        
        function initializeLiveExamples() {
            document.querySelectorAll('.live-example-run').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    // Live example execution logic
                    console.log('Run example');
                });
            });
        }
        
        function toggleTheme() {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        }
        
        // Load saved theme
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
        }
    `;
  }

  private extractDescription(content: string): string {
    const textContent = this.extractTextContent(content);
    const sentences = textContent.split(/[.!?]+/);
    return sentences.slice(0, 2).join('. ').substring(0, 160) + '...';
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
}