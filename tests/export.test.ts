// @vitest-environment node
import { describe, expect, it } from "vitest";
import { boardCsv, fileName } from "@/lib/board/export";
import { crc32, zip } from "@/lib/zip";

describe("boardCsv", () => {
  it("lists items by group with their subitems under them, item columns then subitem columns", () => {
    const csv = boardCsv({
      groups: [{ id: "g2", title: "Done", position: 2 }, { id: "g1", title: "Planning", position: 1 }],
      columns: [{ id: "c2", title: "Notes", scope: "item", position: 2 }, { id: "c1", title: "Status", scope: "item", position: 1 }, { id: "s1", title: "Owner", scope: "subitem", position: 1 }],
      items: [{ id: "i1", name: "Brief", group_id: "g1", parent_item_id: null, position: 1 }, { id: "i2", name: "Ship, v1", group_id: "g2", parent_item_id: null, position: 1 }, { id: "sub", name: "Draft", group_id: null, parent_item_id: "i1", position: 1 }],
      text: (i, c) => ({ "i1:c1": "Working on it", "sub:s1": "Ana" } as Record<string, string>)[`${i}:${c}`] ?? "",
    });
    expect(csv.split("\r\n")).toEqual(["Item,Group,Parent,Status,Notes,Owner", "Brief,Planning,,Working on it,,", "Draft,Planning,Brief,,,Ana", '"Ship, v1",Done,,,,', ""]);
  });
  it("makes safe file names", () => { expect(fileName('Q1: plans/ideas?', "csv")).toBe("Q1- plans-ideas-.csv"); expect(fileName("  ", "zip")).toBe("board.zip"); });
});

describe("zip", () => {
  it("writes a stored archive with the right signatures, names and CRC", async () => {
    const blob = zip([{ name: "a.csv", text: "x,y\r\n" }, { name: "b.csv", text: "1,2\r\n" }], new Date(2026, 0, 2, 3, 4, 6));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const u32 = (o: number) => new DataView(bytes.buffer).getUint32(o, true);
    expect(u32(0)).toBe(0x04034b50);
    expect(new TextDecoder().decode(bytes.slice(30, 35))).toBe("a.csv");
    expect(u32(14)).toBe(crc32(new TextEncoder().encode("x,y\r\n")));
    const second = 30 + 5 + 5;
    expect(u32(second)).toBe(0x04034b50);
    const cdStart = second + 30 + 5 + 5;
    expect(u32(cdStart)).toBe(0x02014b50);
    expect(u32(bytes.length - 22)).toBe(0x06054b50);
    expect(new DataView(bytes.buffer).getUint16(bytes.length - 22 + 10, true)).toBe(2);
    expect(u32(bytes.length - 22 + 16)).toBe(cdStart);
  });
  it("crc32 matches the known value for 'hello'", () => { expect(crc32(new TextEncoder().encode("hello"))).toBe(0x3610a686); });
});
