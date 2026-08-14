require("dotenv").config();
const express = require("express");
const path = require("path");
const {
  GENERATE_SYSTEM_PROMPT,
  OPTIMIZE_SYSTEM_PROMPT,
} = require("./prompts/meta-prompt");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function keyMissing() {
  return !API_KEY || API_KEY === "your_api_key_here";
}

async function geminiGenerate(systemPrompt, userText) {
  const res = await fetch(
    `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API error (HTTP ${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function countTokens(text) {
  try {
    const res = await fetch(`${BASE_URL}/${MODEL}:countTokens?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
      }),
    });
    const data = await res.json();
    if (res.ok && typeof data.totalTokens === "number") {
      return { count: data.totalTokens, exact: true };
    }
  } catch (_) {
    // fall through to estimate
  }
  return { count: Math.ceil(text.length / 4), exact: false };
}

async function handleRequest(systemPrompt, req, res) {
  const input = (req.body?.input || "").trim();
  if (!input) {
    return res.status(400).json({ error: "Input khali — kichu likhun age." });
  }
  if (keyMissing()) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY set kora nei. .env file e key boshan (dekhen .env.example), tarpor server restart korun.",
    });
  }
  try {
    const output = await geminiGenerate(systemPrompt, input);
    const [before, after] = await Promise.all([
      countTokens(input),
      countTokens(output),
    ]);
    res.json({
      output,
      tokens: {
        before: before.count,
        after: after.count,
        exact: before.exact && after.exact,
      },
    });
  } catch (err) {
    const status = err.status === 429 ? 429 : 502;
    res.status(status).json({
      error:
        err.status === 429
          ? "Rate limit hit — free tier er limit shesh. Ek minute pore abar try korun."
          : `AI call fail korlo: ${err.message}`,
    });
  }
}

app.post("/api/generate", (req, res) =>
  handleRequest(GENERATE_SYSTEM_PROMPT, req, res)
);
app.post("/api/optimize", (req, res) =>
  handleRequest(OPTIMIZE_SYSTEM_PROMPT, req, res)
);

app.get("/api/status", (req, res) => {
  res.json({ keyConfigured: !keyMissing(), model: MODEL });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Prompt Engine cholche: http://localhost:${PORT}`);
    if (keyMissing()) {
      console.warn(
        "WARNING: GEMINI_API_KEY set nei — .env file banate hobe (.env.example dekhen)"
      );
    }
  });
}

module.exports = app;
