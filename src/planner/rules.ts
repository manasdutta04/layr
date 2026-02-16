import { ProjectPlan, PlanGenerator, RulePlanTemplate, FileStructureItem, PlanStep } from './interfaces';

/**
 * Rule-based plan generator that works offline using predefined templates
 */
export class RuleBasedPlanGenerator implements PlanGenerator {
  private templates: RulePlanTemplate[] = [
    {
      keywords: ['web', 'website', 'frontend', 'react', 'vue', 'angular', 'html', 'css', 'javascript'],
      title: 'Web Application Project',
      overview: 'A modern web application with responsive design and interactive features',
      requirements: [
        'Responsive design for mobile and desktop',
        'Modern JavaScript framework (React/Vue/Angular)',
        'CSS preprocessing (Sass/Less)',
        'Build system (Webpack/Vite)',
        'Testing framework (Jest/Vitest)',
        'Code linting and formatting',
        'Version control with Git'
      ],
      fileStructure: [
        { name: 'src', type: 'directory', path: 'src/', description: 'Source code directory' },
        { name: 'public', type: 'directory', path: 'public/', description: 'Static assets' },
        { name: 'tests', type: 'directory', path: 'tests/', description: 'Test files' },
        { name: 'package.json', type: 'file', path: 'package.json', description: 'Project dependencies' },
        { name: 'README.md', type: 'file', path: 'README.md', description: 'Project documentation' },
        { name: '.gitignore', type: 'file', path: '.gitignore', description: 'Git ignore rules' }
      ],
      nextSteps: [
        { id: 'init', description: 'Initialize project with package manager', completed: false, priority: 'high', estimatedTime: '10 minutes', dependencies: [] },
        { id: 'framework', description: 'Set up chosen framework', completed: false, priority: 'high', estimatedTime: '30 minutes', dependencies: ['init'] },
        { id: 'styling', description: 'Configure CSS preprocessing', completed: false, priority: 'medium', estimatedTime: '20 minutes', dependencies: ['framework'] },
        { id: 'testing', description: 'Set up testing framework', completed: false, priority: 'medium', estimatedTime: '25 minutes', dependencies: ['framework'] },
        { id: 'build', description: 'Configure build system', completed: false, priority: 'high', estimatedTime: '40 minutes', dependencies: ['framework'] },
        { id: 'deploy', description: 'Set up deployment pipeline', completed: false, priority: 'low', estimatedTime: '60 minutes', dependencies: ['build'] }
      ]
    },
    {
      keywords: ['api', 'backend', 'server', 'node', 'express', 'fastapi', 'django', 'rest', 'graphql'],
      title: 'Backend API Project',
      overview: 'A robust backend API with authentication, database integration, and comprehensive documentation',
      requirements: [
        'RESTful API design',
        'Database integration (SQL/NoSQL)',
        'Authentication and authorization',
        'Input validation and sanitization',
        'Error handling and logging',
        'API documentation (OpenAPI/Swagger)',
        'Unit and integration testing',
        'Environment configuration'
      ],
      fileStructure: [
        { name: 'src', type: 'directory', path: 'src/', description: 'Source code directory' },
        { name: 'tests', type: 'directory', path: 'tests/', description: 'Test files' },
        { name: 'docs', type: 'directory', path: 'docs/', description: 'API documentation' },
        { name: 'config', type: 'directory', path: 'config/', description: 'Configuration files' },
        { name: 'package.json', type: 'file', path: 'package.json', description: 'Project dependencies' },
        { name: '.env.example', type: 'file', path: '.env.example', description: 'Environment variables template' },
        { name: 'README.md', type: 'file', path: 'README.md', description: 'Project documentation' }
      ],
      nextSteps: [
        { id: 'setup', description: 'Initialize project and install dependencies', completed: false, priority: 'high', estimatedTime: '15 minutes', dependencies: [] },
        { id: 'server', description: 'Set up basic server structure', completed: false, priority: 'high', estimatedTime: '30 minutes', dependencies: ['setup'] },
        { id: 'database', description: 'Configure database connection', completed: false, priority: 'high', estimatedTime: '45 minutes', dependencies: ['server'] },
        { id: 'auth', description: 'Implement authentication system', completed: false, priority: 'high', estimatedTime: '90 minutes', dependencies: ['database'] },
        { id: 'endpoints', description: 'Create API endpoints', completed: false, priority: 'medium', estimatedTime: '120 minutes', dependencies: ['auth'] },
        { id: 'testing', description: 'Write comprehensive tests', completed: false, priority: 'medium', estimatedTime: '60 minutes', dependencies: ['endpoints'] },
        { id: 'docs', description: 'Generate API documentation', completed: false, priority: 'low', estimatedTime: '30 minutes', dependencies: ['endpoints'] }
      ]
    },
    {
      keywords: ['mobile', 'app', 'react native', 'flutter', 'ios', 'android', 'native'],
      title: 'Mobile Application Project',
      overview: 'A cross-platform mobile application with native performance and modern UI/UX',
      requirements: [
        'Cross-platform compatibility (iOS/Android)',
        'Native performance optimization',
        'Responsive UI for different screen sizes',
        'Offline functionality and data sync',
        'Push notifications',
        'App store deployment preparation',
        'Testing on real devices'
      ],
      fileStructure: [
        { name: 'src', type: 'directory', path: 'src/', description: 'Source code directory' },
        { name: 'assets', type: 'directory', path: 'assets/', description: 'Images, fonts, and other assets' },
        { name: 'tests', type: 'directory', path: 'tests/', description: 'Test files' },
        { name: 'android', type: 'directory', path: 'android/', description: 'Android-specific code' },
        { name: 'ios', type: 'directory', path: 'ios/', description: 'iOS-specific code' },
        { name: 'package.json', type: 'file', path: 'package.json', description: 'Project dependencies' },
        { name: 'app.json', type: 'file', path: 'app.json', description: 'App configuration' }
      ],
      nextSteps: [
        { id: 'init', description: 'Initialize mobile project', completed: false, priority: 'high', estimatedTime: '20 minutes', dependencies: [] },
        { id: 'navigation', description: 'Set up navigation structure', completed: false, priority: 'high', estimatedTime: '45 minutes', dependencies: ['init'] },
        { id: 'ui', description: 'Create UI components and screens', completed: false, priority: 'medium', estimatedTime: '180 minutes', dependencies: ['navigation'] },
        { id: 'state', description: 'Implement state management', completed: false, priority: 'medium', estimatedTime: '60 minutes', dependencies: ['ui'] },
        { id: 'api', description: 'Integrate with backend APIs', completed: false, priority: 'medium', estimatedTime: '90 minutes', dependencies: ['state'] },
        { id: 'testing', description: 'Test on multiple devices', completed: false, priority: 'high', estimatedTime: '120 minutes', dependencies: ['api'] },
        { id: 'deploy', description: 'Prepare for app store submission', completed: false, priority: 'low', estimatedTime: '180 minutes', dependencies: ['testing'] }
      ]
    }
  ];

  async isAvailable(): Promise<boolean> {
    return true; // Rule-based generator is always available
  }

  async generatePlan(prompt: string): Promise<ProjectPlan> {
    const normalizedPrompt = prompt.toLowerCase();
    
    // Find the best matching template based on keywords
    let bestTemplate = this.templates[0]; // Default to web app
    let maxMatches = 0;

    for (const template of this.templates) {
      const matches = template.keywords.filter(keyword => 
        normalizedPrompt.includes(keyword)
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestTemplate = template;
      }
    }

    // Customize the template based on the prompt
    const customizedTitle = this.customizeTitle(bestTemplate.title, prompt);
    const customizedOverview = this.customizeOverview(bestTemplate.overview, prompt);

    return {
      title: customizedTitle,
      overview: customizedOverview,
      requirements: [...bestTemplate.requirements],
      fileStructure: this.deepCloneFileStructure(bestTemplate.fileStructure),
      nextSteps: this.deepCloneNextSteps(bestTemplate.nextSteps),
      generatedAt: new Date(),
      generatedBy: 'rules'
    };
  }

  private customizeTitle(baseTitle: string, prompt: string): string {
    // Extract potential project name from prompt
    const words = prompt.split(' ').filter(word => word.length > 2);
    const projectName = words.slice(0, 3).join(' ');
    
    if (projectName.length > 0) {
      return `${projectName} - ${baseTitle}`;
    }
    
    return baseTitle;
  }

  private customizeOverview(baseOverview: string, prompt: string): string {
    return `${baseOverview}. This plan was generated based on your request: "${prompt}"`;
  }

  private deepCloneFileStructure(items: FileStructureItem[]): FileStructureItem[] {
    return items.map(item => ({
      ...item,
      children: item.children ? this.deepCloneFileStructure(item.children) : undefined
    }));
  }

  private deepCloneNextSteps(steps: PlanStep[]): PlanStep[] {
    return steps.map(step => ({
      ...step,
      dependencies: [...(step.dependencies || [])]
    }));
  }
}