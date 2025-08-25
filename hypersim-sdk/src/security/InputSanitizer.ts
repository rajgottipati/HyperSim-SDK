/**
 * Input validation and sanitization to prevent injection attacks
 */

interface SanitizationRules {
  maxLength?: number;
  allowedCharacters?: RegExp;
  blockedPatterns?: RegExp[];
  htmlEncode?: boolean;
  sqlEscape?: boolean;
  removeNullBytes?: boolean;
  trimWhitespace?: boolean;
}

export class InputSanitizer {
  private readonly validationLevel: 'strict' | 'moderate' | 'basic';
  private readonly defaultRules: Record<string, SanitizationRules>;

  constructor(validationLevel: 'strict' | 'moderate' | 'basic' = 'strict') {
    this.validationLevel = validationLevel;
    this.defaultRules = this.initializeDefaultRules();
  }

  /**
   * Sanitize input data based on validation level
   */
  async sanitize(data: any, customRules?: Record<string, SanitizationRules>): Promise<any> {
    const rules = { ...this.defaultRules, ...customRules };
    
    return this.sanitizeValue(data, rules, 'root');
  }

  /**
   * Validate and sanitize a specific field
   */
  sanitizeField(value: any, fieldName: string, rules?: SanitizationRules): any {
    const fieldRules = rules || this.getFieldRules(fieldName);
    return this.applySanitizationRules(value, fieldRules);
  }

  /**
   * Check if input contains potentially malicious patterns
   */
  detectThreats(input: string): Array<{ type: string; pattern: string; severity: 'low' | 'medium' | 'high' | 'critical' }> {
    const threats = [];
    const patterns = {
      sqlInjection: {
        patterns: [
          /('|(\-\-)|(;)|(\|)|(\*)|(%))/gi,
          /(union|select|insert|delete|update|drop|create|alter|exec|execute)\s/gi,
          /(or|and)\s+\d+\s*=\s*\d+/gi
        ],
        severity: 'critical' as const
      },
      xss: {
        patterns: [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe[^>]*>.*?<\/iframe>/gi,
          /eval\s*\(/gi
        ],
        severity: 'high' as const
      },
      commandInjection: {
        patterns: [
          /[;&|`$\(\)]/g,
          /(bash|sh|cmd|powershell)\s/gi,
          /\.\.[\/\\]/g
        ],
        severity: 'critical' as const
      },
      pathTraversal: {
        patterns: [
          /\.\.[\/\\]/g,
          /\/(etc|proc|sys|dev)\//gi,
          /\\(windows|system32)\\|gi
        ],
        severity: 'high' as const
      },
      ldapInjection: {
        patterns: [
          /[\(\)\*\\\|\&]/g,
          /(\|\||&&)/g
        ],
        severity: 'medium' as const
      },
      nosqlInjection: {
        patterns: [
          /\$where/gi,
          /\$ne/gi,
          /\$regex/gi,
          /\$gt/gi,
          /\$lt/gi
        ],
        severity: 'high' as const
      }
    };

    for (const [threatType, config] of Object.entries(patterns)) {
      for (const pattern of config.patterns) {
        const matches = input.match(pattern);
        if (matches) {
          threats.push({
            type: threatType,
            pattern: pattern.toString(),
            severity: config.severity
          });
        }
      }
    }

    return threats;
  }

  /**
   * HTML encode string to prevent XSS
   */
  htmlEncode(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * SQL escape string to prevent SQL injection
   */
  sqlEscape(input: string): string {
    return input.replace(/'/g, "''");
  }

  /**
   * Remove dangerous characters and patterns
   */
  removeDangerousPatterns(input: string): string {
    let sanitized = input;

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Remove common injection patterns
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Remove SQL injection patterns in strict mode
    if (this.validationLevel === 'strict') {
      sanitized = sanitized.replace(/(union|select|insert|delete|update|drop|create|alter|exec|execute)\s/gi, '');
      sanitized = sanitized.replace(/('|(\-\-)|(;)|(\|)|(\*)|(%))/g, '');
    }
    
    return sanitized;
  }

  /**
   * Validate email address format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate URL format and safety
   */
  validateURL(url: string): { isValid: boolean; isSafe: boolean; issues: string[] } {
    const issues: string[] = [];
    let isValid = false;
    let isSafe = true;

    try {
      const parsedUrl = new URL(url);
      isValid = true;

      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        issues.push('Unsafe protocol');
        isSafe = false;
      }

      // Check for private/local addresses
      const hostname = parsedUrl.hostname.toLowerCase();
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
        issues.push('Private/internal network address');
        isSafe = false;
      }

      // Check for suspicious patterns
      if (url.includes('javascript:') || url.includes('data:')) {
        issues.push('Potentially dangerous URL scheme');
        isSafe = false;
      }

    } catch {
      issues.push('Invalid URL format');
    }

    return { isValid, isSafe, issues };
  }

  private sanitizeValue(value: any, rules: Record<string, SanitizationRules>, path: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.applySanitizationRules(value, this.getFieldRules(path, rules));
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => 
        this.sanitizeValue(item, rules, `${path}[${index}]`)
      );
    }

    if (typeof value === 'object') {
      const sanitized: any = {};
      
      for (const [key, val] of Object.entries(value)) {
        // Skip prototype pollution attempts
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
          continue;
        }
        
        const sanitizedKey = this.sanitizeField(key, 'objectKey');
        sanitized[sanitizedKey] = this.sanitizeValue(val, rules, `${path}.${key}`);
      }
      
      return sanitized;
    }

    return value;
  }

  private applySanitizationRules(value: string, rules: SanitizationRules): string {
    let sanitized = value;

    // Trim whitespace
    if (rules.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }

    // Remove null bytes
    if (rules.removeNullBytes !== false) {
      sanitized = sanitized.replace(/\x00/g, '');
    }

    // Check length limit
    if (rules.maxLength && sanitized.length > rules.maxLength) {
      sanitized = sanitized.substring(0, rules.maxLength);
    }

    // Apply character filtering
    if (rules.allowedCharacters) {
      const allowed = sanitized.match(rules.allowedCharacters);
      sanitized = allowed ? allowed.join('') : '';
    }

    // Remove blocked patterns
    if (rules.blockedPatterns) {
      for (const pattern of rules.blockedPatterns) {
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // HTML encode
    if (rules.htmlEncode) {
      sanitized = this.htmlEncode(sanitized);
    }

    // SQL escape
    if (rules.sqlEscape) {
      sanitized = this.sqlEscape(sanitized);
    }

    return sanitized;
  }

  private getFieldRules(fieldName: string, customRules?: Record<string, SanitizationRules>): SanitizationRules {
    if (customRules && customRules[fieldName]) {
      return customRules[fieldName];
    }

    return this.defaultRules[fieldName] || this.defaultRules.default;
  }

  private initializeDefaultRules(): Record<string, SanitizationRules> {
    const baseRules: SanitizationRules = {
      removeNullBytes: true,
      trimWhitespace: true
    };

    const strictRules: SanitizationRules = {
      ...baseRules,
      blockedPatterns: [
        /<script[^>]*>.*?<\/script>/gis,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /(union|select|insert|delete|update|drop|create|alter|exec|execute)\s/gi
      ]
    };

    const rules = {
      default: this.validationLevel === 'strict' ? strictRules : baseRules,
      
      email: {
        ...baseRules,
        maxLength: 254,
        allowedCharacters: /[a-zA-Z0-9._%+-@]/g
      },
      
      username: {
        ...baseRules,
        maxLength: 50,
        allowedCharacters: /[a-zA-Z0-9_-]/g
      },
      
      password: {
        removeNullBytes: true,
        maxLength: 128,
        trimWhitespace: false // Preserve whitespace in passwords
      },
      
      url: {
        ...baseRules,
        maxLength: 2048,
        blockedPatterns: [
          /javascript:/gi,
          /data:/gi,
          /vbscript:/gi
        ]
      },
      
      objectKey: {
        ...baseRules,
        maxLength: 100,
        allowedCharacters: /[a-zA-Z0-9_]/g
      }
    };

    return rules;
  }
}
