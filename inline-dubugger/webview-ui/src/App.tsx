import { useState, useRef, useEffect } from "react";
import MonacoEditor from "react-monaco-editor";
import ReactSplit from "react-split";
import type { editor } from "monaco-editor";
import TestCaseArea from "./components/TestCaseArea";
import TopBar from "./components/TopBar";
import { data as staticData } from "./data/data";
import { vscode } from "./vscode";

// --------------------------------
// Proper types:
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
  CurrentPanelId?: string; // Added optional field because we send this in manualSaveAndRun
}

interface TestResult {
  status: "pass" | "fail";
  output: string;
  expected: string;
}

interface VscodeMessage {
  type: "loadData" | "testResult";
  data: string;
}
// --------------------------------

function App() {
  const [data, setData] = useState<AssignmentData | null>(null);
  const [currentPanelId, setCurrentPanelId] = useState<string>("1");
  const [code, setCode] = useState<string>("");
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>(
    {}
  );

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (import.meta.env.MODE === "development") {
      console.log("[App] Development mode: loading staticData");
      setData(staticData);
      setCode(staticData.Panels["1"].Code.editor);
    } else {
      console.log("[App] Production mode: waiting for VS Code message");

      const listener = (event: MessageEvent<VscodeMessage>) => {
        const message = event.data;

        if (message.type === "loadData") {
          try {
            const parsed: AssignmentData = JSON.parse(message.data);
            setData(parsed);
            setCode(parsed.Panels["1"].Code.editor);
          } catch (error) {
            console.error("[App] Error parsing assignment data:", error);
          }
        }

        if (message.type === "testResult") {
          try {
            const parsedResults = message.data as unknown as Record<
              number,
              TestResult
            >;
            setTestResults(parsedResults);
            console.log("[App] Test Results:", parsedResults);
          } catch (error) {
            console.error("[App] Error parsing test results:", error);
          }
        }
      };

      window.addEventListener("message", listener);
      return () => window.removeEventListener("message", listener);
    }
  }, []);

  const manualSaveAndRun = () => {
    if (!data) return;

    const updatedData: AssignmentData = {
      ...data,
      Panels: {
        ...data.Panels,
        [currentPanelId]: {
          ...data.Panels[currentPanelId],
          Code: {
            ...data.Panels[currentPanelId].Code,
            editor: code,
          },
        },
      },
      CurrentPanelId: currentPanelId, // Important for backend
    };

    setData(updatedData);
    vscode.setState(updatedData);
    vscode.postMessage({ type: "save", data: JSON.stringify(updatedData) });
    vscode.postMessage({ type: "run", data: JSON.stringify(updatedData) });

    console.log("[App] Manual save + run triggered");

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  if (!data) {
    return <div>Loading...</div>;
  }

  const currentPanel = data.Panels[currentPanelId];

  return (
    <div id="full-page-container">
      <TopBar title={data.Title} onRunClick={manualSaveAndRun} />
      <div id="app-container">
        <div id="sidebar">
          {Object.keys(data.Panels).map((panelId) => (
            <div key={panelId}>
              <button
                onClick={() => {
                  console.log(`[App] Switching to panel ${panelId}`);
                  setCurrentPanelId(panelId);
                  setCode(data.Panels[panelId].Code.editor);
                }}
              >
                {panelId}
              </button>
            </div>
          ))}
        </div>

        <div id="left-panel">
          <div
            id="Frame"
            dangerouslySetInnerHTML={{ __html: currentPanel.question }}
          />
        </div>

        <div id="right-panel">
          <ReactSplit
            direction="vertical"
            sizes={[
              100 - (280 / window.innerHeight) * 100,
              (280 / window.innerHeight) * 100,
            ]}
            minSize={[100, 280]}
            gutterSize={5}
            className="split"
            onDragEnd={() => editorRef.current?.layout()}
          >
            <div className="editor-area">
              <MonacoEditor
                value={code}
                onChange={(newValue) => setCode(newValue ?? "")}
                theme="vs-dark"
                height="100%"
                width="100%"
                language="python"
                editorDidMount={(editorInstance) => {
                  editorRef.current = editorInstance;
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>

            <div className="testcase-area">
              <TestCaseArea
                testCases={currentPanel.Code.TestCase}
                results={testResults}
              />
            </div>
          </ReactSplit>
        </div>
      </div>

      {/* Saved ✅ Toast */}
      {showSavedToast && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            backgroundColor: "#10B981",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "bold",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            zIndex: 9999,
            transition: "opacity 0.3s ease",
          }}
        >
          Saved ✅
        </div>
      )}
    </div>
  );
}

export default App;
