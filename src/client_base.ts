import { ToFilter, noFn } from "./types";

export interface WebRunner {
  fetcher: typeof fetch;
}

export const RUNNER: WebRunner = {
  fetcher: fetch,
};

export class Model {
  static collection: string;
  static hasFiles: boolean;

  static _new<T extends typeof Model>(this: T, object: any) {
    const o = new this();
    Object.assign(o, object);
    return o as InstanceType<T>;
  }

  static validate(
    object: any,
    error = false,
    removeExtra = true,
    toObjectId = false
  ): string | void {}

  static async findById<T extends typeof Model>(
    this: T,
    id: string,
    useGET = false
  ) {
    const req = await RUNNER.fetcher(`/${this.collection}/list?limit=1`, {
      method: !useGET ? "SEARCH" : "GET",
      body: JSON.stringify({ _id: id }),
      headers: { "Content-Type": "application/json" },
    });
    if (!req.ok) throw new Error();
    const result = await req.json();
    return this._new(Array.isArray(result) ? result[0] : result);
  }

  static async findByIds<T extends typeof Model>(
    this: T,
    ids: string[],
    useGET = false
  ) {
    const req = await RUNNER.fetcher(`/${this.collection}/list`, {
      method: !useGET ? "SEARCH" : "GET",
      body: JSON.stringify({ _id: { $in: ids } }),
      headers: { "Content-Type": "application/json" },
    });
    if (!req.ok) throw new Error();
    const result = (await req.json()) as any[];
    return result.map((o) => this._new(o));
  }

  static async findOne<T extends typeof Model>(
    this: T,
    filter: ToFilter<noFn<T>>,
    useGET = false
  ) {
    const req = await RUNNER.fetcher(`/${this.collection}/list?limit=1`, {
      method: !useGET ? "SEARCH" : "GET",
      body: JSON.stringify(filter),
      headers: { "Content-Type": "application/json" },
    });
    if (!req.ok) throw new Error();
    const result = await req.json();
    return this._new(Array.isArray(result) ? result[0] : result);
  }

  static async find<T extends typeof Model>(
    this: T,
    filter: ToFilter<noFn<T>>,
    useGET = false
  ) {
    const req = await RUNNER.fetcher(`/${this.collection}/list`, {
      method: !useGET ? "SEARCH" : "GET",
      body: JSON.stringify(filter),
      headers: { "Content-Type": "application/json" },
    });
    if (!req.ok) throw new Error();
    const result = (await req.json()) as any[];
    return result.map((o) => this._new(o));
  }

  static async deleteById(id: string) {
    const req = await RUNNER.fetcher(`/${this.collection}/delete/${id}`, {
      method: "DELETE",
    });
    if (!req.ok) throw new Error();
  }

  static async deleteByIds(ids: string[]) {
    const req = await RUNNER.fetcher(
      `/${this.collection}/delete/${ids.join(",")}`,
      { method: "DELETE" }
    );
    if (!req.ok) throw new Error();
  }

  static async create<T extends typeof Model, K extends string = "_id">(
    this: T,
    object: Omit<noFn<T>, K>
  ) {
    this.validate(object, true, true, true);
    const req = await RUNNER.fetcher(
      `/${this.collection}/create`,
      this.hasFiles
        ? {
            method: "POST",
            body: toFormData(object),
          }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(object),
          }
    );
    if (!req.ok) throw new Error();
    const result = await req.json();
    return this._new(result);
  }

  static async replaceById<T extends typeof Model, K extends string = "_id">(
    this: T,
    id: string,
    replacement: Omit<noFn<T>, K>
  ) {
    this.validate(replacement, true, true, true);
    const req = await RUNNER.fetcher(
      `/${this.collection}/replace/${id}`,
      this.hasFiles
        ? {
            method: "POST",
            body: toFormData(replacement),
          }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(replacement),
          }
    );
    if (!req.ok) throw new Error();
    const result = await req.json();
    return this._new(result);
  }

  async delete() {
    // @ts-ignore
    await this.constructor.deleteById(this._id);
  }

  read<T extends Model>(this: T): Promise<T> {
    // @ts-ignore
    return this.constructor.findById(this._id);
  }

  async save() {
    // @ts-ignore
    await this.constructor.replaceById(this._id, this);
  }
}

export function toFormData(
  object: any,
  r = true,
  formData?: FormData,
  path = ""
) {
  if (!formData) formData = new FormData();
  if (
    object == null ||
    Number.isNaN(object) ||
    typeof object === "function" ||
    typeof object === "symbol"
  )
    return;
  if (object instanceof Blob || typeof object !== "object") {
    formData.append(path, object);
    if (r) return formData;
    return;
  }

  for (const [key, value] of Object.entries(object)) {
    toFormData(value, false, formData, path ? `${path}.${key}` : key);
  }
  if (r) return formData;
}

export function matchMime(rules: string | string[], str: string) {
  if (!Array.isArray(rules)) rules = [rules];
  for (const rule of rules) {
    const [type, subType] = rule.split(/ |;/)[0].split(/\\|\//);
    const [type2, subType2] = str.split(/ |;/)[0].split(/\\|\//);
    if (
      (type === "*" || type === "**" || type === type2) &&
      (subType === "*" || subType === "**" || subType === subType2)
    )
      return true;
  }
  return false;
}
