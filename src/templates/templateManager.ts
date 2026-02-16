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
                // SECURITY: Create directory with restrictive permissions (owner only)
                fs.mkdirSync(this.localTemplatesPath, { 
                    recursive: true,
                    mode: 0o700  // rwx------ (700)
                });
                logger.info(`TemplateManager: Created local templates directory at ${this.localTemplatesPath}`);
                
                // Verify permissions were set correctly
                const stats = fs.statSync(this.localTemplatesPath);
                logger.debug(`TemplateManager: Directory permissions: ${(stats.mode & 0o777).toString(8)}`);
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
          
          // SECURITY: Use safe JSON parser
          const template = safeJsonParse<PlanTemplate>(content);
          if (template) {
            templates.push(template);
          } else {
            logger.warn(`TemplateManager: Failed to parse template file: ${file}`);
          }
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
            const id = name.toLowerCase().replace(/\s+/g, '-');
            const template: PlanTemplate = {
                id,
                name,
                category,
                description: 'User created template',
                content
            };

            const filePath = path.join(this.localTemplatesPath, `${id}.json`);
      
      // SECURITY: Write file with restrictive permissions (owner read-write only)
      const fileContent = JSON.stringify(template, null, 2);
      fs.writeFileSync(filePath, fileContent, {
        mode: 0o600  // rw------- (600)
      });
      
      // Double-check permissions were applied
      const stats = fs.statSync(filePath);
      const actualMode = stats.mode & 0o777;
      if (actualMode !== 0o600) {
        logger.warn(`TemplateManager: File permissions not as expected. Got ${actualMode.toString(8)}, wanted 600`);
      }
      
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