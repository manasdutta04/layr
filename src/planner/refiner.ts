import * as vscode from 'vscode';
import { planner } from './index';

export interface PlanSection {
  title: string;
  content: string;
  startLine: number;
  endLine: number;
  level: number;
}

/**
 * Content provider for refinement diff view
 */
class RefinementContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;
  private _content = new Map<string, string>();

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this._content.get(uri.toString()) || '';
  }

  setContent(uri: vscode.Uri, content: string) {
    this._content.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }
}

const contentProvider = new RefinementContentProvider();
vscode.workspace.registerTextDocumentContentProvider('layr-refine', contentProvider);

interface RefinementSession {
  document: vscode.TextDocument;
  section: PlanSection;
  refinedContent: string;
  originalUri: vscode.Uri;
  refinedUri: vscode.Uri;
}

export class PlanRefiner {
  private static activeSessions = new Map<string, RefinementSession>();

  /**
   * Parse the document into sections based on Markdown headings
   */
  public static parsePlanSections(document: vscode.TextDocument): PlanSection[] {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const sections: PlanSection[] = [];

    let currentSection: Partial<PlanSection> | null = null;

    // Check for text before the first heading
    let firstHeadingIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^(#{1,6})\s+(.+)$/)) {
        firstHeadingIndex = i;
        break;
      }
    }

    if (firstHeadingIndex > 0) {
      sections.push({
        title: 'Introduction',
        content: lines.slice(0, firstHeadingIndex).join('\n'),
        startLine: 0,
        endLine: firstHeadingIndex - 1,
        level: 0
      });
    } else if (firstHeadingIndex === -1 && text.trim().length > 0) {
      sections.push({
        title: 'Document',
        content: text,
        startLine: 0,
        endLine: lines.length - 1,
        level: 0
      });
      return sections;
    }

    for (let i = Math.max(0, firstHeadingIndex); i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // If we have a current section, finish it
        if (currentSection) {
          currentSection.endLine = i - 1;
          currentSection.content = lines.slice(currentSection.startLine, i).join('\n');
          sections.push(currentSection as PlanSection);
        }

        // Start new section
        currentSection = {
          title: headingMatch[2],
          level: headingMatch[1].length,
          startLine: i,
        };
      }
    }

    // Finish the last section
    if (currentSection) {
      currentSection.endLine = lines.length - 1;
      currentSection.content = lines.slice(currentSection.startLine).join('\n');
      sections.push(currentSection as PlanSection);
    }

    return sections;
  }

  /**
   * Find which section the current selection belongs to
   */
  public static getSectionAtSelection(document: vscode.TextDocument, selection: vscode.Selection): PlanSection | null {
    const sections = this.parsePlanSections(document);

    // Find section that contains the selection
    for (const section of sections) {
      if (selection.start.line >= section.startLine && selection.start.line <= section.endLine) {
        return section;
      }
    }

    return null;
  }

  /**
   * Refine a section using AI
   */
  public static async refine(
    document: vscode.TextDocument,
    section: PlanSection,
    refinementPrompt: string
  ): Promise<string | null> {
    const fullContext = document.getText();

    try {
      return await planner.refineSection(section.content, refinementPrompt, fullContext);
    } catch (error) {
      vscode.window.showErrorMessage(`Refinement failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Show diff and apply changes
   */
  public static async showDiffAndApply(
    document: vscode.TextDocument,
    section: PlanSection,
    refinedContent: string
  ): Promise<void> {
    const timestamp = Date.now();
    const originalUri = vscode.Uri.parse(`layr-refine:/original-${timestamp}.md`);
    const refinedUri = vscode.Uri.parse(`layr-refine:/refined-${timestamp}.md`);

    contentProvider.setContent(originalUri, section.content);
    contentProvider.setContent(refinedUri, refinedContent);

    // Store session
    const session: RefinementSession = {
      document,
      section,
      refinedContent,
      originalUri,
      refinedUri
    };
    this.activeSessions.set(originalUri.toString(), session);
    this.activeSessions.set(refinedUri.toString(), session);

    // Show diff
    await vscode.commands.executeCommand(
      'vscode.diff',
      originalUri,
      refinedUri,
      `Refine: ${section.title} (Original ↔ Refined)`
    );

    vscode.window.showInformationMessage(
      `Review changes for "${section.title}". Use the checkmark in the toolbar to apply or the 'X' to discard.`,
      'Got it'
    );
  }

  /**
   * Apply changes from an active session
   */
  public static async applyActiveRefinement(uri: vscode.Uri): Promise<vscode.TextDocument | null> {
    const session = this.activeSessions.get(uri.toString());
    if (!session) {
      return null;
    }

    const { document, section, refinedContent } = session;

    // Check for concurrent edits
    const currentText = document.getText(new vscode.Range(
      new vscode.Position(section.startLine, 0),
      document.lineAt(section.endLine).range.end
    ));

    if (currentText !== section.content) {
      const proceed = await vscode.window.showWarningMessage(
        'The section content has changed manually since the refinement was generated. Overwrite changes?',
        { modal: true },
        'Overwrite'
      );
      if (proceed !== 'Overwrite') {
        return null;
      }
    }

    const edit = new vscode.WorkspaceEdit();
    const lastLine = document.lineAt(section.endLine);
    const range = new vscode.Range(
      new vscode.Position(section.startLine, 0),
      lastLine.range.end
    );

    edit.replace(document.uri, range, refinedContent);
    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      await document.save();
      vscode.window.showInformationMessage('Section refined successfully!');
      this.discardActiveRefinement(uri);
      return document;
    } else {
      vscode.window.showErrorMessage('Failed to apply refinements.');
      return null;
    }
  }

  /**
   * Discard an active session and close the diff editor
   */
  public static async discardActiveRefinement(uri: vscode.Uri): Promise<void> {
    const session = this.activeSessions.get(uri.toString());
    if (session) {
      this.activeSessions.delete(session.originalUri.toString());
      this.activeSessions.delete(session.refinedUri.toString());
    }

    // Close the active editor (the diff)
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  }
}


