import * as assert from 'assert';
import { DefaultAIProviderFactory } from '../../planner/providers/factory';
import { GeminiProvider } from '../../planner/providers/gemini';
import { GroqProvider } from '../../planner/providers/groq';
import { OllamaProvider } from '../../planner/providers/ollama';

suite('AIProviderFactory Test Suite', () => {
    test('getInstance returns singleton', () => {
        const factory1 = DefaultAIProviderFactory.getInstance();
        const factory2 = DefaultAIProviderFactory.getInstance();
        assert.strictEqual(factory1, factory2);
    });

    test('createProvider returns GeminiProvider', () => {
        const factory = DefaultAIProviderFactory.getInstance();
        const provider = factory.createProvider('gemini', { apiKey: 'test' });
        assert.ok(provider instanceof GeminiProvider);
        assert.strictEqual(provider.type, 'gemini');
    });

    test('createProvider returns GroqProvider', () => {
        const factory = DefaultAIProviderFactory.getInstance();
        const provider = factory.createProvider('groq', { apiKey: 'test' });
        assert.ok(provider instanceof GroqProvider);
        assert.strictEqual(provider.type, 'groq');
    });

    test('createProvider returns OllamaProvider', () => {
        const factory = DefaultAIProviderFactory.getInstance();
        const provider = factory.createProvider('ollama', { customBaseUrl: 'http://localhost:11434' });
        assert.ok(provider instanceof OllamaProvider);
        assert.strictEqual(provider.type, 'ollama');
    });

    test('createProvider handles mixed case types', () => {
        const factory = DefaultAIProviderFactory.getInstance();
        const provider = factory.createProvider('GEMINI', { apiKey: 'test' });
        assert.ok(provider instanceof GeminiProvider);
    });

    test('createProvider throws on unsupported type', () => {
        const factory = DefaultAIProviderFactory.getInstance();
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            factory.createProvider('invalid' as any, {});
            assert.fail('Should have thrown error');
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            assert.ok(error.name === 'UnsupportedProviderError');
        }
    });
});
