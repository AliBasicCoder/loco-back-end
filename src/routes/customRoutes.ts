import { Model } from "..";
import { getPaths, setUpload } from "../util";
import { customRouteValidateGen } from "../validation_generator";

export function customRoutes(model: typeof Model) {
  let result = "";
  for (const [key, route] of Object.entries(model._customRoutes)) {
    if (route.types.length > 0) {
      result += `
      ${model._functionName}._${key}_validate = ${customRouteValidateGen(
        key,
        route,
        model
      )};
      ${model._functionName}._${key}_setOnUpload = ${setUpload(
        getPaths(route.schema)
      )};`;
    }
    result += `${model._functionName}._${key} = async function (req, res`;
    if (!route.isStatic) result += `, id`;
    result += `) {`;
    if (!route.isStatic) {
      result += `if (!this.driver.isValidId(id)) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
        return;
      }
      const currentDocument = await this.driver.findById(id);
      if (!currentDocument) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Document Not Found");
        return;
      }
      currentDocument = this._new(currentDocument);`;
    }
    if (route.types.length > 0) {
      result += `
const isJson = req.headers["content-type"] === "application/json";
if (
  !(isJson || req.headers["content-type"]?.startsWith("multipart/form-data"))
  || Number(req.headers["content-length"]) <= 0
) {
  res.writeHead(400, { "Content-Type": "text/plain" });
  res.end("Bad Request");
  return;
}
let upload = {};
if (!isJson) {
  var [error, destroy] = await new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    let destroyed = false;
    const files = [];
    const destroy = (error) => {
      destroyed = true;
      bb.end();
      Promise.all(files.map(streamOrId => {
        if (typeof streamOrId === "string")
          return this.filesystem.deleteFile(streamOrId);
        else {
          streamOrId[0].end();
          return this.filesystem.deleteFile(streamOrId[1]);
        }
      }))
      .then(() => resolve([error, destroy]));
      return;
    }
    bb.on("field", (name, value) => !destroyed && this._setOnUpload(upload, name, value));
    bb.on("file", (name, file, info) => {
      if (destroyed) return;
      if (!this.filesystem) {
        destroyed = true;
        resolve(['property "' + name + '" does not exists! unneeded files are NOT allowed', destroy]);
        return;
      }
      const options = this._getFileSchema(name);
      if (!options) 
        return destroy('property "' + name + '" does not exists! unneeded files are NOT allowed');
      if (
        options.mimetype &&
        (!info.mimeType || !matchMime(options.mimetype, info.mimeType))
      ) 
        return destroy('file mimetype should be "' + options.mimetype + '" got "' + info.mimeType + '"');
      
      const [writeStream, id] = this.filesystem.writeFileStream({ name: info.name });
      
      this._setOnUpload(upload, name, id);
      files.push(writeStream);
      const index = files.length - 1;
      let totalLength = 0;

      file.on("data", buffer => {
        totalLength += buffer.length;
        if (options.max && totalLength > options.max)
          return destroy('file "' + name + '" is too big (max size ' + options.max + ' bytes)');
        
        writeStream.write(buffer);
      }).on("close", () => {
        if (options.min && totalLength < options.min)
          return destroy('file "' + name + '" is too small (min size ' + options.max + ' bytes)');
        
        writeStream.end();
        files[index] = [writeStream, id];
      }).on("error", () => {});
    });
    bb
      .on("close", () => !destroyed && resolve([null, destroy]))
      .on("error", () => {});

    req.pipe(bb);
  });
  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(error);
    return;
  }
} else {
  try {
    const str = await collectStr(req, this.JSON_MAX_SIZE || 4194304);
    if (str === null) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("payload exceeded maximum size of " + (this.JSON_MAX_SIZE || 4194304) + " bytes");
      return;
    }
    upload = JSON.parse(str);        
  } catch (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request");
    return;
  }
}
const validation_error = this._${key}_validate(upload);
if (validation_error) {
  destroy?.(validation_error);
  res.writeHead(400, { "Content-Type": "text/plain" });
  res.end(validation_error);
  return;
}`;
    }
    if (route.authorization.length > 0) {
      result += "let user;";
      route.authorization.forEach((m, i) => {
        if (i !== 0) result += `if (!user) {`;
        result += `user = ${m._functionName}.authorize(req, true);`;
        if (i !== 0) result += "}";
      });
      result += `if (!user) {
        destroy?.("Unauthorized");
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        return;
      }`;
    }
    route.argumentsName.forEach((arg, i) => {
      result += `const arg${i} = upload["${arg}"];\n`;
    });
    if (route.isStatic && route.authorization.length > 0) {
      result += `const result = await this.${key}(user, ${route.argumentsName
        .map((_, i) => "arg" + i)
        .join(", ")}, { req, res });`;
    }
    if (route.isStatic && route.authorization.length === 0) {
      result += `const result = await this.${key}(${route.argumentsName
        .map((_, i) => "arg" + i)
        .join(", ")}, { req, res });`;
    }
    if (!route.isStatic && route.authorization.length > 0) {
      result += `const result = await currentDocument.${key}(user, ${route.argumentsName
        .map((_, i) => "arg" + i)
        .join(", ")}, { req, res });`;
    }
    if (!route.isStatic && route.authorization.length === 0) {
      result += `const result = await currentDocument.${key}(${route.argumentsName
        .map((_, i) => "arg" + i)
        .join(", ")}, { req, res });`;
    }
    result += `
const [result_error, result_redirect] = getMetadata(result);
if (result_error) {
  if (typeof result_error.reason === "string") {
    res.writeHead(result_error.status, { "Content-Type": "text/plain" });
    res.end(result_error.reason);
    return;
  }
  res.writeHead(result_error.status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result_error.reason));
  return;
}
if (result_redirect) {
  res.writeHead(result_redirect.status, { Location: result_redirect.url });
  res.end();
  return;
}
if (!result) {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
  return;
}`;
    if (route.returnType?.type === "REF") {
      result += `${route.returnType.to._functionName}._removeNoSend(result);`;
    }
    result += `
res.writeHead(200, { "Content-Type": "application/json" });
res.end(JSON.stringify(result));
return;
};`;
  }

  return result;
}
