import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import mime from "mime-types";
import { v4 as uuid_v4, validate } from "uuid";
import { FileMetadata, FileSystem } from "./types";

function idName(filename: string) {
  const lastDotIndex = filename.lastIndexOf(".");
  const name_only = filename.substring(0, lastDotIndex + 1);
  const ext = filename.substring(lastDotIndex);

  return `${name_only}${uuid_v4()}${ext}`;
}

const id_name_regex =
  /^(.*\.)?([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12})(\.[^\.]+)?$/;

export class FsFilesystem extends FileSystem {
  initialized = false;

  constructor(public directory: string, public includeFilenames = false) {
    super();
  }

  isValidId(id: string): boolean {
    if (this.includeFilenames) return id_name_regex.test(id);
    return validate(id);
  }

  async init() {
    if (fs.existsSync(this.directory)) {
      if ((await fs.promises.stat(this.directory)).isFile())
        throw new Error(`destination directory is a file ${this.directory}`);
    } else {
      await fs.promises.mkdir(this.directory);
    }
    this.initialized = true;
  }

  async close() {}

  async metadata(id: string) {
    const data = await fs.promises.stat(path.join(this.directory, id));
    const mimetype = mime.lookup(id);
    return {
      id,
      name: this.includeFilenames
        ? id_name_regex.exec(id)?.[1].slice(0, -1) || ""
        : "",
      createdAt: data.birthtime,
      updateAt: data.mtime,
      length: data.size,
      mimetype: mimetype ? mimetype : undefined,
    };
  }

  readFileStream(id: string) {
    return fs.createReadStream(path.join(this.directory, id));
  }

  writeFileStream(metadata: FileMetadata): [Writable, string] {
    const id = this.includeFilenames ? idName(metadata.name) : uuid_v4();

    return [fs.createWriteStream(path.join(this.directory, id)), id];
  }

  readFile(id: string) {
    return fs.promises.readFile(id);
  }

  async writeFile(
    buffer: string | NodeJS.ArrayBufferView,
    metadata: FileMetadata
  ) {
    const id = this.includeFilenames ? idName(metadata.name) : uuid_v4();

    await fs.promises.writeFile(path.join(this.directory, id), buffer);
    return id;
  }

  async deleteFile(id: string) {
    try {
      await fs.promises.unlink(path.join(this.directory, id));
    } catch (error) {
      if (error && (error as any).code == "ENOENT") return;
      throw error;
    }
  }
}
