import * as vscode from "vscode";
import * as fs from "fs";
import * as tmp from "tmp";
import { exec } from "child_process";

export async function runInstrumentedCode(
  document: vscode.TextDocument
): Promise<vscode.DecorationOptions[]> {
  console.log(`[CODE-MENTOR-RUNNER] Running instrumented Python code...`);

  const originalCode = document.getText();
  const lines = originalCode.split("\n");
  const instrumentedLines: string[] = [];

  console.log(`[CODE-MENTOR-RUNNER] Document has ${lines.length} lines`);

  let insideMain = false;
  let mainIndentLevel: number | null = null;
  let insideTopLevelCondition = false;
  let previousConditions: string[] = [];

  lines.forEach((line, index) => {
    const stripped = line.trim();
    const instrumented: string[] = [];
    const indent = line.match(/^\s*/)?.[0] ?? "";
    const lineNumber = index + 1;
    const indentLevel = indent.length;

    if (/^def\s+main\s*\(\s*\)\s*:\s*$/.test(stripped)) {
      insideMain = true;
      mainIndentLevel = indentLevel;
      console.log(
        `[INLINE-DEBUGGER-RUNNER] Entered main() scope at line ${lineNumber}`
      );
    } else if (
      insideMain &&
      indentLevel <= (mainIndentLevel ?? 0) &&
      stripped !== ""
    ) {
      insideMain = false;
      mainIndentLevel = null;
      console.log(
        `[INLINE-DEBUGGER-RUNNER] Exited main() scope at line ${lineNumber}`
      );
    }

    const inGlobalScope = indentLevel === 0;
    const allowLog = inGlobalScope || insideMain;

    /**
     * INSERT LOGS ABOVE LINE
     */

    // Start of top-level if/elif/else block
    if (inGlobalScope && /^\s*(if|elif|else).*:\s*$/.test(stripped)) {
      if (!insideTopLevelCondition) {
        insideTopLevelCondition = true;
      }

      const condMatch = stripped.match(/^\s*(if|elif)\s+(.*):$/);
      const condition = condMatch?.[2]?.trim();

      if (condition) {
        // For 'if' and 'elif'
        let fullCondition = "";

        if (previousConditions.length > 0) {
          const negated = previousConditions
            .map((c) => `not(${c})`)
            .join(" and ");
          fullCondition = `${negated} and (${condition})`;
        } else {
          fullCondition = `(${condition})`;
        }

        instrumentedLines.push(
          `${indent}print("[LINE ${lineNumber}]", ${fullCondition})`
        );
        instrumentedLines.push(`${indent}if ${fullCondition}:`);

        previousConditions.push(condition);
        return;
      } else {
        // ELSE BLOCK
        if (previousConditions.length > 0) {
          const negated = previousConditions
            .map((c) => `not(${c})`)
            .join(" and ");
          // instrumentedLines.push(
          //   `${indent}print("[LINE ${lineNumber}]", ${negated})`
          // );
          instrumentedLines.push(`${indent}if ${negated}:`);
          return;
        }
      }
      instrumentedLines.push(line.replace("elif", "if")); // normalize
      return;
    }

    if (
      inGlobalScope &&
      insideTopLevelCondition &&
      stripped !== "" &&
      !/^\s*(if|elif|else).*:\s*$/.test(stripped)
    ) {
      previousConditions = [];
      insideTopLevelCondition = false;
    }

    if (allowLog || insideTopLevelCondition) {
      // Return statement logging
      if (/^\s*return\s+.+/.test(line)) {
        const returnExpr = line.trim().slice(7);
        instrumented.push(
          `${indent}print("[LINE ${lineNumber}]", ${returnExpr})`
        );
      }
    }

    instrumented.push(line);

    if (allowLog || insideTopLevelCondition) {
      // Variable assignment
      if (/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(line)) {
        const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
        const varName = match?.[1];
        if (varName) {
          instrumented.push(
            `${indent}print("[LINE ${lineNumber}]", ${varName})`
          );
        }
      }

      // print() logging
      const printMatch = stripped.match(/^print\s*\((.+)\)$/);
      if (printMatch && printMatch[1]) {
        instrumented.push(
          `${indent}print("[LINE ${lineNumber}]", ${printMatch[1]})`
        );
      }
    }

    instrumentedLines.push(...instrumented);
  });

  const instrumentedCode = instrumentedLines.join("\n");
  console.log(`[CODE-MENTOR-RUNNER] Instrumented Code:\n`, instrumentedCode);

  const decorations = await executeInstrumentedCode(instrumentedCode, lines);
  console.log(`[CODE-MENTOR-RUNNER] Total decorations: ${decorations.length}`);

  for (const deco of decorations) {
    console.log(
      `[CODE-MENTOR-RUNNER-DECO] line ${deco.range.start.line + 1}, Message: ${
        deco.renderOptions?.after?.contentText
      }`
    );
  }
  return decorations;
}

function executeInstrumentedCode(
  code: string,
  OriginalCode: string[]
): Promise<vscode.DecorationOptions[]> {
  return new Promise((resolve) => {
    tmp.file({ postfix: ".py" }, (err, path, _fd, cleanup) => {
      if (err) {
        console.log(`[CODE-MENTOR-RUNNER] tmp file error:`, err);
        return resolve([]);
      }

      fs.writeFileSync(path, code);
      console.log(`[CODE-MENTOR-RUNNER] Temp file written to ${path}`);

      exec(`python "${path}"`, (error, stdout, stderr) => {
        const decorations: vscode.DecorationOptions[] = [];
        const lines = stdout.split("\n");

        console.log(`[CODE-MENTOR-RUNNER] Output: ${stdout}`);

        if (stderr) {
          console.log(`[CODE-MENTOR-RUNNER] STDError: ${stderr}`);
        }
        if (error) {
          console.log(`[CODE-MENTOR-RUNNER] ErrorMessage: ${error.message}`);
          console.log(`[CODE-MENTOR-RUNNER] ErrorOutput: ${error.stdout}`);
        }

        for (const line of lines) {
          const match = line.trim().match(/^\[LINE (\d+)\] (.+)$/);
          if (match) {
            const lineNum = parseInt(match[1]) - 1;
            if (lineNum < 0 || lineNum >= OriginalCode.length) {
              continue;
            }

            const content = match[2];
            const range = new vscode.Range(
              new vscode.Position(lineNum, OriginalCode[lineNum].length),
              new vscode.Position(lineNum, OriginalCode[lineNum].length)
            );

            decorations.push({
              range,
              renderOptions: {
                after: {
                  contentText: `  ${content}`,
                  color: "blue",
                  fontStyle: "italic",
                  margin: "0 0 0 1rem",
                },
              },
            });

            console.log(
              `[CODE-MENTOR-RUNNER] Created decoration for line ${
                lineNum + 1
              }: ${content}`
            );
          }
        }

        cleanup();
        resolve(decorations);
      });
    });
  });
}
