require("dotenv").config();
const express = require("express");
const path = require("path");
const {
  GENERATE_SYSTEM_PROMPT,
  OPTIMIZE_SYSTEM_PROMPT,
} = require("./prompts/meta-prompt");
const {
  anyKeyConfigured,
  generate,
  countTokens,
  statusInfo,
} = require("./lib/ai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function handleRequest(systemPrompt, req, res) {
  const input = (req.body?.input || "").trim();
  if (!input) {
    return res.status(400).json({ error: "Input khali — kichu likhun age." });
  }
  if (!anyKeyConfigured()) {
    return res.status(500).json({
      error:
        "API key set kora nei. .env e GROQ_API_KEY (recommended) othoba GEMINI_API_KEY boshan.",
    });
  }
  try {
    const { output, provider, model } = await generate(systemPrompt, input);
    const [before, after] = await Promise.all([
      countTokens(input),
      countTokens(output),
    ]);
    res.json({
      output,
      provider,
      model,
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
          ? "Rate limit hit — ek minute pore abar try korun."
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
  res.json(statusInfo());
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Prompt Engine cholche: http://localhost:${PORT}`);
    if (!anyKeyConfigured()) {
      console.warn(
        "WARNING: GROQ_API_KEY ba GEMINI_API_KEY set nei — .env.example dekhen"
      );
    }
  });
}

module.exports = app;
