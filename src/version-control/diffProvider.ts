
import * as vscode from 'vscode';
import { VersionManager } from './VersionManager';
import { planner } from '../planner';

export class PlanDiffProvider implements vscode.TextDocumentContentProvider {
    static readonly scheme = 'layr-plan-diff';

    constructor(private versionManager: VersionManager) { }

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        // uri path should be /<versionId>/content
        // we can encode versionId in the authority or path
        const parts = uri.path.split('/');
        const versionId = parts[1]; // assuming path is /versionId/content.md

        if (!versionId) {
            return '';
        }

        const version = await this.versionManager.getVersion(versionId);
        if (!version) {
            return `Error: Version ${versionId} not found.`;
        }

        return planner.planToMarkdown(version.plan);
    }
}
