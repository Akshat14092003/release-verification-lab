// Machine-readable progress from real Playwright events, consumed by the demo server.
import { isAssertionFailure } from "../src/defects.js";
function emit(event) {
  process.stdout.write("@@LAB_EVENT " + JSON.stringify(event) + "\n");
}

export default class LiveReporter {
  onBegin(config, suite) {
    emit({ type: "begin", total: suite.allTests().length });
  }
  onTestBegin(test) {
    emit({ type: "test-start", id: test.id, title: test.title, project: test.parent.project().name });
  }
  onTestEnd(test, result) {
    emit({ type: "test-end", id: test.id, title: test.title, project: test.parent.project().name, status: result.status,
      assertionFailure: isAssertionFailure(result) });
  }
  onEnd() {
    // HTML, JSON and attachments are written after this event, before CLI exit.
    emit({ type: "tests-finished" });
  }
}
