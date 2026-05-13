import { describe, expect, it } from "vitest";

import { parseTeamImportInput } from "./teams.parser.js";

describe("parseTeamImportInput", () => {
  it("parses valid slot lines and rejects malformed lines separately", () => {
    const result = parseTeamImportInput(
      [
        "slot 1 -> Team Alpha",
        "invalid@@format",
        "# comment",
        "slot 2: Team Bravo",
        "random text",
      ].join("\n"),
    );

    expect(result.parsedLines).toHaveLength(2);
    expect(result.invalidLines).toHaveLength(3);
    expect(result.invalidLines.map((entry) => entry.reason)).toEqual([
      "INVALID_FORMAT",
      "COMMENT",
      "INVALID_FORMAT",
    ]);
  });
});
