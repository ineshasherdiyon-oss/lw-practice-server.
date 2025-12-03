// minimal-practice-server.js
import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro";
const GEMINI_AUTH_TYPE = (process.env.GEMINI_AUTH_TYPE || "key").toLowerCase(); // "key" or "bearer"
const PORT = process.env.PORT || 3000;

if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY env var.");
  // we continue so Render will fail deploy clearly
}

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use("/api/", limiter);

// Helper: call Gemini (supports key query or Bearer header)
async function callGemini(systemPrompt, userMessage) {
  // If using the REST key param approach:
  let url = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generate`;
  if (GEMINI_AUTH_TYPE === "key") {
    url += `?key=${GEMINI_API_KEY}`;
  }

  const headers = { "Content-Type": "application/json" };
  if (GEMINI_AUTH_TYPE === "bearer") {
    headers["Authorization"] = `Bearer ${GEMINI_API_KEY}`;
  }

  const body = {
    model: GEMINI_MODEL,
    prompt: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    temperature: 0.0,
    max_output_tokens: 700
  };

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json();
  // try common response shapes
  const content = json?.candidates?.[0]?.content || json?.output?.[0]?.content || JSON.stringify(json);
  return { content, raw: json };
}

app.post("/api/practice", async (req, res) => {
  try {
    const { targetText = "", transcript = "", mode = "shadow", level = "A1" } = req.body;
    if (!targetText) return res.status(400).json({ error: "Missing targetText" });

    const systemPrompt =
      "You are a Sri Lankan spoken English tutor. Return compact JSON with keys: " +
      "score (0-100 integer), fluency (short), pronunciation (short), errors (array of {what, fix}), " +
      "corrected (string), tips (array or string), practice_variation (string). " +
      "If mode==='explain' include keys 'sinhala' and 'transliteration'. Use student-friendly Sinhala examples when requested. " +
      "Output only valid JSON.";

    const userMessage = `Target: "${targetText}"\nTranscript: "${transcript}"\nMode: ${mode}\nLevel: ${level}\nCompare transcript to target.`;

    const { content, raw } = await callGemini(systemPrompt, userMessage);

    // attempt to parse JSON out of model output
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch (e) { parsed = { parse_error: "failed", raw: content }; }
      } else {
        parsed = { parse_error: "no_json", raw: content };
      }
    }

    return res.json({ feedback: parsed, raw });
  } catch (err) {
    console.error("Practice handler error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.get("/", (req, res) => res.send("LearnWithNisal practice server alive"));

app.listen(PORT, () => console.log(`Practice server listening on ${PORT}`));
