/**
 * Shared prompt templates used across AI providers.
 * Centralizing these prevents drift between providers.
 */

/**
 * Build the refinement prompt for any provider.
 */
export function buildRefineSectionPrompt(
  sectionContent: string,
  refinementPrompt: string,
  fullContext: string
): string {
  return `You are an expert software architect. Refine the following section of a project plan based on the user's request.
      
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
}

/**
 * Build the JSON plan generation prompt used by Ollama and Gemini providers.
 */
export function buildJsonPlanPrompt(prompt: string): string {
  return `Create a comprehensive and detailed project plan in JSON format for: "${prompt}"

You are an expert software architect and project manager. Generate a thorough, professional project plan that includes:
- A detailed overview explaining the project's purpose, target audience, and key features
- Comprehensive requirements covering functional, technical, and non-functional aspects
- A well-structured file organization with clear descriptions
- Detailed next steps with realistic time estimates and clear dependencies

CRITICAL: Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not include any explanatory text before or after the JSON. Start your response with { and end with }.

{
  "title": "Descriptive Project Title",
  "overview": "Comprehensive description...",
  "requirements": ["requirement 1", "requirement 2"],
  "fileStructure": [
    { "name": "src", "type": "directory", "path": "src/", "description": "Main source code" }
  ],
  "nextSteps": [
    {
      "id": "step1",
      "description": "Initialize project",
      "completed": false,
      "priority": "high",
      "estimatedTime": "45 minutes",
      "dependencies": []
    }
  ]
}`;
}