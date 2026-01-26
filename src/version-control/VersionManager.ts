
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectPlan } from '../planner/interfaces';

export interface PlanVersion {
    id: string; // timestamp-based unique id
    timestamp: number;
    plan: ProjectPlan;
    metadata: {
        model?: string;
        prompt?: string;
        description: string;
        versionLabel?: string;
    };
}

export class VersionManager {
    private context: vscode.ExtensionContext;
    private historyDir: string;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            this.historyDir = '';
        } else {
            this.historyDir = path.join(workspacePath, '.layr', 'history');
        }
    }

    private ensureHistoryDir() {
        if (this.historyDir && !fs.existsSync(this.historyDir)) {
            fs.mkdirSync(this.historyDir, { recursive: true });
        }
    }

    public updateWorkspacePath() {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspacePath) {
            this.historyDir = path.join(workspacePath, '.layr', 'history');
        }
    }


    public async saveVersion(plan: ProjectPlan, metadata: PlanVersion['metadata']): Promise<string | null> {
        if (!this.historyDir) {
            this.updateWorkspacePath();
            if (!this.historyDir) return null;
        }

        this.ensureHistoryDir();

        const timestamp = Date.now();
        const id = `${timestamp}`;
        const version: PlanVersion = {
            id,
            timestamp,
            plan,
            metadata
        };

        const versionFile = path.join(this.historyDir, `${id}.json`);

        try {
            await fs.promises.writeFile(versionFile, JSON.stringify(version, null, 2));
            return id;
        } catch (error) {
            console.error('Failed to save plan version:', error);
            return null;
        }
    }

    public async getVersions(): Promise<PlanVersion[]> {
        if (!this.historyDir || !fs.existsSync(this.historyDir)) {
            return [];
        }

        try {
            const files = await fs.promises.readdir(this.historyDir);
            const versions: PlanVersion[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const content = await fs.promises.readFile(path.join(this.historyDir, file), 'utf8');
                        const version = JSON.parse(content) as PlanVersion;
                        versions.push(version);
                    } catch (e) {
                        console.error(`Status: Failed to list version file ${file}:`, e);
                    }
                }
            }

            // Sort by timestamp descending
            return versions.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Failed to list versions:', error);
            return [];
        }
    }

    public async getVersion(id: string): Promise<PlanVersion | null> {
        if (!this.historyDir) return null;

        const versionFile = path.join(this.historyDir, `${id}.json`);
        if (!fs.existsSync(versionFile)) return null;

        try {
            const content = await fs.promises.readFile(versionFile, 'utf8');
            return JSON.parse(content) as PlanVersion;
        } catch (error) {
            console.error('Failed to read version:', error);
            return null;
        }
    }
}
