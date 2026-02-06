import * as assert from 'assert';
import { Planner } from '../../planner/index';
import { AIProvider, AIProviderType, ProjectPlan } from '../../planner/interfaces';

class MockAIProvider implements AIProvider {
    name = 'MockProvider';
    type: AIProviderType = 'groq';

    constructor(private shouldFail: boolean = false, private returnMalformedJson: boolean = false) { }

    async generatePlan(prompt: string, options?: { planSize?: string, planType?: string }): Promise<string> {
        if (this.shouldFail) {
            throw new Error('Mock failure');
        }

        if (this.returnMalformedJson) {
            return 'This is not JSON';
        }

        return JSON.stringify({
            title: 'Mock Project',
            overview: 'Mock Overview',
            requirements: ['Req 1', 'Req 2'],
            fileStructure: [
                { name: 'src', type: 'directory', path: 'src', description: 'Source' }
            ],
            nextSteps: [
                { id: '1', description: 'Step 1', completed: false, priority: 'high' }
            ]
        });
    }

    async refineSection(sectionContent: string, refinementPrompt: string, fullContext: string): Promise<string> {
        return 'Refined content';
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        return true;
    }

    getSupportedModels(): string[] {
        return ['mock-model'];
    }

    async isAvailable(): Promise<boolean> {
        return true;
    }
}

suite('Planner Test Suite', () => {
    test('generatePlan returns a valid ProjectPlan on success', async () => {
        const mockProvider = new MockAIProvider();
        const planner = new Planner(mockProvider);

        const plan = await planner.generatePlan('Test prompt');

        assert.strictEqual(plan.title, 'Mock Project');
        assert.strictEqual(plan.generatedBy, 'ai');
        assert.strictEqual(plan.fileStructure.length, 1);
        assert.strictEqual(plan.fileStructure[0].name, 'src');
    });

    test('generatePlan handles malformed JSON gracefully', async () => {
        const mockProvider = new MockAIProvider(false, true);
        const planner = new Planner(mockProvider);

        const plan = await planner.generatePlan('Test prompt');

        // Planner falls back to a basic plan structure when parsing fails
        assert.strictEqual(plan.title, 'AI Generated Plan');
        assert.strictEqual(plan.requirements[0], 'Review and refine the generated plan');
    });

    test('generatePlan throws error when provider fails', async () => {
        const mockProvider = new MockAIProvider(true);
        const planner = new Planner(mockProvider);

        try {
            await planner.generatePlan('Test prompt');
            assert.fail('Should have thrown an error');
        } catch (error: any) {
            assert.ok(error.message.includes('Mock failure'));
        }
    });

    test('refineSection calls provider', async () => {
        const mockProvider = new MockAIProvider();
        const planner = new Planner(mockProvider);

        const result = await planner.refineSection('content', 'refine', 'context');
        assert.strictEqual(result, 'Refined content');
    });
});
