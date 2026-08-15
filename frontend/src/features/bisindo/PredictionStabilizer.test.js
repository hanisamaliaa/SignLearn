import assert from "node:assert/strict";
import test from "node:test";
import { PredictionStabilizer, RejectionReason } from "./PredictionStabilizer.js";

const config = {
  uncertainConfidence: 0.4,
  minConfidence: 0.5,
  minMargin: 0.05,
  highConfidence: 0.8,
  highConfidenceMinMargin: 0.03,
  predictionWindow: 5,
  minimumVotes: 3,
  stableDurationMs: 180,
  fastConfidence: 0.85,
  fastMargin: 0.15,
  fastVotes: 2,
  fastWindow: 3,
  keepConfidence: 0.4,
  releaseDurationMs: 180,
  releaseVotes: 2,
  duplicateCooldownMs: 250,
  smoothingAlpha: 1,
};

const frame = (label, confidence = 0.7, runnerUp = "D", second = 0.1) => ({
  detected: true,
  label,
  confidence,
  probabilities: { [label]: confidence, [runnerUp]: second },
});

function collect(stabilizer, inputs, step = 90) {
  return inputs.flatMap((input, index) => {
    const result = stabilizer.update(input, index * step);
    return result.committedCharacter ? [result.committedCharacter] : [];
  });
}

test("normal acceptance commits after a 3/5 majority in about 180 ms", () => {
  const stabilizer = new PredictionStabilizer(config);
  const results = [0, 90, 180].map((time) => stabilizer.update(frame("B"), time));
  assert.equal(results[1].rejectionReason, RejectionReason.NOT_STABLE_YET);
  assert.equal(results[2].committedCharacter, "B");
  assert.equal(results[2].stableFrames, 3);
  assert.equal(results[2].stableDuration, 180);
});

test("fast acceptance commits a very clear gesture after two frames", () => {
  const stabilizer = new PredictionStabilizer(config);
  assert.equal(stabilizer.update(frame("A", 0.92, "D", 0.03), 0).committedCharacter, null);
  assert.equal(stabilizer.update(frame("A", 0.91, "D", 0.04), 90).committedCharacter, "A");
});

test("one noisy frame does not reset a B majority", () => {
  const stabilizer = new PredictionStabilizer(config);
  const commits = collect(stabilizer, [frame("B"), frame("B"), frame("D"), frame("B")]);
  assert.deepEqual(commits, ["B"]);
});

test("held gesture commits once without character spam", () => {
  const stabilizer = new PredictionStabilizer(config);
  const commits = collect(stabilizer, Array.from({ length: 34 }, () => frame("A")));
  assert.deepEqual(commits, ["A"]);
});

test("different stable letters transition directly without removing the hand", () => {
  const stabilizer = new PredictionStabilizer(config);
  const inputs = [
    frame("A"), frame("A"), frame("A"),
    frame("B"), frame("B"), frame("B"), frame("B"), frame("B"),
    frame("C"), frame("C"), frame("C"), frame("C"), frame("C"),
  ];
  assert.deepEqual(collect(stabilizer, inputs), ["A", "B", "C"]);
});

test("default EMA smoothing still permits direct A to B to C transitions", () => {
  const stabilizer = new PredictionStabilizer({ ...config, smoothingAlpha: 0.45 });
  const inputs = [
    ...Array.from({ length: 5 }, () => frame("A")),
    ...Array.from({ length: 7 }, () => frame("B")),
    ...Array.from({ length: 7 }, () => frame("C")),
  ];
  assert.deepEqual(collect(stabilizer, inputs), ["A", "B", "C"]);
});

test("intentional duplicate is allowed after a timed no-hand release", () => {
  const stabilizer = new PredictionStabilizer(config);
  const inputs = [
    frame("L"), frame("L"), frame("L"),
    { detected: false }, { detected: false }, { detected: false },
    frame("L"), frame("L"), frame("L"),
  ];
  assert.deepEqual(collect(stabilizer, inputs), ["L", "L"]);
});

test("brief low-confidence noise neither commits nor unlocks a duplicate", () => {
  const stabilizer = new PredictionStabilizer(config);
  const weak = frame("A", 0.3, "D", 0.28);
  const inputs = [frame("A"), frame("A"), frame("A"), weak, frame("A"), frame("A"), frame("A")];
  assert.deepEqual(collect(stabilizer, inputs), ["A"]);
});

test("ambiguous margin is rejected with explicit debug telemetry", () => {
  const stabilizer = new PredictionStabilizer(config);
  const ambiguous = frame("B", 0.6, "D", 0.57);
  stabilizer.update(ambiguous, 0);
  stabilizer.update(ambiguous, 90);
  const result = stabilizer.update(ambiguous, 180);
  assert.equal(result.committedCharacter, null);
  assert.equal(result.rejectionReason, RejectionReason.LOW_MARGIN);
  assert.equal(result.handDetected, true);
  assert.equal(result.rawPrediction, "B");
  assert.equal(result.smoothedPrediction, "B");
  assert.equal(result.stableFrames, 3);
});

test("no-hand and low-confidence frames never commit", () => {
  const stabilizer = new PredictionStabilizer(config);
  assert.equal(stabilizer.update({ detected: false }, 0).rejectionReason, RejectionReason.NO_HAND);
  assert.equal(stabilizer.update(frame("B", 0.3, "D", 0.28), 90).committedCharacter, null);
});

test("server-rejected frames never vote or unlock a held duplicate", () => {
  const stabilizer = new PredictionStabilizer(config);
  const rejected = { ...frame("A", 0.92), accepted: false, rejectionReason: "low_confidence" };
  const inputs = [frame("A"), frame("A"), frame("A"), rejected, rejected, rejected,
    frame("A"), frame("A"), frame("A")];
  assert.deepEqual(collect(stabilizer, inputs), ["A"]);
  assert.equal(stabilizer.update(rejected, 900).rejectionReason, RejectionReason.MODEL_REJECTED);
});
