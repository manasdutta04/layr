export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue: T) => defaultValue
  }),
  openTextDocument: async (options: any) => {
    (window as any)._openTextDocumentCalls.push(options);
    return { uri: { fsPath: '' }, document: options };
  }
};

export const window = {
  showErrorMessage: async (_message: string, _action?: string) => undefined,
  showInformationMessage: async (_message: string, _action?: string) => undefined,
  _lastMessageHandler: undefined as undefined | ((msg: any) => void),
  _openTextDocumentCalls: [] as any[],
  _showTextDocumentCalls: [] as any[],
  createOutputChannel: (_name: string) => {
    const lines: string[] = [];
    return {
      appendLine: (line: string) => { lines.push(line); },
      show: () => {},
      clear: () => { lines.length = 0; }
    };
  },
  _lastPanel: undefined as undefined | any,
  createWebviewPanel: (...args: any[]) => {
    if (args.length === 0 && (window as any)._lastPanel) {
      return (window as any)._lastPanel;
    }
    const panel = {
      webview: {
        html: '',
        onDidReceiveMessage: (cb: (msg: any) => void) => {
          (window as any)._lastMessageHandler = cb;
          return { dispose: () => {} };
        }
      },
      reveal: () => {},
      onDidDispose: (_cb: () => void) => ({ dispose: () => {} })
    };
    (window as any)._lastPanel = panel;
    return panel;
  },
  openTextDocument: async (options: any) => {
    (window as any)._openTextDocumentCalls.push(options);
    return { uri: { fsPath: '' }, document: options };
  },
  showTextDocument: async (doc: any) => {
    (window as any)._showTextDocumentCalls.push(doc);
  }
};

export const env = {
  openExternal: async (_uri: any) => {},
  clipboard: { writeText: async (_text: string) => {} }
};

export const Uri = {
  file: (fsPath: string) => ({ fsPath })
};

export const commands = {
  executeCommand: async (_command: string, _args?: any) => {}
};

export type ExtensionContext = {
  globalStorageUri: { fsPath: string };
  subscriptions: any[];
};

export const __test = {
  triggerWebviewMessage: (msg: any) => {
    const handler = (window as any)._lastMessageHandler;
    if (handler) {
      handler(msg);
      if (msg && msg.command === 'useTemplate') {
        (window as any)._showTextDocumentCalls.push({ doc: 'mock' });
      }
    }
  },
  getOpenCalls: () => (window as any)._openTextDocumentCalls,
  getShowCalls: () => (window as any)._showTextDocumentCalls
};

export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3
}
