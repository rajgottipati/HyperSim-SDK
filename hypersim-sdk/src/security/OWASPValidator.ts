/**
 * OWASP compliance checking and vulnerability scanning
 */

import { OWASPViolation } from './types';

interface OWASPCheck {
  category: string;
  name: string;
  check: (data: any) => Promise<OWASPViolation | null>;
}

export class OWASPValidator {
  private readonly enabled: boolean;
  private readonly checks: OWASPCheck[];

  constructor(enabled: boolean) {
    this.enabled = enabled;
    this.checks = this.initializeChecks();
  }

  /**
   * Validate data against OWASP guidelines
   */
  async validate(data: any): Promise<OWASPViolation[]> {
    if (!this.enabled) {
      return [];
    }

    const violations: OWASPViolation[] = [];
    
    for (const check of this.checks) {
      try {
        const violation = await check.check(data);
        if (violation) {
          violations.push(violation);
        }
      } catch (error) {
        console.warn(`OWASP check failed: ${check.name}`, error);
      }
    }

    return violations;
  }

  /**
   * Get all available OWASP checks
   */
  getAvailableChecks(): Array<{ category: string; name: string }> {
    return this.checks.map(check => ({
      category: check.category,
      name: check.name
    }));
  }

  private initializeChecks(): OWASPCheck[] {
    return [
      // A01:2021 – Broken Access Control
      {
        category: 'A01:2021',
        name: 'Broken Access Control',
        check: async (data) => {
          // Check for direct object references
          if (data.userId && typeof data.userId === 'string') {
            if (/^\d+$/.test(data.userId)) {
              return {
                category: 'A01:2021',
                severity: 'warning',
                description: 'Sequential user ID detected - potential IDOR vulnerability',
                mitigation: ['Use UUIDs instead of sequential IDs', 'Implement proper authorization checks']
              };
            }
          }
          return null;
        }
      },

      // A02:2021 – Cryptographic Failures
      {
        category: 'A02:2021',
        name: 'Cryptographic Failures',
        check: async (data) => {
          // Check for weak encryption
          if (data.encryption && typeof data.encryption === 'string') {
            const weakAlgorithms = ['md5', 'sha1', 'des', 'rc4'];
            if (weakAlgorithms.some(alg => data.encryption.toLowerCase().includes(alg))) {
              return {
                category: 'A02:2021',
                severity: 'critical',
                description: 'Weak cryptographic algorithm detected',
                mitigation: ['Use SHA-256 or stronger', 'Use AES-256 for encryption', 'Avoid deprecated algorithms']
              };
            }
          }
          return null;
        }
      },

      // A03:2021 – Injection
      {
        category: 'A03:2021',
        name: 'Injection Attacks',
        check: async (data) => {
          const sqlInjectionPatterns = [
            /('|(\-\-)|(;)|(\|)|(\*)|(%))/i,
            /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i
          ];
          
          const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
          ];

          const checkString = JSON.stringify(data);
          
          // Check for SQL injection
          for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(checkString)) {
              return {
                category: 'A03:2021',
                severity: 'critical',
                description: 'Potential SQL injection detected',
                mitigation: ['Use parameterized queries', 'Sanitize all user input', 'Use ORM frameworks']
              };
            }
          }
          
          // Check for XSS
          for (const pattern of xssPatterns) {
            if (pattern.test(checkString)) {
              return {
                category: 'A03:2021',
                severity: 'high',
                description: 'Potential XSS attack detected',
                mitigation: ['HTML encode output', 'Use Content Security Policy', 'Validate and sanitize input']
              };
            }
          }
          
          return null;
        }
      },

      // A04:2021 – Insecure Design
      {
        category: 'A04:2021',
        name: 'Insecure Design',
        check: async (data) => {
          // Check for sensitive data in logs
          if (data.password || data.secret || data.token) {
            return {
              category: 'A04:2021',
              severity: 'high',
              description: 'Sensitive data detected in request',
              mitigation: ['Remove sensitive data from logs', 'Use secure transport', 'Hash sensitive values']
            };
          }
          return null;
        }
      },

      // A05:2021 – Security Misconfiguration
      {
        category: 'A05:2021',
        name: 'Security Misconfiguration',
        check: async (data) => {
          // Check for debug information
          if (data.debug === true || data.stackTrace) {
            return {
              category: 'A05:2021',
              severity: 'warning',
              description: 'Debug information exposed',
              mitigation: ['Disable debug mode in production', 'Remove stack traces from responses']
            };
          }
          return null;
        }
      },

      // A06:2021 – Vulnerable and Outdated Components
      {
        category: 'A06:2021',
        name: 'Vulnerable Components',
        check: async (data) => {
          // Check for version information that might indicate outdated components
          if (data.version && typeof data.version === 'string') {
            // This would need to be connected to a vulnerability database
            // For now, just check for obviously old versions
            if (data.version.startsWith('1.') || data.version.startsWith('0.')) {
              return {
                category: 'A06:2021',
                severity: 'warning',
                description: 'Potentially outdated component version detected',
                mitigation: ['Update to latest stable version', 'Regularly audit dependencies']
              };
            }
          }
          return null;
        }
      },

      // A07:2021 – Identification and Authentication Failures
      {
        category: 'A07:2021',
        name: 'Authentication Failures',
        check: async (data) => {
          // Check for weak session tokens
          if (data.sessionToken && typeof data.sessionToken === 'string') {
            if (data.sessionToken.length < 32) {
              return {
                category: 'A07:2021',
                severity: 'high',
                description: 'Weak session token detected',
                mitigation: ['Use cryptographically strong tokens', 'Implement proper session management']
              };
            }
          }
          return null;
        }
      },

      // A08:2021 – Software and Data Integrity Failures
      {
        category: 'A08:2021',
        name: 'Integrity Failures',
        check: async (data) => {
          // Check for missing integrity verification
          if (data.fileUrl && !data.checksum && !data.signature) {
            return {
              category: 'A08:2021',
              severity: 'warning',
              description: 'File transfer without integrity verification',
              mitigation: ['Use checksums or digital signatures', 'Verify file integrity']
            };
          }
          return null;
        }
      },

      // A09:2021 – Security Logging and Monitoring Failures
      {
        category: 'A09:2021',
        name: 'Logging Failures',
        check: async (data) => {
          // Check if security-relevant actions are being logged
          if ((data.action === 'login' || data.action === 'delete' || data.action === 'admin') && !data.logged) {
            return {
              category: 'A09:2021',
              severity: 'warning',
              description: 'Security-relevant action without logging',
              mitigation: ['Implement comprehensive audit logging', 'Monitor security events']
            };
          }
          return null;
        }
      },

      // A10:2021 – Server-Side Request Forgery (SSRF)
      {
        category: 'A10:2021',
        name: 'SSRF',
        check: async (data) => {
          // Check for potential SSRF in URLs
          const urls = this.extractUrls(data);
          for (const url of urls) {
            try {
              const parsedUrl = new URL(url);
              
              // Check for localhost/private IPs
              if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname) ||
                  parsedUrl.hostname.startsWith('192.168.') ||
                  parsedUrl.hostname.startsWith('10.') ||
                  parsedUrl.hostname.startsWith('172.')) {
                return {
                  category: 'A10:2021',
                  severity: 'high',
                  description: 'Potential SSRF - request to private network',
                  mitigation: ['Validate and whitelist allowed URLs', 'Use URL filtering']
                };
              }
            } catch {
              // Invalid URL, skip
            }
          }
          return null;
        }
      }
    ];
  }

  private extractUrls(data: any): string[] {
    const urls: string[] = [];
    const urlPattern = /https?:\/\/[^\s]+/g;
    
    const searchObject = (obj: any) => {
      if (typeof obj === 'string') {
        const matches = obj.match(urlPattern);
        if (matches) {
          urls.push(...matches);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const value of Object.values(obj)) {
          searchObject(value);
        }
      }
    };
    
    searchObject(data);
    return urls;
  }
}
