import fetch from 'node-fetch';
import { AIProvider, AIProviderType, AIServiceError } from '../interfaces';

export class OllamaProvider implements AIProvider {
  public readonly name = 'Ollama';
  public readonly type: AIProviderType = 'ollama';

  private baseUrl: string;
  private modelName: string;

  private fetcher: typeof fetch;

  constructor(baseUrl: string, modelName: string, fetcher?: typeof fetch) {
    // Remove trailing slash if present and ensure default if empty
    this.baseUrl = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
    this.modelName = modelName || 'llama3';
    this.fetcher = fetcher || fetch;
    console.log(`OllamaProvider: Initialized with ${this.baseUrl} using model ${this.modelName}`);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetcher(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (_e) {
      return false;
    }
  }

  async validateApiKey(_apiKey: string): Promise<boolean> {
    // Ollama typically doesn't use API keys for local instances,
    // so we simply check if the server is reachable.
    return this.isAvailable();
  }

  getSupportedModels(): string[] {
    // Return common models, though the user can type any custom model in settings
    return ['llama3', 'mistral', 'codellama', 'deepseek-coder'];
  }

  async generatePlan(prompt: string, _options?: { planSize?: string, planType?: string }): Promise<string> {
    try {
      // We use the exact same system prompt as GeminiProvider to ensure consistency
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

      // Call Ollama API
      const response = await this.fetcher(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: systemPrompt,
          format: "json", // Enforce JSON mode
          stream: false,
          options: {
            temperature: 0.7,
            num_ctx: 4096 // Ensure enough context for larger plans
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.statusText}`);
      }

      const data = await response.json() as { response: string };
      const jsonText = data.response;

      console.log('OllamaProvider: Raw response length:', jsonText.length);

      // Return the raw JSON string as requested by the interface
      // The PlanGenerator logic will handle parsing this later.
      return jsonText;

    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Unknown error generating plan with Ollama',
        error instanceof Error ? error : undefined
      );
    }
  }

  async refineSection(sectionContent: string, refinementPrompt: string, fullContext: string): Promise<string> {
    try {
      const systemPrompt = `You are an expert software architect. Refine the following section of a project plan based on the user's request.
      
Original Section Content:
"${sectionContent}"

User's Refinement Request:
"${refinementPrompt}"

Full Plan Context (for reference):
"${fullContext}"

CRITICAL INSTRUCTIONS:
1. Return ONLY the refined content for this section.
2. Maintain the same Markdown heading level as the original section if applicable.
3. Ensure the refined content fits seamlessly back into the full plan.
4. Do not include any introductory or concluding text.
5. If the user asks for more detail, be specific and technical.`;

      const response = await this.fetcher(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: systemPrompt,
          stream: false,
          options: {
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.statusText}`);
      }

      const data = await response.json() as { response: string };
      return data.response;

    } catch (error) {
      console.error('OllamaProvider.refineSection error:', error);
      throw new AIServiceError(error instanceof Error ? error.message : String(error));
    }
  }
}