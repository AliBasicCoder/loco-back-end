// TODO consider supporting Deno
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import bcrypt from "bcrypt";
import { v4 as uuid_v4 } from "uuid";
import cookie, { CookieSerializeOptions } from "cookie";
import { snake } from "case";
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
  error,
  getMetadata,
  noFn,
} from "./types";
import { STATE } from "./schema";
import { schemaValidateGen } from "./validation_generator";
import {
  functionName,
  getSchema,
  getPaths,
  removeProperties,
  trimArray,
  setUpload,
  $args,
  matchMime,
  removeExtra,
} from "./util";
import { list } from "./routes/list";
import { create } from "./routes/create";
import { del } from "./routes/delete";
import { replace } from "./routes/replace";
import { customRoutes } from "./routes/customRoutes";
export * from "./types";
export * from "./schema";
export * from "./mongodb_driver";
export * from "./client_generator";
export * from "./dir_filesystem_driver";

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
    // TODO make function to convert all ObjectIds to strings
    o._id = o._id.toString();
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
  static _list(req: IncomingMessage, res: ServerResponse) {
    throw new Error("Method should be overwritten");
  }
  static _create(req: IncomingMessage, res: ServerResponse) {
    throw new Error("Method should be overwritten");
  }
  static _update(req: IncomingMessage, res: ServerResponse, id: string) {
    throw new Error("Method should be overwritten");
  }
  static _delete(req: IncomingMessage, res: ServerResponse, ids: string[]) {
    throw new Error("Method should be overwritten");
  }
  static _removeExtra(object: any) {
    throw new Error("Method should be overwritten");
  }

  static authorize: AuthorizeFunction | null = null;

  static validate(
    object: any,
    error = false,
    removeExtra = true,
    toObjectId = false
  ): string | void {}

  static rule_list(fn?: (req: IncomingMessage) => MaybePromise<boolean>): void;
  static rule_list<J extends typeof Model>(
    collection: J,
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ): void;
  static rule_list<J extends typeof Model>(
    collection?: J | ((req: IncomingMessage) => MaybePromise<boolean>),
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
    fn?: (req: IncomingMessage) => MaybePromise<boolean>
  ): void;
  static rule_create<J extends typeof Model>(
    collection: J,
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ): void;
  static rule_create<J extends typeof Model>(
    collection?: J | ((req: IncomingMessage) => MaybePromise<boolean>),
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
    fn?: (req: IncomingMessage) => MaybePromise<boolean>
  ): void;
  static rule_delete<J extends typeof Model>(
    collection: J,
    fn?: (user: InstanceType<J>) => MaybePromise<boolean>
  ): void;
  static rule_delete<T extends typeof Model, J extends typeof Model>(
    this: T,
    collection: J,
    fn: (
      user: InstanceType<J>,
      document: InstanceType<T>
    ) => MaybePromise<boolean>,
    fetchDocument: true
  ): void;
  static rule_delete<T extends typeof Model, J extends typeof Model>(
    collection?: J | ((req: IncomingMessage) => MaybePromise<boolean>),
    fn?:
      | ((user: InstanceType<J>) => MaybePromise<boolean>)
      | ((
          user: InstanceType<J>,
          document: InstanceType<T>
        ) => MaybePromise<boolean>),
    fetchDocument: boolean = false
  ) {
    if (!this._rules_delete) this._rules_delete = [];

    this._rules_delete.push(
      collection && "_new" in collection
        ? ["delete", collection, fn as (user: Model) => boolean, fetchDocument]
        : ["delete", "*", collection]
    );
  }

  static rule_list_filter<J extends typeof Model>(
    fn: (req: IncomingMessage) => MaybePromise<ToFilter<noFn<InstanceType<J>>>>
  ): void;
  static rule_list_filter<J extends typeof Model>(
    collection: J,
    fn: (user: InstanceType<J>) => MaybePromise<ToFilter<noFn<InstanceType<J>>>>
  ): void;
  static rule_list_filter<J extends typeof Model>(
    collection:
      | J
      | ((
          req: IncomingMessage
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
    fn?: (req: IncomingMessage) => MaybePromise<boolean>
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
    collection?: J | ((req: IncomingMessage) => MaybePromise<boolean>),
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

  static async findByIds<T extends typeof Model>(this: T, ids: string[]) {
    const queryResult = await this.driver.findByIds(this.collection, ids);

    return queryResult.map((o) => this._new(o));
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

  static preCreate(object: any) {}
  static postCreate(object: any) {}

  static preUpdate(
    newObject: any
    // oldObject: any | null
  ) {}
  static postUpdate(object: any) {}

  static preDelete(ids: string[]) {}
  static postDelete(ids: string[]) {}
  static preValidate(object: any) {}
  static preValidateUpdate(object: any) {}
  static preValidateCreate(object: any) {}
}

export type LocoPlugin = (models: (typeof Model)[]) => string;

export type Router = (models: (typeof Model)[]) => string;

export type ErrorHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  error: any
) => void;

const INIT_ENVIRONMENT = { getMetadata, matchMime };

export function setEnvironment(o: any) {
  Object.assign(INIT_ENVIRONMENT, o);
}

interface InitOptions {
  models: (typeof Model)[];
  router: Router;
  defaultDriver: DBDriver;
  defaultFilesystem?: FileSystem;
  plugins?: LocoPlugin[];
  outputBundle?: string;
}

export async function init(options: InitOptions) {
  const {
    models,
    router,
    defaultDriver,
    defaultFilesystem,
    plugins,
    outputBundle,
  } = Object.assign({ plugins: [] as LocoPlugin[] }, options);

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
    result += `${model._functionName}._removeExtra = ${removeExtra(model)};`;
    // TODO consider creating base functions and using
    // TODO them since the code produced is extremely similar anyway
    if (model._rules_list.length >= 1)
      result += `${model._functionName}._list = ${list(model)};`;
    if (model._rules_create.length >= 1)
      result += `${model._functionName}._create = ${create(model)};`;
    if (model._rules_delete.length >= 1)
      result += `${model._functionName}._delete = ${del(model)};`;
    if (model._rules_update.length >= 1)
      result += `${model._functionName}._replace = ${replace(model)};`;

    if (!model._customRoutes) model._customRoutes = {};

    result += customRoutes(model);
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
function init(${functionArgs}, ENVIRONMENT) { 
  const { getMetadata, matchMime } = ENVIRONMENT;
  ${result};
  ${plugins.map((fn) => fn(models)).join(";")}; ${router(models)}
};`;

  let init_result;
  if (outputBundle) {
    result += "module.exports = init;";
    fs.writeFileSync(outputBundle, result);
    init_result = require(outputBundle)(...models, INIT_ENVIRONMENT);
  } else {
    result += "init";
    init_result = eval(result);
  }

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
  console.error(error);
  res.writeHead(500, { "Content-Type": "text/plain" });
  res.end("Internal Server Error");
};

function handleErrorCreator(errorHandler: ErrorHandler) {
  return (fn: Function) => {
    return (req: IncomingMessage, res: ServerResponse, ...args: any[]) => {
      try {
        const result = fn(req, res, ...args);
        if (result instanceof Promise) {
          return result.catch((error) => {
            try {
              errorHandler(req, res, error);
            } catch (error2) {
              console.log(
                "\nTried to handle error but error handler errored! Original Error: \n"
              );
              console.error(error);
              console.log("\nError handler error: \n");
              console.error(error2);
            }
          });
        }
        return result;
      } catch (error) {
        try {
          errorHandler(req, res, error);
        } catch (error2) {
          console.log(
            "\nTried to handle error but error handler errored! Original Error: \n"
          );
          console.error(error);
          console.log("\nError handler error: \n");
          console.error(error2);
        }
      }
    };
  };
}

export function httpRouter(
  port?: number,
  errorHandler: ErrorHandler = defaultErrorHandler
) {
  setEnvironment({ handleError: handleErrorCreator(errorHandler), PORT: port });

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
    const ids = st.split(",");
    return ${model._functionName}._delete(req, res, ids);
  }`;
      if (model._rules_update.length > 0)
        inside += `if (pathname.startsWith("/${
          model.collection
        }/replace") && req.method === "PUT") {
  const st = pathname.slice(${model.collection.length + 9});
  if (st == "" || st.contains("/")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Cannot " + req.method + " " + pathname);    
    return;
  }
  ${model._functionName}._replace(req, res, st);
}`;
    });
    inside += `
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Cannot " + req.method + " " + pathname);    
  return`;
    result += `
const { handleError } = ENVIRONMENT; 
const http = require("http");
const server = http.createServer(handleError(
  (req, res) => {
    const url = require("url").parse(req.url, true);
    const pathname = url.pathname;
    req.query = url.query;
    ${inside}
  }
));`;
    if (port)
      result += `server.listen(ENVIRONMENT.PORT, () => console.log("Started on port: " + ENVIRONMENT.PORT));`;
    result += "return server;";

    return result;
  };
}

export function expressRouter(
  port?: number,
  errorHandler: ErrorHandler = defaultErrorHandler
) {
  setEnvironment({ handleError: handleErrorCreator(errorHandler), PORT: port });

  return (models: (typeof Model)[]) => {
    let result = `
const { handleError } = ENVIRONMENT; 
const express = require("express");
const router = express.Router();
`;

    models.forEach((model) => {
      if (model._rules_list.length > 0)
        result += `router.get("/${model.collection}/list", handleError((req, res) => ${model._functionName}._list(req, res)));`;
      if (model._rules_create.length > 0)
        result += `router.post("/${model.collection}/create", handleError((req, res) => ${model._functionName}._create(req, res)));`;
      if (model._rules_delete.length > 0)
        result += `router.delete("/${model.collection}/delete/:ids", handleError((req, res) => ${model._functionName}._delete(req, res, req.params.ids.split(","))));`;
      if (model._rules_update.length > 0)
        result += `router.put("/${model.collection}/replace/:id", handleError((req, res) => ${model._functionName}._replace(req, res, req.params.id)));`;
      for (const [key, route] of Object.entries(model._customRoutes)) {
        result += `router.${route.method}("/${model.collection}/${key}${
          !route.isStatic ? "/:id" : ""
        }", handleError((req, res) => ${model._functionName}._${key}(req, res${
          !route.isStatic ? ", id" : ""
        })));`;
      }
    });

    result += `return router;`;
    return result;
  };
}

function customRouteCreator(method: "delete" | "get" | "put" | "post") {
  return (...args: any[]) => {
    return (o: any, propertyName: string) => {
      const model = (o.prototype ? o : o.constructor) as typeof Model;
      const argumentsName = $args(o[propertyName]);
      if (argumentsName[argumentsName.length - 1] === "ctx") {
        argumentsName.pop();
      }
      const schema = {} as any;
      for (let i = 0; i < args.length; i++) {
        schema[argumentsName[i]] = args[i];
      }
      if (!model._customRoutes) model._customRoutes = {};
      model._customRoutes[propertyName] = {
        argumentsName,
        authorization: [],
        isStatic: !!o.prototype,
        method,
        returnType: null,
        schema,
        types: args,
      };
    };
  };
}

export const GET = customRouteCreator("get");
export const POST = customRouteCreator("post");
export const PUT = customRouteCreator("put");
export const DEL = customRouteCreator("delete");

export function returns(type: any) {
  return (o: any, propertyName: string) => {
    const model = (o.prototype ? o : o.constructor) as typeof Model;
    if (!model._customRoutes) model._customRoutes = {};

    model._customRoutes[propertyName].returnType = type;
  };
}

export function allow(...args: (typeof Model)[]) {
  return (o: any, propertyName: string) => {
    const model = (o.prototype ? o : o.constructor) as typeof Model;
    if (!model._customRoutes) model._customRoutes = {};

    model._customRoutes[propertyName].authorization = args;
    model._customRoutes[propertyName].argumentsName =
      model._customRoutes[propertyName].argumentsName.slice(1);
    if (
      model._customRoutes[propertyName].argumentsName.length !==
      model._customRoutes[propertyName].types.length
    ) {
      throw new Error("arguments should be the same as types");
    }
    const schema = {} as any;
    for (let i = 0; i < model._customRoutes[propertyName].types.length; i++) {
      schema[model._customRoutes[propertyName].argumentsName[i]] =
        model._customRoutes[propertyName].types[i];
    }
    model._customRoutes[propertyName].schema = schema;
  };
}

export function sessionAuth(
  collection: typeof Model,
  sessionCollection: typeof Model,
  antiCSRF = true
): AuthorizeFunction {
  return async (req, returnUser) => {
    if (!req.headers.cookie) {
      return false;
    }
    const cookies = (
      (req as any).cookies
        ? (req as any).cookies
        : cookie.parse(req.headers.cookie)
    ) as Record<string, string>;
    const id = cookies.SessionID;
    if (!id) return false;
    // @ts-ignore
    const session = await sessionCollection.findOne({ id });
    if (
      !session ||
      (antiCSRF && (session as any).anti_csrf !== req.headers.anti_csrf)
    )
      return false;

    if (returnUser) {
      const user = await collection.findById((session as any).user);
      // TODO should session be removed?
      if (!user) return false;

      return collection._new(user);
    }

    return true;
  };
}

interface EPSoptions {
  emailProperty: string;
  passwordProperty: string;
  extraSessionData: (req: IncomingMessage, user: any) => any;
  cookieOptions: CookieSerializeOptions;
}

const defaultEPSoptions: EPSoptions = {
  emailProperty: "email",
  passwordProperty: "password",
  extraSessionData: () => ({}),
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  },
};

export function emailPasswordSessionLogin(
  collection: typeof Model,
  sessionCollection: typeof Model,
  options: Partial<EPSoptions> = {}
): Function {
  const op = { ...defaultEPSoptions, ...options };

  if (!collection._customRoutes) collection._customRoutes = {};

  collection._customRoutes.login = {
    types: [{ type: "STRING" }, { type: "STRING" }],
    schema: { email: { type: "STRING" }, password: { type: "STRING" } },
    isStatic: true,
    method: "post",
    returnType: { type: "REF", to: sessionCollection },
    argumentsName: ["email", "password"],
    authorization: [],
  };

  return async (
    email: string,
    password: string,
    ctx: { req: IncomingMessage; res: ServerResponse }
  ) => {
    const user = await collection.findOne({ [op.emailProperty]: email });
    if (
      !user ||
      !(await bcrypt.compare(password, (user as any)[op.passwordProperty]))
    ) {
      return error(400, "incorrect email or password");
    }
    const session = await sessionCollection.driver.create(
      sessionCollection.collection,
      {
        id: uuid_v4(),
        user: user._id.toString(),
        ip_address: (ctx.req.headers["x-forwarded-for"] ||
          ctx.req.socket.remoteAddress) as string,
        createAt: new Date(),
        updateAt: new Date(),
        ...op.extraSessionData(ctx.req, user),
      }
    );
    ctx.res.setHeader(
      "cookie",
      cookie.serialize("SessionID", session.id, op.cookieOptions)
    );

    return session;
  };
}
