import path from "path";
import { Model, httpRouter, init } from "../src";
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
}
Some2.rule_list();
Some.rule_create();
Some2.rule_delete(Some);
Some.rule_update();

init(
  [Some2, Some],
  httpRouter(4321),
  new MongoDBDriver("mongodb://localhost:27017", "server-db-test"),
  new FsFilesystem(path.join(__dirname, "files"))
);
