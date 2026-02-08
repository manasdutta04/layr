import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VersionManager } from '../../src/version-control/VersionManager';
import { ProjectPlan } from '../../src/planner/interfaces';

let tempDir: string;
let vm: VersionManager;

const mockPlan: ProjectPlan = {
  title: 'T',
  overview: 'O',
  requirements: [],
  fileStructure: [],
  nextSteps: [],
  generatedAt: new Date(),
  generatedBy: 'ai'
};

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'layr-vm-'));
  vm = new VersionManager(tempDir);
});

afterEach(async () => {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
});

describe('VersionManager integration', () => {
  it('persists versions to filesystem', async () => {
    const id = await vm.saveVersion(mockPlan, { description: 'v1' });
    expect(id).toBeTruthy();
    const files = await fs.promises.readdir(path.join(tempDir, '.layr', 'history'));
    expect(files.some(f => f.endsWith('.json'))).toBe(true);
  });

  it('returns sorted versions by timestamp', async () => {
    const id1 = await vm.saveVersion(mockPlan, { description: 'v1' });
    await new Promise(r => setTimeout(r, 10));
    const id2 = await vm.saveVersion(mockPlan, { description: 'v2' });
    const versions = await vm.getVersions();
    expect(versions[0].id).toEqual(id2);
    expect(versions[1].id).toEqual(id1);
  });

  it('cleans up old versions', async () => {
    for (let i = 0; i < 5; i++) {
      await vm.saveVersion(mockPlan, { description: `v${i}` });
      await new Promise(r => setTimeout(r, 5));
    }
    await vm.cleanupOldVersions(2);
    const versions = await vm.getVersions();
    expect(versions.length).toBe(2);
  });
});
