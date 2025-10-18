import { AIProvider, AIProviderType, AIServiceError } from '../interfaces';
import fetch from 'node-fetch';

/**
 * DeepSeek AI Provider
 * Supports the DeepSeek models
 */
export class DeepseekProvider implements AIProvider {
  readonly name = 'DeepSeek';
  readonly type: AIProviderType = 'deepseek';
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: { apiKey: string; model?: string; baseURL?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-v3.1';
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
  }

  async generatePlan(prompt: string, options?: any): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant that generates detailed project plans.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 4000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AIServiceError(`DeepSeek API request failed: ${error}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError('Failed to generate plan with DeepSeek', error as Error);
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getSupportedModels(): string[] {
    return ['deepseek-v3.1', 'deepseek-chat', 'deepseek-coder'];
  }

  async isAvailable(): Promise<boolean> {
    return this.validateApiKey(this.apiKey);
  }
}
