import * as vscode from 'vscode';

export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Security = 'SECURITY',
  Warn = 'WARN',
  Error = 'ERROR',
}

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logBuffer: string[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;
  private securityEvents: Array<{timestamp: Date, event: string}> = [];

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
    // SECURITY: Filter sensitive information from logs
    const sanitizedMessage = this.sanitizeMessage(message);
    const sanitizedArgs = args.map(arg => this.sanitizeArg(arg));
    
    const timestamp = new Date().toISOString();
    const formattedArgs = sanitizedArgs.length > 0 ? ` ${sanitizedArgs.map(arg => 
      arg instanceof Error ? arg.stack || arg.message : JSON.stringify(arg)
    ).join(' ')}` : '';
    
    const logLine = `[${timestamp}] [${level}] ${sanitizedMessage}${formattedArgs}`;
  
  private sanitizeMessage(message: string): string {
    // Remove potential file paths
    let sanitized = message.replace(/[A-Z]:\\[\w\\]+/g, '[PATH]');
    sanitized = sanitized.replace(/\/[\w\/]+/g, '[PATH]');
    
    // Remove potential API keys
    sanitized = sanitized.replace(/[a-zA-Z0-9_-]{32,}/g, '[REDACTED]');
    
    // Remove email addresses
    sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
    
    return sanitized;
  }
  
  private sanitizeArg(arg: unknown): unknown {
    if (typeof arg === 'string') {
      return this.sanitizeMessage(arg);
    }
    if (arg && typeof arg === 'object') {
      // Don't log full objects that might contain sensitive data
      return '[OBJECT]';
    }
    return arg;
  }
    
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
  
  /**
   * SECURITY: Log security-relevant events
   * These are kept in a separate buffer for security monitoring
   */
  public security(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Security, message, ...args);
    
    // Keep security events in separate buffer
    this.securityEvents.push({
      timestamp: new Date(),
      event: `${message} ${args.join(' ')}`
    });
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
    return this.logBuffer.join('\n');
  }

  public clear(): void {
    this.logBuffer = [];
    this.outputChannel.clear();
  }
  
  /**
   * Get security events for audit purposes
   */
  public getSecurityEvents(): Array<{timestamp: Date, event: string}> {
    return [...this.securityEvents];
  }
  
  public clearSecurityEvents(): void {
    this.securityEvents = [];
  }
}

export const logger = Logger.getInstance();
