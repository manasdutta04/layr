import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VersionManager } from '../../version-control/VersionManager';
import { ProjectPlan } from '../../planner/interfaces';

suite('VersionManager Test Suite', () => {
    let tempDir: string;
    let versionManager: VersionManager;

    setup(async () => {
        // Create a temp directory for testing
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'layr-test-'));
        versionManager = new VersionManager(tempDir);
    });

    teardown(async () => {
        // Cleanup temp directory
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    const mockPlan: ProjectPlan = {
        title: 'Test Plan',
        overview: 'Overview',
        requirements: [],
        fileStructure: [],
        nextSteps: [],
        generatedAt: new Date(),
        generatedBy: 'ai'
    };

    test('saveVersion creates file on disk', async () => {
        const id = await versionManager.saveVersion(mockPlan, { description: 'Initial save' });
        assert.ok(id, 'Should return an ID');

        const versions = await versionManager.getVersions();
        assert.strictEqual(versions.length, 1);
        assert.strictEqual(versions[0].id, id);
        assert.strictEqual(versions[0].metadata.description, 'Initial save');
    });

    test('getVersions returns simplified list sorted by timestamp', async () => {
        // Create two versions
        const id1 = await versionManager.saveVersion(mockPlan, { description: 'v1' });

        // Wait a bit to ensure timestamp difference (fs resolution might be low)
        await new Promise(r => setTimeout(r, 10));

        const id2 = await versionManager.saveVersion(mockPlan, { description: 'v2' });

        const versions = await versionManager.getVersions();
        assert.strictEqual(versions.length, 2);

        // Should be sorted new to old
        assert.strictEqual(versions[0].id, id2);
        assert.strictEqual(versions[1].id, id1);
    });

    test('cleanupOldVersions removes oldest', async () => {
        // Create 5 versions
        for (let i = 0; i < 5; i++) {
            await versionManager.saveVersion(mockPlan, { description: `v${i}` });
            await new Promise(r => setTimeout(r, 10));
        }

        // Check count
        let versions = await versionManager.getVersions();
        assert.strictEqual(versions.length, 5);

        // Keep only top 2
        await versionManager.cleanupOldVersions(2);

        versions = await versionManager.getVersions();
        assert.strictEqual(versions.length, 2);

        // Should rely contain the last 2 (v3, v4)
        const labels = versions.map(v => v.metadata.description).sort();
        assert.deepStrictEqual(labels, ['v3', 'v4']);
    });

    test('deleteVersion removes file', async () => {
        const id = await versionManager.saveVersion(mockPlan, { description: 'to delete' });
        assert.ok(id);

        let version = await versionManager.getVersion(id as string);
        assert.ok(version);

        const success = await versionManager.deleteVersion(id as string);
        assert.strictEqual(success, true);

        version = await versionManager.getVersion(id as string);
        assert.strictEqual(version, null);
    });
});
