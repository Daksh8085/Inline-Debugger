import * as vscode from "vscode";
import { pythonDecorationsMap, setupListeners } from "./listener";
import { DecorationType } from "./types";
import { CmbEditorProvider } from "./CmbEditorProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "inline-dubugger" is now active!'
  );

  const disposable = vscode.commands.registerCommand(
    "inline-dubugger.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from inline-dubugger!");
    }
  );

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand("inline-debugger.printLog", setupListeners)
  );
  context.subscriptions.push(CmbEditorProvider.register(context));
}

export function deactivate() {
  console.log(
    `[INLINE-DEBUGGER] Deactivating extension - Cleaning up decorations`
  );

  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.languageId === "python") {
    editor.setDecorations(DecorationType, []);
  }
  pythonDecorationsMap.clear();
}
