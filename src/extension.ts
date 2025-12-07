import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { planner } from './planner';

/**
 * This method is called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
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
      console.log('Layr: Error loading .env:', error);
    }
    
    console.log('Layr: Final GROQ_API_KEY status:', process.env.GROQ_API_KEY ? '***configured*** (length: ' + process.env.GROQ_API_KEY.length + ')' : 'not found');
  } else {
    console.log('Layr: No .env file found in extension directory');
  }

  // Refresh planner configuration after .env is loaded
  console.log('Layr: Refreshing planner configuration after .env load');
  planner.refreshConfig();

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

      // Show progress indicator
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating project plan...',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Analyzing your request...' });
        
        try {
          // Generate the plan
          const plan = await planner.generatePlan(prompt.trim());
          
          progress.report({ increment: 50, message: 'Converting to Markdown...' });
          
          // Convert plan to Markdown
          const markdown = planner.planToMarkdown(plan);
          
          progress.report({ increment: 80, message: 'Opening plan in editor...' });
          
          // Create a new document with the plan
          const doc = await vscode.workspace.openTextDocument({
            content: markdown,
            language: 'markdown'
          });
          
          // Show the document in a new editor
          await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.One
          });
          
          progress.report({ increment: 100, message: 'Plan generated successfully!' });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          vscode.window.showErrorMessage(`Failed to generate plan: ${errorMessage}`);
          console.error('Plan generation error:', error);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Error: ${errorMessage}`);
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
          'Cancel'
        );
        
        if (action === 'Create Plan') {
          await vscode.commands.executeCommand('layr.createPlan');
        }
        return;
      }

      // Check if it's a markdown file
      if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage(
          'Please open a Layr plan file (.md) to execute it. The active file is not a markdown document.'
        );
        return;
      }

      // Get the document content
      const content = editor.document.getText();

      // Check if it's a Layr-generated plan (has the watermark)
      const layrWatermark = '*Generated by Layr';
      if (!content.includes(layrWatermark)) {
        vscode.window.showWarningMessage(
          'This markdown file was not generated by Layr AI. Only Layr-generated plans can be executed for safety reasons.'
        );
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
              'Plan sent to Cursor AI! Check the chat panel to start implementation.'
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
            'Plan copied to clipboard!\n\nPaste it into your AI assistant to get implementation help.',
            { modal: false },
            'Try Opening Chat',
            'Instructions'
          );

          if (action === 'Try Opening Chat') {
            try {
              await vscode.commands.executeCommand('workbench.action.chat.open');
            } catch (e) {
              vscode.window.showInformationMessage(
                'Could not automatically open chat. Please open your AI assistant manually and paste the plan from clipboard.'
              );
            }
          } else if (action === 'Instructions') {
            showExecutionInstructions();
          }
        }

      } catch (error) {
        console.error('Error executing plan with AI:', error);
        
        // Fallback: Copy to clipboard
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage(
          'Plan copied to clipboard! Paste it into your AI coding assistant to get started.',
          'Got it'
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Error executing plan: ${errorMessage}`);
      console.error('Execute plan command error:', error);
    }
  });

  // Listen for configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('layr.planSize') ||
        event.affectsConfiguration('layr.planType')) {
      vscode.window.showInformationMessage('Layr: Configuration updated! Changes will take effect on next plan generation.');
    }
  });

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(
    createPlanCommand,
    executePlanCommand,
    configChangeListener
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
    'Welcome to Layr! AI-powered project planning is ready to use - no configuration needed!',
    'Create First Plan',
    'Learn More'
  );

  switch (action) {
    case 'Create First Plan':
      await vscode.commands.executeCommand('layr.createPlan');
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
  const instructions = `
# How to Execute Your Layr Plan

Your plan has been copied to the clipboard! Here's how to use it with AI assistants:

## Using GitHub Copilot Chat (VS Code)
1. Open the Chat panel (Ctrl+Shift+I or Cmd+Shift+I)
2. Paste the plan into the chat
3. Ask: "Help me implement this plan step by step"
4. Follow the AI's guidance to build your project

## Using Cursor AI
1. Open Cursor Chat (Ctrl+L or Cmd+L)
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

## Using Other AI Assistants
1. Open ChatGPT, Claude, or your preferred AI
2. Paste the plan
3. Ask for implementation help phase by phase
4. Copy the generated code back to your IDE

## Tips for Best Results
- ✅ Start with Phase 1 and work sequentially
- ✅ Implement and test each step before moving on
- ✅ Ask the AI to explain code you don't understand
- ✅ Request code reviews and improvements
- ✅ Use the plan's file structure as your guide

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