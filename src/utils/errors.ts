export abstract class LayrError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AIProviderError extends LayrError {
  constructor(message: string, public readonly provider: string, code?: string) {
    super(`[${provider}] ${message}`, code);
  }
}

export class TemplateError extends LayrError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}

export class ConfigurationError extends LayrError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}

export class FileSystemError extends LayrError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}
