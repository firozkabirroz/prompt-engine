// Prints available Gemini model names (no secrets in output)
require("dotenv").config();

async function main() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}&pageSize=100`
  );
  const data = await res.json();
  if (!res.ok) {
    console.error("Error:", data?.error?.message || res.status);
    process.exit(1);
  }
  for (const m of data.models || []) {
    if (m.supportedGenerationMethods?.includes("generateContent")) {
      console.log(m.name.replace("models/", ""));
    }
  }
}

main();
