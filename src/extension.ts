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

  // Load environment variables from .env file
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  console.log('Layr: Workspace root:', workspaceRoot);

  if (workspaceRoot) {
    const envPath = path.join(workspaceRoot, '.env');
    console.log('Layr: Attempting to load .env from:', envPath);
    console.log('Layr: .env file exists:', fs.existsSync(envPath));
    
    try {
      // Try dotenv first
      const result = dotenv.config({ path: envPath });
      console.log('Layr: dotenv.config() result:', result.error ? 'ERROR: ' + result.error : 'SUCCESS');
      console.log('Layr: GEMINI_API_KEY after dotenv:', process.env.GEMINI_API_KEY ? '***configured***' : 'not found');
      
      // Manual fallback - read file directly
      if (!process.env.GEMINI_API_KEY && fs.existsSync(envPath)) {
        console.log('Layr: dotenv failed, trying manual file read');
        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log('Layr: .env file content length:', envContent.length);
        console.log('Layr: .env file content preview:', envContent.substring(0, 100));
        
        const lines = envContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          console.log('Layr: Processing line:', trimmed.substring(0, 20) + '...');
          if (trimmed.startsWith('GEMINI_API_KEY=')) {
            const apiKey = trimmed.split('=')[1];
            process.env.GEMINI_API_KEY = apiKey;
            console.log('Layr: Manually set GEMINI_API_KEY from file, length:', apiKey?.length);
            break;
          }
        }
      }
    } catch (error) {
      console.log('Layr: Error loading .env:', error);
    }
    
    console.log('Layr: Final GEMINI_API_KEY status:', process.env.GEMINI_API_KEY ? '***configured*** (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'not found');
  } else {
    console.log('Layr: No workspace folder found, trying default .env location');
    dotenv.config();
  }

  // Refresh planner configuration after .env is loaded
  console.log('Layr: Refreshing planner configuration after .env load');
  planner.refreshConfig();

  // Register debug command to test API key loading
  const debugCommand = vscode.commands.registerCommand('layr.debug', async () => {
    const config = vscode.workspace.getConfiguration('layr');
    
    // Get unified model configuration
    const selectedModel = config.get<string>('aiModel') || 'gemini-2.5-flash';
    const apiKey = config.get<string>('apiKey') || '';
    
    // Determine provider from model name
    let selectedProvider = 'gemini';
    if (selectedModel.startsWith('gemini')) {
      selectedProvider = 'gemini';
    } else if (selectedModel.startsWith('gpt') || selectedModel.startsWith('o3')) {
      selectedProvider = 'openai';
    } else if (selectedModel.startsWith('claude')) {
      selectedProvider = 'claude';
    } else if (selectedModel.startsWith('kimi') || selectedModel.startsWith('deepseek') || selectedModel.startsWith('grok')) {
      selectedProvider = 'openai'; // Default to OpenAI for other models
    }
    
    // Get API keys from configuration or environment variables (fallback)
    const geminiApiKey = selectedProvider === 'gemini' ? apiKey : process.env.GEMINI_API_KEY || '';
    const openaiApiKey = selectedProvider === 'openai' ? apiKey : process.env.OPENAI_API_KEY || '';
    const claudeApiKey = selectedProvider === 'claude' ? apiKey : process.env.CLAUDE_API_KEY || '';
    
    // Test AI provider availability
    let aiProviderStatus = 'unknown';
    let apiTestResult = 'not tested';
    try {
      const isAvailable = await planner.isAIAvailable();
      aiProviderStatus = isAvailable ? 'available' : 'not available';
      
      // Test the API key directly if available
      if (isAvailable) {
        const testResult = await planner.testAPIKey();
        apiTestResult = testResult.success ? 'API key works!' : `API error: ${testResult.error}`;
      }
    } catch (error) {
      aiProviderStatus = `error: ${error}`;
    }
    
    const message = `Layr Debug Information

Selected Model: ${selectedModel}
Determined Provider: ${selectedProvider}
API Key: ${apiKey ? '***configured***' : 'not set'}
OpenAI Org: ${config.get<string>('openaiOrganization') || 'not set'}

Provider Status:
• Gemini: ${geminiApiKey ? 'configured' : 'not set'}
• OpenAI: ${openaiApiKey ? 'configured' : 'not set'}
• Claude: ${claudeApiKey ? 'configured' : 'not set'}

AI Generator: ${aiProviderStatus}
Test Result: ${apiTestResult}

Raw Config:
${JSON.stringify({
      selectedModel,
      determinedProvider: selectedProvider,
      apiKey: apiKey ? '***configured***' : 'not set'
    }, null, 2)}`;
    
    vscode.window.showInformationMessage(message);
    console.log('Layr Multi-Provider Debug:', { 
      selectedModel,
      determinedProvider: selectedProvider,
      geminiApiKey: geminiApiKey ? '***configured***' : 'not set',
      openaiApiKey: openaiApiKey ? '***configured***' : 'not set',
      claudeApiKey: claudeApiKey ? '***configured***' : 'not set',
      aiProviderStatus,
      apiTestResult
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
      // For now, just show a notification
      // This can be extended later to scaffold code or run scripts
      const action = await vscode.window.showInformationMessage(
        'Executing plan... 🚀',
        { modal: false },
        'View Progress',
        'Cancel'
      );

      if (action === 'View Progress') {
        vscode.window.showInformationMessage(
          'Plan execution feature is coming soon! For now, follow the steps in your generated plan manually.',
          { modal: false }
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
    if (event.affectsConfiguration('layr.aiModel') ||
        event.affectsConfiguration('layr.apiKey') ||
        event.affectsConfiguration('layr.openaiOrganization')) {
      vscode.window.showInformationMessage('Layr: Configuration updated! Changes will take effect on next plan generation.');
    }
  });

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(
    debugCommand,
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
    'Welcome to Layr! To get started with AI-powered planning, configure your AI provider and API key.',
    'Configure Settings',
    'Use Offline Mode',
    'Learn More'
  );

  switch (action) {
    case 'Configure Settings':
      await vscode.commands.executeCommand('workbench.action.openSettings', 'layr.aiProvider');
      break;
    case 'Use Offline Mode':
      vscode.window.showInformationMessage(
        'You can use Layr without an API key! It will generate plans using built-in templates. Try the "Layr: Create Plan" command.'
      );
      break;
    case 'Learn More':
      vscode.env.openExternal(vscode.Uri.parse('https://makersuite.google.com/app/apikey'));
      break;
  }

  // Mark welcome as shown
  context.globalState.update('layr.hasShownWelcome', true);
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  console.log('Layr extension deactivated');
}