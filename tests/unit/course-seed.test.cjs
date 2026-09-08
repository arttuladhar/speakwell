const assert = require("node:assert/strict");
const test = require("node:test");
const { corePracticeLoop, days } = require("../../data/courseSeed");

test("course seed provides the ten ordered workshop days", () => {
  assert.equal(days.length, 10);
  assert.deepEqual(
    days.map((day) => day.day),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
});

test("each course day includes complete practice content", () => {
  for (const day of days) {
    assert.ok(day.title);
    assert.ok(day.focus);
    assert.ok(day.presentation);
    assert.ok(day.exerciseDuration);
    assert.ok(day.exercise.length > 0);
    assert.ok(day.reflection.length > 0);
    assert.equal(day.resources.length, 2);
  }
});

test("core practice loop keeps its three review passes", () => {
  assert.equal(corePracticeLoop.length, 3);
  assert.ok(corePracticeLoop.every((step) => typeof step === "string"));
});