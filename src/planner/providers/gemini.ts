import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AIProvider, AIProviderType, GeminiConfig, AIServiceError, APIKeyMissingError } from '../interfaces';

/**
 * Gemini AI provider implementation
 */
export class GeminiProvider implements AIProvider {
  public readonly name = 'Google Gemini';
  public readonly type: AIProviderType = 'gemini';
  
  private genAI: GoogleGenerativeAI | null = null;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    
    if (config.apiKey && config.apiKey.trim() !== '' && config.apiKey !== 'your_api_key_here') {
      this.genAI = new GoogleGenerativeAI(config.apiKey);
      console.log('GeminiProvider: GoogleGenerativeAI initialized successfully');
    } else {
      console.log('GeminiProvider: API key invalid or placeholder, not initializing AI');
    }
  }

  async generatePlan(prompt: string, options?: any): Promise<string> {
    if (!this.genAI) {
      throw new APIKeyMissingError('gemini');
    }

    try {
      // Get the model name from config or use default
      const modelName = this.config.model || 'gemini-pro';
      
      const model = this.genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });
      
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

      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      
      console.log('GeminiProvider: Response candidates:', response.candidates?.length || 0);
      console.log('GeminiProvider: Finish reason:', response.candidates?.[0]?.finishReason);
      
      const text = response.text();
      console.log('GeminiProvider: Raw AI response length:', text.length);

      if (!text || text.trim() === '') {
        throw new AIServiceError('Empty response from Gemini API');
      }

      return text;
    } catch (error) {
      console.error('GeminiProvider: Error generating plan:', error);
      if (error instanceof APIKeyMissingError) {
        throw error;
      }
      
      const errorStr = error instanceof Error ? error.message : String(error);
      let userFriendlyMsg = `Failed to generate plan with Gemini: ${errorStr}`;
      
      // Provide specific guidance based on error type
      if (errorStr.includes('429') || errorStr.includes('quota')) {
        userFriendlyMsg = 'Gemini API quota exceeded. Please wait a few minutes and try again. Check limits at: https://ai.google.dev/pricing';
      } else if (errorStr.includes('401') || errorStr.includes('unauthorized')) {
        userFriendlyMsg = 'Invalid Gemini API key. Get a new one at: https://ai.google.dev/tutorials/rest_quickstart';
      } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
        userFriendlyMsg = 'Network error connecting to Gemini. Check your internet connection and firewall settings.';
      } else if (errorStr.includes('Safety') || errorStr.includes('safety')) {
        userFriendlyMsg = 'Your request was blocked by safety filters. Try rephrasing your project description with less sensitive content.';
      }
      
      throw new AIServiceError(userFriendlyMsg, error instanceof Error ? error : undefined);
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testAI = new GoogleGenerativeAI(apiKey);
      const model = testAI.getGenerativeModel({ model: 'gemini-pro' });
      await model.generateContent("Hello");
      return true;
    } catch (error) {
      console.error('GeminiProvider: API key validation failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('authentication')) {
        console.error('GeminiProvider: Invalid API key detected. Get one at: https://ai.google.dev/tutorials/rest_quickstart');
      }
      return false;
    }
  }

  getSupportedModels(): string[] {
    return ['gemini-pro', 'gemini-pro-vision'];
  }

  async isAvailable(): Promise<boolean> {
    return this.genAI !== null && this.config.apiKey.trim() !== '';
  }
}