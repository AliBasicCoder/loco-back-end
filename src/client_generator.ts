import fs from "fs";
import path from "path";
import { Model } from ".";
import { AnyType, SchemaObject } from "./types";
import {
  customRouteValidateGen,
  schemaValidateGen,
} from "./validation_generator";

function base(schema: AnyType): string {
  if (schema.type === "TUPLE")
    return `[${schema.sub_types.map(base).join(", ")}]`;
  if (schema.type === "ARRAY") return `(${base(schema.sub_type)})[]`;
  if (schema.type === "BOOLEAN") return "boolean";
  if (schema.type === "NUMBER") return "number";
  if (schema.type === "STRING") return "string";
  if (schema.type === "DATE") return "Date";
  if (schema.type === "REF") return `${schema.to._functionName} | string`;
  if (schema.type === "FILE") return "string | Blob";
  let result = "";
  for (const [key, sc] of Object.entries(schema.schema)) {
    result += ` ${key}: ${base(sc)};`;
  }
  return `{${result} }`;
}

function schemaToTypescript(schema: SchemaObject): string {
  let result = "";
  for (const [key, sc] of Object.entries(schema)) {
    result += `  declare ${key}: ${base(sc)};\n`;
  }
  return result;
}

function customRoutes(model: typeof Model) {
  let result = "";
  for (const [key, route] of Object.entries(model._customRoutes)) {
    result += `static ${key}_validate = ${customRouteValidateGen(
      key,
      route,
      model
    )};\n`;
    if (route.isStatic) result += "static ";
    // TODO add argument validation
    // TODO only convert to formdata if it has files
    result += `  async ${key}(`;

    result += route.argumentsName
      .map((arg, i) => `${arg}: ${base(route.types[i])}`)
      .join(", ");

    if (route.returnType?.type === "REF")
      result += `): ${route.returnType.to._functionName} `;
    else if (route.returnType) result += `): ${base(route.returnType)} `;
    else result += `) `;
    result += `{
    const __object = { ${route.argumentsName.join(",")} };
    this.${key}_validate(object);
    const __req = await RUNNER.fetcher("/${model.collection}/${key}"${
      route.isStatic ? "" : '+ "/" + this._id'
    }, {
      method: "${route.method.toUpperCase()}",
      body: toFormData(__object)    
    });
    if (!__req.ok) throw new Error(__req.status + ": " + __req.statusText);
    const __result = await __req.json();
  `;
    if (route.returnType?.type === "REF") {
      result += `  return ${route.returnType.to._functionName}._new(__result);`;
    } else {
      result += `  return __result;`;
    }
    result += "\n  }";
  }
  return result;
}

export function webCollectionsCreator(dir: string, models: (typeof Model)[]) {
  let result = `// @ts-nocheck
// AUTO-GENERATED PLEASE DO NOT EDIT
import { Model, init, METADATA, toFormData, RUNNER } from "loco/dist/client_base";
import { fetcher } from "./fetcher";
RUNNER.fetcher = fetcher
`;
  for (const model of models) {
    result += `export class ${model._functionName} extends Model {
${schemaToTypescript(model._schema)}
${customRoutes(model)}
static validate = ${schemaValidateGen(model)};
}
`;
  }
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  else if (fs.statSync(dir).isFile())
    throw new Error("expected path of directory found file at: " + dir);
  if (!fs.existsSync(path.join(dir, "fetcher.ts")))
    fs.writeFileSync(
      path.join(dir, "fetcher.ts"),
      "export const fetcher = fetch;"
    );

  fs.writeFileSync(path.join(dir, "client.ts"), result);
}
