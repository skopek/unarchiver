import { FileInfo } from "./file";

enum TarFileType {
  REGTYPE = "0" /* regular file */,
  AREGTYPE = "\0" /* regular file */,
  LNKTYPE = "1" /* link */,
  SYMTYPE = "2" /* reserved */,
  CHRTYPE = "3" /* character special */,
  BLKTYPE = "4" /* block special */,
  DIRTYPE = "5" /* directory */,
  FIFOTYPE = "6" /* FIFO special */,
  CONTTYPE = "7" /* reserved */,
  XHDTYPE = "x" /* Extended header referring to the next file in the archive */,
  XGLTYPE = "g" /* Global extended header */,
}

interface TarFile {
  name: string;
  mode: string;
  uid: string;
  gid: string;
  size: number;
  mtime: string;
  chksum: string;
  typeflag: TarFileType;
  linkname: string;
  magic: string;
  version: string;
  uname: string;
  gname: string;
  devmajor: string;
  devminor: string;
  prefix: string;
  body: Uint8Array;
}

function validateTypeFlag(type: string): asserts type is TarFileType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!Object.values(TarFileType as any).includes(type)) {
    throw new Error(`Wrong typeflag "${type}"`);
  }
}

export function checkIsTar(byteArray: Uint8Array) {
  const textDecoder = new TextDecoder();
  const part = byteArray.slice(257, 262);

  return textDecoder.decode(part) === "ustar";
}

export function readTar(byteArray: Uint8Array) {
  const textDecoder = new TextDecoder();

  const tarballFiles: TarFile[] = [];

  let pos = 0;
  while (byteArray.length > pos) {
    const header = textDecoder.decode(byteArray.slice(pos, pos + 512));
    pos += 512;

    const fileName = header.slice(0, 100).replace(/\0/g, "");
    const mode = header.slice(100, 108).replace(/\0/g, "");
    const uid = header.slice(108, 116).replace(/\0/g, "");
    const gid = header.slice(116, 124).replace(/\0/g, "");
    const fileSize = parseInt(header.slice(124, 135), 8);
    const mtime = header.slice(136, 148).replace(/\0/g, "");
    const chksum = header.slice(148, 156).replace(/\0/g, "");
    const typeflag = header.slice(156, 157);
    const linkname = header.slice(157, 257).replace(/\0/g, "");
    const magic = header.slice(257, 263).replace(/\0/g, "");
    const version = header.slice(263, 265).replace(/\0/g, "");
    const uname = header.slice(265, 297).replace(/\0/g, "");
    const gname = header.slice(297, 329).replace(/\0/g, "");
    const devmajor = header.slice(329, 337).replace(/\0/g, "");
    const devminor = header.slice(337, 345).replace(/\0/g, "");
    const prefix = header.slice(345, 500).replace(/\0/g, "");

    const body = byteArray.slice(pos, pos + fileSize);
    pos += fileSize;

    validateTypeFlag(typeflag);

    tarballFiles.push({
      mode,
      uid,
      gid,
      mtime,
      chksum,
      typeflag,
      linkname,
      magic,
      version,
      uname,
      gname,
      devmajor,
      devminor,
      prefix,
      body,
      name: fileName,
      size: fileSize,
    });

    let x = 0;
    while (x === 0) x = byteArray[pos++];
    pos--;
  }

  const files: FileInfo[] = [];

  for (const tarballFile of tarballFiles) {
    if ([TarFileType.REGTYPE, TarFileType.AREGTYPE].includes(tarballFile.typeflag))
      files.push(tarballFile);
  }

  return files;
}
