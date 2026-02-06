import * as vscode from 'vscode';
import { AIProvider, AIProviderFactory, AIProviderType } from '../interfaces';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
// FIXED: Import the new provider class
import { OllamaProvider } from './ollama';
import { logger } from '../../utils/logger';
import { AIProviderError } from '../../utils/errors';

/**
 * Factory for creating AI providers
 */
export class DefaultAIProviderFactory implements AIProviderFactory {
  private static instance: DefaultAIProviderFactory;

  private constructor() {}

  public static getInstance(): DefaultAIProviderFactory {
    if (!DefaultAIProviderFactory.instance) {
      DefaultAIProviderFactory.instance = new DefaultAIProviderFactory();
    }
    return DefaultAIProviderFactory.instance;
  }

  createProvider(type: AIProviderType | string, config: any): AIProvider {
    // Normalize type to lowercase to ensure matching works (Gemini vs gemini)
    const normalizedType = type.toLowerCase();
    logger.debug(`AIProviderFactory: Creating provider for type: ${normalizedType}`);

    switch (normalizedType) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'groq':
        return new GroqProvider(config);
      case 'ollama':
        // Extract the specific config values needed for Ollama
        const baseUrl = config.customBaseUrl || 'http://localhost:11434';
        const model = config.modelName || 'llama3';
        // FIXED: Return the new OllamaProvider instance
        return new OllamaProvider(baseUrl, model);
      default:
        const errorMsg = `Unsupported AI provider: "${type}"`;
        logger.error(`AIProviderFactory: ${errorMsg}`);
        
        const action = 'Show Logs';
        vscode.window.showErrorMessage(errorMsg, action).then(selected => {
          if (selected === action) {
            logger.show();
          }
        });
        
        throw new AIProviderError(errorMsg, 'Factory');
    }
  }

  getSupportedProviders(): AIProviderType[] {
    // FIXED: 'ollama' is now a valid type in interfaces.ts, so no casting needed
    return ['gemini', 'groq', 'ollama'];
  }
}

/**
 * Convenience function to get the default factory instance
 */
export function getAIProviderFactory(): AIProviderFactory {
  return DefaultAIProviderFactory.getInstance();
}