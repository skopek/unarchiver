import { ByteReader } from "./reader";

enum BlockType {
  NO_COMPRESSION = 0,
  FIXED = 1,
  DYNAMIC = 2,
  ERROR = 3,
}

type CodeMap = Map<number, { codeList: number[]; indexes: number[] }>;

export class LZBuffer {
  private maxSize!: number;

  private mask!: number;

  public dict!: number[];

  private pos!: number;

  private size!: number;

  constructor(s: number) {
    this.maxSize = s;
    this.mask = this.maxSize - 1;
    this.dict = Array.from<number>({ length: this.maxSize });
    this.pos = 0;
    this.size = 0;
  }

  public addByte(b: number) {
    this.dict[this.pos] = b;
    this.pos = (this.pos + 1) & this.mask;

    if (this.size < this.maxSize) this.size++;
  }

  public addBytes(b: number[]) {
    for (let i = 0; i < 0 + b.length; i++) this.addByte(b[i]);
  }

  public getBytes(dist: number, len: number) {
    const bytes = Array.from<number>({ length: len });
    const start = (this.pos - dist) & this.mask;
    let x = start;

    for (let i = 0; i < len; i++) {
      bytes[i] = this.dict[x];
      x = (x + 1) & this.mask;

      if (x == this.pos) x = start;
    }

    return bytes;
  }
}

const LEN_LOWER = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258,
];
const LEN_N_BITS = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];

const DIST_LOWER = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049,
  3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_N_BITS = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];

const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

const END_OF_BLOCK_SYMBOL = 256;

function buildCodes(codeLen: number[]) {
  const n = codeLen.length;
  const codes = Array.from<number>({ length: n });

  const lengthArray = codeLen.filter((len) => len > 0).sort((a, b) => a - b);
  const lengthSet = new Set(lengthArray);

  let code = 0;
  let lastShift = 0;
  for (const length of lengthSet) {
    code <<= length - lastShift;
    lastShift = length;

    for (let i = 0; i < n; i++) {
      if (codeLen[i] == length) codes[i] = code++;
    }
  }

  return codes;
}

function buildCodeMap(codes: number[], codeLen: number[]) {
  const codeMap: CodeMap = new Map();

  codeLen.forEach((len, i) => {
    if (len > 0) {
      let code = codeMap.get(len);

      if (!code) {
        code = { codeList: [], indexes: [] };
        codeMap.set(codeLen[i], code);
      }

      code.codeList.push(codes[i]);
      code.indexes.push(i);
    }
  });

  return codeMap;
}

function readSymbol(reader: ByteReader, codeMap: CodeMap) {
  let value = 0;
  let valueLen = 0;

  while (true) {
    if (valueLen == 15) break;

    value <<= 1;
    value |= reader.readBit();
    valueLen++;

    const code = codeMap.get(valueLen);

    if (code) {
      const index = code.codeList.indexOf(value);

      if (index !== -1) return code.indexes[index];
    }
  }

  throw new Error("Couldn't find code");
}

function readLengths(reader: ByteReader, numLengths: number, codeLengths: number[]) {
  const lengthCodes = buildCodes(codeLengths);
  const lengthCodeMap = buildCodeMap(lengthCodes, codeLengths);

  const lengths = Array.from<number>({ length: numLengths });

  for (let i = 0; i < numLengths; i++) {
    const value = readSymbol(reader, lengthCodeMap);

    if (value == 16) {
      const n = 3 + reader.readBits(2);

      lengths.fill(lengths[i - 1], i, i + n);

      i += n - 1;
    } else if (value == 17) {
      const n = 3 + reader.readBits(3);

      lengths.fill(0, i, i + n);

      i += n - 1;
    } else if (value == 18) {
      const n = 11 + reader.readBits(7);

      lengths.fill(0, i, i + n);

      i += n - 1;
    } else {
      lengths[i] = value;
    }
  }

  return lengths;
}

function readHuffmanBlock(
  reader: ByteReader,
  buffer: LZBuffer,
  out: number[],
  literals: CodeMap,
  distances: CodeMap
) {
  while (true) {
    const litSym = readSymbol(reader, literals);

    if (litSym < END_OF_BLOCK_SYMBOL) {
      const byte = litSym;

      buffer.addByte(byte);

      out.push(byte);
    } else if (litSym == END_OF_BLOCK_SYMBOL) {
      break;
    } else {
      const lenSym = litSym - 257;
      const len = LEN_LOWER[lenSym] + reader.readBits(LEN_N_BITS[lenSym]);

      const distSym = readSymbol(reader, distances);
      const dist = DIST_LOWER[distSym] + reader.readBits(DIST_N_BITS[distSym]);

      const bytes = buffer.getBytes(dist, len);

      buffer.addBytes(bytes);

      out.push(...bytes);
    }
  }
}

function readUncompressedBlock(reader: ByteReader, buffer: LZBuffer, out: number[]) {
  const len = reader.readBytes(2);
  const nlen = reader.readBytes(2);

  if (len !== (nlen ^ 0xffff)) {
    throw new Error("Invalid block");
  }

  for (let i = 0; i < len; i++) {
    const byte = reader.readByte();

    buffer.addByte(byte);
    out.push(byte);
  }
}

function getDefaultLitralsAndDistances() {
  const literalLengths: number[] = [];
  const literalCodes: number[] = [];

  const distanceLengths: number[] = [];
  const distanceCodes: number[] = [];

  let nextCode = 0;
  for (let i = 256; i <= 279; i++) {
    literalCodes[i] = nextCode++;
    literalLengths[i] = 7;
  }

  nextCode <<= 1;
  for (let i = 0; i <= 143; i++) {
    literalCodes[i] = nextCode++;
    literalLengths[i] = 8;
  }
  for (let i = 280; i <= 285; i++) {
    literalCodes[i] = nextCode++;
    literalLengths[i] = 8;
  }
  nextCode += 2;
  nextCode <<= 1;
  for (let i = 144; i <= 255; i++) {
    literalCodes[i] = nextCode++;
    literalLengths[i] = 9;
  }

  for (let i = 0; i <= 29; i++) {
    distanceCodes[i] = i;
    distanceLengths[i] = 5;
  }

  const literals = buildCodeMap(literalCodes, literalLengths);
  const distances = buildCodeMap(distanceCodes, distanceLengths);

  return [literals, distances] as const;
}

function readLitralsAndDistances(reader: ByteReader) {
  const hlit = reader.readBits(5) + 257;
  const hdist = reader.readBits(5) + 1;
  const hclen = reader.readBits(4) + 4;

  const codeLengths = Array.from<number>({ length: 19 }).fill(0);

  for (let i = 0; i < hclen; i++) {
    codeLengths[CODE_LENGTH_ORDER[i]] = reader.readBits(3);
  }

  const numLengths = hlit + hdist;
  const lengths = readLengths(reader, numLengths, codeLengths);

  const literalLengths = lengths.slice(0, hlit);
  const literalCodes = buildCodes(literalLengths);
  const literals = buildCodeMap(literalCodes, literalLengths);

  const distanceLengths = lengths.slice(hlit, numLengths);
  const distanceCodes = buildCodes(distanceLengths);
  const distances = buildCodeMap(distanceCodes, distanceLengths);

  return [literals, distances] as const;
}

export function inflate(reader: ByteReader) {
  const buffer = new LZBuffer(32768);

  const out: number[] = [];

  let isLast: number;
  do {
    isLast = reader.readBit();
    const blockType = reader.readBits(2);

    switch (blockType) {
      case BlockType.NO_COMPRESSION: {
        readUncompressedBlock(reader, buffer, out);
        break;
      }

      case BlockType.FIXED: {
        const [literals, distances] = getDefaultLitralsAndDistances();

        readHuffmanBlock(reader, buffer, out, literals, distances);
        break;
      }

      case BlockType.DYNAMIC: {
        const [literals, distances] = readLitralsAndDistances(reader);

        readHuffmanBlock(reader, buffer, out, literals, distances);
        break;
      }

      default: {
        throw Error("Invalid block type");
      }
    }
  } while (!isLast);

  return out;
}
