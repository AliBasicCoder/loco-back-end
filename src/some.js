const http = require("http");

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

http
  .createServer(async (req, res) => {
    const query =
      req.query || new URL(req.url, "http://" + req.headers.host).searchParams;
    const limit = Number(query.limit || 100);
    const skip = Number(query.skip);

    if (
      Number.isNaN(limit) ||
      !Number.isInteger(limit) ||
      limit <= 0 ||
      Number.isNaN(skip) ||
      !Number.isInteger(skip) ||
      skip <= 0 ||
      (req.headers["content-type"] !== "application/json" &&
        Number(req.headers["content-length"]) > 0)
    ) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
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
      }
    }
  })
  .listen(4321);
