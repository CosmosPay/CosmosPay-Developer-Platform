/* zip.ts: a ZIP archive (PKWARE APPNOTE 6.3, the subset every unzip tool reads) written and read
   with Node's own zlib, so the brand kit (src/lib/site/brand-kit.ts) needs no archive dependency.

   Written: one local header and its data per entry, then the central directory and its end record;
   names in UTF-8 (general purpose bit 11), each entry deflated when that makes it smaller and stored
   otherwise (a PNG barely shrinks), no ZIP64 (an archive under 4 GiB and 65,535 entries). Every
   entry carries the same fixed timestamp, so the same files always make the same bytes: a rebuild
   with nothing changed serves an identical archive. Read: the central directory, each entry checked
   against its CRC-32, for the tests and the smoke test. Node only (node:zlib). */
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

export interface ZipEntry {
  /** The path inside the archive, with forward slashes and no leading slash. */
  name: string;
  data: Uint8Array;
}

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
const UTF8_NAMES = 0x0800;
const STORED = 0;
const DEFLATED = 8;
/* 1 January 2026, 00:00, as MS-DOS writes a date and a time: the archive's one timestamp. */
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

function checkName(name: string): void {
  if (!name || name.startsWith("/") || name.includes("\\") || name.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`zip: "${name}" is not a relative path with forward slashes`);
  }
}

/** The archive holding `entries`, in their order. Names must be unique relative paths. */
export function zip(entries: readonly ZipEntry[]): Buffer {
  const seen = new Set<string>();
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    checkName(entry.name);
    if (seen.has(entry.name)) throw new Error(`zip: "${entry.name}" is in the archive twice`);
    seen.add(entry.name);
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data.buffer, entry.data.byteOffset, entry.data.byteLength);
    const deflated = deflateRawSync(data, { level: 9 });
    const method = deflated.length < data.length ? DEFLATED : STORED;
    const body = method === DEFLATED ? deflated : data;
    const crc = crc32(data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL, 0);
    local.writeUInt16LE(20, 4); // version needed to extract: 2.0 (deflate)
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL, 0);
    central.writeUInt16LE(20, 4); // made by: 2.0, MS-DOS attributes (none set)
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_NAMES, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

/** The entries of an archive `zip` wrote (or any one without ZIP64, encryption or data
 *  descriptors), each inflated and checked against its CRC-32. Throws on anything else. */
export function unzip(archive: Uint8Array): ZipEntry[] {
  const buf = Buffer.from(archive.buffer, archive.byteOffset, archive.byteLength);
  const endAt = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endAt < 0 || endAt + 22 > buf.length) throw new Error("unzip: no end of central directory record");
  const count = buf.readUInt16LE(endAt + 10);
  let at = buf.readUInt32LE(endAt + 16);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== CENTRAL) throw new Error(`unzip: central directory entry ${i} is malformed`);
    const flags = buf.readUInt16LE(at + 8);
    const method = buf.readUInt16LE(at + 10);
    const crc = buf.readUInt32LE(at + 16);
    const size = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const extraLength = buf.readUInt16LE(at + 30);
    const commentLength = buf.readUInt16LE(at + 32);
    const localAt = buf.readUInt32LE(at + 42);
    const name = buf.toString(flags & UTF8_NAMES ? "utf8" : "latin1", at + 46, at + 46 + nameLength);
    if (buf.readUInt32LE(localAt) !== LOCAL) throw new Error(`unzip: ${name} has no local header`);
    const dataAt = localAt + 30 + buf.readUInt16LE(localAt + 26) + buf.readUInt16LE(localAt + 28);
    const body = buf.subarray(dataAt, dataAt + size);
    const data = method === STORED ? Buffer.from(body) : method === DEFLATED ? inflateRawSync(body) : null;
    if (!data) throw new Error(`unzip: ${name} uses compression method ${method}`);
    if ((crc32(data) >>> 0) !== crc) throw new Error(`unzip: ${name} fails its CRC-32`);
    entries.push({ name, data });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
