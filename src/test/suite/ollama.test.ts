import * as assert from 'assert';
import { OllamaProvider } from '../../planner/providers/ollama';

suite('OllamaProvider Test Suite', () => {
    // Mock fetch function
    const mockFetch = (ok: boolean, jsonResponse: unknown) => {
        return (async (_url: unknown, _init?: unknown) => {
            return {
                ok,
                json: async () => jsonResponse,
                text: async () => JSON.stringify(jsonResponse),
                statusText: ok ? 'OK' : 'Error'
            };
        }) as unknown as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };

    test('isAvailable checks api/tags', async () => {
        const fetcher = mockFetch(true, {});
        const provider = new OllamaProvider('http://localhost', 'llama3', fetcher);

        const available = await provider.isAvailable();
        assert.strictEqual(available, true);
    });

    test('generatePlan parses response correctly', async () => {
        const mockResponse = { response: '{"title": "Test Plan"}' };
        const fetcher = mockFetch(true, mockResponse);
        const provider = new OllamaProvider('http://localhost', 'llama3', fetcher);

        const result = await provider.generatePlan('my prompt');
        assert.strictEqual(result, '{"title": "Test Plan"}');
    });

    test('generatePlan handles errors', async () => {
        const fetcher = mockFetch(false, {});
        const provider = new OllamaProvider('http://localhost', 'llama3', fetcher);

        try {
            await provider.generatePlan('test');
            assert.fail('Should throw error');
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            assert.ok(error.message.includes('Ollama API Error'));
        }
    });
});
