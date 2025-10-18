import { AIProvider, AIProviderType, AIServiceError } from '../interfaces';
import fetch from 'node-fetch';

/**
 * O3 AI Provider (OpenAI O3 Model)
 * Supports the O3 reasoning model
 */
export class O3Provider implements AIProvider {
  readonly name = 'O3';
  readonly type: AIProviderType = 'o3';
  private apiKey: string;
  private model: string;
  private baseURL: string;
  private organization?: string;

  constructor(config: { apiKey: string; model?: string; baseURL?: string; organization?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'o3';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.organization = config.organization;
  }

  async generatePlan(prompt: string, options?: any): Promise<string> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant that generates detailed project plans with deep reasoning capabilities.',
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
        throw new AIServiceError(`O3 API request failed: ${error}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError('Failed to generate plan with O3', error as Error);
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getSupportedModels(): string[] {
    return ['o3', 'o3-mini'];
  }

  async isAvailable(): Promise<boolean> {
    return this.validateApiKey(this.apiKey);
  }
}
