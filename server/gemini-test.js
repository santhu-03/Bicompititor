import dotenv from "dotenv";
import { askGemini } from "./src/services/gemini.js";

dotenv.config();

async function test() {
  try {
    const text = await askGemini("Say hello in one sentence.");
    console.log(text);
  } catch (error) {
    console.error(error);
  }
}

test();
