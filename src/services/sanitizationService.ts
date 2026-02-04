import * as vscode from 'vscode';

export class SanitizationService {
    // Regex patterns for common sensitive data
    private static readonly PATTERNS = {
        // Standard Email Regex
        EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        
        // IPv4 Address (0.0.0.0 to 255.255.255.255)
        IPV4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        
        // Common API Keys (OpenAI 'sk-', GitHub 'ghp_', etc.)
        API_KEY: /\b(sk-|ghp_|gho_|xoxb-|xoxp-)[a-zA-Z0-9_\-]{20,}\b/g
    };

    /**
     * Scrubs sensitive data from the input string.
     * Returns the sanitized string and a boolean indicating if changes were made.
     */
    public static sanitize(input: string): { sanitizedText: string; wasRedacted: boolean } {
        let sanitizedText = input;
        let wasRedacted = false;

        // 1. Redact Emails
        if (this.PATTERNS.EMAIL.test(sanitizedText)) {
            sanitizedText = sanitizedText.replace(this.PATTERNS.EMAIL, '<REDACTED_EMAIL>');
            wasRedacted = true;
        }

        // 2. Redact IP Addresses
        if (this.PATTERNS.IPV4.test(sanitizedText)) {
            sanitizedText = sanitizedText.replace(this.PATTERNS.IPV4, '<REDACTED_IP>');
            wasRedacted = true;
        }

        // 3. Redact API Keys
        if (this.PATTERNS.API_KEY.test(sanitizedText)) {
            sanitizedText = sanitizedText.replace(this.PATTERNS.API_KEY, '<REDACTED_SECRET>');
            wasRedacted = true;
        }

        return { sanitizedText, wasRedacted };
    }
}