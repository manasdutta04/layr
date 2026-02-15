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
    
    // Redact potential secrets from log output
    const redactSecrets = (str: string): string => {
      // Redact anything that looks like an API key (long alphanumeric strings)
      return str.replace(/(?:gsk_|sk-|AIza)[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
                .replace(/GROQ_API_KEY=\S+/g, 'GROQ_API_KEY=[REDACTED]')
                .replace(/Bearer\s+\S+/g, 'Bearer [REDACTED]');
    };
    
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
      arg instanceof Error ? arg.stack || arg.message : JSON.stringify(arg)
    ).join(' ')}` : '';
    
    const logLine = redactSecrets(`[${timestamp}] [${level}] ${message}${formattedArgs}`);
    
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
    return this.logBuffer.join('\n');
  }

  public clear(): void {
    this.logBuffer = [];
    this.outputChannel.clear();
  }
}

export const logger = Logger.getInstance();
