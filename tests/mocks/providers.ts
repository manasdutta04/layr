import { AIProvider } from '../../src/planner/interfaces';

export class MockAIProvider implements AIProvider {
  readonly name = 'MockAI';
  readonly type = 'groq';
  private available: boolean;
  private response: string;

  constructor(response: string, available = true) {
    this.response = response;
    this.available = available;
  }

  async generatePlan(_prompt: string, _options?: { planSize?: string; planType?: string }): Promise<string> {
    return this.response;
  }

  async refineSection(_sectionContent: string, _refinementPrompt: string, _fullContext: string): Promise<string> {
    return 'refined';
  }

  async validateApiKey(_apiKey: string): Promise<boolean> {
    return true;
  }

  getSupportedModels(): string[] {
    return ['mock-model'];
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }
}
