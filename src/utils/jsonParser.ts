import { logger } from './logger';

/**
 * Extract JSON from an AI response that may contain markdown code blocks or extra text.
 * Attempts multiple strategies and repairs common JSON issues.
 */
export function extractAndParseJSON<T = unknown>(text: string): T {
  let jsonText = '';

  // Method 1: Look for JSON between ```json and ``` markers
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
    logger.debug('jsonParser: Found JSON in code block');
  } else {
    // Method 2: Look for JSON between ``` and ``` markers
    const genericCodeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (genericCodeBlockMatch) {
      const potentialJson = genericCodeBlockMatch[1].trim();
      if (potentialJson.startsWith('{') && potentialJson.endsWith('}')) {
        jsonText = potentialJson;
        logger.debug('jsonParser: Found JSON in generic code block');
      }
    }

    if (!jsonText) {
      // Method 3: Look for JSON object starting with { and ending with }
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
        logger.debug('jsonParser: Found JSON object');
      } else {
        // Method 4: Try to parse the entire response as JSON
        try {
          JSON.parse(text.trim());
          jsonText = text.trim();
          logger.debug('jsonParser: Entire response is valid JSON');
        } catch {
          throw new Error('No valid JSON found in response');
        }
      }
    }
  }

  // Try to parse JSON with error handling and repair
  try {
    return JSON.parse(jsonText) as T;
  } catch (parseError) {
    logger.warn('jsonParser: JSON parse error, attempting repair...', parseError);
    return repairAndParseJSON<T>(jsonText);
  }
}

/**
 * Attempt to repair common JSON issues and parse again.
 */
function repairAndParseJSON<T>(jsonText: string): T {
  let repairedJson = jsonText;

  // Fix trailing commas in arrays and objects
  repairedJson = repairedJson.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between array elements
  repairedJson = repairedJson.replace(/}(\s*){/g, '},$1{');
  repairedJson = repairedJson.replace(/](\s*)\[/g, '],$1[');

  // Fix missing quotes around property names
  repairedJson = repairedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  try {
    const result = JSON.parse(repairedJson) as T;
    logger.info('jsonParser: Successfully repaired and parsed JSON');
    return result;
  } catch (repairError) {
    logger.error('jsonParser: Failed to repair JSON:', repairError);
    throw new Error('Failed to parse or repair JSON response');
  }
}