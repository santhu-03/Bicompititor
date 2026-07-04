import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say hello in one sentence." }],
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    });

    console.log(completion.choices[0]?.message?.content);
  } catch (error) {
    console.error(error);
  }
}

test();
