import { AIProvider, AIProviderFactory, AIProviderType, UnsupportedProviderError } from '../interfaces';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
// Import the new Ollama provider
import { OllamaPlanGenerator } from './ollama';

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

    switch (normalizedType) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'groq':
        return new GroqProvider(config);
      case 'ollama':
        // Extract the specific config values needed for Ollama
        // We use safe defaults just in case the config is missing
        const baseUrl = config.customBaseUrl || 'http://localhost:11434';
        const model = config.modelName || 'llama3';
        return new OllamaPlanGenerator(baseUrl, model);
      default:
        throw new UnsupportedProviderError(type as AIProviderType);
    }
  }

  getSupportedProviders(): AIProviderType[] {
    // Cast to any to allow returning the extended list including ollama
    return ['gemini', 'groq', 'ollama' as any];
  }
}

/**
 * Convenience function to get the default factory instance
 */
export function getAIProviderFactory(): AIProviderFactory {
  return DefaultAIProviderFactory.getInstance();
}