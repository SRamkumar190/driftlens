import assert from "node:assert/strict";
import test from "node:test";

import {
  InvestigationValidationError,
  validateRocketRideResult,
} from "../src/index.js";

const validResult = {
  component_id: "controller_01",
  status: "unreviewed_drift",
  confidence: 0.96,
  conclusion: "Implementation changed without complete review evidence",
  recommended_action: "Send for engineering and quality review",
};

test("minimum required RocketRide result is valid", () => {
  assert.deepEqual(validateRocketRideResult(validResult), validResult);
});

for (const [name, value, expectedMessage] of [
  [
    "empty component ID",
    { ...validResult, component_id: " " },
    "component_id",
  ],
  [
    "invalid status",
    { ...validResult, status: "approved" },
    "status",
  ],
  [
    "confidence below zero",
    { ...validResult, confidence: -0.1 },
    "confidence",
  ],
  [
    "confidence above one",
    { ...validResult, confidence: 1.1 },
    "confidence",
  ],
  [
    "missing conclusion",
    { ...validResult, conclusion: "" },
    "conclusion",
  ],
  [
    "missing recommended action",
    { ...validResult, recommended_action: "" },
    "recommended_action",
  ],
] as const) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => validateRocketRideResult(value),
      (error: unknown) =>
        error instanceof InvestigationValidationError &&
        error.message.includes(expectedMessage),
    );
  });
}
