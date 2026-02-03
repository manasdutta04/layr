import fetch from 'node-fetch';
import { ProjectPlan, PlanGenerator, AIServiceError, FileStructureItem, PlanStep } from '../interfaces';

export class OllamaPlanGenerator implements PlanGenerator {
  private baseUrl: string;
  private modelName: string;

  constructor(baseUrl: string, modelName: string) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.modelName = modelName || 'llama3';
    console.log(`OllamaPlanGenerator: Initialized with ${this.baseUrl} using model ${this.modelName}`);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Ping Ollama to see if it's running
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async testApiKey(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: 'Ollama service is reachable but returned an error.' };
    } catch (error) {
      return { 
        success: false, 
        error: 'Could not connect to Ollama. Make sure it is running (default: http://localhost:11434).' 
      };
    }
  }

  async generatePlan(prompt: string): Promise<ProjectPlan> {
    try {
      const systemPrompt = `You are an expert software architect. Create a concise project plan in JSON format for: "${prompt}"
      
      CRITICAL INSTRUCTION: Return ONLY valid JSON. No markdown formatting, no explanation text.
      
      {
        "title": "Project Title",
        "overview": "Brief description",
        "requirements": ["req1", "req2"],
        "fileStructure": [
          { "name": "src", "type": "directory", "path": "src/", "description": "source" }
        ],
        "nextSteps": [
          { "id": "1", "description": "step 1", "completed": false, "priority": "high", "estimatedTime": "1h", "dependencies": [] }
        ]
      }`;

      // Call Ollama API
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: systemPrompt,
          format: "json", // Enforce JSON mode
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const jsonText = data.response;

      console.log('OllamaPlanGenerator: Raw response:', jsonText);

      // Parse and Validate
      let planData;
      try {
        planData = JSON.parse(jsonText);
      } catch (e) {
        // Fallback: Try to clean markdown code blocks if Ollama ignored instruction
        const cleanJson = jsonText.replace(/```json\n?|\n?```/g, '').trim();
        planData = JSON.parse(cleanJson);
      }

      return {
        title: planData.title || 'Ollama Generated Plan',
        overview: planData.overview || 'No overview provided',
        requirements: Array.isArray(planData.requirements) ? planData.requirements : [],
        fileStructure: this.validateFileStructure(planData.fileStructure || []),
        nextSteps: this.validateNextSteps(planData.nextSteps || []),
        generatedAt: new Date(),
        generatedBy: 'ai-local'
      };

    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Unknown error generating plan with Ollama',
        error instanceof Error ? error : undefined
      );
    }
  }

  // --- Validation Helpers (Reused from Gemini logic) ---
  
  private validateFileStructure(items: any[]): FileStructureItem[] {
    return items.map((item, index) => ({
      name: item.name || `item-${index}`,
      type: item.type === 'directory' ? 'directory' : 'file',
      path: item.path || item.name || `item-${index}`,
      description: item.description,
      children: item.children ? this.validateFileStructure(item.children) : undefined
    }));
  }

  private validateNextSteps(steps: any[]): PlanStep[] {
    return steps.map((step, index) => ({
      id: step.id || `step-${index + 1}`,
      description: step.description || `Step ${index + 1}`,
      completed: Boolean(step.completed),
      priority: ['high', 'medium', 'low'].includes(step.priority) ? step.priority : 'medium',
      estimatedTime: step.estimatedTime,
      dependencies: Array.isArray(step.dependencies) ? step.dependencies : []
    }));
  }
}