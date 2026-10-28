// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes commas, quotes and line breaks, and leaves plain fields bare", () => {
    expect(toCsv([["Item", "Note", "Count"], ["a,b", 'say "hi"', 3], ["line\nbreak", null, undefined]]))
      .toBe('Item,Note,Count\r\n"a,b","say ""hi""",3\r\n"line\nbreak",,\r\n');
  });
});
