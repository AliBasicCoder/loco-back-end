import { Model } from ".";
import {
  ArrayType,
  ArrayTypeOptions,
  BooleanType,
  BooleanTypeOptions,
  DateType,
  DateTypeOptions,
  FileType,
  FileTypeOptions,
  NumberType,
  NumberTypeOptions,
  ObjectType,
  ObjectTypeOptions,
  ReferenceType,
  ReferenceTypeOptions,
  StringType,
  StringTypeOptions,
  TupleType,
  TupleTypeOptions,
} from "./types";

export const STATE = { ret: true };

export const boolean = (options?: BooleanTypeOptions) =>
  (STATE.ret
    ? ({ type: "BOOLEAN", ...options } as BooleanType)
    : undefined) as unknown as boolean;

export function number(
  options: NumberTypeOptions & { nullable: true }
): number | null;
export function number(
  options?: NumberTypeOptions & { nullable?: false }
): number;
export function number(options?: NumberTypeOptions) {
  return (STATE.ret
    ? ({
        type: "NUMBER",
        integerOnly: false,
        nullable: false,
        signed: true,
        ...options,
      } as NumberType)
    : undefined) as unknown as number | null;
}

export function string(
  options: StringTypeOptions & { nullable: true }
): string | null;
export function string(
  options?: StringTypeOptions & { nullable?: false }
): string;
export function string(options?: StringTypeOptions) {
  return (STATE.ret
    ? ({
        type: "STRING",
        nullable: false,
        ...options,
      } as StringType)
    : undefined) as unknown as string | null;
}

export const id = () =>
  (STATE.ret
    ? ({
        type: "STRING",
        nullable: true,
        ID: true,
      } as StringType)
    : undefined) as unknown as string;

export function date(
  options: DateTypeOptions & { nullable: true }
): Date | null;
export function date(options?: DateTypeOptions & { nullable?: false }): Date;
export function date(options?: DateTypeOptions) {
  return (STATE.ret
    ? ({
        type: "DATE",
        store: "DATE_TIME",
        ...options,
      } as DateType)
    : undefined) as unknown as Date;
}

export const ref = (to: typeof Model, options?: ReferenceTypeOptions) =>
  (STATE.ret
    ? ({
        type: "REF",
        to,
        ...options,
      } as ReferenceType)
    : undefined) as unknown as string;

// TODO make a File type and make Model.create
// TODO accept Blobs on creation
export function file(
  options: FileTypeOptions & { nullable: true }
): string | Blob | null;
export function file(
  options?: FileTypeOptions & { nullable?: false }
): string | Blob;
export function file(options?: FileTypeOptions) {
  return (STATE.ret
    ? ({ type: "FILE", ...options } as FileType)
    : undefined) as unknown as string | Blob | null;
}

export function array<T>(sub_type: T, options?: ArrayTypeOptions) {
  if (!STATE.ret) return undefined as unknown as T[];
  return { type: "ARRAY", sub_type, ...options } as ArrayType as unknown as T[];
}

// figure out a way to remove the as const
export function tuple<T extends any[]>(
  options: TupleTypeOptions,
  ...sub_types: T
) {
  return (STATE.ret
    ? ({ type: "TUPLE", sub_types, ...options } as TupleType)
    : undefined) as unknown as T;
}

export function object<T extends { [key: string]: any }>(
  schema: T,
  options: ObjectTypeOptions & { nullable: true }
): T | null;
export function object<T extends { [key: string]: any }>(
  schema: T,
  options?: ObjectTypeOptions & { nullable?: false }
): T;
export function object<T extends { [key: string]: any }>(
  schema: T,
  options?: ObjectTypeOptions
) {
  return (STATE.ret
    ? ({ type: "OBJECT", schema, ...options } as ObjectType)
    : undefined) as unknown as T | null;
}
