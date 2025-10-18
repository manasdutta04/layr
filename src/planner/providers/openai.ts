import { AIProvider, AIProviderType, OpenAIConfig, AIServiceError, APIKeyMissingError } from '../interfaces';
import fetch from 'node-fetch';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements AIProvider {
  public readonly name = 'OpenAI';
  public readonly type: AIProviderType = 'openai';
  
  private config: OpenAIConfig;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  async generatePlan(prompt: string, options?: any): Promise<string> {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new APIKeyMissingError('openai');
    }
    
    // Support for all models including third-party models that use OpenAI-compatible API

    try {
      const systemPrompt = `Create a comprehensive and detailed project plan in JSON format for: "${prompt}"

You are an expert software architect and project manager. Generate a thorough, professional project plan that includes:
- A detailed overview explaining the project's purpose, target audience, and key features
- Comprehensive requirements covering functional, technical, and non-functional aspects
- A well-structured file organization with clear descriptions
- Detailed next steps with realistic time estimates and clear dependencies

CRITICAL: Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not include any explanatory text before or after the JSON. Start your response with { and end with }.

{
  "title": "Descriptive Project Title",
  "overview": "Provide a comprehensive 3-4 sentence description explaining what this project does, who it's for, what problems it solves, and what makes it unique or valuable. Include key features and technologies that will be used.",
  "requirements": [
    "Detailed functional requirement with specific features",
    "Technical requirement specifying frameworks, libraries, or tools",
    "Performance requirement with measurable criteria",
    "Security requirement addressing data protection",
    "User experience requirement for interface design",
    "Testing requirement for quality assurance",
    "Deployment requirement for production readiness",
    "Documentation requirement for maintainability"
  ],
  "fileStructure": [
    {
      "name": "src",
      "type": "directory", 
      "path": "src/",
      "description": "Main source code directory containing all application logic"
    },
    {
      "name": "components",
      "type": "directory", 
      "path": "src/components/",
      "description": "Reusable UI components and their associated styles"
    },
    {
      "name": "pages",
      "type": "directory", 
      "path": "src/pages/",
      "description": "Main application pages and route components"
    },
    {
      "name": "utils",
      "type": "directory", 
      "path": "src/utils/",
      "description": "Utility functions and helper modules"
    },
    {
      "name": "styles",
      "type": "directory", 
      "path": "src/styles/",
      "description": "Global styles, themes, and CSS modules"
    },
    {
      "name": "package.json",
      "type": "file", 
      "path": "package.json",
      "description": "Project dependencies, scripts, and metadata configuration"
    },
    {
      "name": "README.md",
      "type": "file", 
      "path": "README.md",
      "description": "Project documentation with setup instructions and usage guide"
    },
    {
      "name": ".env.example",
      "type": "file", 
      "path": ".env.example",
      "description": "Environment variables template for configuration"
    }
  ],
  "nextSteps": [
    {
      "id": "step1",
      "description": "Initialize project structure and install core dependencies including framework, build tools, and essential libraries",
      "completed": false,
      "priority": "high",
      "estimatedTime": "45 minutes",
      "dependencies": []
    },
    {
      "id": "step2",
      "description": "Set up development environment with linting, formatting, and testing configuration",
      "completed": false,
      "priority": "high",
      "estimatedTime": "30 minutes",
      "dependencies": ["step1"]
    },
    {
      "id": "step3",
      "description": "Create basic project structure with main directories and initial component scaffolding",
      "completed": false,
      "priority": "medium",
      "estimatedTime": "60 minutes",
      "dependencies": ["step1", "step2"]
    },
    {
      "id": "step4",
      "description": "Implement core functionality and main features as outlined in requirements",
      "completed": false,
      "priority": "high",
      "estimatedTime": "4-6 hours",
      "dependencies": ["step3"]
    },
    {
      "id": "step5",
      "description": "Add comprehensive testing suite including unit tests and integration tests",
      "completed": false,
      "priority": "medium",
      "estimatedTime": "2-3 hours",
      "dependencies": ["step4"]
    },
    {
      "id": "step6",
      "description": "Optimize performance, add error handling, and implement security best practices",
      "completed": false,
      "priority": "medium",
      "estimatedTime": "2 hours",
      "dependencies": ["step4"]
    },
    {
      "id": "step7",
      "description": "Create comprehensive documentation and deployment configuration",
      "completed": false,
      "priority": "low",
      "estimatedTime": "90 minutes",
      "dependencies": ["step5", "step6"]
    }
  ]
}`;

      // Determine if we're using a third-party model
      const modelName = this.config.model || 'gpt-4';
      const isThirdPartyModel = ['kimi-k2-0905', 'deepseek-v3.1', 'grok-4', 'o3'].includes(modelName);
      
      // Use appropriate API URL based on model
      let apiUrl = `${this.baseUrl}/chat/completions`;
      
      // Set custom API URLs for third-party models if needed
      if (isThirdPartyModel) {
        if (modelName === 'kimi-k2-0905') {
          apiUrl = 'https://api.moonshot.cn/v1/chat/completions';
        } else if (modelName === 'deepseek-v3.1') {
          apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        } else if (modelName === 'grok-4') {
          apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        } else if (modelName === 'o3') {
          apiUrl = 'https://api.o3.ai/v1/chat/completions';
        }
      }
      
      const requestBody = {
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
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      };

      if (this.config.organization) {
        headers['OpenAI-Organization'] = this.config.organization;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new AIServiceError(
          `OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
        );
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content;

      if (!text || text.trim() === '') {
        throw new AIServiceError('Empty response from OpenAI API');
      }

      console.log('OpenAIProvider: Raw AI response length:', text.length);
      return text;
    } catch (error) {
      console.error('OpenAIProvider: Error generating plan:', error);
      if (error instanceof APIKeyMissingError || error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to generate plan with OpenAI: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
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
      console.error('OpenAIProvider: API key validation failed:', error);
      return false;
    }
  }

  getSupportedModels(): string[] {
    return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.apiKey.trim() !== '');
  }
}