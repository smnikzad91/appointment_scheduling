// node --test scripts/uptime-monitor.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const { decide } = require("./uptime-monitor.cjs");

const up = { api: true, web: true };
const apiDown = { api: "HTTP 503", web: true };

function run(sequence) {
  let state = {};
  const sent = [];
  for (const results of sequence) {
    const { next, messages } = decide(state, results);
    state = next;
    sent.push(messages.map((m) => `${m.kind}:${m.id}`));
  }
  return { state, sent };
}

test("alerts once after 3 consecutive failures, then once on recovery", () => {
  const { sent } = run([apiDown, apiDown, apiDown, apiDown, apiDown, up, up]);
  assert.deepEqual(sent, [[], [], ["down:api"], [], [], ["recovered:api"], []]);
});

test("a blip shorter than 3 minutes never alerts, and resets the count", () => {
  const { sent } = run([apiDown, apiDown, up, apiDown, apiDown, up]);
  assert.deepEqual(sent.flat(), []);
});

test("each target is tracked on its own", () => {
  const bothDown = { api: "no connection", web: "timeout" };
  const { sent } = run([bothDown, bothDown, apiDown, apiDown]);
  assert.deepEqual(sent, [[], [], ["down:api"], []]); // web recovered before its 3rd failure
});

test("the alert says what failed", () => {
  const { messages } = decide({ api: { fails: 2, alerted: false } }, { api: "HTTP 503", web: true });
  assert.match(messages[0].text, /API/);
  assert.match(messages[0].text, /HTTP 503/);
});
