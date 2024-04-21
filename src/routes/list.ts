import { Model } from "..";

// TODO thinks if it's a good idea to take raw filters from request?
export function list(model: typeof Model) {
  let result = `async function (req, res) {
const limit = Number(req.query.limit || ${model.DEFAULT_LIMIT})
const skip = Number(req.query.skip || 0);
if (
  Number.isNaN(limit) || !Number.isInteger(limit) || limit <= 0 
  || Number.isNaN(skip) || !Number.isInteger(skip)
) {
  res.writeHead(400, {'Content-Type': 'text/plain'});
  res.end("Bad Request");
  return;
}`;
  if (model.MAX_LIMIT)
    result += `if (limit > ${model.MAX_LIMIT}) {
  res.writeHead(400, {'Content-Type': 'text/plain'});
  res.end("limit is TOO big! can NOT exceed ${model.MAX_LIMIT}");
  return;
}`;
  // TODO consider removing promises
  result += `
let filter = {};
if (
  req.headers["content-type"] === "application/json" &&
  Number(req.headers["content-length"]) > 0
) {
  try {
    const str = await collectStr(req, this.JSON_MAX_SIZE || 4194304);
    if (str === null) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("payload exceeded maximum size of " + (this.JSON_MAX_SIZE || 4194304) + " bytes");
      return;
    }
    filter = JSON.parse(str);        
  } catch (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request");
    return;
  }
}`;
  // TODO separate authorization code into a septate function
  if (model._rules_list[0][1] !== "*") {
    result += "let authorized = false;";
    model._rules_list.forEach((rule, i) => {
      const collection = rule[1] as typeof Model;
      const fn = rule[2];
      if (i !== 0) result += `if (!authorized) {`;
      result += `const authorize_result = await ${
        collection._functionName
      }.authorize({ req, res }, ${!!fn});`;
      if (fn) {
        result += `if (authorize_result) {
  const authorize_result2 = await this._rules_list[${i}][2](authorize_result);
  if (authorize_result2) {
    authorized = true;
`;
        // TODO create function to convert id to ObjectIds better in filters
        if (rule[0] === "list_filter")
          result += `Object.assign(filter, authorize_result2);`;
        if (rule[0] === "list_filter" && model.driver.ObjectId) {
          result += `
if (filter._id) {
  if (filter._id.$in) filter._id.$in = filter._id.$in.map(e => new this.driver.ObjectId(e));
  if (filter._id.$nin) filter._id.$nin = filter._id.$nin.map(e => new this.driver.ObjectId(e));
  if (typeof filter._id === "string") filter._id = new this.driver.ObjectId(filter._id);
}`;
        }
        result += "  }\n}";
      } else result += `if (authorize_result) authorized = true;`;
      if (i !== 0) result += "}";
    });
    result += `if (!authorized) {
  res.writeHead(401, { "Content-Type": "text/plain" });
  res.end("Unauthorized");
  return;
}`;
  } else if (model._rules_list[0][2]) {
    const rule = model._rules_list[0];
    result += `const authorize_result = await this._rules_list[0][2](req);
if (!authorize_result) {
  res.writeHead(401, { "Content-Type": "text/plain" });
  res.end("Unauthorized");
  return;
}
`;
    if (rule[0] === "list_filter")
      result += `Object.assign(filter, authorize_result);`;
    if (rule[0] === "list_filter" && model.driver.ObjectId) {
      result += `
if (filter._id) {
if (filter._id.$in) filter._id.$in = filter._id.$in.map(e => new this.driver.ObjectId(e));
if (filter._id.$nin) filter._id.$nin = filter._id.$nin.map(e => new this.driver.ObjectId(e));
if (typeof filter._id === "string") filter._id = new this.driver.ObjectId(filter._id);
}`;
    }
  }
  result += `const result = await this.driver.find(this.collection, filter, { limit, skip`;
  if (model._noSend.length > 0)
    result += `, projection: ${JSON.stringify(
      noSendToProjection(model._noSend)
    )}`;
  result += " });";
  result += `
res.writeHead(200, { "Content-Type": "application/json" });
res.end(JSON.stringify(result));
return;
}`;
  return result;
}

function noSendToProjection(paths: (typeof Model)["_noSend"]) {
  const result = {} as any;
  for (const path of paths) {
    result[path.filter((i) => typeof i === "string").join(".")] = 0;
  }
  return result;
}
