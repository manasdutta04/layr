import { AIProvider, AIProviderFactory, AIProviderType, UnsupportedProviderError } from '../interfaces';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { KimiProvider } from './kimi';
import { DeepseekProvider } from './deepseek';
import { GrokProvider } from './grok';
import { O3Provider } from './o3';

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

  createProvider(type: AIProviderType, config: any): AIProvider {
    switch (type) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'claude':
        return new ClaudeProvider(config);
      case 'kimi':
        return new KimiProvider(config);
      case 'deepseek':
        return new DeepseekProvider(config);
      case 'grok':
        return new GrokProvider(config);
      case 'o3':
        return new O3Provider(config);
      default:
        throw new UnsupportedProviderError(type);
    }
  }

  getSupportedProviders(): AIProviderType[] {
    return ['gemini', 'openai', 'claude', 'kimi', 'deepseek', 'grok', 'o3'];
  }
}

/**
 * Convenience function to get the default factory instance
 */
export function getAIProviderFactory(): AIProviderFactory {
  return DefaultAIProviderFactory.getInstance();
}