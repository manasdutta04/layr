import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ProjectPlan, PlanGenerator, FileStructureItem, PlanStep } from './interfaces';
// 1. Import the cache
import { PlanCache } from './cache';
import { logger } from '../utils/logger';
import { AIProviderError } from '../utils/errors';

/**
 * Gemini AI-powered plan generator
 */
export class GeminiPlanGenerator implements PlanGenerator {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string;
  // 2. Add cache property
  private cache: PlanCache;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // 3. Initialize Cache Singleton
    this.cache = PlanCache.getInstance();

    console.log('GeminiPlanGenerator: API key received:', apiKey ? '***configured***' : 'empty');
    console.log('GeminiPlanGenerator: API key length:', apiKey?.length || 0);

    if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_api_key_here') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      logger.info('GeminiPlanGenerator: GoogleGenerativeAI initialized successfully');
    } else {
      logger.warn('GeminiPlanGenerator: API key invalid or placeholder, not initializing AI');
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.genAI !== null && this.apiKey.trim() !== '';
  }

  async testApiKey(): Promise<{ success: boolean; error?: string }> {
    if (!this.genAI) {
      return { success: false, error: 'AI provider is not configured. Please verify your configuration settings.' };
    }

    try {
      logger.info('GeminiPlanGenerator: Testing API key...');
      const model = this.genAI.getGenerativeModel({ 
            model: 'gemini-pro',
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
      await model.generateContent("Hello");
      logger.info('GeminiPlanGenerator: API key test successful');
      return { success: true };
    } catch (error) {
      logger.error('GeminiPlanGenerator: API key test failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      let userMsg = errorMsg;

      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('authentication')) {
        userMsg = 'Authentication failed. Please verify your configuration settings.';
      } else if (errorMsg.includes('429') || errorMsg.includes('quota')) {
        userMsg = 'Service quota exceeded. Please wait a few minutes before trying again.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        userMsg = 'Network error. Check your internet connection and firewall settings.';
      }

      return { success: false, error: userMsg };
    }
  }

  async generatePlan(prompt: string): Promise<ProjectPlan> {
    if (!this.genAI) {
      throw new AIProviderError('AI provider is not configured.', 'Gemini');
    }

    // 4. CACHE LOOKUP START
    const cachedPlan = this.cache.get(prompt);
    if (cachedPlan) {
      logger.info(`GeminiPlanGenerator: Cache HIT for prompt: ${prompt.substring(0, 50)}...`);
      // Return cached plan with updated timestamp so it feels fresh
      return { ...cachedPlan, generatedAt: new Date() };
    }
    logger.info('GeminiPlanGenerator: Cache MISS. Calling API...');
    // 4. CACHE LOOKUP END

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-pro',
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

      const systemPrompt = `Create a concise project plan in JSON format for: "${prompt}"

Return ONLY valid JSON. No extra text. Keep file structure simple (max 2 levels deep).

{
  "title": "Project Title",
  "overview": "Brief description (1-2 sentences)",
  "requirements": ["requirement 1", "requirement 2", "requirement 3"],
  "fileStructure": [
    {
      "name": "src",
      "type": "directory", 
      "path": "src/",
      "description": "Source code"
    },
    {
      "name": "package.json",
      "type": "file", 
      "path": "package.json",
      "description": "Dependencies"
    }
  ],
  "nextSteps": [
    {
      "id": "step1",
      "description": "Setup project",
      "completed": false,
      "priority": "high",
      "estimatedTime": "30 minutes",
      "dependencies": []
    }
  ]
}`;

      const result = await model.generateContent(systemPrompt);
      const response = await result.response;

      // Check for safety filters or blocked content
      logger.debug('GeminiPlanGenerator: Response candidates:', response.candidates?.length || 0);
      logger.debug('GeminiPlanGenerator: Finish reason:', response.candidates?.[0]?.finishReason);
      logger.debug('GeminiPlanGenerator: Safety ratings:', response.candidates?.[0]?.safetyRatings);
      
      const text = response.text();

      logger.debug('GeminiPlanGenerator: Response length:', text.length);
      logger.debug('GeminiPlanGenerator: Response preview (first 200 chars):', text.substring(0, 200));

      // Check if response is empty due to safety filters
      if (!text || text.length === 0) {
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') {
          throw new AIProviderError('Your request was blocked by content policies. Try rephrasing your project description.', 'Gemini');
        } else if (finishReason === 'RECITATION') {
          throw new AIProviderError('Content was blocked. Try rephrasing your project description differently.', 'Gemini');
        } else {
          throw new AIProviderError(`AI service returned an empty response. Please try again.`, 'Gemini');
        }
      }

      // Try multiple JSON extraction methods
      let jsonText = '';

      // Method 1: Look for JSON between ```json and ``` markers
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
        logger.debug('GeminiPlanGenerator: Found JSON in code block');
      } else {
        // Method 2: Look for JSON between ``` and ``` markers (without json specifier)
        const genericCodeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
        if (genericCodeBlockMatch) {
          const potentialJson = genericCodeBlockMatch[1].trim();
          if (potentialJson.startsWith('{') && potentialJson.endsWith('}')) {
            jsonText = potentialJson;
            logger.debug('GeminiPlanGenerator: Found JSON in generic code block');
          }
        }

        if (!jsonText) {
          // Method 3: Look for JSON object starting with { and ending with }
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
            logger.debug('GeminiPlanGenerator: Found JSON object');
          } else {
            // Method 4: Try to parse the entire response as JSON
            try {
              JSON.parse(text.trim());
              jsonText = text.trim();
              logger.debug('GeminiPlanGenerator: Entire response is valid JSON');
            } catch {
              logger.error('GeminiPlanGenerator: No valid JSON found in response. Full response:', text);
              throw new AIProviderError('AI service returned an invalid response format. Try with a simpler project description.', 'Gemini');
            }
          }
        }
      }

      logger.debug(`GeminiPlanGenerator: Extracted JSON length: ${jsonText.length}`);

      // Try to parse JSON with error handling and repair
      let planData;
      try {
        planData = JSON.parse(jsonText);
      } catch (parseError) {
        logger.warn('GeminiPlanGenerator: JSON parse error, attempting to repair...', parseError);
        
        // Try to repair common JSON issues
        let repairedJson = jsonText;

        // Fix trailing commas in arrays and objects
        repairedJson = repairedJson.replace(/,(\s*[}\]])/g, '$1');

        // Fix missing commas between array elements
        repairedJson = repairedJson.replace(/}(\s*){/g, '},$1{');
        repairedJson = repairedJson.replace(/](\s*)\[/g, '],$1[');

        // Fix missing quotes around property names
        repairedJson = repairedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

        // Try parsing the repaired JSON
        try {
          planData = JSON.parse(repairedJson);
          logger.info('GeminiPlanGenerator: Successfully repaired and parsed JSON');
        } catch (repairError) {
          logger.error('GeminiPlanGenerator: Failed to repair JSON:', repairError);
          logger.debug('GeminiPlanGenerator: Original JSON:', jsonText);
          throw new AIProviderError('Failed to parse AI response format. The service may have returned malformed data. Try again with a clearer project description.', 'Gemini');
        }
      }

      // Validate and transform the response
      const plan: ProjectPlan = {
        title: planData.title || 'Generated Project Plan',
        overview: planData.overview || 'No overview provided',
        requirements: Array.isArray(planData.requirements) ? planData.requirements : [],
        fileStructure: this.validateFileStructure(planData.fileStructure || []),
        nextSteps: this.validateNextSteps(planData.nextSteps || []),
        generatedAt: new Date(),
        generatedBy: 'ai'
      };

      // 5. CACHE STORE (Save the valid plan)
      this.cache.set(prompt, plan);
      logger.info('GeminiPlanGenerator: Plan stored in local cache');

      return plan;
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      
      logger.error('GeminiPlanGenerator: Unexpected error:', error);
      
      if (error instanceof SyntaxError) {
        throw new AIProviderError('Failed to parse AI response. This may indicate a temporary service issue. Try again in a moment.', 'Gemini');
      }
      
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error occurred while generating plan',
        'Gemini'
      );
    }
  }

  private validateFileStructure(items: unknown[]): FileStructureItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item, index) => {
      const typedItem = item as { name?: string; type?: string; path?: string; description?: string; children?: unknown[] };
      return {
        name: typedItem.name || `item-${index}`,
        type: typedItem.type === 'directory' ? 'directory' : 'file',
        path: typedItem.path || typedItem.name || `item-${index}`,
        description: typedItem.description,
        children: typedItem.children ? this.validateFileStructure(typedItem.children) : undefined
      };
    });
  }

  private validateNextSteps(steps: unknown[]): PlanStep[] {
    if (!Array.isArray(steps)) {
      return [];
    }

    return steps.map((step, index) => {
      const typedStep = step as { id?: string; description?: string; completed?: boolean; priority?: string; estimatedTime?: string; dependencies?: string[] };
      const priority = typedStep.priority;

      return {
        id: typedStep.id || `step-${index + 1}`,
        description: typedStep.description || `Step ${index + 1}`,
        completed: Boolean(typedStep.completed),
        priority: (priority === 'high' || priority === 'medium' || priority === 'low') ? priority : 'medium',
        estimatedTime: typedStep.estimatedTime,
        dependencies: Array.isArray(typedStep.dependencies) ? typedStep.dependencies : []
      };
    });
  }
}