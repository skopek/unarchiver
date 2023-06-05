import { checkIsGzip, decompressGzip } from "./gzip";
import { ByteReader } from "./reader";
import { checkIsTar, readTar } from "./tar";

export function unarchive(buffer: ArrayBuffer) {
  const reader = new ByteReader(buffer);

  if (checkIsGzip(reader)) {
    const out = decompressGzip(reader);

    return readTar(out);
  }

  const byteArray = new Uint8Array(buffer);

  if (checkIsTar(byteArray)) return readTar(byteArray);

  throw new Error("File not supported");
}
