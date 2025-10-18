import { AIProvider, AIProviderType, OpenAIConfig, APIKeyMissingError, AIServiceError } from '../interfaces';
import fetch from 'node-fetch';

/**
 * Kimi provider implementation
 * Uses the Moonshot API which is OpenAI-compatible
 */
export class KimiProvider implements AIProvider {
  public readonly name = 'Kimi';
  public readonly type: AIProviderType = 'kimi';
  
  private config: OpenAIConfig;
  private baseUrl = 'https://api.moonshot.cn/v1';

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  async generatePlan(prompt: string, options?: any): Promise<string> {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new APIKeyMissingError('kimi');
    }

    try {
      const systemPrompt = `Create a comprehensive and detailed project plan in JSON format for: "${prompt}"

You are an expert software architect and project manager. Generate a thorough, professional project plan that includes:
- A detailed overview explaining the project's purpose, target audience, and key features
- Comprehensive requirements covering functional, technical, and non-functional aspects
- A well-structured file organization with clear descriptions
- Detailed next steps with realistic time estimates and clear dependencies

CRITICAL: Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not include any explanatory text before or after the JSON. Start your response with { and end with }.`;

      const modelName = this.config.model || 'kimi-k2-0905';
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new AIServiceError(`Kimi API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AIServiceError(`Error generating plan with Kimi: ${errorMessage}`);
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getSupportedModels(): string[] {
    return ['kimi-k2-0905'];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey && this.config.apiKey.trim() !== '';
  }
}