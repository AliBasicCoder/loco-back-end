import { Db, MongoClient, ObjectId } from "mongodb";
import { DBDriver, Metadata, ReplaceOptions, FindOptions } from "./types";

export class MongoDBDriver extends DBDriver {
  client: MongoClient = null as unknown as MongoClient;
  db: Db = null as unknown as Db;
  initialized = false;
  ObjectId = ObjectId;
  isValidId = ObjectId.isValid;

  constructor(public uri: string, public database: string) {
    super();
  }

  async init(metadata: Metadata) {
    const client = new MongoClient(this.uri);
    try {
      await client.connect();
      var db = client.db(this.database);
      await db.command({ ping: 1 });
    } catch (error) {
      await client.close();
      throw error;
    }
    this.client = client;
    this.db = db;

    const db_collections = [];
    for await (const db_collection of db.listCollections()) {
      db_collections.push(db_collection.name);
    }
    for (const collection of metadata) {
      if (db_collections.includes(collection.collection)) return;
      const new_collection = await db.createCollection(collection.collection);
      // TODO handle unique indexes
      // for (const key of collection._uniqueIndex) {
      //   await new_collection.createIndex(key, { unique: true });
      // }
    }

    this.initialized = true;
  }
  close() {
    return this.client.close();
  }

  findOne(collection: string, filter: any, options?: FindOptions) {
    return this.db.collection(collection).findOne(filter, options);
  }
  findById(collection: string, id: string | number, options?: FindOptions) {
    return this.findOne(collection, { _id: new ObjectId(id) }, options);
  }
  findByIds(collection: any, ids: any[], options?: FindOptions) {
    return this.find(
      collection,
      {
        _id: { $in: ids.map((id: number) => new ObjectId(id)) },
      },
      options
    );
  }
  async find(collection: string, filter: any, options?: FindOptions) {
    const cursor = this.db.collection(collection).find(filter, options);
    const result = [];
    for await (const doc of cursor) {
      result.push(doc);
    }
    return result;
  }

  count(collection: string, filter: any) {
    return this.db.collection(collection).countDocuments(filter);
  }

  async create(collection: string, document: any) {
    // NOTE mongodb automatically inserts IDs
    await this.db.collection(collection).insertOne(document);
    return document;
  }
  async createMany(collection: string, docs: any[]) {
    // NOTE mongodb automatically inserts IDs
    await this.db.collection(collection).insertMany(docs);
    return docs;
  }

  async deleteOne(collection: string, filter: any) {
    await this.db.collection(collection).deleteOne(filter);
  }
  deleteWithId(collection: string, id: string) {
    return this.deleteOne(collection, { _id: new ObjectId(id) });
  }
  async deleteMany(collection: string, filter: any) {
    return (await this.db.collection(collection).deleteMany(filter))
      .deletedCount;
  }
  async deleteWithIds(collection: string, ids: string[]) {
    await this.db.collection(collection).deleteMany({
      _id: { $in: ids.map((id) => new ObjectId(id)) },
    });
  }

  replaceOne(
    collection: string,
    filter: any,
    replacement: any,
    options?: ReplaceOptions
  ) {
    return this.db
      .collection(collection)
      .findOneAndReplace(filter, replacement, {
        ...options,
        returnDocument: "after",
      });
  }
  replaceById(
    collection: string,
    id: string,
    replacement: any,
    options?: ReplaceOptions
  ) {
    if (replacement._id && typeof replacement._id === "string")
      replacement._id = new ObjectId(replacement._id);
    return this.replaceOne(
      collection,
      { _id: new ObjectId(id) },
      replacement,
      options
    );
  }
}
