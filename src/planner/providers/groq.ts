import { AIProvider, AIProviderType } from '../interfaces';
import fetch from 'node-fetch';
import { logger } from '../../utils/logger';
import { AIProviderError } from '../../utils/errors';

/**
 * Groq AI Provider (via Secure Proxy)
 * Uses a secure backend proxy to keep API keys safe
 * Zero configuration needed for users!
 */
export class GroqProvider implements AIProvider {
  readonly name = 'Groq';
  readonly type: AIProviderType = 'groq';
  private model: string;
  private proxyURL: string;
  private useProxy: boolean;

  private fetcher: typeof fetch;

  constructor(config: { apiKey?: string; model?: string; baseURL?: string }, fetcher?: typeof fetch) {
    this.model = config.model || 'llama-3.3-70b-versatile';

    // Secure proxy endpoint - keeps API key safe on server
    this.proxyURL = process.env.LAYR_PROXY_URL || 'https://layr-api.vercel.app/api/chat';

    // Use proxy if URL is configured, otherwise this will fail gracefully
    this.useProxy = this.proxyURL !== 'YOUR_VERCEL_URL_HERE';
    this.fetcher = fetcher || fetch;
  }

  async generatePlan(prompt: string, options?: { planSize?: string, planType?: string }): Promise<string> {
    if (!this.useProxy) {
      throw new AIProviderError(
        'Layr AI backend proxy is not configured. ' +
        'The extension author needs to deploy the API. ' +
        'For documentation, visit: https://github.com/manasdutta04/layr#setup',
        this.name
      );
    }

    try {
      logger.info(`GroqProvider: Generating plan for project type: ${options?.planType || 'SaaS'} (Size: ${options?.planSize || 'Normal'})`);
      // Extract settings from options
      const planSize = options?.planSize || 'Normal';
      const planType = options?.planType || 'SaaS';

      // Build size-specific instructions
      let sizeInstructions = '';
      let maxTokens = 5000;

      if (planSize === 'Concise') {
        maxTokens = 2500;
        sizeInstructions = `
CRITICAL SIZE CONSTRAINTS - MUST FOLLOW:
- Total output: 80-100 lines maximum
- Overview: 1 short paragraph only (3-4 sentences)
- Requirements: List 3-4 items per category maximum
- Technology Stack: List only essential tools (2-3 per section)
- Implementation: 2-3 phases maximum
- File Structure: Show only top-level structure
- Keep descriptions brief - single sentences only
- NO detailed explanations - be concise and direct`;
      } else if (planSize === 'Normal') {
        maxTokens = 5000;
        sizeInstructions = `
SIZE CONSTRAINTS:
- Total output: 180-240 lines
- Overview: 2-3 paragraphs
- Requirements: 5-8 items per category
- Technology Stack: Balanced coverage
- Implementation: 4-6 phases
- File Structure: Full structure with key directories
- Provide clear but concise explanations`;
      } else { // Descriptive
        maxTokens = 8000;
        sizeInstructions = `
SIZE SPECIFICATIONS:
- Total output: 300+ lines
- Overview: 4-5 detailed paragraphs
- Requirements: 10-15 items per category with thorough explanations
- Technology Stack: Comprehensive coverage with rationale
- Implementation: 8-12 phases with detailed steps
- File Structure: Complete structure with all subdirectories
- Provide extensive explanations and examples`;
      }

      // Build type-specific instructions
      let typeInstructions = '';

      if (planType === 'Hobby') {
        typeInstructions = `
PROJECT TYPE: HOBBY/LEARNING PROJECT
CRITICAL - This is a SIMPLE LEARNING PROJECT:
- Focus on basic functionality only - NO complex enterprise features
- Use simple, single-file architecture where possible
- Database: SQLite or JSON files (NO PostgreSQL, MongoDB, etc.)
- Deployment: Simple services only (Vercel, Netlify, GitHub Pages)
- Authentication: Basic email/password only (NO OAuth, SSO, etc.)
- NO CI/CD pipelines, NO microservices, NO load balancers
- NO monitoring, logging infrastructure, or complex DevOps
- Skip: Testing frameworks, linters, formatters (keep it simple)
- Focus: Learning, experimentation, quick setup
- Phases: 2-3 maximum, each 1-2 weeks
- Tech Stack: Minimal - use frameworks' defaults`;
      } else if (planType === 'SaaS') {
        typeInstructions = `
PROJECT TYPE: SOFTWARE AS A SERVICE
MUST INCLUDE:
- Multi-tenant architecture with data isolation
- User authentication with roles and permissions
- Subscription/billing integration (Stripe recommended)
- RESTful or GraphQL API design
- Cloud deployment (AWS/GCP/Azure)
- Scalable database design
- Email service integration
- Analytics and monitoring
- CI/CD pipeline
- Phases: 6-8, production-ready focus`;
      } else if (planType === 'Production') {
        typeInstructions = `
PROJECT TYPE: PRODUCTION-READY APPLICATION
MUST INCLUDE:
- Comprehensive error handling and logging
- Full test coverage (unit, integration, e2e)
- CI/CD pipeline with automated deployment
- Monitoring and alerting setup
- Security best practices (HTTPS, CSP, etc.)
- Performance optimization
- Database migrations and backups
- Documentation for deployment and maintenance
- Phases: 6-10, focus on reliability`;
      } else if (planType === 'Enterprise') {
        typeInstructions = `
PROJECT TYPE: ENTERPRISE APPLICATION
MUST INCLUDE:
- Microservices architecture
- Enterprise authentication (SSO, LDAP, SAML)
- Compliance requirements (GDPR, HIPAA, etc.)
- Audit logging and security monitoring
- API gateway and service mesh
- Container orchestration (Kubernetes)
- High availability and disaster recovery
- Integration with enterprise systems
- Extensive documentation and governance
- Phases: 10-12, enterprise-grade quality`;
      } else if (planType === 'Prototype') {
        typeInstructions = `
PROJECT TYPE: RAPID PROTOTYPE
FOCUS ON:
- Minimal viable features only
- Quick setup and deployment
- Simple architecture for easy iteration
- Mock services instead of full implementation
- Basic UI with placeholder content
- Hardcoded data acceptable for demo
- Skip testing, CI/CD, monitoring
- Use no-code/low-code tools where possible
- Phases: 1-2, 1-2 weeks total`;
      } else { // Open Source
        typeInstructions = `
PROJECT TYPE: OPEN SOURCE PROJECT
MUST INCLUDE:
- Clear contribution guidelines
- Code of conduct
- License selection
- Documentation for contributors
- Issue templates and PR guidelines
- Community engagement strategy
- Public roadmap
- Welcoming README for newcomers
- Phases: Include community building`;
      }

      const systemPrompt = `You are an expert software architect and project planner for Layr AI.

${sizeInstructions}

${typeInstructions}

Generate a project plan following this structure. START YOUR RESPONSE WITH THE WATERMARK ON THE FIRST LINE:

*Generated by Layr on ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}*

---

# Project Title
[Clear, compelling, professional title]

## Overview
${planSize === 'Concise' ? 'Write 1 short paragraph (3-4 sentences) covering:' : planSize === 'Normal' ? 'Write 2 paragraphs covering:' : 'Write 3-4 detailed paragraphs covering:'}
- The purpose and value proposition of the project
- Target users and use cases
- Key features and functionality
- Expected benefits and outcomes
- Technical approach and architecture philosophy

## Requirements

### Functional Requirements
${planSize === 'Concise' ? '- [List 3-5 functional requirements with brief descriptions]' : planSize === 'Normal' ? '- [List 6-8 functional requirements with clear descriptions]' : '- [List 10-15 comprehensive functional requirements with detailed explanations]'}

### Technical Requirements
${planSize === 'Concise' ? '- [List 2-4 technical requirements]' : planSize === 'Normal' ? '- [List 4-6 technical requirements with rationale]' : '- [List 8-12 comprehensive technical requirements with detailed rationale]'}

### Non-Functional Requirements
${planSize === 'Concise' ? '- [List 2-3 non-functional requirements]' : planSize === 'Normal' ? '- Performance, Security, Scalability [4-5 items]' : '- Performance: [Specific performance targets]\n- Security: [Security considerations and measures]\n- Scalability: [Scalability requirements]\n- Accessibility: [Accessibility standards]\n- [List 6-8 non-functional requirements]'}

## Technology Stack

### Frontend
${planSize === 'Concise' ? '- [Primary framework with version]\n- [2-3 key libraries]' : planSize === 'Normal' ? '- [Primary framework/library with version]\n- [State management solution]\n- [UI library]\n- [4-5 frontend tools]' : '- [Primary framework/library with version and rationale]\n- [State management solution with explanation]\n- [UI component library with justification]\n- [6-8 additional frontend tools with reasoning]'}

### Backend (if applicable)
${planSize === 'Concise' ? '- [Server framework]\n- [Database]' : planSize === 'Normal' ? '- [Server framework with version]\n- [Database]\n- [Authentication]\n- [API design]' : '- [Server framework with version and rationale]\n- [Database with detailed justification]\n- [Authentication approach with security considerations]\n- [API design pattern with reasoning]'}

### DevOps & Tools
${planSize === 'Concise' ? '- [Version control, CI/CD, Testing - 2-3 items]' : planSize === 'Normal' ? '- [Version control, CI/CD, Testing, Deployment - 4-5 items]' : '- [Version control strategy]\n- [CI/CD pipeline tools]\n- [Testing frameworks]\n- [Code quality tools]\n- [Deployment platform]\n- [Monitoring and logging]'}

## Architecture

### System Architecture
${planSize === 'Concise' ? '[Brief 2-3 sentence description of architecture pattern and component interaction]' : planSize === 'Normal' ? '[1 paragraph description of system architecture including component breakdown and data flow]' : '[Detailed description of the overall system architecture, including:\n- High-level component breakdown\n- Data flow description\n- Integration points\n- Architecture patterns used (MVC, microservices, etc.)]'}

### Key Components
${planSize === 'Concise' ? '1. [Component]: [Brief description]\n2. [Component]: [Brief description]\n3. [Component]: [Brief description]\n[List 3-4 components]' : planSize === 'Normal' ? '1. **[Component]**: [Description of purpose and responsibilities]\n2. **[Component]**: [Description of purpose and responsibilities]\n[List 4-6 components with explanations]' : '1. **[Component Name]**: [Detailed description of purpose, responsibilities, and interactions]\n2. **[Component Name]**: [Detailed description of purpose, responsibilities, and interactions]\n[List 6-10 key components with comprehensive explanations]'}

## File Structure
${planSize === 'Concise' ?
          `\`\`\`
project-root/
├── src/
│   ├── components/      # UI components
│   ├── pages/          # Pages/routes
│   ├── utils/          # Utilities
│   └── index.js        # Entry point
├── public/             # Static files
├── package.json
└── README.md
\`\`\`` :
          planSize === 'Normal' ?
            `\`\`\`
project-root/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Shared components
│   │   └── features/       # Feature components
│   ├── pages/              # Page components/routes
│   ├── services/           # API services
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom hooks
│   ├── types/              # Type definitions
│   └── index.tsx           # Entry point
├── tests/                  # Test files
├── public/                 # Static files
├── docs/                   # Documentation
├── package.json
├── tsconfig.json
└── README.md
\`\`\`` :
            `\`\`\`
project-root/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Common/shared components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── features/       # Feature-specific components
│   │   │   └── [feature-components]
│   │   └── layout/         # Layout components
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── Sidebar.tsx
│   ├── pages/              # Page components/routes
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   └── [other-pages]
│   ├── services/           # API services and business logic
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── [other-services]
│   ├── utils/              # Utility functions
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── hooks/              # Custom hooks
│   │   └── [custom-hooks]
│   ├── context/            # Context providers
│   │   └── [context-files]
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/             # Global styles and themes
│   │   ├── globals.css
│   │   └── theme.ts
│   ├── assets/             # Static assets
│   │   ├── images/
│   │   └── icons/
│   └── index.tsx           # Application entry point
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── public/                 # Public static files
│   ├── index.html
│   └── favicon.ico
├── docs/                   # Documentation
│   ├── API.md
│   └── SETUP.md
├── .github/                # GitHub-specific files
│   └── workflows/         # CI/CD workflows
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── .env.example
├── .gitignore
└── README.md
\`\`\``}

## Implementation Phases

${planSize === 'Concise' && (planType === 'Hobby' || planType === 'Prototype') ?
          `### Phase 1: Setup & Core (Week 1)
- [ ] Set up project structure and dependencies
- [ ] Build basic UI components
- [ ] Implement core functionality
**Deliverables:** Working MVP

### Phase 2: Polish & Deploy (Week 2)
- [ ] Add remaining features
- [ ] Basic testing
- [ ] Deploy
**Deliverables:** Deployed application` :

          planSize === 'Concise' ?
            `### Phase 1: Foundation (Weeks 1-2)
- [ ] Project setup and infrastructure
- [ ] Core components and routing
**Deliverables:** Basic structure

### Phase 2: Feature Development (Weeks 3-4)
- [ ] Implement main features
- [ ] Add authentication (if needed)
**Deliverables:** Functional features

### Phase 3: Testing & Deployment (Week 5)
- [ ] Testing and bug fixes
- [ ] Deploy to production
**Deliverables:** Live application` :

            planSize === 'Normal' ?
              `### Phase 1: Project Setup & Foundation (Week 1)
**Objectives:** Establish development environment
- [ ] Initialize repository and development environment
- [ ] Set up project structure
- [ ] Install and configure core dependencies
- [ ] Set up linting and formatting tools
**Deliverables:** Working development environment

### Phase 2: Core Infrastructure (Week 2)
**Objectives:** Build foundational components
- [ ] Implement routing structure
- [ ] Create reusable common components
- [ ] Set up state management
- [ ] Implement API service layer
**Deliverables:** Core infrastructure ready

### Phase 3: Feature Development (Weeks 3-4)
**Objectives:** Implement main features
- [ ] Develop primary features with CRUD operations
- [ ] Add data validation and error handling
- [ ] Implement responsive design
- [ ] Integrate with backend APIs
**Deliverables:** Fully functional features

### Phase 4: Testing & Deployment (Week 5-6)
**Objectives:** Quality assurance and launch
- [ ] Write unit and integration tests
- [ ] Fix bugs and perform code review
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production
**Deliverables:** Deployed, tested application` :

              `### Phase 1: Project Setup & Foundation (Week 1)
**Objectives:** Establish development environment and basic project structure
- [ ] Initialize project repository and set up version control
- [ ] Configure development environment (Node.js, package manager, etc.)
- [ ] Set up project structure with all necessary folders
- [ ] Install and configure core dependencies
- [ ] Set up linting and code formatting tools
- [ ] Create basic README with project overview
- [ ] Configure TypeScript/Babel if applicable
**Deliverables:** Working development environment, initialized project structure

### Phase 2: Core Infrastructure (Week 2)
**Objectives:** Build foundational components and services
- [ ] Implement basic routing structure
- [ ] Create reusable common components
- [ ] Set up state management solution
- [ ] Implement API service layer
- [ ] Configure authentication mechanism (if applicable)
- [ ] Set up error handling and logging
- [ ] Implement basic layout components
**Deliverables:** Core infrastructure components ready for feature development

### Phase 3: Feature Development (Weeks 3-5)
**Objectives:** Implement main application features
- [ ] Develop [Feature 1] with full CRUD operations
- [ ] Implement [Feature 2] with business logic
- [ ] Create [Feature 3] with user interactions
- [ ] Add data validation and error handling for each feature
- [ ] Implement responsive design for all features
- [ ] Add loading states and user feedback mechanisms
- [ ] Integrate with backend APIs (if applicable)
**Deliverables:** Fully functional features with complete user flows

### Phase 4: Testing & Quality Assurance (Week 6)
**Objectives:** Ensure code quality and reliability
- [ ] Write unit tests for all components (target: 80%+ coverage)
- [ ] Implement integration tests for key user flows
- [ ] Set up end-to-end testing suite
- [ ] Perform cross-browser testing
- [ ] Conduct responsive design testing on multiple devices
- [ ] Fix identified bugs and issues
- [ ] Code review and refactoring
**Deliverables:** Well-tested, production-ready codebase

### Phase 5: Polish & Optimization (Week 7)
**Objectives:** Optimize performance and enhance UX
- [ ] Optimize bundle size and loading performance
- [ ] Implement code splitting and lazy loading
- [ ] Add animations and transitions
- [ ] Optimize images and assets
- [ ] Implement caching strategies
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Performance testing and optimization
**Deliverables:** Optimized, polished application

### Phase 6: Documentation & Deployment (Week 8)
**Objectives:** Prepare for production launch
- [ ] Write comprehensive API documentation
- [ ] Create user guide and tutorials
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Implement monitoring and analytics
- [ ] Perform security audit
- [ ] Deploy to production
- [ ] Set up error tracking and logging
**Deliverables:** Deployed application with complete documentation`}

## Next Steps

### Immediate Actions (Start Today)
1. � **Set up development environment** (2 hours)
   - Install Node.js (v18+ recommended) and npm/yarn
   - Install preferred code editor (VS Code recommended)
   - Set up Git and create repository
   - *Depends on: None*

2. 🔴 **Initialize project structure** (1-2 hours)
   - Run project initialization command (create-react-app, vite, etc.)
   - Set up folder structure as outlined above
   - Install core dependencies
   - *Depends on: Development environment setup*

3. � **Configure development tools** (1-2 hours)
   - Set up ESLint and Prettier
   - Configure TypeScript (if applicable)
   - Add Git hooks with Husky
   - Create .env.example file
   - *Depends on: Project initialization*

### Week 1 Priorities
4. 🟡 **Create basic layout components** (4-6 hours)
   - Design and implement Header component
   - Design and implement Footer component
   - Create basic routing structure
   - *Depends on: Project structure and tools configuration*

5. 🟡 **Set up state management** (3-4 hours)
   - Choose and install state management library
   - Create store structure
   - Implement basic state slices
   - *Depends on: Project initialization*

6. 🟡 **Implement authentication flow** (6-8 hours)
   - Create login/signup components
   - Implement authentication service
   - Add protected route logic
   - Set up session management
   - *Depends on: State management and routing*

### Week 2 Priorities
7. 🟡 **Build core UI components** (8-10 hours)
   - Create reusable Button component with variants
   - Implement Input/Form components with validation
   - Build Modal/Dialog component
   - Create Loading and Error state components
   - *Depends on: Basic layout components*

8. 🟢 **Set up API integration layer** (4-6 hours)
   - Create API service with Axios/Fetch
   - Implement request/response interceptors
   - Add error handling middleware
   - *Depends on: Project structure*

9. 🟢 **Write initial documentation** (2-3 hours)
   - Update README with project info
   - Document component usage
   - Create setup instructions
   - *Depends on: Project initialization*

### Ongoing Tasks
10. 🟢 **Set up testing infrastructure** (4-6 hours)
    - Install testing libraries (Jest, React Testing Library)
    - Configure test environment
    - Write example tests
    - Set up test coverage reporting
    - *Depends on: Project initialization*

11. 🟢 **Implement CI/CD pipeline** (3-4 hours)
    - Create GitHub Actions workflow
    - Set up automated testing
    - Configure deployment pipeline
    - *Depends on: Project repository and testing setup*

## Testing Strategy

${planSize === 'Concise' || planType === 'Hobby' || planType === 'Prototype' ?
          `- Basic unit tests for core functions
- Manual testing of main features
- Target: Working functionality` :
          planSize === 'Normal' ?
            `### Unit Testing
- Test utility functions and components
- Use Jest/React Testing Library
- Target: 70%+ coverage

### Integration Testing
- Test component interactions
- Verify API integration
- Cover critical user paths

### E2E Testing
- Test complete workflows with Cypress/Playwright
- Verify cross-browser compatibility` :
            `### Unit Testing
- Test all utility functions with 100% coverage
- Test React components with React Testing Library
- Mock external dependencies and API calls
- Target: 85%+ code coverage

### Integration Testing
- Test component interactions and data flow
- Verify API integration works correctly
- Test state management with multiple components
- Target: All critical user paths covered

### End-to-End Testing
- Use Playwright or Cypress for E2E tests
- Test complete user workflows
- Verify cross-browser compatibility
- Test responsive behavior on different screen sizes`}

## Deployment Strategy

${planSize === 'Concise' || planType === 'Hobby' || planType === 'Prototype' ?
          `- Deploy to Vercel/Netlify or similar free hosting
- Simple push-to-deploy workflow
- Monitor basic errors with free tools` :
          planSize === 'Normal' ?
            `### Development Environment
- Continuous deployment on merges
- Used for testing and QA

### Production Environment
- Deploy via CI/CD pipeline
- Monitor with error tracking
- Automated rollback on failures` :
            `### Development Environment
- Continuous deployment on feature branch merges
- Accessible at: [dev-url]
- Used for testing and QA

### Staging Environment
- Mirrors production configuration
- Final testing before production release
- Accessible at: [staging-url]

### Production Environment
- Deploy via CI/CD pipeline
- Automated rollback on deployment failures
- Monitor with error tracking (Sentry, etc.)
- Accessible at: [production-url]`}

## Maintenance & Future Enhancements

${planSize === 'Concise' || planType === 'Hobby' || planType === 'Prototype' ?
          `- Fix bugs as they arise
- Update dependencies quarterly
- Consider future enhancements based on feedback` :
          planSize === 'Normal' ?
            `### Regular Maintenance
- Monthly dependency updates
- Bug fixes and minor improvements
- Performance monitoring

### Future Enhancements
- [2-3 future feature ideas]
- [Integration opportunities]
- [Scalability improvements]` :
            `### Regular Maintenance
- Weekly dependency updates
- Monthly security audits
- Performance monitoring and optimization
- Bug fixes and minor improvements

### Future Feature Ideas
- [Future enhancement 1 with description]
- [Future enhancement 2 with description]
- [Future enhancement 3 with description]
- [Integration with external services]
- [Advanced features based on user feedback]`}

CRITICAL REMINDER: Your response MUST be ${planSize === 'Concise' ? 'EXACTLY 80-100 lines' : planSize === 'Normal' ? 'EXACTLY 180-240 lines' : '300+ lines'}. Count your lines and STOP when you reach the limit.`;

      // Call the secure proxy endpoint instead of Groq directly
      const response = await this.fetcher(this.proxyURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: {
            systemPrompt: systemPrompt,
            userPrompt: prompt
          },
          model: this.model,
          maxTokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('GroqProvider: Proxy API Error:', errorText);
        
        let userMsg = `API request failed (${response.status}): ${errorText}`;

        // Provide generic guidance for common HTTP errors
        if (response.status === 401 || response.status === 403) {
          userMsg = `Authentication failed (${response.status}). Please verify your configuration.`;
        } else if (response.status === 429) {
          userMsg = `Rate limit exceeded (${response.status}). Please wait a moment and try again.`;
        } else if (response.status === 500 || response.status === 502 || response.status === 503) {
          userMsg = `Service temporarily unavailable (${response.status}). Please try again in a few minutes.`;
        } else if (response.status === 408 || response.status === 504) {
          userMsg = `Request timeout (${response.status}). Try again with a simpler project description.`;
        } else if (response.status >= 400 && response.status < 500) {
          userMsg = `Request error (${response.status}): ${errorText}. Check your configuration at: https://github.com/manasdutta04/layr#setup`;
        }
        
        throw new AIProviderError(userMsg, this.name);
      }

      const data = await response.json() as { content?: string };
      const content = data.content || '';

      if (!content) {
        throw new AIProviderError('AI service returned an empty response. This might indicate a temporary service issue. Please try again.', this.name);
      }

      logger.debug('GroqProvider: Successfully generated plan');
      return content;
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('GroqProvider: Unexpected error:', error);
      let userMsg = `Failed to generate plan: ${errorMsg}`;

      // Provide generic guidance for network errors
      if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
        userMsg = 'Network connection error. Check your internet connection and firewall settings.';
      } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ETIMEDOUT')) {
        userMsg = 'Cannot reach the service. Check your internet connection or try again in a few moments.';
      } else if (errorMsg.includes('JSON')) {
        userMsg = 'Invalid response format received. This is likely a temporary issue. Please try again shortly.';
      }
      
      throw new AIProviderError(userMsg, this.name);
    }
  }

  async refineSection(sectionContent: string, refinementPrompt: string, fullContext: string): Promise<string> {
    // Basic input sanitization - limit length to prevent abuse
    const maxSectionLength = 50000;
    const maxPromptLength = 2000;
    const sanitizedSection = sectionContent.substring(0, maxSectionLength);
    const sanitizedPrompt = refinementPrompt.substring(0, maxPromptLength);
    const sanitizedContext = fullContext.substring(0, maxSectionLength);

    if (!this.useProxy) {
      throw new AIProviderError('Layr AI backend proxy is not configured.', this.name);
    }

    try {
      logger.info('GroqProvider: Refining section...');
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

      const response = await this.fetcher(this.proxyURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: {
            systemPrompt: systemPrompt,
            userPrompt: refinementPrompt
          },
          model: this.model,
          maxTokens: 4000
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AIProviderError(`API request failed with status ${response.status}: ${errorText}`, this.name);
      }

      const data = await response.json() as { content?: string };
      logger.debug('GroqProvider: Section refined successfully');
      return data.content || '';
    } catch (error) {
      logger.error('GroqProvider.refineSection error:', error);
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new AIProviderError(error instanceof Error ? error.message : String(error), this.name);
    }
  }

  async validateApiKey(_apiKey: string): Promise<boolean> {
    // With proxy, we don't validate keys client-side
    // Just check if proxy is configured
    return this.useProxy;
  }

  getSupportedModels(): string[] {
    return [
      'llama-3.3-70b-versatile',      // Fast, versatile, recommended
      'llama-3.1-70b-versatile',      // Fast and versatile
      'llama-3.1-8b-instant',         // Ultra fast, good for simple tasks
      'mixtral-8x7b-32768',           // Good for long context
      'gemma2-9b-it',                 // Efficient instruction following
    ];
  }

  async isAvailable(): Promise<boolean> {
    return this.useProxy;
  }
}
