import { Model } from "..";

export function del(model: typeof Model) {
  let result = `async function (req, res, ids) {
for (const id of ids) {
  if (!this.driver.isValidId(id)) {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('"' + id + '" is not a valid id');
    return
  }
}`;

  if (model._rules_delete[0][1] !== "*") {
    result += "let authorized = false;";
    model._rules_delete.forEach((rule, i) => {
      const collection = rule[1] as typeof Model;
      const fn = rule[2];
      if (i !== 0) result += `if (!authorized) {`;
      result += `const authorize_result = await ${
        collection._functionName
      }.authorize(req, ${!!fn});`;
      if (fn) {
        if (rule[3]) {
          result += `if (authorize_result) {
            const __documents = await ${model._functionName}.findByIds(ids);
            const __user = ${collection._functionName}._new(authorize_result);
            let __allAuthorized = true;
            for (const __document of __documents) {
              if (!(await this._rules_delete[${i}][2](__user, __document))) {
                __allAuthorized = false;
                break;
              }
            }
            authorized = __allAuthorized;
          }`;
        } else {
          result += `if (authorize_result) {
const authorize_result2 = await this._rules_delete[${i}][2](${collection._functionName}._new(authorize_result));
if (authorize_result2) {
  authorized = true;
}
}`;
        }
      } else result += `if (authorize_result) authorized = true;`;
      if (i !== 0) result += "}";
    });
    result += `if (!authorized) {
res.writeHead(401, { "Content-Type": "text/plain" });
res.end("Unauthorized");
return;
}`;
  } else if (model._rules_delete[0][2]) {
    const rule = model._rules_delete[0];
    result += `const authorize_result = await this._rules_delete[0][2](req);
if (!authorize_result) {
res.writeHead(401, { "Content-Type": "text/plain" });
res.end("Unauthorized");
return;
}`;
  }

  result += `
const [__result1_error] = getMetadata(this.preDelete(ids));
if (__result1_error) {
  if (typeof __result1_error.reason === "string") {
    res.writeHead(__result1_error.status, { "Content-Type": "text/plain" });
    res.end(__result1_error.reason);
    return;
  }
  res.writeHead(__result1_error.status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(__result1_error.reason));
  return;
}
await this.driver.deleteWithIds(this.collection, ids);
this.postDelete(ids);
res.writeHead(200, { "Content-Type": "text/plain" });
res.end("OK");
return;
}`;

  return result;
}
