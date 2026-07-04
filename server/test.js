import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

async function test() {
  try {
    const client = new MongoClient(uri);

    await client.connect();
    console.log("✅ Connected to MongoDB");

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Ping successful");

    await client.close();
  } catch (err) {
    console.error("❌ Error:");
    console.error(err);
  }
}

test();