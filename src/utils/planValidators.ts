import { FileStructureItem, PlanStep } from '../planner/interfaces';

/**
 * Validate and normalize an array of raw file structure items from AI response.
 */
export function validateFileStructure(items: unknown[]): FileStructureItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => {
    const typedItem = item as {
      name?: string;
      type?: string;
      path?: string;
      description?: string;
      children?: unknown[];
    };
    return {
      name: typedItem.name || `item-${index}`,
      type: typedItem.type === 'directory' ? 'directory' as const : 'file' as const,
      path: typedItem.path || typedItem.name || `item-${index}`,
      description: typedItem.description || '',
      children: typedItem.children ? validateFileStructure(typedItem.children) : undefined,
    };
  });
}

/**
 * Validate and normalize an array of raw plan steps from AI response.
 */
export function validateNextSteps(steps: unknown[]): PlanStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((step, index) => {
    const typedStep = step as {
      id?: string; description?: string; completed?: boolean;
      priority?: string; estimatedTime?: string; dependencies?: string[];
    };
    const priority = typedStep.priority;
    return {
      id: typedStep.id || `step-${index + 1}`,
      description: typedStep.description || `Step ${index + 1}`,
      completed: Boolean(typedStep.completed),
      priority: (priority === 'high' || priority === 'medium' || priority === 'low') ? priority : 'medium' as const,
      estimatedTime: typedStep.estimatedTime || 'Unknown',
      dependencies: Array.isArray(typedStep.dependencies) ? typedStep.dependencies : [],
    };
  });
}