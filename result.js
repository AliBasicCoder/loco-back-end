function init(Some2, Some, ENVIRONMENT) {
  Some2.validate = function (object, toObjectId) {
    if (typeof object.h1 !== "string") return "'h1' is NOT a string";
    if (object.h2 == null) object.h2 = [];
    else if (!Array.isArray(object.h2)) object.h2 = [object.h2];
    for (let i_1 = 0; i_1 < object.h2.length; i_1++) {
      if (typeof object.h2[i_1] !== "string")
        return "'h2[i_1]' is NOT a string";
    }
    if (typeof object.h3 !== "object") return "'h3' is not a object";
    if (object.h3.h4 == null) object.h3.h4 = [];
    else if (!Array.isArray(object.h3.h4)) object.h3.h4 = [object.h3.h4];
    for (let i_1 = 0; i_1 < object.h3.h4.length; i_1++) {
      if (typeof object.h3.h4[i_1] !== "object")
        return "'h3.h4[i_1]' is not a object";
      if (typeof object.h3.h4[i_1].h5 !== "string")
        return "'h3.h4[i_1].h5' is NOT a string";
    }
  };
  Some2._removeNoReceive = function (object) {};
  Some2._removeNoSend = function (object) {};
  Some2._getFileSchema = function (path) {
    if (path === "h1") {
      return { type: "STRING", nullable: false };
    } else if (/\.h2\.[0-9]+/.test(path)) {
      return { type: "STRING", nullable: false };
    } else if (/\.h3\.h4\.[0-9]+\.h5/.test(path)) {
      return { type: "STRING", nullable: false };
    } else {
      return null;
    }
  };
  Some2._setOnUpload = function (object, path, value) {
    let groups;
    if (path === "h1") {
      object.h1 = value;
    } else if ((groups = /h2\.([0-9]+)/.exec(path))) {
      const [_, i_0] = groups;
      if (!object.h2) {
        object.h2 = [];
      }
      object.h2[i_0] = value;
    } else if ((groups = /h3\.h4\.([0-9]+)\.h5/.exec(path))) {
      const [_, i_0] = groups;
      if (!object.h3) {
        object.h3 = {};
      }
      if (!object.h3.h4) {
        object.h3.h4 = [];
      }
      if (!object.h3.h4[i_0]) {
        object.h3.h4[i_0] = {};
      }
      object.h3.h4[i_0].h5 = value;
    }
  };
  Some2._list = async function (req, res) {
    const query =
      req.query || new URL(req.url, "http://" + req.headers.host).searchParams;
    const limit = Number(query.limit || 100);
    const skip = Number(query.skip || 0);
    if (
      Number.isNaN(limit) ||
      !Number.isInteger(limit) ||
      limit <= 0 ||
      Number.isNaN(skip) ||
      !Number.isInteger(skip)
    ) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
      return;
    }
    if (limit > 1000) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("limit is TOO big! can NOT exceed 1000");
      return;
    }
    let filter = {};
    if (
      req.headers["content-type"] === "application/json" &&
      Number(req.headers["content-length"]) > 0
    ) {
      let str = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chuck) => {
          console.log(chuck);
          data += chuck;
        });
        req.on("end", () => resolve(data));
        req.on("error", (err) => reject(err));
      });
      try {
        filter = JSON.parse(str);
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
        return;
      }
    }
    const authorize_result = await this._rules_list[0][2](req);
    if (!authorize_result) {
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end("Unauthorized");
      return;
    }
    const result = await this.driver.find(this.collection, filter, {
      limit,
      skip,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  };
  Some.validate = function (object, toObjectId) {
    if (object._id != null) {
      if (
        !(
          object._id instanceof this._driver.ObjectId ||
          (typeof object._id === "string" && this._driver.isValidId(object._id))
        )
      )
        return "'_id' is NOT a valid ID";
      if (typeof object._id === "string" && toObjectId)
        object._id = new this._driver.ObjectId(object._id);
      if (object._id instanceof this._driver.ObjectId && !toObjectId)
        object._id = object._id.toString();
    } else object._id = null;
    if (object._id != null) {
      if (typeof object._id !== "string") return "'_id' is NOT a string";
    } else object._id = null;
    if (typeof object.file === "string") {
      if (!this._filesystem.isValidId(object.file))
        return "'file' is not a valid file id";
    } else {
      if (!(object.file instanceof Blob || object.file instanceof Buffer))
        return "'file' is not a Buffer, a Blob nor a file id";
    }
    if (!Array.isArray(object.tuple)) return "'object.tuple' is not an array";
    if (object.tuple.length !== 2)
      return "'object.tuple' doesn't have 2 elements";
    if (typeof object.tuple[0] !== "string")
      return "'tuple[0]' is NOT a string";
    if (
      object.tuple[1] == "0" ||
      object.tuple[1] === "" ||
      object.tuple[1] === "false"
    )
      object.tuple[1] = false;
    if (object.tuple[1] == "1" || object.tuple[1] === "true")
      object.tuple[1] = true;
    if (typeof object.tuple[1] !== "boolean")
      return "'tuple[1]' is not a boolean";
  };
  Some._removeNoReceive = function (object) {};
  Some._removeNoSend = function (object) {
    delete object.file;
  };
  Some._getFileSchema = function (path) {
    if (path === "_id") {
      return { type: "STRING", nullable: true, ID: true };
    } else if (path === "file") {
      return { type: "FILE", noSend: true };
    } else if (path === "tuple.0") {
      return { type: "STRING", nullable: false };
    } else if (path === "tuple.1") {
      return { type: "BOOLEAN" };
    } else {
      return null;
    }
  };
  Some._setOnUpload = function (object, path, value) {
    let groups;
    if (path === "_id") {
      object._id = value;
    } else if (path === "file") {
      object.file = value;
    } else if (path === "tuple.0") {
      if (!object.tuple) {
        object.tuple = [];
      }
      object.tuple[0] = value;
    } else if (path === "tuple.1") {
      if (!object.tuple) {
        object.tuple = [];
      }
      object.tuple[1] = value;
    }
  };
  Some._list = async function (req, res) {
    const query =
      req.query || new URL(req.url, "http://" + req.headers.host).searchParams;
    const limit = Number(query.limit || 100);
    const skip = Number(query.skip || 0);
    if (
      Number.isNaN(limit) ||
      !Number.isInteger(limit) ||
      limit <= 0 ||
      Number.isNaN(skip) ||
      !Number.isInteger(skip)
    ) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
      return;
    }
    if (limit > 1000) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("limit is TOO big! can NOT exceed 1000");
      return;
    }
    let filter = {};
    if (
      req.headers["content-type"] === "application/json" &&
      Number(req.headers["content-length"]) > 0
    ) {
      let str = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chuck) => {
          console.log(chuck);
          data += chuck;
        });
        req.on("end", () => resolve(data));
        req.on("error", (err) => reject(err));
      });
      try {
        filter = JSON.parse(str);
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
        return;
      }
    }
    const authorize_result = await this._rules_list[0][2](req);
    if (!authorize_result) {
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end("Unauthorized");
      return;
    }
    const result = await this.driver.find(this.collection, filter, {
      limit,
      skip,
      projection: { file: 0 },
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  };
  function handleError(fn, errorHandler) {
    return (req, res, ...args) => {
      try {
        const result = fn(req, res, ...args);
        if (result instanceof Promise) {
          return result.catch((error) => {
            errorHandler(req, res, error);
          });
        }
        return result;
      } catch (error) {
        errorHandler(req, res, error);
      }
    };
  }
  const http = require("http");
  const server = http.createServer(
    handleError((req, res) => {
      const url = new URL(req.url, "http://" + req.headers.host);
      const pathname = url.pathname;
      req.query = url.searchParams;

      if (pathname === "/some2/list" && req.method === "GET") {
        return Some2._list(req, res);
      }
      if (pathname === "/some/list" && req.method === "GET") {
        return Some._list(req, res);
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Cannot " + req.method + " " + pathname);
      return;
    }, ENVIRONMENT.errorHandler)
  );
  server.listen(ENVIRONMENT.PORT, () =>
    console.log("Started on port: " + ENVIRONMENT.PORT)
  );
  return server;
}
