import { describe, expect, it } from "vitest";
import {
  approvedSteps,
  canAutoApply,
  moveStep,
  newTask,
  nextRunnable,
  queueSummary,
  removeStep,
  toPlanSteps,
  toggleStep,
  updateTask,
} from "@/lib/builder-queue";

const withSteps = (destructive = false) => {
  const task = newTask("Add a services page");
  return {
    ...task,
    steps: toPlanSteps([
      { key: "a", title: "Create the services page", where: "Services", destructive: false },
      { key: "b", title: "Remove the old block", where: "Home", destructive },
    ]),
  };
};

describe("builder queue", () => {
  it("runs one request at a time", () => {
    const a = newTask("first");
    const b = newTask("second");
    expect(nextRunnable([a, b])?.instruction).toBe("first");
    const busy = updateTask([a, b], a.id, { state: "building" });
    expect(nextRunnable(busy)).toBeNull();
  });

  it("only builds steps the owner kept", () => {
    let task = withSteps();
    task = toggleStep(task, "b");
    expect(approvedSteps(task).map((s) => s.key)).toEqual(["a"]);
    task = removeStep(task, "a");
    expect(task.steps).toHaveLength(1);
  });

  it("reorders steps and stops at the ends", () => {
    const task = withSteps();
    expect(moveStep(task, "b", -1).steps.map((s) => s.key)).toEqual(["b", "a"]);
    expect(moveStep(task, "a", -1).steps.map((s) => s.key)).toEqual(["a", "b"]);
  });

  it("never auto-applies a plan that removes content or asks a question", () => {
    expect(canAutoApply(withSteps(false))).toBe(true);
    expect(canAutoApply(withSteps(true))).toBe(false);
    expect(canAutoApply({ ...withSteps(false), questions: ["Which city?"] })).toBe(false);
    expect(canAutoApply({ ...withSteps(false), steps: [] })).toBe(false);
  });

  it("summarises the queue without inventing progress", () => {
    expect(queueSummary([])).toBe("");
    const a = { ...newTask("one"), state: "complete" as const };
    const b = { ...newTask("two"), state: "failed" as const };
    const c = newTask("three");
    expect(queueSummary([a, b, c])).toBe("1 done · 1 waiting · 1 didn't work");
  });
});
