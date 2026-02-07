import * as vscode from 'vscode';
import { TemplateManager } from './templateManager';
import { logger } from '../utils/logger';
import { TemplateError } from '../utils/errors';

export class TemplateBrowser {
    private panel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly templateManager: TemplateManager
    ) { }

    public open() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'layrTemplateBrowser',
            'Layr: Browse Templates',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        this.updateContent();

        // Handle messages from the webview (User clicks "Use")
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'useTemplate':
                        await this.applyTemplate(message.id);
                        return;
                }
            },
            null,
            this.context.subscriptions
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private updateContent() {
        if (!this.panel) { return; }
        const templates = this.templateManager.getAllTemplates();
        this.panel.webview.html = this.getHtmlForWebview(templates);
    }

    private async applyTemplate(templateId: string) {
        try {
            const template = this.templateManager.getTemplateById(templateId);
            if (!template) {
                logger.error(`TemplateBrowser: Template not found: ${templateId}`);
                vscode.window.showErrorMessage(`Template not found: ${templateId}`);
                return;
            }

            logger.info(`TemplateBrowser: Applying template "${template.name}"`);

            // Open a new untitled document with the template content
            const doc = await vscode.workspace.openTextDocument({
                content: template.content,
                language: 'markdown' 
            });
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage(`Loaded template: ${template.name}`);
        } catch (error) {
            logger.error(`TemplateBrowser: Failed to apply template ${templateId}:`, error);
            const action = 'Show Logs';
            vscode.window.showErrorMessage(`Failed to load template: ${error instanceof Error ? error.message : String(error)}`, action).then(selected => {
                if (selected === action) {
                    logger.show();
                }
            });
        }
    }

    private getHtmlForWebview(templates: PlanTemplate[]): string {
        // Simple CSS for the cards
        const style = `
            body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); }
            h2 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 10px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
            .card { 
                background: var(--vscode-editor-background); 
                border: 1px solid var(--vscode-panel-border); 
                padding: 15px; 
                border-radius: 4px; 
                transition: transform 0.2s;
            }
            .card:hover { transform: translateY(-2px); border-color: var(--vscode-focusBorder); }
            .tag { 
                display: inline-block; 
                background: var(--vscode-badge-background); 
                color: var(--vscode-badge-foreground); 
                padding: 2px 8px; 
                border-radius: 10px; 
                font-size: 0.8em; 
                margin-bottom: 8px;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 2px;
                width: 100%;
                margin-top: 10px;
            }
            button:hover { background: var(--vscode-button-hoverBackground); }
        `;

        // Generate HTML cards
        const cardsHtml = templates.map(t => `
            <div class="card">
                <span class="tag">${t.category}</span>
                <h3>${t.name}</h3>
                <p>${t.description}</p>
                <button onclick="useTemplate('${t.id}')">Use Template</button>
            </div>
        `).join('');

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${style}</style>
        </head>
        <body>
            <h2>Available Plans</h2>
            <div class="grid">
                ${cardsHtml}
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function useTemplate(id) {
                    vscode.postMessage({ command: 'useTemplate', id: id });
                }
            </script>
        </body>
        </html>`;
    }
}