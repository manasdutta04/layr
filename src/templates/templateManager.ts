import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PlanTemplate, BUILTIN_TEMPLATES } from './builtinTemplates';
import { logger } from '../utils/logger';
import { TemplateError } from '../utils/errors';

export class TemplateManager {
    private localTemplatesPath: string;

    constructor(context: vscode.ExtensionContext) {
        // Store user templates in the extension's global storage directory
        this.localTemplatesPath = path.join(context.globalStorageUri.fsPath, 'templates');
        this.ensureStorageExists();
    }

    private ensureStorageExists() {
        try {
            if (!fs.existsSync(this.localTemplatesPath)) {
                fs.mkdirSync(this.localTemplatesPath, { recursive: true });
                logger.info(`TemplateManager: Created local templates directory at ${this.localTemplatesPath}`);
            }
        } catch (error) {
            logger.error('TemplateManager: Failed to create templates directory:', error);
            throw new TemplateError(`Failed to initialize template storage: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public getAllTemplates(): PlanTemplate[] {
        logger.debug('TemplateManager: Fetching all templates');
        const userTemplates = this.loadUserTemplates();
        return [...BUILTIN_TEMPLATES, ...userTemplates];
    }

    private loadUserTemplates(): PlanTemplate[] {
        const templates: PlanTemplate[] = [];
        try {
            if (!fs.existsSync(this.localTemplatesPath)) {
                return [];
            }
            const files = fs.readdirSync(this.localTemplatesPath);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = fs.readFileSync(path.join(this.localTemplatesPath, file), 'utf-8');
                    templates.push(JSON.parse(content));
                }
            }
            logger.debug(`TemplateManager: Loaded ${templates.length} user templates`);
        } catch (error) {
            logger.error('TemplateManager: Error loading user templates:', error);
        }
        return templates;
    }

    public async saveTemplate(name: string, content: string, category: PlanTemplate['category']): Promise<void> {
        try {
            // Sanitize ID: only allow alphanumeric, hyphens, and underscores
            const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const template: PlanTemplate = {
                id,
                name,
                category,
                description: 'User created template',
                content
            };

            // Validate the resulting path stays within the templates directory
            const filePath = path.join(this.localTemplatesPath, `${id}.json`);
            const normalizedPath = path.resolve(filePath);
            const normalizedBase = path.resolve(this.localTemplatesPath);
            if (!normalizedPath.startsWith(normalizedBase)) {
                throw new TemplateError('Invalid template name: path traversal detected');
            }

            fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
            logger.info(`TemplateManager: Saved template "${name}" to ${filePath}`);
            vscode.window.showInformationMessage(`Template "${name}" saved successfully!`);
        } catch (error) {
            logger.error(`TemplateManager: Failed to save template "${name}":`, error);
            throw new TemplateError(`Failed to save template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public getTemplateById(id: string): PlanTemplate | undefined {
        return this.getAllTemplates().find(t => t.id === id);
    }
}