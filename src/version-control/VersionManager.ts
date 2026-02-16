
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ProjectPlan } from '../planner/interfaces';
import { logger } from '../utils/logger';

export interface PlanVersion {
/**
 * SECURITY: Validates UUID format to prevent injection
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * SECURITY: Sanitizes a path to prevent traversal
 */
function sanitizePath(basePath: string, filename: string): string | null {
  const fullPath = path.join(basePath, filename);
  const normalized = path.normalize(fullPath);
  return normalized.startsWith(path.normalize(basePath)) ? normalized : null;
}

export interface PlanVersion {
    id: string; // UUID-based unique id
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
    private historyDir: string;

    constructor(baseDir?: string) {
        if (baseDir) {
            this.historyDir = path.join(baseDir, '.layr', 'history');
            return;
        }

        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            this.historyDir = '';
            // Only show warning if we are not in a test environment (implied by no baseDir injected but also check context?)
            // Actually, showing warning is fine.
            vscode.window.showWarningMessage(
                'Layr: No workspace folder found. Plan version history will not be saved until you open a workspace folder.',
                'Learn More'
            ).then(action => {
                if (action === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://code.visualstudio.com/docs/editor/workspaces'));
                }
            });
        } else {
            this.historyDir = path.join(workspacePath, '.layr', 'history');
        }
    }

    private async ensureHistoryDir() {
        if (this.historyDir && !fs.existsSync(this.historyDir)) {
            // SECURITY: Create with owner-only permissions
            await fs.promises.mkdir(this.historyDir, { 
                recursive: true,
                mode: 0o700  // rwx------
            });
        }
    }

    public updateWorkspacePath() {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspacePath) {
            this.historyDir = path.join(workspacePath, '.layr', 'history');
        } else {
            vscode.window.showWarningMessage(
                'Layr: No workspace folder found. Plan version history will not be saved.',
                'Open Folder'
            ).then(action => {
                if (action === 'Open Folder') {
                    vscode.commands.executeCommand('vscode.openFolder');
                }
            });
        }
    }


    public async saveVersion(plan: ProjectPlan, metadata: PlanVersion['metadata']): Promise<string | null> {
        if (!this.historyDir) {
            this.updateWorkspacePath();
            if (!this.historyDir) { return null; }
        }

        await this.ensureHistoryDir();

        const timestamp = Date.now();
        const id = randomUUID(); // Use UUID to prevent race conditions
        const version: PlanVersion = {
            id,
            timestamp,
            plan,
            metadata
        };

    // SECURITY: Validate UUID format to prevent path traversal
    if (!id || !isValidUUID(id)) {
      logger.warn(`VersionManager: Invalid version ID format: ${id}`);
      return null;
    }
    
    // SECURITY: Use sanitized path
    const versionFile = sanitizePath(this.historyDir, `${id}.json`);
    if (!versionFile) {
      logger.error(`VersionManager: Path traversal attempt detected for ID: ${id}`);
      return null;
    }
    

        try {
            // SECURITY: Write with restrictive permissions
            const fileContent = JSON.stringify(version, null, 2);
            await fs.promises.writeFile(versionFile, fileContent, {
                mode: 0o600  // rw-------
            });
            
            // Verify permissions
            const stats = await fs.promises.stat(versionFile);
            const actualMode = stats.mode & 0o777;
            if (actualMode !== 0o600) {
                logger.warn(`VersionManager: File permissions not as expected for ${id}. Got ${actualMode.toString(8)}`);
            }
            
            logger.debug(`VersionManager: Saved plan version ${id} to ${versionFile}`);

            // Automatically cleanup old versions to prevent unlimited growth
            // Keep only the 50 most recent versions
            await this.cleanupOldVersions(50);

            return id;
        } catch (error) {
            logger.error(`VersionManager: Failed to save plan version ${id}:`, error);
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
                        logger.warn(`VersionManager: Failed to parse version file ${file}:`, e);
                    }
                }
            }

            // Sort by timestamp descending
            return versions.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            logger.error('VersionManager: Failed to list versions:', error);
            return [];
        }
    }

    public async getVersion(id: string): Promise<PlanVersion | null> {
        if (!this.historyDir) { return null; }

        const versionFile = path.join(this.historyDir, `${id}.json`);
        if (!fs.existsSync(versionFile)) {
            logger.warn(`VersionManager: Version file not found: ${id}`);
            return null;
        }

        try {
            const content = await fs.promises.readFile(versionFile, 'utf8');
            return JSON.parse(content) as PlanVersion;
        } catch (error) {
            logger.error(`VersionManager: Failed to read version ${id}:`, error);
            return null;
        }
    }

    /**
     * Clean up old versions, keeping only the most recent ones
     * @param keepCount Number of versions to keep (default: 50)
     */
    public async cleanupOldVersions(keepCount: number = 50): Promise<number> {
        if (!this.historyDir || !fs.existsSync(this.historyDir)) {
            return 0;
        }

        try {
            const versions = await this.getVersions();

            if (versions.length <= keepCount) {
                return 0; // Nothing to clean up
            }

            // Sort by timestamp descending (newest first)
            const sortedVersions = versions.sort((a, b) => b.timestamp - a.timestamp);

            // Get versions to delete (older than keepCount)
            const versionsToDelete = sortedVersions.slice(keepCount);

            let deletedCount = 0;
            for (const version of versionsToDelete) {
                const versionFile = path.join(this.historyDir, `${version.id}.json`);
                try {
                    await fs.promises.unlink(versionFile);
                    deletedCount++;
                } catch (error) {
                    logger.error(`VersionManager: Failed to delete old version ${version.id}:`, error);
                }
            }

            if (deletedCount > 0) {
                logger.info(`VersionManager: Cleaned up ${deletedCount} old versions`);
            }
            return deletedCount;
        } catch (error) {
            logger.error('VersionManager: Failed to cleanup old versions:', error);
            return 0;
        }
    }

    /**
     * Delete a specific version by ID
     */
    public async deleteVersion(id: string): Promise<boolean> {
        if (!this.historyDir) { return false; }

        const versionFile = path.join(this.historyDir, `${id}.json`);
        if (!fs.existsSync(versionFile)) { return false; }

        try {
            await fs.promises.unlink(versionFile);
            logger.info(`VersionManager: Deleted version ${id}`);
            return true;
        } catch (error) {
            logger.error(`VersionManager: Failed to delete version ${id}:`, error);
            return false;
        }
    }
}
