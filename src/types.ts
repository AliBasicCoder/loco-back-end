import type stream from "node:stream";
import http from "http";
import { Model } from ".";

// TODO consider allowing types to act as decorators
// TODO so something instead of @createdAt() property = date()
// TODO i could do property = createdAt()
export type GlobalOptions = {
  skip?: boolean;
  noSend?: boolean;
  noReceive?: boolean;
};

export type BooleanTypeOptions = GlobalOptions & {
  default?: boolean;
};

export type BooleanType = BooleanTypeOptions & {
  type: "BOOLEAN";
};

export type NumberTypeOptions = GlobalOptions & {
  integerOnly?: boolean;
  signed?: boolean;
  min?: number;
  max?: number;
  default?: number;
  enum?: number[];
  validator?: (n: number, path: string) => boolean | string;
  nullable?: boolean;
};

export type NumberType = NumberTypeOptions & {
  type: "NUMBER";
  integerOnly: boolean;
  signed: boolean;
};

export type StringTypeOptions = GlobalOptions & {
  min?: number;
  max?: number;
  fixedLength?: number;
  default?: string;
  enum?: string[];
  unique?: boolean;
  validator?: (n: string, path: string) => boolean | string;
  nullable?: boolean;
  ID?: boolean;
};

export type StringType = StringTypeOptions & { type: "STRING" };

export type DateTypeOptions = GlobalOptions & {
  store?: "DATE_TIME" | "DATE" | "TIME" | "TIMESTAMP";
  min?: Date;
  max?: Date;
  default?: Date;
  enum?: Date[];
  validator?: (n: Date, path: string) => boolean | string;
  nullable?: boolean;
};

export type DateType = DateTypeOptions & {
  type: "DATE";
  store: "DATE_TIME" | "DATE" | "TIME" | "TIMESTAMP";
};

export type FileTypeOptions = GlobalOptions & {
  min?: number;
  max?: number;
  mimetype?: string | string[];
  default?: string;
  nullable?: boolean;
  skipIdValidation?: boolean;
};

export type FileType = FileTypeOptions & { type: "FILE" };

export type ReferenceTypeOptions = GlobalOptions & {
  nullable?: boolean;
  // noRef?: boolean;
};

export type ReferenceType = ReferenceTypeOptions & {
  type: "REF";
  to: typeof Model;
};

export type TupleTypeOptions = GlobalOptions & {
  validator?: (value: any, path: string) => string | boolean;
};

export type TupleType = TupleTypeOptions & {
  type: "TUPLE";
  sub_types: AnyType[];
};

export type ArrayTypeOptions = GlobalOptions & {
  min?: number;
  max?: number;
  validator?: (value: any[], path: string) => string | boolean;
};

export type ArrayType = ArrayTypeOptions & {
  type: "ARRAY";
  sub_type: AnyType;
};

export type BasicType =
  | BooleanType
  | NumberType
  | StringType
  | DateType
  | ReferenceType
  | FileType;

export type ObjectTypeOptions = GlobalOptions & {
  nullable?: boolean;
};

export type ObjectType = ObjectTypeOptions & {
  type: "OBJECT";
  schema: SchemaObject;
};

export type AnyType = BasicType | TupleType | ArrayType | ObjectType;

export type SchemaObject = {
  [k: string]: AnyType;
};

export const isSchemaObject = (o: any): o is SchemaObject =>
  typeof o.type !== "string";

// Other Types

type AtLeastOnePropertyOf<T> = {
  [K in keyof T]: { [L in K]: T[L] } & { [L in Exclude<keyof T, K>]?: T[L] };
}[keyof T];

type ComparisonQueryNumber =
  | { $eq: number }
  | { $nqe: number }
  | AtLeastOnePropertyOf<{
      $lt: number;
      $lte: number;
      $gt: number;
      $gte: number;
      $mod: [number, number];
    }>
  | { $in: number[] }
  | { $nin: number[] };

type ComparisonQueryDate =
  | { $eq: Date }
  | { $nqe: Date }
  | AtLeastOnePropertyOf<{
      $lt: Date;
      $lte: Date;
      $gt: Date;
      $gte: Date;
    }>
  | { $in: Date[] }
  | { $nin: Date[] };

type ComparisonQueryString =
  | { $eq: string }
  | { $nqe: string }
  | { $in: string[] }
  | { $nin: string[] };

type ArrayQuery<T extends any[]> =
  | {
      $all: (
        | T[number]
        | {
            $elemMatch: ToFilter<T[number]>;
          }
      )[];
    }
  | {
      $elemMatch: ToFilter<T[number]>;
    }
  | T[number]
  | T[number][];

export type ToFilter<T> = T extends boolean
  ? boolean
  : T extends number
  ? ComparisonQueryNumber | number
  : T extends string
  ? ComparisonQueryString | string
  : T extends Date
  ? ComparisonQueryDate | Date
  : T extends any[]
  ? ArrayQuery<T>
  : {
      [K in keyof T]?: ToFilter<T[K]>;
    };

// export interface Filter {}

export interface FindOptions {
  limit?: number;
  skip?: number;
  projection?: any;
}

export interface ReplaceOptions {
  projection?: any;
}

export abstract class DBDriver {
  abstract initialized: boolean;
  abstract ObjectId?: { new (s: string): { toString(): string } };
  abstract isValidId(id: string): boolean;

  abstract init(metadata: Metadata): Promise<void>;
  abstract close(): Promise<void>;
  abstract create(collection: string, document: any): Promise<any>;
  abstract createMany(collection: string, docs: any[]): Promise<any>;
  abstract count(collection: string, filter: any): Promise<number>;
  abstract deleteMany(collection: string, filter: any): Promise<number>;
  abstract deleteWithIds(collection: string, ids: string[]): Promise<void>;
  abstract deleteOne(collection: string, filter: any): Promise<void>;
  abstract deleteWithId(collection: string, id: string): Promise<void>;
  abstract replaceOne(
    collection: string,
    filter: any,
    replacement: any,
    replaceOptions?: ReplaceOptions
  ): Promise<any | null>;
  abstract replaceById(
    collection: string,
    id: string,
    replacement: any,
    replaceOptions?: ReplaceOptions
  ): Promise<any | null>;
  abstract find(
    collection: string,
    filter: any,
    options?: FindOptions
  ): Promise<any[]>;
  abstract findOne(
    collection: string,
    filter: any,
    options?: FindOptions
  ): Promise<any | null>;
  abstract findById(
    collection: string,
    id: string,
    options?: FindOptions
  ): Promise<any | null>;
  abstract findByIds(
    collection: string,
    ids: string[],
    options?: FindOptions
  ): Promise<any[]>;
}

export interface FileMetadata {
  name: string;
  id: string;
  length: number;
  createdAt: Date;
  updateAt: Date;
  mimetype?: string;
}

export abstract class FileSystem {
  abstract initialized: boolean;
  abstract init(): Promise<void>;
  abstract close(): Promise<void>;
  abstract deleteFile(id: string): Promise<void>;
  abstract readFileStream(id: string): stream.Readable;
  abstract writeFileStream(metadata: FileMetadata): [stream.Writable, string];
  abstract readFile(id: string): Promise<Buffer>;
  abstract writeFile(
    buffer: string | NodeJS.ArrayBufferView,
    metadata: FileMetadata
  ): Promise<string>;
  abstract metadata(id: string): Promise<FileMetadata | null>;
  abstract isValidId(id: string): boolean;
}

export type MaybePromise<T> = T | Promise<T>;

export type ListRule =
  | ["list", "*", ((req: http.IncomingMessage) => MaybePromise<boolean>)?]
  | ["list", typeof Model, ((user: Model) => MaybePromise<boolean>)?];

export type ListFilterRule =
  | ["list_filter", "*", (req: http.IncomingMessage) => MaybePromise<any>]
  | ["list_filter", typeof Model, (user: Model) => MaybePromise<any>];

export type CreateRule =
  | ["create", "*", ((req: http.IncomingMessage) => MaybePromise<boolean>)?]
  | ["create", typeof Model, ((user: Model) => MaybePromise<boolean>)?];

export type UpdateRule =
  | ["update", "*", ((req: http.IncomingMessage) => MaybePromise<boolean>)?]
  | [
      "update",
      typeof Model,
      ((user: Model, document: Model) => MaybePromise<boolean>)?,
      // wether to fetch the document or not
      boolean?
    ];

// TODO consider adding delete_filter rule
export type DeleteRule =
  | ["delete", "*", ((req: http.IncomingMessage) => MaybePromise<boolean>)?]
  | [
      "delete",
      typeof Model,
      ((user: Model, document: Model) => MaybePromise<boolean>)?,
      // wether to fetch the document or not
      boolean?
    ];

export type Rule =
  | ListRule
  | ListFilterRule
  | CreateRule
  | UpdateRule
  | DeleteRule;

export type CustomRouteItem = {
  schema: SchemaObject;
  types: AnyType[];
  method: "get" | "post" | "put" | "delete";
  isStatic: boolean;
  authorization: (typeof Model)[];
  returnType: AnyType | null;
  argumentsName: string[];
};

export type Metadata = (typeof Model)[];

export interface Runner {
  // driver: DBDriver;
  // filesystem?: FileSystem;
  server?: http.Server;
}

export type Context = {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  [key: string]: any;
};

export type AuthorizeFunction = (
  ctx: Context,
  returnUser: boolean
) => Promise<boolean | object>;
// Other Types

type ExcludeKeysWithTypeOf<T, V> = {
  [K in keyof T]: Exclude<T[K], undefined> extends V ? never : K;
}[keyof T];

type Without<T, V> = Pick<T, ExcludeKeysWithTypeOf<T, V>>;

export type noFn<T> = Without<T, Function>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const ERROR = Symbol("ERROR");

const REDIRECT = Symbol("REDIRECT");

export type CustomError = {
  status: number;
  reason: any;
};

export type Redirect = {
  url: string;
  status: number;
};

export type LocoError = {
  [ERROR]: CustomError;
};

export type LocoReducers = {
  [REDIRECT]: Redirect;
};

export const getMetadata = (
  o: any
): [CustomError | undefined, Redirect | undefined] =>
  typeof o === "object" ? [o[ERROR], o[REDIRECT]] : [null, null];

export const error = (status: number, reason: any) => ({
  [ERROR]: { status, reason },
});

export const redirect = (status: number, url: string) => ({
  [REDIRECT]: { url, status },
});

export type Ref<T> = T & {
  readonly _populated: boolean;
  // _collection: string;
  // _populate(): Promise<void>;
  readonly _id: string;
};
