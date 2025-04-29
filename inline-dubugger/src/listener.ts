import * as vscode from "vscode";
import { runInstrumentedCode } from "./instrumentedRunner";
import { DecorationType } from "./types";
import debounce from "lodash/debounce";

export const pythonDecorationsMap = new Map<
  string,
  vscode.DecorationOptions[]
>();

export function setupListeners(): void {
  // Handle already open tab
  async function initializeOpenEditors() {
    console.log("[CODE-MENTOR] Initializing already open editors");

    for (const editor of vscode.window.visibleTextEditors) {
      const document = editor.document;
      if (document.languageId !== "python") {
        continue;
      }

      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      if (diagnostics.length > 0) {
        console.log(
          `[CODE-MENTOR] Skipping ${document.uri.toString()} (errors found)`
        );
        continue;
      }

      console.log(
        `[CODE-MENTOR] Instrumenting already open file: ${document.uri.toString()}`
      );
      const PythonLogDecorations = await runInstrumentedCode(document);
      pythonDecorationsMap.set(document.uri.toString(), PythonLogDecorations);
      editor.setDecorations(DecorationType, PythonLogDecorations);
    }
  }

  async function updateDecorations(document: vscode.TextDocument) {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    if (diagnostics.length > 0) {
      console.log(`[CODE-MENTOR] FOUND ERROR - Skipping instrumented`);
      return;
    }

    console.log(`[CODE-MENTOR] No Errors - Running instrumented Code`);

    const PythonLogDecorations = await runInstrumentedCode(document);
    pythonDecorationsMap.set(document.uri.toString(), PythonLogDecorations);

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
      editor.setDecorations(DecorationType, PythonLogDecorations);
    }
  }

  // === Debounced function to avoid too frequent runs ===
  const debouncedUpdateDecorations = debounce(
    async (document: vscode.TextDocument) => {
      const editor = vscode.window.activeTextEditor;
      if (
        !editor ||
        editor.document.uri.toString() !== document.uri.toString()
      ) {
        console.log(
          `[CODE-MENTOR] No matching active editor inside debounced function`
        );
        return;
      }
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      if (diagnostics.length > 0) {
        console.log(`[CODE-MENTOR] FOUND ERROR - Skipping instrumented`);
        return;
      }
      console.log(`[CODE-MENTOR] No Errors - Running instrumented Code`);

      const PythonLogDecorations = await runInstrumentedCode(document);
      pythonDecorationsMap.set(document.uri.toString(), PythonLogDecorations);

      editor.setDecorations(DecorationType, PythonLogDecorations);
    },
    300
  ); // 90ms debounce

  // === On Save ===
  vscode.workspace.onDidSaveTextDocument(async (document) => {
    if (document.languageId !== "python") {
      console.log(`[CODE-MENTOR] Skipping non-python file`);
      return;
    }

    await updateDecorations(document);
  });

  // === On Change ===
  vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (event.document.languageId !== "python") {
      console.log(`[CODE-MENTOR] Skipping non-python file`);
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      editor.document.uri.toString() !== event.document.uri.toString()
    ) {
      console.log(`[CODE-MENTOR] No matching active editor`);
      return;
    }

    const documentUri = event.document.uri.toString();

    // === Check if only space or newline inserted ===
    const trivialChange = event.contentChanges.every(
      (change) => change.text === "\n"
    );

    if (trivialChange) {
      console.log(
        `[CODE-MENTOR] Trivial change (space/newline) detected - reapplying previous decorations`
      );
      const PythonLogDecorations = pythonDecorationsMap.get(documentUri) ?? [];
      editor.setDecorations(DecorationType, PythonLogDecorations);
      return;
    }

    // Debounce actual heavy update
    debouncedUpdateDecorations(event.document);
  });

  // === onOpen ===
  vscode.workspace.onDidOpenTextDocument(async (document) => {
    if (document.languageId !== "python") {
      console.log(`[CODE-MENTOR] Skipping non-python file on open`);
      return;
    }

    // Delay a tiny bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    await updateDecorations(document);
  });

  // === onClose ===
  vscode.workspace.onDidCloseTextDocument((document) => {
    if (document.languageId !== "python") {
      console.log(`[CODE-MENTOR] Skipping non-python file on close`);
      return;
    }

    console.log(
      `[CODE-MENTOR] Python document closed: ${document.uri.toString()}`
    );
    pythonDecorationsMap.delete(document.uri.toString());

    // Optional: if you want, clear decorations if it was the active file
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
      console.log(`[CODE-MENTOR] Clearing decorations for closed document`);
      editor.setDecorations(DecorationType, []);
    }
  });

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor || editor.document.languageId !== "python") {
      return;
    }

    const PythonLogDecorations =
      pythonDecorationsMap.get(editor.document.uri.toString()) ?? [];
    editor.setDecorations(DecorationType, PythonLogDecorations);
  });

  initializeOpenEditors();
}
