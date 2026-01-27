import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PlanTemplate, BUILTIN_TEMPLATES } from './builtinTemplates';

export class TemplateManager {
    private localTemplatesPath: string;

    constructor(context: vscode.ExtensionContext) {
        // Store user templates in the extension's global storage directory
        this.localTemplatesPath = path.join(context.globalStorageUri.fsPath, 'templates');
        this.ensureStorageExists();
    }

    private ensureStorageExists() {
        if (!fs.existsSync(this.localTemplatesPath)) {
            fs.mkdirSync(this.localTemplatesPath, { recursive: true });
        }
    }

    public getAllTemplates(): PlanTemplate[] {
        const userTemplates = this.loadUserTemplates();
        return [...BUILTIN_TEMPLATES, ...userTemplates];
    }

    private loadUserTemplates(): PlanTemplate[] {
        const templates: PlanTemplate[] = [];
        try {
            const files = fs.readdirSync(this.localTemplatesPath);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = fs.readFileSync(path.join(this.localTemplatesPath, file), 'utf-8');
                    templates.push(JSON.parse(content));
                }
            }
        } catch (error) {
            console.error('Error loading user templates:', error);
        }
        return templates;
    }

    public async saveTemplate(name: string, content: string, category: PlanTemplate['category']): Promise<void> {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const template: PlanTemplate = {
            id,
            name,
            category,
            description: 'User created template',
            content
        };

        const filePath = path.join(this.localTemplatesPath, `${id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
        vscode.window.showInformationMessage(`Template "${name}" saved successfully!`);
    }

    public getTemplateById(id: string): PlanTemplate | undefined {
        return this.getAllTemplates().find(t => t.id === id);
    }
}