# Prompt Engine — Token-Efficient Prompt Generator

Web app that turns a rough idea into a **token-efficient, well-structured prompt**, or compresses an existing prompt without losing meaning.

Uses free models: **Groq Llama 3.3 70B** (primary, fast) with **Gemini Flash Lite** as automatic fallback.

## Features

- **Generate mode**: Rough idea (Bangla/English) → complete optimized prompt
- **Optimize mode**: Existing prompt → compressed version (fewer tokens, same meaning)
- **Token savings**: Before/after token count + how much you saved
- Copy button + prompt history (saved in the browser)
- Dark / light theme with a refined, responsive UI

## Setup (local)

### 1. Get a free API key (pick one)

- **Recommended:** [Groq Console](https://console.groq.com/keys) → Create API key. No card needed. Fast and stable.
- **Fallback:** [Google AI Studio](https://aistudio.google.com/apikey) → Create API key.

### 2. Put the key in `.env`

Copy `.env.example` to `.env` and set at least one:

```
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Install & run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Project structure

```
├── server.js          # Express server + Gemini API
├── api/index.js       # Vercel serverless entry
├── prompts/
│   └── meta-prompt.js # Generate & Optimize system prompts
├── public/            # UI (HTML, CSS, JS)
├── vercel.json
├── .env               # API keys (never commit)
└── package.json
```

## Git: commit and push

From a machine that already has GitHub access:

```bash
git clone https://github.com/firozkabirroz/prompt-engine.git
cd prompt-engine
```

If this folder is already the repo, skip clone. Then:

```bash
git checkout -b ui/premium-refresh
git add public/index.html public/style.css public/app.js public/favicon.svg
git add api/index.js vercel.json server.js package.json .gitignore README.md
git status
git commit -m "feat(ui): premium dark/light design system and Vercel deploy"
git push -u origin ui/premium-refresh
```

Merge on GitHub, or push straight to `main` if that is the workflow:

```bash
git checkout main
git merge ui/premium-refresh
git push origin main
```

First-time remote (only if the folder is not cloned yet):

```bash
git init
git add .
git commit -m "feat(ui): premium dark/light design system and Vercel deploy"
git branch -M main
git remote add origin https://github.com/firozkabirroz/prompt-engine.git
git push -u origin main
```

Do **not** commit `.env`. It is gitignored on purpose.

## Deploy to Vercel

### Option A — Dashboard

1. Go to [vercel.com/new](https://vercel.com/new) and import `firozkabirroz/prompt-engine`.
2. Framework Preset: **Other**. Root Directory: `.`
3. Environment variables:
   - `GROQ_API_KEY` = your Groq key (recommended)
   - `GEMINI_API_KEY` = your Gemini key (fallback)
   - `GEMINI_MODEL` = `gemini-flash-lite-latest` (optional)
4. Click **Deploy**.

### Option B — CLI

```bash
npm i -g vercel
cd "D:\Cladue Project\Prompt Engine"
vercel login
vercel
```

When prompted, link the existing GitHub project (or create a new Vercel project). Then set secrets and ship production:

```bash
vercel env add GROQ_API_KEY
vercel env add GEMINI_API_KEY
vercel env add GEMINI_MODEL
vercel --prod
```

Paste the API key when asked. Choose **Production**, **Preview**, and **Development** so local `vercel dev` also works.

After deploy, open the `*.vercel.app` URL. The UI is static files from `public/`; `/api/generate` and `/api/optimize` run as a Node function (`api/index.js`) with a 30s max duration.

## Author

<div align="center">
  <p><strong>Firoz Kabir</strong></p>
  <p>
    <a href="https://github.com/firozkabirroz/">
      <img src="https://img.shields.io/badge/GitHub-firozkabirroz-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub" />
    </a>
    <a href="https://www.facebook.com/flywithfiroz">
      <img src="https://img.shields.io/badge/Facebook-flywithfiroz-1877F2?style=flat-square&logo=facebook&logoColor=white" alt="Facebook" />
    </a>
    <a href="mailto:firozkabir.consultant@gmail.com">
      <img src="https://img.shields.io/badge/Email-firozkabir.consultant%40gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email" />
    </a>
  </p>
  <p>
    💻 <a href="https://github.com/firozkabirroz/">GitHub</a>
    &nbsp;·&nbsp;
    📘 <a href="https://www.facebook.com/flywithfiroz">Facebook</a>
    &nbsp;·&nbsp;
    ✉️ <a href="mailto:firozkabir.consultant@gmail.com">firozkabir.consultant@gmail.com</a>
  </p>
</div>
