import * as vscode from 'vscode';

export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR',
}

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logBuffer: string[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;

  // Patterns that indicate sensitive data (case-insensitive)
  private readonly SENSITIVE_PATTERNS = [
    /api[_-]?key/gi,
    /secret/gi,
    /password/gi,
    /token/gi,
    /bearer\s+[a-z0-9\-_.]+/gi,
    /authorization:\s*[^\s]+/gi,
    /gsk_[a-z0-9]+/gi,  // Groq API keys
    /AI[a-z0-9]{35,}/gi, // Gemini API keys
    /sk-[a-z0-9]{48}/gi, // OpenAI-style keys
  ];

  /**
   * Redacts sensitive information from log messages
   */
  private redactSensitiveData(message: string): string {
    let redacted = message;

    // Redact API keys and tokens
    for (const pattern of this.SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, (match) => {
        // Keep first 3 and last 3 characters, redact middle
        if (match.length > 10) {
          return `${match.substring(0, 3)}***REDACTED***${match.substring(match.length - 3)}`;
        }
        return '***REDACTED***';
      });
    }

    // Redact email addresses
    redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***EMAIL***');

    // Redact potential file paths (Windows and Unix)
    redacted = redacted.replace(/[A-Z]:\\[^:\s]+/gi, '***PATH***');
    redacted = redacted.replace(/\/home\/[^\s]+/gi, '***PATH***');
    redacted = redacted.replace(/\/Users\/[^\s]+/gi, '***PATH***');

    // Redact IP addresses
    redacted = redacted.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***IP***');

    return redacted;
  }

  /**
   * Safely formats arguments for logging, redacting sensitive data
   */
  private formatArgs(args: unknown[]): string {
    return args.map(arg => {
      const str = arg instanceof Error 
        ? (arg.stack || arg.message) 
        : JSON.stringify(arg, null, 2);
      return this.redactSensitiveData(str);
    }).join(' ');
  }

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Layr');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    
    // Redact sensitive data from message and arguments
    const safeMessage = this.redactSensitiveData(message);
    const formattedArgs = args.length > 0 ? ` ${this.formatArgs(args)}` : '';
    
    const logLine = `[${timestamp}] [${level}] ${safeMessage}${formattedArgs}`;
    
    // Add to output channel
    this.outputChannel.appendLine(logLine);
    
    // Add to buffer for diagnostic command
    this.logBuffer.push(logLine);
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift();
    }

    // Also log to console for development
    if (level === LogLevel.Error) {
      console.error(logLine);
    } else if (level === LogLevel.Warn) {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  }

  public debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Debug, message, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Info, message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Warn, message, ...args);
  }

  public error(message: string, error?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.Error, message, error, ...args);
  }

  public show(): void {
    this.outputChannel.show();
  }

  public getLogs(): string {
    // Add warning header to copied logs
    const header = `
======================================
LAYR EXTENSION LOGS
======================================
WARNING: Review logs before sharing publicly
Sensitive data has been redacted but review carefully
======================================

`;
    return header + this.logBuffer.join('\n');
  }

  public clear(): void {
    this.logBuffer = [];
    this.outputChannel.clear();
  }
}

export const logger = Logger.getInstance();
