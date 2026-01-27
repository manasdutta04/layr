import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import MarkdownIt from 'markdown-it';
import { planner } from './planner';
import { PlanRefiner } from './planner/refiner';
import { TemplateManager } from './templates/templateManager';
import { TemplateBrowser } from './templates/templateBrowser';
import { estimateCost } from './cost-estimation/costEstimator';

/**
 * This method is called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  // Initialize Managers
  const templateManager = new TemplateManager(context);
  const templateBrowser = new TemplateBrowser(context, templateManager);

  console.log('🚀 LAYR EXTENSION ACTIVATE FUNCTION CALLED! 🚀');
  console.log('Layr Extension: ONLINE ONLY MODE ACTIVATED - Build ' + new Date().toISOString());
  console.log('Layr extension is now active! 🚀');

  // Load environment variables from .env file in extension directory
  const extensionRoot = context.extensionPath;
  const envPath = path.join(extensionRoot, '.env');
  console.log('Layr: Extension root:', extensionRoot);
  console.log('Layr: Attempting to load .env from:', envPath);
  console.log('Layr: .env file exists:', fs.existsSync(envPath));
  
  if (fs.existsSync(envPath)) {
    try {
      // Load .env from extension directory
      const result = dotenv.config({ path: envPath });
      console.log('Layr: dotenv.config() result:', result.error ? 'ERROR: ' + result.error : 'SUCCESS');
      console.log('Layr: GROQ_API_KEY after dotenv:', process.env.GROQ_API_KEY ? '***configured***' : 'not found');
      
      // Manual fallback - read file directly
      if (!process.env.GROQ_API_KEY) {
        console.log('Layr: dotenv failed, trying manual file read');
        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log('Layr: .env file content length:', envContent.length);
        
        const lines = envContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('GROQ_API_KEY=')) {
            const apiKey = trimmed.substring('GROQ_API_KEY='.length).trim();
            process.env.GROQ_API_KEY = apiKey;
            console.log('Layr: Manually set GROQ_API_KEY from file, length:', apiKey?.length);
            break;
          }
        }
      }
    } catch (error) {
      console.log('Layr: Error loading .env file:', error instanceof Error ? error.message : String(error));
      console.log('Layr: Tip: Ensure .env file exists in extension directory. See: https://github.com/manasdutta04/layr#setup');
    }
    
    console.log('Layr: Final GROQ_API_KEY status:', process.env.GROQ_API_KEY ? '***configured*** (length: ' + process.env.GROQ_API_KEY.length + ')' : 'not found');
  } else {
    console.log('Layr: No .env file found in extension directory. API key should be set via VS Code settings. Guide: https://github.com/manasdutta04/layr#configuration');
  }

  // Refresh planner configuration after .env is loaded
  console.log('Layr: Refreshing planner configuration after .env load');
  planner.refreshConfig();

  // --- NEW: Register "Browse Templates" Command ---
  const browseTemplatesCommand = vscode.commands.registerCommand('layr.browseTemplates', () => {
      templateBrowser.open();
  });

  // --- NEW: Register "Save As Template" Command ---
  const saveAsTemplateCommand = vscode.commands.registerCommand('layr.saveAsTemplate', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
          vscode.window.showErrorMessage('Open a file to save it as a template.');
          return;
      }

      const name = await vscode.window.showInputBox({ prompt: 'Enter template name' });
      if (!name) return;

      const category = await vscode.window.showQuickPick(
          ['Web', 'Backend', 'Mobile', 'Data', 'DevOps', 'Desktop'], 
          { placeHolder: 'Select a category' }
      );
      if (!category) return;

      const content = editor.document.getText();
      // @ts-ignore
      await templateManager.saveTemplate(name, content, category);
  });

  // Register the "Refine Plan Section" command
  const refinePlanSectionCommand = vscode.commands.registerCommand('layr.refinePlanSection', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const selection = editor.selection;

    // Identify section
    const section = PlanRefiner.getSectionAtSelection(document, selection);
    if (!section) {
      vscode.window.showErrorMessage('Could not identify a plan section at the current selection');
      return;
    }

    // Prompt for refinement
    const refinementPrompt = await vscode.window.showInputBox({
      prompt: `How would you like to refine the "${section.title}" section?`,
      placeHolder: 'e.g., Add more detail to the database schema, include security considerations...',
      ignoreFocusOut: true
    });

    if (!refinementPrompt) {
      return; // User cancelled
    }

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Refining section: ${section.title}...`,
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'AI is thinking...' });
      
      const refinedContent = await PlanRefiner.refine(document, section, refinementPrompt);
      
      if (refinedContent) {
        await PlanRefiner.showDiffAndApply(document, section, refinedContent);
      }
    });
  });

  // Register the "Create Plan" command
  const createPlanCommand = vscode.commands.registerCommand('layr.createPlan', async () => {
    try {
      // Show input box to get user's prompt
      const prompt = await vscode.window.showInputBox({
        prompt: 'What do you want to build?',
        placeHolder: 'e.g., A React todo app with authentication and database',
        ignoreFocusOut: true,
        validateInput: (value: string) => {
          if (!value || value.trim().length === 0) {
            return 'Please enter a description of what you want to build';
          }
          if (value.trim().length < 10) {
            return 'Please provide a more detailed description (at least 10 characters)';
          }
          return null;
        }
      });

      if (!prompt) {
        return; // User cancelled
      }

      // Show progress indicator with percentage tracking
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating project plan...',
        cancellable: false
      }, async (progress) => {
        // Track cumulative percentage for smooth visual feedback
        let lastReportedPercentage = 0;
        
        const updateProgress = (targetPercentage: number, message: string) => {
          const increment = targetPercentage - lastReportedPercentage;
          lastReportedPercentage = targetPercentage;
          progress.report({ 
            increment: increment,
            message: `[${targetPercentage}%] ${message}`
          });
        };
        
        try {
          // Stage 1: Analyze request
          updateProgress(15, 'Analyzing your request...');
          
          // Generate the plan
          updateProgress(35, 'Connecting to AI provider...');
          const plan = await planner.generatePlan(prompt.trim());
          updateProgress(60, 'Formatting plan as Markdown...');
          
          // Convert plan to Markdown
          const markdown = planner.planToMarkdown(plan);
          updateProgress(80, 'Preparing document...');
          
          // Create a new document with the plan
          const doc = await vscode.workspace.openTextDocument({
            content: markdown,
            language: 'markdown'
          });
          
          updateProgress(90, 'Opening in editor...');
          
          // Show the document in a new editor
          await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.One
          });
          
          updateProgress(100, 'Plan generated successfully! ✨');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const fullError = `Failed to generate plan:

${errorMessage}

Documentation: https://github.com/manasdutta04/layr#troubleshooting`;
          vscode.window.showErrorMessage(fullError);
          console.error('Plan generation error:', error);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const fullError = `Error creating plan:

${errorMessage}

Need help? Visit: https://github.com/manasdutta04/layr#troubleshooting`;
      vscode.window.showErrorMessage(fullError);
      console.error('Create plan command error:', error);
    }
  });

  // Register the "Execute Plan" command
  const executePlanCommand = vscode.commands.registerCommand('layr.executePlan', async () => {
    try {
      // Get the active editor
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        const action = await vscode.window.showWarningMessage(
          'No plan file is currently open. Please open a Layr-generated plan (.md file) or create a new plan first.',
          'Create Plan',
          'Need Help',
          'Cancel'
        );
        
        if (action === 'Create Plan') {
          await vscode.commands.executeCommand('layr.createPlan');
        } else if (action === 'Need Help') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/manasdutta04/layr#how-to-use'));
        }
        return;
      }

      // Check if it's a markdown file
      if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage(
          'Please open a Layr plan file (.md) to execute it. The active file is not a markdown document.\n\nGuide: https://github.com/manasdutta04/layr#Usage-guide'
        );
        return;
      }

      // Get the document content
      const content = editor.document.getText();

      // Check if it's a Layr-generated plan (has the watermark)
      const layrWatermark = '*Generated by Layr';
      if (!content.includes(layrWatermark)) {
        const action = await vscode.window.showWarningMessage(
          'This markdown file was not generated by Layr AI. Only Layr-generated plans can be executed for safety reasons.\n\nCreate a new plan: https://github.com/manasdutta04/layr#Usage-guide',
          'Create New Plan',
          'Cancel'
        );
        
        if (action === 'Create New Plan') {
          await vscode.commands.executeCommand('layr.createPlan');
        }
        return;
      }

      // Show confirmation dialog
      const confirmation = await vscode.window.showInformationMessage(
        'Execute this plan with AI assistance?',
        { modal: true, detail: 'This will send the plan to your AI coding assistant (GitHub Copilot, Cursor AI, Windsurf, Antigravity, etc.) to help you implement it step by step.' },
        'Execute',
        'Copy'
      );

      // Handle Copy action
      if (confirmation === 'Copy') {
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage(
          'Plan copied to clipboard! Paste it into your AI coding assistant to get started.',
          'Got it'
        );
        return;
      }

      // Handle no selection (user closed dialog)
      if (confirmation !== 'Execute') {
        return;
      }

      // Try to use AI Chat (GitHub Copilot, Cursor, Windsurf, etc.)
      try {
        // Check for different AI chat implementations across IDEs
        const copilotChat = vscode.extensions.getExtension('GitHub.copilot-chat');
        const cursorChat = vscode.extensions.getExtension('cursor.chat');
        const windsurfChat = vscode.extensions.getExtension('windsurf.ai');
        const antigravityChat = vscode.extensions.getExtension('antigravity.ai');
        
        let chatOpened = false;
        
        // Try GitHub Copilot Chat (VS Code)
        if (copilotChat) {
          try {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
              query: `I have a project plan that I need help implementing. Here's the complete plan:\n\n${content}\n\nPlease help me implement this step by step. Let's start with Phase 1.`
            });
            chatOpened = true;
            
            vscode.window.showInformationMessage(
              'Plan sent to GitHub Copilot Chat! Check the chat panel to start implementation.',
              'Open Chat'
            ).then(action => {
              if (action === 'Open Chat') {
                vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
              }
            });
          } catch (e) {
            console.log('Failed to open Copilot Chat:', e);
          }
        }
        
        // Try Cursor AI Chat
        if (!chatOpened && cursorChat) {
          try {
            await vscode.commands.executeCommand('cursor.chat.open', {
              text: `I have a project plan that I need help implementing. Here's the complete plan:\n\n${content}\n\nPlease help me implement this step by step. Let's start with Phase 1.`
            });
            chatOpened = true;
            
            vscode.window.showInformationMessage(
              'Plan sent to Cursor AI! Check the chat panel to start implementation. Docs: https://github.com/manasdutta04/layr#implementation'
            );
          } catch (e) {
            console.log('Failed to open Cursor Chat:', e);
          }
        }
        
        // Try Windsurf AI
        if (!chatOpened && windsurfChat) {
          try {
            await vscode.commands.executeCommand('windsurf.chat.open', {
              prompt: `I have a project plan that I need help implementing. Here's the complete plan:\n\n${content}\n\nPlease help me implement this step by step. Let's start with Phase 1.`
            });
            chatOpened = true;
            
            vscode.window.showInformationMessage(
              'Plan sent to Windsurf AI! Check the chat panel to start implementation.'
            );
          } catch (e) {
            console.log('Failed to open Windsurf Chat:', e);
          }
        }
        
        // Try Antigravity AI
        if (!chatOpened && antigravityChat) {
          try {
            await vscode.commands.executeCommand('antigravity.chat.open', {
              message: `I have a project plan that I need help implementing. Here's the complete plan:\n\n${content}\n\nPlease help me implement this step by step. Let's start with Phase 1.`
            });
            chatOpened = true;
            
            vscode.window.showInformationMessage(
              'Plan sent to Antigravity AI! Check the chat panel to start implementation.'
            );
          } catch (e) {
            console.log('Failed to open Antigravity Chat:', e);
          }
        }
        
        // Generic fallback: Try common chat commands
        if (!chatOpened) {
          const commonChatCommands = [
            'workbench.action.chat.open',
            'chat.open',
            'ai.chat.open',
            'assistant.open'
          ];
          
          for (const command of commonChatCommands) {
            try {
              await vscode.commands.executeCommand(command);
              chatOpened = true;
              break;
            } catch (e) {
              // Try next command
            }
          }
        }
        
        // Final fallback: Copy to clipboard and show instructions
        if (!chatOpened) {
          await vscode.env.clipboard.writeText(content);
          
          const action = await vscode.window.showInformationMessage(
            'Could not open AI Chat. Plan copied to clipboard!\n\nPaste it into your AI assistant (ChatGPT, Claude, GitHub Copilot, etc.) to get implementation help.',
            { modal: false },
            'Try Opening Chat',
            'Instructions',
            'Docs'
          );

          if (action === 'Try Opening Chat') {
            try {
              await vscode.commands.executeCommand('workbench.action.chat.open');
            } catch (e) {
              vscode.window.showInformationMessage(
                'Could not automatically open chat. Please open your AI assistant manually and paste the plan from clipboard.\n\nGuide: https://github.com/manasdutta04/layr#implementation'
              );
            }
          } else if (action === 'Instructions') {
            showExecutionInstructions();
          } else if (action === 'Docs') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/manasdutta04/layr#how-to-execute-plans'));
          }
        }

      } catch (error) {
        console.error('Error executing plan with AI:', error);
        
        // Fallback: Copy to clipboard
        await vscode.env.clipboard.writeText(content);
        const action = await vscode.window.showInformationMessage(
          'Plan copied to clipboard! Paste it into your AI coding assistant to get started.\n\nTroubleshooting: https://github.com/manasdutta04/layr#troubleshooting',
          'Got it',
          'Read Docs'
        );
        
        if (action === 'Read Docs') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/manasdutta04/layr#how-to-execute-plans'));
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const fullError = `Error executing plan:

${errorMessage}

Troubleshooting: https://github.com/manasdutta04/layr#troubleshooting`;
      vscode.window.showErrorMessage(fullError);
      console.error('Execute plan command error:', error);
    }
  });

  // Register the "Export Plan" command
  const exportPlanCommand = vscode.commands.registerCommand('layr.exportPlan', async () => {
    try {
      // Get the active editor
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        vscode.window.showWarningMessage('No plan file is currently open. Please open a Layr plan (.md file) to export.');
        return;
      }

      // Check if it's a markdown file
      if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Please open a Markdown (.md) file to export.');
        return;
      }

      // Get the document content
      const content = editor.document.getText();

      // Ask for export format
      const format = await vscode.window.showQuickPick(['HTML'], {
        placeHolder: 'Select export format'
      });

      if (!format) {
        return;
      }

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Exporting plan to ${format}...`,
        cancellable: false
      }, async (progress) => {
        try {
          const md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
          });

          const htmlContent = md.render(content);
          
          // Apply styling
          const styledHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Layr Project Plan</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #f0f2f5;
        }
        .container {
            background-color: #ffffff;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        }
        h1, h2, h3, h4, h5, h6 {
            color: #1a202c;
            margin-top: 2rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }
        h1 { 
            font-size: 2.5rem;
            border-bottom: 3px solid #4a90e2; 
            padding-bottom: 0.5rem;
            color: #2d3748;
        }
        h2 { 
            font-size: 1.8rem;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.3rem;
            margin-top: 2.5rem;
        }
        h3 { font-size: 1.4rem; color: #4a5568; }
        p { margin-bottom: 1.2rem; }
        code {
            background-color: #edf2f7;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.9em;
            color: #e53e3e;
        }
        pre {
            background-color: #1a202c;
            color: #e2e8f0;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1.5rem 0;
            line-height: 1.45;
        }
        pre code {
            background-color: transparent;
            padding: 0;
            color: inherit;
            font-size: 0.85em;
        }
        blockquote {
            border-left: 5px solid #4a90e2;
            margin: 1.5rem 0;
            padding: 0.5rem 0 0.5rem 1.5rem;
            font-style: italic;
            color: #4a5568;
            background-color: #f7fafc;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 2rem 0;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 1rem;
            text-align: left;
        }
        th { 
            background-color: #edf2f7;
            font-weight: 600;
        }
        tr:nth-child(even) { background-color: #f8fafc; }
        ul, ol { margin-bottom: 1.2rem; padding-left: 1.5rem; }
        li { margin-bottom: 0.5rem; }
        .footer {
            margin-top: 4rem;
            text-align: center;
            font-size: 0.9rem;
            color: #718096;
            border-top: 1px solid #e2e8f0;
            padding-top: 2rem;
        }
        @media print {
            body { background-color: white; padding: 0; }
            .container { box-shadow: none; padding: 0; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
        }
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent}
        <div class="footer">
            Generated by <a href="https://github.com/manasdutta04/layr" target="_blank" style="color: #4a90e2; text-decoration: none; font-weight: 600;">Layr - AI Planning Layer</a>
        </div>
    </div>
</body>
</html>
          `;

          // Determine save path
          let savePath: string;
          if (editor.document.isUntitled) {
            // If unsaved, ask for directory
            const uri = await vscode.window.showSaveDialog({
              defaultUri: vscode.Uri.file('project-plan.html'),
              filters: { 'HTML Files': ['html'] }
            });
            if (!uri) return;
            savePath = uri.fsPath;
          } else {
            // Save in same directory
            const sourcePath = editor.document.uri.fsPath;
            savePath = sourcePath.replace(/\.md$/, '') + '.html';
            
            // If it already exists, confirm overwrite
            if (fs.existsSync(savePath)) {
              const overwrite = await vscode.window.showWarningMessage(
                `File ${path.basename(savePath)} already exists. Overwrite?`,
                'Yes', 'No'
              );
              if (overwrite !== 'Yes') return;
            }
          }

          fs.writeFileSync(savePath, styledHtml);
          
          vscode.window.showInformationMessage(`Plan exported successfully to ${path.basename(savePath)}`, 'Open File').then(action => {
            if (action === 'Open File') {
              vscode.env.openExternal(vscode.Uri.file(savePath));
            }
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          vscode.window.showErrorMessage(`Failed to export plan: ${errorMessage}`);
          console.error('Export error:', error);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Error exporting plan: ${errorMessage}`);
      console.error('Export plan command error:', error);
    }
  });

  // Register the "Estimate Cost" command
  const estimateCostCommand = vscode.commands.registerCommand('layr.estimateCost', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a plan file to estimate costs.');
      return;
    }

    const document = editor.document;
    const text = document.getText();
    
    // 1. Calculate the cost
    const costReport = estimateCost(text);

    // 2. Append the report to the bottom of the file
    editor.edit(editBuilder => {
        const lastLine = document.lineAt(document.lineCount - 1);
        const position = new vscode.Position(document.lineCount, 0);
        editBuilder.insert(position, costReport);
    });

    vscode.window.showInformationMessage('💰 Cost estimation added to your plan!');
  });

  // Listen for configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('layr.planSize') ||
        event.affectsConfiguration('layr.planType') ||
        event.affectsConfiguration('layr.geminiApiKey')) {
      vscode.window.showInformationMessage('✅ Layr configuration updated! Changes will take effect on your next plan generation.');
    }
  });

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(
    createPlanCommand,
    executePlanCommand,
    exportPlanCommand,
    estimateCostCommand, // Added Cost Estimator
    refinePlanSectionCommand,
    configChangeListener,
    browseTemplatesCommand,
    saveAsTemplateCommand,
    vscode.commands.registerCommand('layr.applyRefinement', async (uri: vscode.Uri) => {
      // If uri is not provided, try to get it from the active editor
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (targetUri) {
        await PlanRefiner.applyActiveRefinement(targetUri);
      }
    }),
    vscode.commands.registerCommand('layr.discardRefinement', async (uri: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (targetUri) {
        await PlanRefiner.discardActiveRefinement(targetUri);
      }
    })
  );

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get('layr.hasShownWelcome', false);
  if (!hasShownWelcome) {
    showWelcomeMessage(context);
  }
}

/**
 * Show welcome message with setup instructions
 */
async function showWelcomeMessage(context: vscode.ExtensionContext) {
  const action = await vscode.window.showInformationMessage(
    '🎉 Welcome to Layr! AI-powered project planning is ready to use.',
    'Create First Plan',
    'Setup Guide',
    'Learn More'
  );

  switch (action) {
    case 'Create First Plan':
      await vscode.commands.executeCommand('layr.createPlan');
      break;
    case 'Setup Guide':
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/manasdutta04/layr#setup'));
      break;
    case 'Learn More':
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/manasdutta04/layr'));
      break;
  }

  // Mark welcome as shown
  context.globalState.update('layr.hasShownWelcome', true);
}

/**
 * Show execution instructions for manual implementation
 */
function showExecutionInstructions() {
  const instructions = `# How to Execute Your Layr Plan

Your plan has been copied to the clipboard! Here's how to use it with AI assistants:

## Using GitHub Copilot Chat (VS Code)
1. Open the Chat panel (Ctrl+Shift+I or Cmd+Shift+I)
2. Paste the plan into the chat
3. Ask: "Help me implement this plan step by step"
4. Follow the AI's guidance to build your project

## Using Cursor AI
1. Open Cursor Chat: Ctrl+L (or Cmd+L on Mac)
2. Paste the plan
3. Ask: "Help me implement this plan step by step"
4. Work through each phase with Cursor's assistance

## Using Windsurf AI
1. Open Windsurf Chat panel
2. Paste the plan
3. Request implementation guidance
4. Build your project step by step

## Using Antigravity AI
1. Open Antigravity Chat
2. Paste the plan
3. Ask: "Help me implement this plan step by step"
4. Follow the AI's implementation guidance

## Using ChatGPT, Claude, or Other AI Assistants
1. Visit ChatGPT (openai.com), Claude (claude.ai), or your preferred AI tool
2. Paste the plan into the chat
3. Ask: "Help me implement this project plan step by step"
4. Copy the generated code back to your IDE

## Tips for Best Results ✨
- ✅ Start with Phase 1 and work sequentially
- ✅ Implement and test each step before moving to the next
- ✅ Ask the AI to explain code you don't understand
- ✅ Request code reviews and improvements for quality
- ✅ Use the plan's file structure as your project guide
- ✅ Ask for help if you get stuck on any phase

## Troubleshooting
- If chat doesn't open: Copy the plan from clipboard and paste manually
- For API errors: Check your AI provider configuration
- For more help: https://github.com/manasdutta04/layr#troubleshooting

Happy coding! 🚀
  `;

  const doc = vscode.workspace.openTextDocument({
    content: instructions.trim(),
    language: 'markdown'
  }).then(doc => {
    vscode.window.showTextDocument(doc, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside
    });
  });
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  console.log('Layr extension deactivated');
}