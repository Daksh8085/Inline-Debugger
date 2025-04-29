"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
function TestCaseArea({ testCases, }) {
    const [currentTestCaseId, setCurrentTestCaseId] = (0, react_1.useState)(1);
    const currentTestCase = testCases[currentTestCaseId];
    return (<div className="testcase-area">
      {/* Test Case Tabs */}
      <div className="testcase-tabs">
        {Object.keys(testCases).map((id) => (<button key={id} className={`testcase-tab-button ${Number(id) === currentTestCaseId ? "active" : ""}`} onClick={() => setCurrentTestCaseId(Number(id))}>
            Test Case {id}
          </button>))}
      </div>

      {/* Input Format */}
      <div className="testcase-section">Input Format</div>
      <div className="testcase-box">{currentTestCase.input || "-"}</div>

      {/* Output Format */}
      <div className="testcase-section">Output Format</div>
      <div className="testcase-box">{currentTestCase.output || "-"}</div>

      {/* Your Output (empty for now) */}
      <div className="testcase-section">Your Output</div>
      <div className="testcase-box">OUTPUT PRODUCED BY YOUR CODE</div>
    </div>);
}
exports.default = TestCaseArea;
//# sourceMappingURL=TestCaseArea.js.map