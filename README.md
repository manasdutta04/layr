# Layr - AI Planning Layer

**Transform your ideas into structured project plans with AI-powered planning for VS Code.**

Layr is a VS Code extension that generates comprehensive, actionable project plans from natural language descriptions. **Now with pre-configured Groq integration - start using AI planning instantly without any setup!**

 Quick Start - No Configuration Needed!

Layr comes **pre-configured with Groq AI** - just install and start planning immediately:

1. Install the extension
2. Press `Ctrl+Shift+P` and type "Layr: Create Plan"
3. Describe your project
4. Get your AI-generated plan instantly!

**No API keys, no configuration, no waiting - just install and use!**

## Demo Video

[Watch the demo video](https://youtu.be/PjBLxArnfu4)


## Key Benefits

**Zero Setup Required** : Pre-configured with Groq AI for instant use - no API key needed!

**Lightning Fast** : Powered by Groq's ultra-fast inference infrastructure for near-instant results.

**Intelligent Planning** : Leverages advanced LLMs (Llama 3.3) to create detailed, context-aware project plans.

**Seamless Integration** : Native VS Code integration through Command Palette with instant access to planning tools.

**Flexible Output** : Generates editable Markdown documents that you can customize and reference throughout development.

**Multi-Provider Support** : Optional support for Gemini, OpenAI, and Claude if you prefer other AI providers.

**Secure Configuration** : Multiple options for API key storage with built-in security best practices.

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Layr"

![Search for Layr in VS Code Extensions](./assets/extensions-panel-search.png)

4. Click Install

![Layr installed confirmation](./assets/layr-installed-confirmation.png)

#### VS Code Version Compatibility
Layr requires **Visual Studio Code version 1.74 or later**.

You can check your VS Code version via:
- **Windows/Linux:** Help → About
- **macOS:** Code → About Visual Studio Code


### From Open VSX Registry (for Cursor, Antigravity, Windsurf, VSCodium, etc.)
1. Open your IDE
2. Go to Extensions
3. Search for "Layr"
4. Click Install

Or install directly from [Open VSX Registry](https://open-vsx.org/extension/ManasDutta/layr)

### From Source
1. Clone this repository
2. Open in VS Code
3. Run `npm install`
4. Press F5 to launch in Extension Development Host

## Configuration

### No Configuration Needed!

**Layr is 100% pre-configured!** Just install and start using it immediately.

- No API keys to enter
- No settings to configure  
- No account required
- No setup steps

**It just works!**

The extension comes with Groq AI built-in, providing:
- **Ultra-fast** responses (1-3 seconds)
- **Powerful AI** (Llama 3.3 70B model)
- **Completely free** for you to use
- **Secure** - your data stays private

### Customization Settings (Optional)

While Layr works great out of the box, you can customize your plans:

**How to Access Layr Settings:**

1. **VS Code / Cursor / Windsurf / Antigravity:**
   - Open Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
   - Search for "Layr" in the settings search bar
   - Or navigate to: **Settings** → Look for **"Layr"** section in the left sidebar
   - You'll find two settings: **"Layr: Plan Size"** and **"Layr: Plan Type"**

2. **Via Settings JSON:**
   - Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Preferences: Open User Settings (JSON)"
   - Add or modify:
     ```json
     {
       "layr.planSize": "Normal",
       "layr.planType": "SaaS"
     }
     ```

**Plan Size** (`layr.planSize`):
- **Concise**: 80-100 lines, quick overviews
- **Normal**: 180-240 lines, balanced detail (default)
- **Descriptive**: 300+ lines, comprehensive plans

**Plan Type** (`layr.planType`):
- **Hobby**: Simple learning projects with basic tools
- **SaaS**: Multi-tenant apps with billing and scalability (default)
- **Production**: Enterprise-grade with full CI/CD
- **Enterprise**: Microservices with advanced infrastructure
- **Prototype**: Rapid MVPs for quick validation
- **Open Source**: Community-focused with contribution guidelines
### For Developers: Using Your Own Groq Key

If you're forking this extension or want to use your own Groq API key:

1. Get a free API key from [Groq Console](https://console.groq.com/keys)
2. Add to `.env` file: `GROQ_API_KEY=your_key_here`
3. Or embed it in `src/planner/providers/groq.ts`

See `GROQ_SETUP.md` for detailed instructions.

## Usage Guide

### Creating a Plan

1. **Open Command Palette** : Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Run Command** : Type "Layr: Create Plan" and press Enter
3. **Describe Your Project** : Enter a natural language description of what you want to build
   - Example: "A React todo app with user authentication and real-time updates"
   - Example: "A REST API for a blog platform with user management"
   - Example: "A Python data analysis script for sales reporting"
4. **Review Generated Plan** : The extension will create a new Markdown file with your project plan
5. **Customize as Needed** : Edit the generated plan to match your specific requirements

### Executing a Plan

1. **Open a Layr Plan** : Open any markdown file generated by Layr (contains "Generated by Layr AI" watermark)
2. **Open Command Palette** : Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. **Run Command** : Type "Layr: Execute Plan" and press Enter
4. **Confirm Execution** : Review the confirmation dialog and click "Execute with AI"
5. **Implementation Assistance** : 
   - **VS Code**: Plan sent to GitHub Copilot Chat automatically
   - **Cursor**: Plan sent to Cursor AI automatically
   - **Windsurf**: Plan sent to Windsurf AI automatically
   - **Antigravity**: Plan sent to Antigravity AI automatically
   - **Other IDEs**: Plan copied to clipboard for manual paste
6. **Follow AI Guidance** : Work with your AI assistant to implement the plan step by step

**Safety Features:**
- Only Layr-generated plans can be executed (watermark verification)
- Confirmation required before sending to AI
- Helpful error messages guide you through the process
- Automatic detection of AI assistants across different IDEs
- Universal clipboard fallback for any IDE

### Best Practices for Prompts

**Be Specific** : Include technology preferences, key features, and constraints
- Good: "A Node.js REST API with JWT authentication, PostgreSQL database, and Docker deployment"
- Basic: "A web API"

**Mention Context** : Include information about scale, audience, or special requirements
- "A mobile-first React app for small businesses with offline capability"
- "A Python script for processing large CSV files with memory optimization"

**Include Constraints** : Mention any limitations or preferences
- "Using only free/open-source technologies"
- "Must be deployable on AWS Lambda"

## Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Layr: Create Plan` | Generate a new project plan from description | None |
| `Layr: Execute Plan` | Send plan to AI assistant for implementation | None |

## Plan Output Structure

Generated plans include:

**Project Overview** : High-level description and objectives
**Requirements** : Functional and technical requirements
**Architecture** : System design and component structure
**Technology Stack** : Recommended tools and frameworks
**Implementation Steps** : Detailed development phases
**File Structure** : Suggested project organization
**Testing Strategy** : Approach for quality assurance
**Deployment**  : Production deployment considerations

## AI-Powered Planning

### Default: Groq AI
**Advantages** :
- **Ultra-fast** - Get plans in seconds, not minutes
- **Free to use** - Pre-configured, no setup required
- **Highly accurate** - Powered by Llama 3.3 70B
- **No account needed** - Works immediately after install
- **State-of-the-art** - Latest open-source models

**Requirements** :
- Internet connection
- That's it! Pre-configured and ready to go

**Best For** : Everyone! Fast, free, and powerful - perfect for all projects

### Alternative AI Providers (on request | paid)
You can optionally use:
- **Gemini** - Google's multimodal AI
- **OpenAI** - GPT-4 and other OpenAI models  
- **Claude** - Anthropic's Claude models

All provide detailed, customized plans but require your own API keys.
- No API key required
- Instant generation
- Consistent structure

**Limitations** :
- Limited to predefined project types
- Less customization
- May not reflect latest technologies

**Best For** : Common project patterns, quick prototyping, offline development

## Troubleshooting

### Common Issues

**"Failed to generate plan"**
- Check internet connection
- Verify API key is correctly configured
- Try using template mode as fallback

**"API key not found"**
- Ensure API key is set in VS Code settings
- Check that the key is valid and active
- Verify the key has appropriate permissions

**"Extension not responding"**
- Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
- Check VS Code output panel for error messages
- Ensure extension is properly installed and enabled

### Getting Help

- Check the [GitHub repository](https://github.com/manasdutta04/layr) for known issues
- Review VS Code's extension troubleshooting guide
- Submit bug reports with detailed error messages and steps to reproduce

## Privacy and Security

- API keys are stored locally in VS Code settings
- No data is collected or transmitted except to Google's Gemini API
- Generated plans remain on your local machine
- All communication with external services uses secure HTTPS connections

## Contributing

Contributions are welcome! Please see the repository for development setup instructions and contribution guidelines.

## License

This project is licensed under the MIT License. See the LICENSE file for details.


##  Development

### Prerequisites
- Node.js 16+
- VS Code
- TypeScript knowledge

### Setup
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Debug in VS Code
# Press F5 to launch Extension Development Host
```

### Building
```bash
# Compile for production
npm run vscode:prepublish
```

##  Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `layr.geminiApiKey` | string | `""` | Your Gemini AI API key for generating intelligent plans |

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

##  License

MIT License - see LICENSE file for details

##  Creators

- Developed by [Manas Dutta](https://github.com/manasdutta04)

## Issues & Support

If you encounter any issues or have suggestions:
1. Check existing issues on GitHub
2. Create a new issue with detailed description
3. Include VS Code version and extension logs
