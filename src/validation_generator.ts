import { Model } from ".";
import { AnyType, CustomRouteItem } from "./types";

function join(
  key: string,
  path: string,
  removeFirst: boolean,
  keyIsNumber: boolean
) {
  if (removeFirst) path = path.split(".").slice(1).join(".");
  if (path) {
    if (!Number.isNaN(Number(key)) || keyIsNumber) return `${path}[${key}]`;
    return `${path}.${key}`;
  }
  return key;
}

// TODO consider create or using a lib to make code generation safer and easier
function validateGen(
  sc: AnyType,
  key: string,
  key2: string,
  path: string,
  path2: string,
  model: typeof Model,
  keyIsNumber = false,
  removeExtra = false,
  removeFirst = true,
  index = 0
) {
  let result = "";
  if (sc.skip) return result;
  const d = join(key, path, false, keyIsNumber);
  const d2 = join(key, path, removeFirst, keyIsNumber);
  const d3 = join(key2, path2, false, false);

  if (sc.type === "BOOLEAN") {
    if ("default" in sc) result += `if (${d} == null) ${d} = ${sc.default};`;
    result += `if (${d} == "0" || ${d} === "" || ${d} === "false") ${d} = false;
if (${d} == "1" || ${d} === "true") ${d} = true;
if (typeof ${d} !== "boolean") return "'${d2}' is not a boolean";`;
  }
  if (sc.type === "NUMBER") {
    if ("default" in sc) result += `if (${d} == null) ${d} = ${sc.default};`;
    if (sc.nullable) result += `if (${d} != null) {`;
    result += `if (typeof ${d} === "string") ${d} = Number(${d});
if (typeof ${d} !== "number" || Number.isNaN(${d})) return "'${d2}' is not a number";`;
    if (typeof sc.min === "number")
      result += `if (${d} < ${sc.min}) return "'${d2}' is too small (should be >= ${sc.min})";`;
    if (typeof sc.max === "number")
      result += `if (${d} > ${sc.max}) return "'${d2}' is too big (should be <= ${sc.max})";`;
    if (sc.integerOnly)
      result += `if (!Number.isInteger(${d})) return "'${d2}' is NOT an integer";`;
    if (sc.enum)
      result += `if (!${d3}.enum.includes(${d})) return "'${d2}' is NOT one of possible values";`;
    if (sc.validator) {
      result += `const r_${index} = (${d3}.validator)(${d}, "${d2}");
if (typeof r_${index} === "string") return r_${index};
if (r_${index} === false) return "'${d2}' rejected by validator";`;
      index++;
    }
    if (sc.nullable) result += `} else ${d} = null;`;
  }
  if (sc.type === "STRING") {
    if (sc.ID) {
      result += `if (${d} != null) {`;
      if (model.driver.ObjectId) {
        result += `
if (!(${d} instanceof this.driver.ObjectId || (typeof ${d} === "string" && this.driver.isValidId(${d})))) 
  return "'${d2}' is NOT a valid ID";
if (typeof ${d} === "string" && toObjectId) ${d} = new this.driver.ObjectId(${d});
if (${d} instanceof this.driver.ObjectId && !toObjectId) ${d} = ${d}.toString();`;
      } else {
        result += `if (typeof ${d} !== "string" || !this.driver.isValidId(${d}))
return "'${d2}' is NOT a valid ID";`;
      }
      result += `} else ${d} = null;`;
    }
    if ("default" in sc) result += `if (${d} == null) ${d} = "${sc.default}";`;
    if (sc.nullable) result += `if (${d} != null) {`;
    result += `if (typeof ${d} !== "string") return "'${d2}' is NOT a string";`;
    if (sc.min)
      result += `if (${d}.length < ${sc.min}) return "'${d2}' is too short (should be at least ${sc.min} characters)";`;
    if (sc.max)
      result += `if (${d}.length > ${sc.max}) return "'${d2}' is too long (should be at most ${sc.max} characters)";`;
    if (sc.fixedLength)
      result += `if (${d}.length !== ${sc.fixedLength}) return "'${d2}' should be exactly ${sc.fixedLength} characters";`;
    if (sc.enum)
      result += `if (!${d3}.enum.includes(${d})) return "'${d2}' is NOT one of possible values";`;
    if (sc.validator) {
      result += `const r_${index} = (${d3}.validator)(${d}, "${d2}");
  if (typeof r_${index} === "string") return r_${index};
  if (r_${index} === false) return "'${d2}' rejected by validator";`;
      index++;
    }
    if (sc.nullable) result += `} else ${d} = null;`;
  }
  if (sc.type === "DATE") {
    if ("default" in sc)
      result += `if (${d} == null) ${d} = new Date(${sc.default?.getTime()});`;
    if (sc.nullable) result += `if (${d} != null) {`;
    result += `if (typeof ${d} === "string" || typeof ${d} === "number") ${d} = new Date(${d});
if (!(${d} instanceof Date) || isNaN(${d})) return "'${d2}' is NOT a date";`;
    if (sc.min)
      result += `if (${d}.getTime() < ${sc.min.getTime()}) return "'${d2}' is too old (should be at least ${
        sc.min
      })";`;
    if (sc.max)
      result += `if (${d}.getTime() > ${sc.max.getTime()}) return "'${d2}' is too recent (should be at most ${
        sc.max
      })";`;
    if (sc.enum)
      result += `if (!${d3}.enum.includes(${d})) return "'${d2}' is NOT one of possible values";`;
    if (sc.validator) {
      result += `const r_${index} = (${d3}.validator)(${d}, "${d2}");
if (typeof r_${index} === "string") return r_${index};
if (r_${index} === false) return "'${d2}' rejected by validator";`;
      index++;
    }
    if (sc.nullable) result += `} else ${d} = null;`;
  }
  // TODO sc.min and sc.max
  if (sc.type === "FILE") {
    if (sc.default) result += `if (${d} == null) ${d} = ${sc.default};`;
    if (sc.nullable) result += `if (${d} != null) {`;
    result += `if (typeof ${d} === "string") {
      if (!this.filesystem.isValidId(${d})) return "'${d2}' is not a valid file id";
    } else {`;
    if (typeof process === "undefined") {
      result += `if (!(${d} instanceof Blob)) return "'${d2}' is not a Blob nor a file id";`;
      if (sc.mimetype)
        result += `if (!${d}.type || !matchMime(${d3}.mimeType, ${d}.type))
return "'${d2}' is wrong mime type";`;
    } else {
      result += `if (!(${d} instanceof Blob || ${d} instanceof Buffer))
      return "'${d2}' is not a Buffer, a Blob nor a file id";`;
      if (sc.mimetype)
        result += `if ({d} instanceof Blob && (!${d}.type || !matchMime(${d3}.mimeType, ${d}.type)))
return "'${d2}' is wrong mime type";`;
    }
    result += "}";
    if (sc.nullable) result += `} else ${d} = null;`;
  }
  if (sc.type === "REF") {
    if (sc.nullable) result += `if (${d} != null) {`;
    if (model.driver.ObjectId) {
      result += `if (!(${d} instanceof this.driver.ObjectId || (typeof ${d} === "string" && this.driver.isValidId(${d}))))
return "'${d2}' is not a valid reference";
if (toObjectId && typeof ${d} === "string") ${d} = new this.driver.ObjectId(${d});
if (!toObjectId && typeof ${d} !== "string") ${d} = ${d}.toString();`;
    } else {
      result += `if (typeof ${d} !== "string" || !this.driver.isValidId(${d}))
return "'${d2}' is not a valid reference";`;
    }
    if (sc.nullable) result += `} else ${d} = null;`;
  }
  if (sc.type === "ARRAY") {
    index++;
    result += `if (${d} == null) ${d} = [];
else if (!Array.isArray(${d})) ${d} = [${d}];`;
    if ("max" in sc)
      result += `if (${d}.length > ${sc.max}) return "'${d2}' has too many items";`;
    if ("min" in sc)
      result += `if (${d}.length < ${sc.min}) return "'${d2}' has too few items";`;
    result += `for (let i_${index} = 0; i_${index} < ${d}.length; i_${index}++) {`;
    result += validateGen(
      sc.sub_type,
      `i_${index}`,
      "sub_type",
      d,
      d3,
      model,
      true,
      removeExtra,
      removeFirst,
      index
    );
    result += "}";
  }
  if (sc.type === "TUPLE") {
    result += `if (!Array.isArray(${d})) return "'${d}' is not an array";
if (${d}.length !== ${sc.sub_types.length}) return "'${d}' doesn't have ${sc.sub_types.length} elements";`;
    for (let i = 0; i < sc.sub_types.length; i++) {
      result += validateGen(
        sc.sub_types[i],
        `${i}`,
        `sub_type[${i}]`,
        d,
        d3,
        model,
        false,
        removeExtra,
        removeFirst,
        index
      );
    }
  }
  if (sc.type === "OBJECT") {
    if (sc.nullable) result += `if (${d} != null) {`;
    result += `if (typeof ${d} !== "object") return "'${d2}' is not a object";`;
    for (const [nested_key, nested_sc] of Object.entries(sc.schema)) {
      result += validateGen(
        nested_sc,
        nested_key,
        nested_key,
        d,
        `${d3}.schema`,
        model,
        false,
        removeExtra,
        removeFirst
      );
    }

    if (sc.nullable) result += `} else ${d} = null;`;
  }
  return result;
}

export function schemaValidateGen(model: typeof Model) {
  const schema = model._schema;
  let result = "function (object, toObjectId) {";
  for (const [key, sc] of Object.entries(schema)) {
    result += validateGen(sc, key, key, "object", "this._schema", model);
  }
  return result + "}";
}

export function customRouteValidateGen(
  key: string,
  route: CustomRouteItem,
  model: typeof Model
) {
  let result = "function (object, toObjectId) {";

  for (const [key, sc] of Object.entries(route.schema)) {
    result += validateGen(
      sc,
      key,
      key,
      "object",
      `this._customRoutes[${key}]`,
      model
    );
  }
  return result + "}";
}
