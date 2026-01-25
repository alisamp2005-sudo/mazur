import { describe, it, expect } from "vitest";
import { getOperatorStatuses, hasAvailableOperators } from "./3cx-api";

describe("3CX API Integration", () => {
  it("should connect to 3CX API and get operator statuses", async () => {
    const extensions = ["1000", "2000", "3000", "4000"];

    const statuses = await getOperatorStatuses(extensions);

    console.log("[3CX Test] Operator statuses:", statuses);

    expect(statuses).toBeDefined();
    expect(statuses.length).toBe(4);

    // Check that each extension has a status
    for (const ext of extensions) {
      const status = statuses.find((s) => s.extension === ext);
      expect(status).toBeDefined();
      expect(status?.status).toBeDefined();
      console.log(
        `[3CX Test] Extension ${ext}: ${status?.status} (Available: ${status?.isAvailable})`
      );
    }
  });

  it("should check if any operators are available", async () => {
    const extensions = ["1000", "2000", "3000", "4000"];

    const hasAvailable = await hasAvailableOperators(extensions);

    console.log("[3CX Test] Has available operators:", hasAvailable);

    expect(typeof hasAvailable).toBe("boolean");
  });
});
