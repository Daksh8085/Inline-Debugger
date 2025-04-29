import * as vscode from "vscode";
import { getNonce, getUri } from "./utilities";
import * as tmp from "tmp";
import * as fs from "fs";
import { exec } from "child_process";

interface TestCase {
  input: string;
  output: string;
  status: string;
  time: string;
  try: string;
}

interface CodeSection {
  editor: string;
  TestCase: Record<number, TestCase>;
}

interface Panel {
  question: string;
  Code: CodeSection;
}

interface AssignmentData {
  Title: string;
  Panels: Record<string, Panel>;
  CurrentPanelId: string;
}

export class CmbEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "inline-dubugger.cmbEditor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new CmbEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      CmbEditorProvider.viewType,
      provider
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "webview-ui", "build"),
      ],
    };

    new CmbEditor(document, webviewPanel, this.context);
  }
}

class CmbEditor {
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext
  ) {
    this.panel = panel;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.setWebviewMessageListener(this.panel.webview);
    this.panel.webview.html = this.getHtmlForWebview(
      this.panel.webview,
      this.context.extensionUri
    );

    setTimeout(() => {
      this.panel.webview.postMessage({
        type: "loadData",
        data: this.document.getText(),
      });
    }, 300);
  }

  private getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ): string {
    const scriptUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.js",
    ]);
    const styleUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.css",
    ]);
    const nonce = getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link rel="stylesheet" href="${styleUri}">
        <title>Assignment Editor</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  private setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message) => {
        console.log("[Extension] Received message:", message);

        switch (message.type) {
          case "loaded":
            console.log("[Extension] Webview says: loaded!");
            break;
          case "save":
            if (message.data) {
              await this.saveDocument(message.data);
            }
            break;
          case "run":
            if (message.data) {
              await this.runTestCases(message.data);
            }
            break;
          default:
            console.log("[Extension] Unknown message type:", message.type);
        }
      },
      null,
      this.disposables
    );
  }

  private async saveDocument(newContent: string) {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      this.document.positionAt(0),
      this.document.positionAt(this.document.getText().length)
    );
    edit.replace(this.document.uri, fullRange, newContent);
    await vscode.workspace.applyEdit(edit);
    await this.document.save();
    console.log("[Extension] Document saved!");
  }

  private async runTestCases(data: string) {
    console.log("[Extension] Running test cases...");

    const parsed = JSON.parse(data) as AssignmentData;
    const currentPanel = parsed.Panels[parsed.CurrentPanelId];
    const code = currentPanel.Code.editor;
    const testCases = currentPanel.Code.TestCase;

    const tempFile = tmp.fileSync({ postfix: ".py" });
    fs.writeFileSync(tempFile.name, code);

    const results: Record<
      number,
      { status: string; output: string; expected: string }
    > = {};

    for (const [key, value] of Object.entries(testCases)) {
      const testCase = value as TestCase;
      const input = testCase.input;
      const expectedOutput = testCase.output.trim();

      try {
        const output = await this.runPythonFile(tempFile.name, input);
        const actualOutput = output.trim();
        const pass = actualOutput === expectedOutput;

        results[Number(key)] = {
          status: pass ? "pass" : "fail",
          output: actualOutput,
          expected: expectedOutput,
        };
      } catch (error) {
        results[Number(key)] = {
          status: "error",
          output: String(error),
          expected: expectedOutput,
        };
      }
    }

    tempFile.removeCallback();

    console.log("[Extension] Testcase Results:", results);

    this.panel.webview.postMessage({
      type: "testResult",
      data: results,
    });
  }

  private runPythonFile(filePath: string, input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = exec(`python "${filePath}"`, (error, stdout, stderr) => {
        if (error) {
          reject(stderr || stdout || error.message);
        } else {
          resolve(stdout);
        }
      });

      child.stdin?.write(input);
      child.stdin?.end();
    });
  }

  public dispose() {
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      disposable?.dispose();
    }
  }
}
