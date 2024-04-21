import { Model } from "..";

export function create(model: typeof Model) {
  let result = `async function (req, res) {
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
this._removeNoReceive(upload);
this.preValidateCreate(upload);
this.preValidateUpdate(upload);
this.preValidate(upload);
const validation_error = this.validate(upload);
if (validation_error) {
  destroy?.(validation_error);
  res.writeHead(400, { "Content-Type": "text/plain" });
  res.end(validation_error);
  return;
}
if (isJson) this._removeExtra(upload);
`;

  if (model._rules_create[0][1] !== "*") {
    result += "let authorized = false;";
    model._rules_create.forEach((rule, i) => {
      const collection = rule[1] as typeof Model;
      const fn = rule[2];
      if (i !== 0) result += `if (!authorized) {`;
      result += `const authorize_result = await ${
        collection._functionName
      }.authorize(req, ${!!fn});`;
      if (fn) {
        result += `if (authorize_result) {
  const authorize_result2 = await this._rules_create[${i}][2](authorize_result);
  if (authorize_result2) {
    authorized = true;
  }
}`;
      } else result += `if (authorize_result) authorized = true;`;
      if (i !== 0) result += "}";
    });
    result += `if (!authorized) {
      destroy?.("Unauthorized");
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end("Unauthorized");
      return;
    }`;
  } else if (model._rules_create[0][2]) {
    result += `const authorize_result = await this._rules_create[0][2](req);
if (!authorize_result) {
  res.writeHead(401, { "Content-Type": "text/plain" });
  res.end("Unauthorized");
  return;
}`;
  }

  result += `this.preCreate(upload);
this.preUpdate(upload);
const result = await this.driver.create(this.collection, upload);
this.postCreate(result);
this.postUpdate(result);
this._removeNoSend(result);
res.writeHead(200, { "Content-Type": "application/json" });
res.end(JSON.stringify(result));
}`;

  return result;
}
