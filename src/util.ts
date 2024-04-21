import { ArrayType, Model, ObjectType, TupleType } from ".";
import { AnyType, BasicType, SchemaObject, isSchemaObject } from "./types";

export function trimArray<T>(array: T[], item: T) {
  let lastIndex;
  for (let i = array.length - 1; i >= 0; i--) {
    if (array[i] === item) lastIndex = i;
    else break;
  }
  return lastIndex !== undefined ? array.slice(0, lastIndex) : array;
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

export function functionName(func: Function) {
  const result = /class\s+([\w\$]+)/.exec(func.toString());
  if (result) return result[1];

  const result2 = /^function\s+([\w\$]+)\s*\(/.exec(func.toString());
  return result2 ? result2[1] : ""; // for an anonymous function there won't be a match
}

export function removeProperties(propertiesArray: (number | string)[][]) {
  let result = "function (object) {";
  for (const properties of propertiesArray) {
    if (!properties.includes(-1)) {
      result +=
        "delete object" +
        properties.reduce(
          (pv, current) =>
            pv + (typeof current === "number" ? `[${current}]` : `.${current}`),
          ""
        ) +
        ";";
      continue;
    }
    let acc = "object";
    let index = 1;
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      if (i === properties.length - 1) {
        acc += `.${property}`;
        result += `delete ${acc};`;
        result += "}".repeat(index);
        break;
      }
      if (typeof property === "string") {
        acc += `.${property}`;
        continue;
      }
      result += `for (let i_${index}; i_${index} < ${acc}.length; i_${index}++) {`;
      acc += `[i_${index}]`;
      index++;
    }
  }
  result += "}";
  return result;
}

export function getPaths(
  schema: AnyType | SchemaObject,
  path: (string | number)[] = []
) {
  const result: [(string | number)[], BasicType][] = [];

  if (!isSchemaObject(schema)) {
    if (schema.type === "ARRAY") {
      if ("noSend" in schema.sub_type || "noReceive" in schema.sub_type)
        throw new Error(
          `noSend or noReceive properties are set on array sub_type instead of array! (in ${path.join(
            "."
          )})`
        );
      // it might not make sense why i'm checking the property to be not set
      // then setting it in the sub-type, but i'm doing this in order to make
      // find noSend and noReceive paths easy
      schema.sub_type.noSend = schema.noSend;
      schema.sub_type.noReceive = schema.noReceive;
      const r = getPaths(schema.sub_type, [...path, -1]);
      result.push(...r);
    } else if (schema.type === "TUPLE") {
      schema.sub_types.forEach((type, i) => {
        const r = getPaths(type, [...path, i]);
        result.push(...r);
      });
    } else if (schema.type === "OBJECT") {
      const r = getPaths(schema.schema, [...path]);
      result.push(...r);
    } else {
      result.push([[...path], schema]);
    }
  } else {
    for (const [k, sc] of Object.entries(schema)) {
      const r = getPaths(sc, [...path, k]);
      result.push(...r);
    }
  }

  return result;
}

export function getSchema(paths: (typeof Model)["_paths"]) {
  let result = "function (path) { ";

  for (let i = 0; i < paths.length; i++) {
    const [path, schema] = paths[i];
    if (i !== 0) result += "else ";

    if (!path.includes(-1)) {
      result += `if (path === "${path.join(".")}") { return ${JSON.stringify(
        schema
      )}; }`;
      continue;
    }

    const regex = path.reduce(
      (pv, p) => (p === -1 ? pv + "\\.[0-9]+" : pv + `\\.${p}`),
      ""
    );
    result += `if (/${regex}/.test(path)) { return ${JSON.stringify(
      schema
    )}; }`;
  }
  if (paths.length >= 1) result += "else { return null; }";
  result += "}";
  return result;
}

// TODO CODE
export function setUpload(paths: (typeof Model)["_paths"]) {
  paths = paths.filter(([_, t]) => !t.noReceive);
  let result = "function (object, path, value) {let groups; ";

  for (let i = 0; i < paths.length; i++) {
    const [path, schema] = paths[i];
    if (i !== 0) result += "else ";
    let regex = "";
    let joinedPath = "";
    let insideIf = "";
    let includesN1 = false;
    let nOfGroups = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const nextP = path[i + 1];
      if (p === -1) {
        regex += "\\.([0-9]+)";
        joinedPath += `[i_${nOfGroups}]`;
        includesN1 = true;
        nOfGroups++;
      } else {
        regex += `\\.${p}`;
        joinedPath += typeof p === "number" ? `[${p}]` : `.${p}`;
      }
      if (i === path.length - 1) {
        insideIf += `object${joinedPath} = value;`;
        break;
      }
      if (typeof nextP === "number")
        insideIf += `if (!object${joinedPath}) {object${joinedPath} = [];}`;
      else insideIf += `if (!object${joinedPath}) {object${joinedPath} = {};}`;
    }
    regex = regex.slice(2);
    if (includesN1) {
      result += `if (groups = /${regex}/.exec(path)) {`;
      result += `const [_, `;
      result += Array(nOfGroups)
        .fill(0)
        .map((_, i) => `i_${i}`)
        .join(",");
      result += `] = groups; ${insideIf} }`;
    } else result += `if (path === "${regex}") { ${insideIf} }`;
  }
  result += "}";
  return result;
}

function removeExtraSub(
  schema: SchemaObject | TupleType | ArrayType,
  key: string,
  index: number
) {
  if (isSchemaObject(schema)) {
    let result = `
const keys_${index} = [${Object.keys(schema).map((k) => "'" + k + "'")}];
for (const key_${index} in ${key}) {
  if (!keys_${index}.includes(key_${index}))
    delete ${key}[key_${index}];
}`;
    for (const [sub_key, sub_type] of Object.entries(schema)) {
      if (sub_type.type === "TUPLE" || sub_type.type === "ARRAY")
        result += removeExtraSub(sub_type, `${key}.${sub_key}`, index + 1);
      if (sub_type.type === "OBJECT")
        result += removeExtraSub(
          sub_type.schema,
          `${key}.${sub_key}`,
          index + 1
        );
      index++;
    }
    return result;
  }
  if (schema.type === "TUPLE") {
    let result = `
if (${key}.length > ${schema.sub_types.length}) ${key} = ${key}.slice(0, ${schema.sub_types.length});
`;
    schema.sub_types.forEach((sub_type, i) => {
      if (sub_type.type === "TUPLE" || sub_type.type === "ARRAY")
        result += removeExtraSub(sub_type, `${key}[${i}]`, index + 1);
      if (sub_type.type === "OBJECT")
        result += removeExtraSub(sub_type.schema, `${key}[${i}]`, index + 1);
      index++;
    });
    return result;
  }
  if (
    schema.sub_type.type === "TUPLE" ||
    schema.sub_type.type === "ARRAY" ||
    schema.sub_type.type === "OBJECT"
  ) {
    let result = `for (let i_${index} = 0; i_${index} < ${key}.length; i_${index}++) {`;
    if (schema.sub_type.type === "OBJECT")
      result += removeExtraSub(
        schema.sub_type.schema,
        `${key}[i_${index}]`,
        index + 1
      );
    else
      result += removeExtraSub(
        schema.sub_type,
        `${key}[i_${index}]`,
        index + 1
      );
    index++;
    return result + "}";
  }

  return "";
}

export function removeExtra(model: typeof Model) {
  return `function (object) {
${removeExtraSub(model._schema, "object", 0)}
}`;
}

// from stack overflow
export function $args(func: Function) {
  return (func + "")
    .replace(/[/][/].*$/gm, "") // strip single-line comments
    .replace(/\s+/g, "") // strip white space
    .replace(/[/][*][^/*]*[*][/]/g, "") // strip multi-line comments
    .split("){", 1)[0]
    .replace(/^[^(]*[(]/, "") // extract the parameters
    .replace(/=[^,]+/g, "") // strip any ES6 defaults
    .split(",")
    .filter(Boolean); // split & filter [""]
}
