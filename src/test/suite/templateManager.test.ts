import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { TemplateManager } from '../../templates/templateManager';

suite('TemplateManager Test Suite', () => {
    let tempDir: string;
    let templateManager: TemplateManager;

    setup(async () => {
        // Create a temp directory to simulate global storage
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'layr-templates-'));

        // Mock ExtensionContext
        const mockContext = {
            globalStorageUri: vscode.Uri.file(tempDir),
            subscriptions: []
        } as unknown as vscode.ExtensionContext;

        templateManager = new TemplateManager(mockContext);
    });

    teardown(async () => {
        // Cleanup
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    test('getAllTemplates returns built-in templates', () => {
        const templates = templateManager.getAllTemplates();
        assert.ok(templates.length > 0);

        const reactTemplate = templates.find(t => t.id === 'react-spa');
        assert.ok(reactTemplate, 'Should verify React SPA template exists');
    });

    test('saveTemplate persists to disk', async () => {
        const name = "My Custom Template";
        const content = "Plan content";

        await templateManager.saveTemplate(name, content, 'Web');

        const templates = templateManager.getAllTemplates();
        const custom = templates.find(t => t.name === name);

        assert.ok(custom);
        assert.strictEqual(custom.category, 'Web');
        assert.strictEqual(custom.content, content);
    });

    test('getTemplateById finds strictly', async () => {
        await templateManager.saveTemplate("Unique One", "Content", "Web");
        // ID generation: name.toLowerCase().replace(/\s+/g, '-') -> unique-one

        const template = templateManager.getTemplateById('unique-one');
        assert.ok(template);
        assert.strictEqual(template.name, "Unique One");
    });
});
