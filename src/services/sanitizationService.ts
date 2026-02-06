import * as vscode from 'vscode';

export class SanitizationService {
    // Regex patterns for common sensitive data
    private static readonly PATTERNS = {
        // Standard Email Regex
        EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        
        // IPv4 Address (0.0.0.0 to 255.255.255.255)
        // Improved: Uses negative lookbehind/ahead to avoid matching version numbers (e.g. v1.2.3.4 or 1.2.3.4.5)
        IPV4: /(?<![\w.])(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?![\w.])/g,
        
        // Common API Keys
        // Added: AKIA (AWS), AIza (Google Firebase/Cloud)
        API_KEY: /\b(sk-|ghp_|gho_|xoxb-|xoxp-|AKIA|AIza)[a-zA-Z0-9_\-]{20,}\b/g
    };

    /**
     * Scrubs sensitive data from the input string.
     * Returns the sanitized string and a boolean indicating if changes were made.
     */
    public static sanitize(input: string): { sanitizedText: string; wasRedacted: boolean } {
        let sanitizedText = input;
        
        // Store original to check for changes (avoids regex state bugs with .test())
        const originalText = input;

        // 1. Redact Emails
        sanitizedText = sanitizedText.replace(this.PATTERNS.EMAIL, '<REDACTED_EMAIL>');

        // 2. Redact IP Addresses
        sanitizedText = sanitizedText.replace(this.PATTERNS.IPV4, '<REDACTED_IP>');

        // 3. Redact API Keys
        sanitizedText = sanitizedText.replace(this.PATTERNS.API_KEY, '<REDACTED_SECRET>');

        return { 
            sanitizedText, 
            wasRedacted: sanitizedText !== originalText 
        };
    }
}