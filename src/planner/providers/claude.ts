import { AIProvider, AIProviderType, ClaudeConfig, AIServiceError, APIKeyMissingError } from '../interfaces';
import fetch from 'node-fetch';

/**
 * Claude AI provider implementation
 */
export class ClaudeProvider implements AIProvider {
  public readonly name = 'Anthropic Claude';
  public readonly type: AIProviderType = 'claude';
  
  private config: ClaudeConfig;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(config: ClaudeConfig) {
    this.config = config;
  }

  async generatePlan(prompt: string, options?: any): Promise<string> {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new APIKeyMissingError('claude');
    }

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

      // Get the model name from config or use default
      const modelName = this.config.model || 'claude-3-sonnet-20240229';
      
      const requestBody = {
        model: modelName,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new AIServiceError(
          `Claude API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
        );
      }

      const data = await response.json() as any;
      const text = data.content?.[0]?.text;

      if (!text || text.trim() === '') {
        throw new AIServiceError('Empty response from Claude API');
      }

      console.log('ClaudeProvider: Raw AI response length:', text.length);
      return text;
    } catch (error) {
      console.error('ClaudeProvider: Error generating plan:', error);
      if (error instanceof APIKeyMissingError || error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to generate plan with Claude: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Claude doesn't have a simple validation endpoint, so we'll try a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
      return response.ok;
    } catch (error) {
      console.error('ClaudeProvider: API key validation failed:', error);
      return false;
    }
  }

  getSupportedModels(): string[] {
    return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.apiKey.trim() !== '');
  }
}