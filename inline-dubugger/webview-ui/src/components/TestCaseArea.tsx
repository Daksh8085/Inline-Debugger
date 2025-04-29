import { useState } from "react";

interface TestResult {
  status: "pass" | "fail";
  output: string;
  expected: string;
}

interface TestCaseAreaProps {
  testCases: Record<number, { input: string; output: string }>;
  results?: Record<number, TestResult>;
}

export default function TestCaseArea({
  testCases,
  results = {},
}: TestCaseAreaProps) {
  const [activeTab, setActiveTab] = useState<number>(1);

  const testCaseKeys = Object.keys(testCases).map(Number);
  const activeTestCase = testCases[activeTab];
  const activeResult = results[activeTab];

  return (
    <div>
      {/* Tabs */}
      <div className="testcase-tabs">
        {testCaseKeys.map((key) => (
          <button
            key={key}
            className={`testcase-tab-button ${
              activeTab === key ? "active" : ""
            }`}
            onClick={() => setActiveTab(key)}
          >
            Test Case {key}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTestCase && (
        <div>
          <div className="testcase-section">Input Format</div>
          <div className="testcase-box">{activeTestCase.input}</div>

          <div className="testcase-section">Expected Output</div>
          <div className="testcase-box">{activeTestCase.output}</div>

          <div className="testcase-section">Your Output</div>
          <div
            className={`testcase-box ${
              activeResult?.status === "pass"
                ? "output-pass"
                : activeResult?.status === "fail"
                ? "output-fail"
                : ""
            }`}
          >
            {activeResult ? activeResult.output : "Pending..."}
          </div>
        </div>
      )}
    </div>
  );
}
