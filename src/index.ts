// TODO consider supporting Deno
import path from "path";
import fs from "fs";
import type http from "node:http";
import {
  AuthorizeFunction,
  BasicType,
  CreateRule,
  CustomRouteItem,
  DBDriver,
  DeleteRule,
  FileSystem,
  FileType,
  ListFilterRule,
  ListRule,
  MaybePromise,
  Rule,
  SchemaObject,
  ToFilter,
  UpdateRule,
  noFn,
} from "./types";
import { STATE } from "./schema";
import { snake } from "case";
import { schemaValidateGen } from "./validation_generator";
import {
  functionName,
  getSchema,
  getPaths,
  removeProperties,
  trimArray,
  setUpload,
} from "./util";
import { list } from "./routes/list";
import { IncomingMessage, ServerResponse } from "node:http";
import { create } from "./routes/create";
import { del } from "./routes/delete";

export class Model {
  static DEFAULT_LIMIT = 100;
  static MAX_LIMIT: number | null = 1000;
  static collection: string;
  static _functionName: string;
  static _rules: Rule[];
  static _rules_list: (ListRule | ListFilterRule)[];
  static _rules_create: CreateRule[];
  static _rules_update: UpdateRule[];
  static _rules_delete: DeleteRule[];
  static _customRoutes: {
    [key: string]: CustomRouteItem;
  };
  static _schema: SchemaObject;
  static _paths: [(string | number)[], BasicType][];
  static _noSend: (string | number)[][] = [];
  static _noReceive: (string | number)[][] = [["_id"]];
  static _uniqueIndex: (string | number)[][] = [];
  static _files: [(string | number)[], FileType][] = [];
  static _ref: (string | number)[][] = [];
  static driver: DBDriver;
  static filesystem: FileSystem;
  declare _id: string;

  static _new<T extends typeof Model>(this: T, object: any) {
    const o = new this();
    Object.assign(o, object);
    return o as InstanceType<T>;
  }
  static _removeNoSend(object: any) {
    throw new Error("Method should be overwritten");
  }
  static _removeNoReceive(object: any) {
    throw new Error("Method should be overwritten");
  }
  static _getFileSchema(path: string) {
    throw new Error("Method should be overwritten");
  }
  static _setOnUpload(object: any, path: string, value: any) {
    throw new Error("Method should be overwritten");
  }
  static _list(req: http.IncomingMessage, res: http.ServerResponse) {
    throw new Error("Method should be overwritten");
  }
  static _create(req: http.IncomingMessage, res: http.ServerResponse) {
    throw new Error("Method should be overwritten");
  }
  static _update(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    id: string
  ) {
    throw new Error("Method should be overwritten");
  }
  static _delete(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    ids: string[]
  ) {
    throw new Error("Method should be overwritten");
  }

  static authorize: AuthorizeFunction | null = null;

  static validate(
    object: any,
    error = false,
    removeExtra = true,
    toObjectId = false
  ): string | void {}

  static rule_list(
    fn?: (req: http.IncomingMessage) => MaybePromise<boolean>
  ): void;
  static rule_list<J extends typeof Model>(
    collection: J,
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ): void;
  static rule_list<J extends typeof Model>(
    collection?: J | ((req: http.IncomingMessage) => MaybePromise<boolean>),
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ) {
    if (!this._rules_list) this._rules_list = [];

    this._rules_list.push(
      collection && "_new" in collection
        ? ["list", collection, fn as (user: Model) => boolean]
        : ["list", "*", collection]
    );
  }

  static rule_create(
    fn?: (req: http.IncomingMessage) => MaybePromise<boolean>
  ): void;
  static rule_create<J extends typeof Model>(
    collection: J,
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ): void;
  static rule_create<J extends typeof Model>(
    collection?: J | ((req: http.IncomingMessage) => MaybePromise<boolean>),
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ) {
    if (!this._rules_create) this._rules_create = [];

    this._rules_create.push(
      collection && "_new" in collection
        ? ["create", collection, fn as (user: Model) => boolean]
        : ["create", "*", collection]
    );
  }

  static rule_delete(
    fn?: (req: http.IncomingMessage) => MaybePromise<boolean>
  ): void;
  static rule_delete<J extends typeof Model>(
    collection: J,
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ): void;
  static rule_delete<J extends typeof Model>(
    collection?: J | ((req: http.IncomingMessage) => MaybePromise<boolean>),
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ) {
    if (!this._rules_delete) this._rules_delete = [];

    this._rules_delete.push(
      collection && "_new" in collection
        ? ["delete", collection, fn as (user: Model) => boolean]
        : ["delete", "*", collection]
    );
  }

  static rule_list_filter<J extends typeof Model>(
    fn: (
      req: http.IncomingMessage
    ) => MaybePromise<ToFilter<noFn<InstanceType<J>>>>
  ): void;
  static rule_list_filter<J extends typeof Model>(
    collection: J,
    fn: (user: InstanceType<J>) => MaybePromise<ToFilter<noFn<InstanceType<J>>>>
  ): void;
  static rule_list_filter<J extends typeof Model>(
    collection:
      | J
      | ((
          req: http.IncomingMessage
        ) => MaybePromise<ToFilter<noFn<InstanceType<J>>>>),
    fn?: (
      user: InstanceType<J>
    ) => MaybePromise<ToFilter<noFn<InstanceType<J>>>>
  ) {
    if (!this._rules_list) this._rules_list = [];

    this._rules_list.push(
      "_new" in collection
        ? ["list_filter", collection, fn as (user: Model) => any]
        : ["list_filter", "*", collection]
    );
  }

  static rule_update(
    fn?: (req: http.IncomingMessage) => MaybePromise<boolean>
  ): void;
  static rule_update<T extends typeof Model, J extends typeof Model>(
    this: T,
    collection: J,
    fn?: (
      user: InstanceType<J>,
      object: InstanceType<T>
    ) => MaybePromise<boolean>
  ): void;
  static rule_update<T extends typeof Model, J extends typeof Model>(
    this: T,
    collection?: J | ((req: http.IncomingMessage) => MaybePromise<boolean>),
    fn?: (
      user: InstanceType<J>,
      object: InstanceType<T>
    ) => MaybePromise<boolean>
  ) {
    if (!this._rules_update) this._rules_update = [];

    this._rules_update.push(
      collection && "_new" in collection
        ? ["update", collection, fn as (user: Model) => boolean]
        : ["update", "*", collection]
    );
  }

  static async create<T extends typeof Model, K extends string = "_id">(
    this: T,
    object: Omit<noFn<InstanceType<T>>, K>
  ) {
    this.validate(object, true, true, true);
    const result = await this.driver.create(this.collection, object);

    return this._new(result);
  }

  static async createMany<T extends typeof Model, K extends string = "_id">(
    objects: Omit<noFn<InstanceType<T>>, K>[]
  ) {
    objects.forEach((object) => this.validate(object, true, true, true));
    const results = await this.driver.createMany(this.collection, objects);

    return results.map((o: any) => this._new(o)) as T[];
  }

  static async findById<T extends typeof Model>(this: T, id: string) {
    const queryResult = await this.driver.findById(this.collection, id);
    if (!queryResult) return;

    return this._new(queryResult);
  }

  static async findOne<T extends typeof Model>(
    this: T,
    filter: ToFilter<noFn<InstanceType<T>>>
  ) {
    const queryResult = await this.driver.findOne(this.collection, filter);
    if (!queryResult) return;

    return this._new(queryResult);
  }

  static async find<T extends typeof Model>(
    this: T,
    filter: ToFilter<noFn<InstanceType<T>>>
  ) {
    const queryResult = await this.driver.find(this.collection, filter);

    return queryResult.map((o) => this._new(o));
  }

  static async deleteOne<T extends typeof Model>(
    this: T,
    filter: ToFilter<noFn<InstanceType<T>>>
  ) {
    await this.driver.deleteOne(this.collection, filter);
  }

  static async deleteMany<T extends typeof Model>(
    this: T,
    filter: ToFilter<noFn<InstanceType<T>>>
  ) {
    await this.driver.deleteMany(this.collection, filter);
  }

  static async deleteById(id: string) {
    await this.driver.deleteWithId(this.collection, id);
  }

  static async deleteByIds(ids: string[]) {
    await this.driver.deleteWithIds(this.collection, ids);
  }

  static async replaceOne<T extends typeof Model, K extends string = "_id">(
    this: T,
    filter: ToFilter<noFn<InstanceType<T>>>,
    replacement: Omit<noFn<InstanceType<T>>, K>
  ) {
    const result = await this.driver.replaceOne(
      this.collection,
      filter,
      replacement
    );
    if (!result) return null;
    return this._new(result) as T;
  }

  static async replaceById<T extends typeof Model, K extends string = "_id">(
    this: T,
    id: string,
    replacement: Omit<noFn<InstanceType<T>>, K>
  ) {
    const result = await this.driver.replaceById(
      this.collection,
      id,
      replacement
    );
    if (!result) return null;
    return this._new(result) as T;
  }

  async delete() {
    const constructor = this.constructor as typeof Model;

    await constructor.driver.deleteWithId(constructor.collection, this._id);
  }

  async read<T extends Model>(this: T) {
    const constructor = this.constructor as typeof Model;

    const result = await constructor.driver.findById(
      constructor.collection,
      this._id
    );
    if (!result) throw new Error("document deleted");

    return constructor._new(result) as T;
  }

  async save() {
    const constructor = this.constructor as typeof Model;

    await constructor.driver.replaceById(
      constructor.collection,
      this._id,
      this
    );
  }

  static preCreate<T extends typeof Model>(
    this: T,
    object: noFn<InstanceType<T>>
  ) {}
  static postCreate<T extends typeof Model>(
    this: T,
    object: noFn<InstanceType<T>>
  ) {}

  static preUpdate<T extends typeof Model>(
    this: T,
    newObject: noFn<InstanceType<T>>,
    oldObject: noFn<InstanceType<T>> | null
  ) {}
  static postUpdate<T extends typeof Model>(
    this: T,
    object: noFn<InstanceType<T>>
  ) {}

  static preDelete(ids: string[]) {}
  static postDelete(ids: string[]) {}
}

export type LocoPlugin = (models: (typeof Model)[]) => string;

export type Router = (models: (typeof Model)[]) => string;

export type ErrorHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  error: any
) => void;

const INIT_ENVIRONMENT = {};

export function setEnvironment(o: any) {
  Object.assign(INIT_ENVIRONMENT, o);
}

export async function init(
  models: (typeof Model)[],
  router: Router,
  defaultDriver: DBDriver,
  defaultFilesystem?: FileSystem,
  plugins: LocoPlugin[] = []
) {
  let functionArgs = "";
  let result = "";
  models.forEach((model, i) => {
    const inst = new model();
    model._functionName = functionName(model);
    model.collection = model.collection
      ? model.collection
      : snake(model._functionName);

    functionArgs += model._functionName;
    if (i !== models.length - 1) functionArgs += ", ";

    if (!model.driver) model.driver = defaultDriver;
    // @ts-ignore
    if (!model.filesystem && defaultFilesystem)
      model.filesystem = defaultFilesystem;
    // @ts-ignore
    model._schema = { ...inst };
    model._paths = getPaths(model._schema);
    if (!model._rules_list) model._rules_list = [];
    if (!model._rules_delete) model._rules_delete = [];
    if (!model._rules_update) model._rules_update = [];
    if (!model._rules_create) model._rules_create = [];

    model._rules = [
      ...model._rules_create,
      ...model._rules_list,
      ...model._rules_delete,
      ...model._rules_update,
    ];

    for (const rule of model._rules) {
      if (typeof rule[1] !== "string" && !rule[1].authorize)
        throw new Error(
          `Model ${rule[1]._functionName} has no authorize function`
        );
      if (rule[0] === "list_filter" && typeof rule[2] !== "function")
        throw new Error(`All list_filter rules must have function `);
    }
    model._noSend = model._paths
      .filter(([_, t]) => t.noSend)
      .map(([path]) => trimArray(path, -1));
    model._noReceive = model._paths
      .filter(([_, t]) => t.noReceive)
      .map(([path]) => trimArray(path, -1));
    model._files = model._paths.filter(
      ([_, t]) => t.type === "FILE"
    ) as (typeof Model)["_files"];
    model._uniqueIndex = model._paths
      .filter(([_, t]) => t.type === "STRING" && t.unique)
      .map(([path]) => path);
    model._ref = model._paths
      .filter(([_, t]) => t.type === "REF")
      .map(([path]) => path);

    if (model._files.length > 0 && !model.filesystem)
      throw new Error(
        `Model: ${model._functionName} has files but no filesystem!`
      );
  });
  STATE.ret = false;
  models.forEach((model) => {
    result += `${model._functionName}.validate = ${schemaValidateGen(model)};`;
    result += `${model._functionName}._removeNoReceive = ${removeProperties(
      model._noReceive
    )};`;
    result += `${model._functionName}._removeNoSend = ${removeProperties(
      model._noSend
    )};`;
    result += `${model._functionName}._getFileSchema = ${getSchema(
      model._paths
    )};`;
    result += `${model._functionName}._setOnUpload = ${setUpload(
      model._paths
    )};`;
    // TODO consider creating base functions and using
    // TODO them since the code produced is extremely similar anyway
    if (model._rules_list.length >= 1)
      result += `${model._functionName}._list = ${list(model)};`;
    if (model._rules_create.length >= 1)
      result += `${model._functionName}._create = ${create(model)};`;
    if (model._rules_delete.length >= 1)
      result += `${model._functionName}._delete = ${del(model)};`;
  });
  result = `
function collectStr(req, MAX_SIZE = 4194304) {
  return new Promise((resolve, reject) => {
    let data = "";
    let destroyed = false;
    req.on("data", (chuck) => {
      if (destroyed) return;
      if (data.length + chuck.length > MAX_SIZE) {
        req.destroy();
        resolve(null);
      }
      data += chuck;
    });
    req.on("end", () => !destroyed && resolve(data));
    req.on("error", (err) => !destroyed && reject(err));
  });
}
const busboy = require("busboy");  
function init(${functionArgs}, ENVIRONMENT) { ${result}; ${plugins
    .map((fn) => fn(models))
    .join(";")}; ${router(models)} };

module.exports = init;`;

  fs.writeFileSync(path.join(__dirname, "__LOCO_BUILD.js"), result);

  const init_result = require("./__LOCO_BUILD.js")(...models, INIT_ENVIRONMENT);
  const promises = [] as Promise<void>[];
  models.forEach((model) => {
    if (!model.driver.initialized) promises.push(model.driver.init(models));
    if (model.filesystem && !model.filesystem?.initialized)
      promises.push(model.filesystem.init());
  });
  await Promise.all(promises);

  return init_result;
}

const defaultErrorHandler: ErrorHandler = (req, res, error) => {
  res.writeHead(500, { "Content-Type": "text/plain" });
  res.end("Internal Server Error");
  console.error(error);
};

export function httpRouter(
  port?: number,
  errorHandler: ErrorHandler = defaultErrorHandler
) {
  setEnvironment({ errorHandler, PORT: port });

  return (models: (typeof Model)[]) => {
    let inside = "";
    let result = "";
    models.forEach((model) => {
      if (model._rules_list.length > 0)
        inside += `
  if (pathname === "/${model.collection}/list" && req.method === "GET") {
    return ${model._functionName}._list(req, res);  
  }`;
      if (model._rules_create.length > 0)
        inside += `
  if (pathname === "/${model.collection}/create" && req.method === "POST") {
    return ${model._functionName}._create(req, res);  
  }`;
      if (model._rules_delete.length > 0)
        inside += ` 
  if (pathname.startsWith("/${
    model.collection
  }/delete") && req.method === "DELETE") {
    const st = pathname.slice(${model.collection.length + 8});
    if (st == "" || st.contains("/")) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Cannot " + req.method + " " + pathname);    
      return;
    }
    const ids = st.split("/");
    return ${model._functionName}._delete(req, res, ids);
  }`;
    });
    inside += `
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Cannot " + req.method + " " + pathname);    
  return`;
    result += `
function handleError(fn, errorHandler) {
  return (req, res, ...args) => {
    try {
      const result = fn(req, res, ...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorHandler(req, res, error);
        });
      }
      return result;
    } catch (error) {
      errorHandler(req, res, error);
    }
  };
}
const http = require("http");
const server = http.createServer(handleError(
  (req, res) => {
    const url = require("url").parse(req.url, true);
    const pathname = url.pathname;
    req.query = url.query;
    ${inside}
  },
  ENVIRONMENT.errorHandler
));`;
    if (port)
      result += `server.listen(ENVIRONMENT.PORT, () => console.log("Started on port: " + ENVIRONMENT.PORT));`;
    result += "return server;";

    return result;
  };
}
