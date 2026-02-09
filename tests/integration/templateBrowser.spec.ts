import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TemplateManager } from '../../src/templates/templateManager';
import { TemplateBrowser } from '../../src/templates/templateBrowser';
import { ExtensionContext, window, Uri, __test } from 'vscode';

let tempDir: string;
let context: ExtensionContext;
let tm: TemplateManager;
let tb: TemplateBrowser;

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'layr-templates-'));
  context = { globalStorageUri: Uri.file(tempDir), subscriptions: [] } as unknown as ExtensionContext;
  tm = new TemplateManager(context);
  tb = new TemplateBrowser(context, tm);
});

afterEach(async () => {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
});

describe('TemplateBrowser integration', () => {
  it('renders templates grid including saved user template', async () => {
    await tm.saveTemplate('X Template', 'Content', 'Web');
    tb.open();
    const panelHtml = (window as any).createWebviewPanel().webview.html;
    expect(panelHtml).toContain('Available Plans');
  });

  it('applies template and opens document', async () => {
    await tm.saveTemplate('Unique Template', 'ContentValue', 'Web');
    tb.open();
    __test.triggerWebviewMessage({ command: 'useTemplate', id: 'unique-template' });
    const openCalls = __test.getOpenCalls();
    expect(openCalls.length).toBeGreaterThan(0);
    expect(openCalls[0].content).toEqual('ContentValue');
    const showCalls = __test.getShowCalls();
    expect(showCalls.length).toBeGreaterThan(0);
  });
});
