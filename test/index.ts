import path from "path";
import {
  GET,
  Model,
  allow,
  expressRouter,
  httpRouter,
  init,
  returns,
} from "../src";
import { FsFilesystem } from "../src/dir_filesystem_driver";
import { MongoDBDriver } from "../src/mongodb_driver";
import {
  array,
  boolean,
  file,
  id,
  number,
  object,
  ref,
  string,
  tuple,
} from "../src/schema";
import { AuthorizeFunction } from "../src/types";
import express, { Router } from "express";
import { webCollectionsCreator } from "../src/client_generator";

function validateSome(s: string) {
  console.log("hi");
  return true;
}

class Some extends Model {
  _id = id();
  file = file({ noSend: true });
  tuple = tuple({}, string(), boolean());

  static authorize = (async (req, res) => {
    return true;
  }) as AuthorizeFunction;
}

class Some2 extends Model {
  h1 = string();
  h2 = array(string());
  h3 = object({ h4: array(object({ h5: string() })) });

  @allow(Some)
  @returns(string())
  @GET(string(), number())
  static editFile(user: Some, name: string, age: number, ctx: any) {
    console.log(name, age, ctx);
  }
}

Some2.rule_list();
Some.rule_create();
Some2.rule_delete(Some);
Some.rule_update();

async function main() {
  const router = (await init({
    models: [Some2, Some],
    router: expressRouter(4321),
    defaultDriver: new MongoDBDriver(
      "mongodb://localhost:27017",
      "server-db-test"
    ),
    defaultFilesystem: new FsFilesystem(path.join(__dirname, "files")),
  })) as Router;

  const app = express();
  app.use(router);

  app.listen(4321, () => console.log("Started on port 4321"));

  webCollectionsCreator("/home/aliahmed/web/loco/client", [Some, Some2]);
}

main();
