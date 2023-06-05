import { inflate } from "./deflate";
import { ByteReader } from "./reader";

enum Flags {
  FTEXT = 1,
  FHCRC = 2,
  FEXTRA = 4,
  FNAME = 8,
  FCOMMENT = 16,
}

export function checkIsGzip(reader: ByteReader) {
  const id1 = reader.readByte();
  const id2 = reader.readByte();

  return id1 === 0x1f && id2 === 0x8b;
}

export function decompressGzip(reader: ByteReader) {
  const method = reader.readByte();
  const flags = reader.readByte();

  reader.readBytes(4); // skip time
  reader.readByte(); // skip extra flags
  reader.readByte(); // skip os

  if (method !== 8) throw new Error("Unsupported compression method");

  if (Flags.FEXTRA & flags) {
    const xlen = reader.readBytes(2);

    for (let i = 0; i < xlen; i++) {
      reader.readByte(); // skip
    }
  }

  if (Flags.FNAME & flags) {
    reader.readToZeroByte(); // skip
  }

  if (Flags.FCOMMENT & flags) {
    reader.readToZeroByte(); // skip
  }

  if (Flags.FHCRC & flags) {
    reader.readBytes(2); // skip crc16
  }

  const out = inflate(reader);

  reader.readBytes(4); // skip crc32
  const size = reader.readBytes(4);

  if (out.length !== size)
    throw new Error(`Size mismatch, expected = ${size}, actual = ${out.length}`);

  return new Uint8Array(out);
}
