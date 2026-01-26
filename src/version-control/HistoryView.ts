
import * as vscode from 'vscode';
import { VersionManager, PlanVersion } from './VersionManager';
import { PlanDiffProvider } from './diffProvider';
import { planner } from '../planner';

export class HistoryView {
    public static currentPanel: HistoryView | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private versionManager: VersionManager) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'compare':
                        this._compareVersions(message.v1, message.v2);
                        return;
                    case 'restore':
                        this._restoreVersion(message.versionId);
                        return;
                    case 'compareWithCurrent':
                        this._compareWithCurrent(message.versionId);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, versionManager: VersionManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (HistoryView.currentPanel) {
            HistoryView.currentPanel._panel.reveal(column);
            HistoryView.currentPanel._update(); // Refresh content
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'layrPlanHistory',
            'Layr Plan History',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'assets')]
            }
        );

        HistoryView.currentPanel = new HistoryView(panel, extensionUri, versionManager);
    }

    public dispose() {
        HistoryView.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update() {
        const versions = await this.versionManager.getVersions();
        this._panel.webview.html = this._getHtmlForWebview(versions);
    }

    private async _compareVersions(id1: string, id2: string) {
        // v2 is new, v1 is old.
        // Left: v2 (older?), Right: v1 (newer?) -- usually Diff is Left (Old) -> Right (New)
        // If the user selects two, we assume they want to compare them.

        // Let's assume id1 and id2 are sorted or the user order matters.
        // Ideally the UI sends Old, New.

        const uri1 = vscode.Uri.parse(`${PlanDiffProvider.scheme}:/${id1}/plan.md`);
        const uri2 = vscode.Uri.parse(`${PlanDiffProvider.scheme}:/${id2}/plan.md`);

        const title = `Diff: ${shortId(id1)} ↔ ${shortId(id2)}`;

        await vscode.commands.executeCommand('vscode.diff', uri1, uri2, title);
    }

    private async _compareWithCurrent(id: string) {
        // Compare selected version with current active editor content? 
        // Or re-generate current plan markdown?
        // Since we don't know if the current editor has the "Current" plan, 
        // we might need to assume the "Latest" version in history is current OR 
        // if we have a robust way to know 'Current Plan' state in memory.

        // For now, let's compare with the LATEST stored version if we treated it as current,
        // OR better: if the user has an open file, compare against it.
        // But user wants "compare previous versions".

        // Use case: Compare historical version (Left) vs Current Active Editor (Right)
        // Only works if active editor is a markdown file?

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor to compare with.');
            return;
        }

        const uri1 = vscode.Uri.parse(`${PlanDiffProvider.scheme}:/${id}/plan.md`);
        const title = `Diff: ${shortId(id)} ↔ Current File`;

        await vscode.commands.executeCommand('vscode.diff', uri1, editor.document.uri, title);
    }

    private async _restoreVersion(id: string) {
        const version = await this.versionManager.getVersion(id);
        if (!version) return;

        // Restore means putting it into a new editor or replacing current?
        // Let's open a new untitled file with the content for safety
        const content = planner.planToMarkdown(version.plan);
        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Version ${shortId(id)} content opened in new editor.`);
    }

    private _getHtmlForWebview(versions: PlanVersion[]) {
        // Simple HTML list
        const rows = versions.map(v => {
            const date = new Date(v.timestamp).toLocaleString();
            return `
            <div class="version-item">
                <div class="version-header">
                    <span class="version-id">#${shortId(v.id)}</span>
                    <span class="version-date">${date}</span>
                </div>
                <div class="version-meta">
                    <strong>${v.metadata.description}</strong><br/>
                    <small>Model: ${v.metadata.model || 'N/A'}</small>
                </div>
                <div class="version-actions">
                     <button onclick="compareWithCurrent('${v.id}')" title="Compare with active file">Diff with Active</button>
                     <button onclick="restore('${v.id}')" title="Restore content">Restore</button>
                </div>
            </div>
            `;
        }).join('');

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
                .version-item { border-bottom: 1px solid var(--vscode-panel-border); padding: 10px 0; }
                .version-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .version-id { font-family: monospace; opacity: 0.8; }
                .version-date { opacity: 0.7; font-size: 0.9em; }
                .version-meta { margin-bottom: 8px; }
                .version-actions button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 8px;
                    cursor: pointer;
                    margin-right: 5px;
                }
                .version-actions button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                h2 { margin-top: 0; }
            </style>
        </head>
        <body>
            <h2>Plan History</h2>
            <div id="versions">
                ${rows.length ? rows : '<p>No history available.</p>'}
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function compareWithCurrent(id) {
                    vscode.postMessage({ command: 'compareWithCurrent', versionId: id });
                }
                function restore(id) {
                    vscode.postMessage({ command: 'restore', versionId: id });
                }
            </script>
        </body>
        </html>`;
    }
}

function shortId(id: string) {
    return id.substring(id.length - 6);
}
