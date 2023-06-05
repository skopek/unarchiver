import fs from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";
import { unarchive } from "../lib/unarchive";

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);

  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }

  return arrayBuffer;
}

const FILES = ["archive.tgz", "archive.tar"];

test.each(FILES)("unarchive(%s)", async (filename) => {
  const path = join(__dirname, "fixtures", filename);
  const file = await fs.readFile(path);
  const buffer = toArrayBuffer(file);

  const files = unarchive(buffer);
  const fileNames = files.map((file) => file.name);

  expect(fileNames.includes("test/file.txt")).toBe(true);

  const decoder = new TextDecoder();
  const body = decoder.decode(files.find((file) => file.name === "test/file.txt")?.body);

  expect(body).toBe("Lorem ipsum dolor sit amet consectetur adipisicing elit. Reiciendis, cumque.");
});
