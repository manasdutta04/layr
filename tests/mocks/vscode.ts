export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue: T) => defaultValue
  })
};

export const window = {
  showErrorMessage: async (_message: string, _action?: string) => undefined,
  showInformationMessage: async (_message: string, _action?: string) => undefined,
  _lastMessageHandler: undefined as undefined | ((msg: any) => void),
  _openTextDocumentCalls: [] as any[],
  _showTextDocumentCalls: [] as any[],
  createWebviewPanel: (..._args: any[]) => ({
    webview: {
      html: '',
      onDidReceiveMessage: (cb: (msg: any) => void) => {
        (window as any)._lastMessageHandler = cb;
        return { dispose: () => {} };
      }
    },
    reveal: () => {},
    onDidDispose: (_cb: () => void) => ({ dispose: () => {} })
  }),
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
    if (handler) handler(msg);
  },
  getOpenCalls: () => (window as any)._openTextDocumentCalls,
  getShowCalls: () => (window as any)._showTextDocumentCalls
};
