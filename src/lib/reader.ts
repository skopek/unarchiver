export class ByteReader {
  byteIndex = 0;
  bitIndex = 0;

  view: DataView;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  getByte() {
    return this.view.getUint8(this.byteIndex);
  }

  readByte() {
    if (this.bitIndex > 0) {
      this.bitIndex = 0;
      this.byteIndex++;
    }

    const value = this.getByte();

    this.byteIndex++;
    this.bitIndex = 0;

    return value;
  }

  readBytes(amount: number) {
    let value = 0;

    for (let i = 0; i < amount; i++) {
      const byte = this.readByte();

      value |= byte << (i * 8);
    }

    return value;
  }

  readToZeroByte() {
    const bytes: number[] = [];

    let byte: number;

    while (true) {
      byte = this.readByte();

      if (byte !== 0) bytes.push(byte);
      else break;
    }

    return new Uint8Array(bytes);
  }

  readBit() {
    let byte = this.getByte();

    if (this.bitIndex === 8) {
      this.byteIndex++;
      this.bitIndex = 0;

      byte = this.getByte();
    }

    const value = byte & (1 << this.bitIndex) ? 1 : 0;

    this.bitIndex++;

    return value;
  }

  readBits(amount: number) {
    let value = 0;

    for (let i = 0; i < amount; i++) {
      const bit = this.readBit();

      value += bit << i;
    }

    return value;
  }
}
