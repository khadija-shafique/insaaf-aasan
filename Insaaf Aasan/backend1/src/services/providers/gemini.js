/**
 * Gemini provider — reuses the same classification, legalDb, and
 * officialSourceFallback logic as mock.js (the proven rule-based engine),
 * and only asks Gemini to rewrite the final message more naturally.
 * Never lets Gemini invent laws, authorities, or facts — it only rewords
 * what the rule-based engine already determined to be true.
 *
 * AI calls try several Gemini models first (with retry on 503/429), then
 * fall back to Groq models. If everything fails, the original message is
 * used, so the app never breaks because of the AI call.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { retrieve } = require("../rag/retriever");
const classification = require("../classification");
const legalDb = require("../legalDb");
const { CATEGORY_FIELDS } = require("../fieldDetectors");
const { buildDraft } = require("../draftBuilder");
const officialSourceFallback = require("../officialSourceFallback");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const splitList = (value) =>
  value
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

// Comma-separated lists, tried in order. GEMINI_MODEL (single) still works
// as a fallback if GEMINI_MODELS is not set.
const GEMINI_MODELS = splitList(
  process.env.GEMINI_MODELS ||
    process.env.GEMINI_MODEL ||
    "gemini-3.8-flash,gemini-3.7-flash,gemini-flash-lite-latest"
);

const GROQ_MODELS = splitList(
  process.env.GROQ_MODELS || "llama-3.3-70b-versatile,llama-3.1-8b-instant"
);

/**
 * Try each Gemini model in order. Retries a model on 503/429 with backoff,
 * skips to the next model on 404. Returns text, or null if all fail.
 */
async function tryGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) return null;

  for (const name of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const m = genAI.getGenerativeModel({ model: name });
        const r = await m.generateContent(prompt);
        const text = r.response.text().trim();
        if (text) {
          console.log(`[gemini] success with ${name}`);
          return text;
        }
        break; // empty response: try next model
      } catch (err) {
        const msg = String(err);
        if (/404/.test(msg)) {
          console.warn(`[gemini] ${name} unavailable, trying next model`);
          break;
        }
        if (/503|429/.test(msg)) {
          console.warn(`[gemini] ${name} busy (attempt ${attempt + 1})`);
          await sleep(500 * 2 ** attempt);
          continue;
        }
        console.warn(`[gemini] ${name} failed: ${err.message}`);
        break;
      }
    }
  }
  return null;
}

/**
 * Try each Groq model in order (OpenAI-compatible API).
 * Returns text, or null if all fail or no key is set.
 */
async function tryGroq(prompt) {
  if (!process.env.GROQ_API_KEY) return null;

  for (const name of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: name,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        console.warn(`[groq] ${name} failed: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) {
        console.log(`[groq] success with ${name}`);
        return text;
      }
    } catch (err) {
      console.warn(`[groq] ${name} error: ${err.message}`);
    }
  }
  return null;
}

/** Gemini models first, then Groq. Returns null if everything fails. */
async function generateText(prompt) {
  return (await tryGemini(prompt)) || (await tryGroq(prompt));
}

/**
 * Rewrite a message more naturally, grounded ONLY in groundingFacts.
 * On any failure, silently returns the original message so the app
 * never breaks because of the AI call.
 */
async function polishMessage(originalMessage, groundingFacts, userText) {
  if (!originalMessage) return originalMessage;
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    return originalMessage;
  }

  try {
    const prompt = `
You are rewriting a legal assistant's message to sound more natural and warm.

RULES:
- Do NOT add any new facts, laws, or claims beyond the GROUNDING FACTS below.
- Do NOT remove or change the meaning of any question being asked.
- Match the language style of the ORIGINAL MESSAGE (English, Urdu, or Roman Urdu).
- Reply in the same language and script style as USER'S LAST MESSAGE.
- Keep it short — 1 to 3 sentences.

GROUNDING FACTS:
${groundingFacts}

USER'S LAST MESSAGE:
${userText || ""}

ORIGINAL MESSAGE:
${originalMessage}

Rewritten message:
`;
    const text = await generateText(prompt);
    if (!text) {
      console.warn("[polish] all AI providers failed, using original message");
      return originalMessage;
    }
    console.log("[polish] succeeded ✅");
    return text;
  } catch (err) {
    console.warn("[polish] failed, using original message:", err.message);
    return originalMessage;
  }
}

function queryFrom(text, conversation) {
  const prev = conversation
    .filter((m) => m && m.role === "user" && typeof m.content === "string")
    .slice(-2)
    .map((m) => m.content);
  return [...prev, text].join(" . ");
}

async function buildGrounding(query, jsonFallback) {
  try {
    const hits = await retrieve(query);
    if (hits.length) {
      console.log("[rag] used:", hits.map((h) => `${h.id} (${h.score.toFixed(2)})`).join(", "));
      return hits.map((h) => h.text).join("\n---\n");
    }
    console.log("[rag] no confident match -> JSON fallback");
  } catch (e) {
    console.warn("[rag] failed -> JSON fallback:", e.message);
  }
  return jsonFallback;
}

async function ragAnswer(question, hits) {
  const context = hits.map((h) => h.text).join("\n---\n");
  const prompt = `You are Insaaf Aasan, a legal complaint assistant for Pakistan.
Answer the user's question using ONLY the CONTEXT below.
If the context does not contain the answer, say you don't have verified information and suggest the official website or the nearest police station / relevant authority.
Never invent law sections, fees, deadlines or procedures.
Reply in the same language style as the user (English, Urdu or Roman Urdu). Under 150 words.

CONTEXT:
${context}

USER QUESTION:
${question}`;
  const answer = await generateText(prompt);
  // Throwing is intentional: analyze() catches it and continues the normal flow.
  if (!answer) throw new Error("all AI providers failed");
  return answer;
}

/**
 * Provider interface: analyze(text, language, context) -> AnalysisResult.
 * Same contract and same Section-13 shape as mock.js — this function
 * builds the result exactly like mock.js does, then polishes `message`.
 */
async function analyze(text, language, context) {
  const conversation = (context && Array.isArray(context.conversation))
    ? context.conversation
    : [];

  const result = classification.analyzeConversation({ text, conversation });
  const ragQuery = queryFrom(text, conversation);

  // Case 1: no confident category yet — try the official-source fallback.
  if (!result.category) {
    const outOfScope = await officialSourceFallback.maybeHandleOutOfScope({
      text,
      language: result.language,
      result,
      conversation,
    });
    if (outOfScope) {
      const polished = await polishMessage(
        outOfScope.message,
        await buildGrounding(ragQuery, outOfScope.sources ? JSON.stringify(outOfScope.sources) : "(no sources found)"),
        text
      );
      return { ...outOfScope, message: polished };
    }

    if (result.message_hint === "clarify") {
      try {
        const hits = await retrieve(ragQuery, { topK: Number(process.env.RAG_TOP_K) || 3, minScore: Number(process.env.RAG_ANSWER_MIN_SCORE) || 0.65 });
        if (hits.length) {
          const answer = await ragAnswer(text, hits);
          return {
            category: null, confidence: result.confidence, language: result.language,
            needs_follow_up: true, follow_up_questions: [], missing_fields: [], matched_fields: [],
            legal_references: [], explanation: null, authority: null, next_steps: [],
            draft: null, sources: [], message: answer, message_hint: "clarify", disambiguation: null,
          };
        }
      } catch (e) {
        console.warn("[rag] answer failed, continuing normal flow:", e.message);
      }
    }

    const baseMessage = result.follow_up_questions[0] || "";
    const polished = await polishMessage(baseMessage, await buildGrounding(ragQuery, "(no category identified yet)"), text);

    return {
      category: null,
      confidence: result.confidence,
      language: result.language,
      needs_follow_up: true,
      follow_up_questions: result.follow_up_questions,
      missing_fields: [],
      matched_fields: [],
      legal_references: [],
      explanation: null,
      authority: null,
      next_steps: [],
      draft: null,
      sources: [],
      message: polished,
      message_hint: result.message_hint,
      disambiguation: result.disambiguation,
    };
  }

  // Case 2: category identified — look it up in the curated legal database.
  const categoryData = legalDb.getCategory(result.category);
  if (!categoryData) {
    return {
      category: null,
      confidence: "none",
      language: result.language,
      needs_follow_up: true,
      follow_up_questions: [classification.GENERIC_DESCRIBE_QUESTION],
      missing_fields: [],
      matched_fields: [],
      legal_references: [],
      explanation: null,
      authority: null,
      next_steps: [],
      draft: null,
      sources: [],
      message: classification.GENERIC_DESCRIBE_QUESTION,
      message_hint: "clarify",
      disambiguation: null,
    };
  }

  const groundingFacts = await buildGrounding(ragQuery, JSON.stringify({
    category: categoryData.label_en,
    authority: categoryData.complaint_authority,
    laws: categoryData.laws,
  }));

  // Case 2a: still collecting required facts.
  if (result.message_hint !== "finalize") {
    const baseMessage = result.follow_up_questions[0] || "";
    const polished = await polishMessage(baseMessage, groundingFacts, text);

    return {
      category: {
        id: categoryData.id,
        label: categoryData.label_en,
        label_ur: categoryData.label_ur,
        label_roman: categoryData.label_roman,
        icon: categoryData.icon,
        workflow_type: categoryData.workflow_type,
      },
      confidence: result.confidence,
      language: result.language,
      needs_follow_up: true,
      follow_up_questions: result.follow_up_questions,
      missing_fields: result.missing_fields,
      matched_fields: result.matched_fields,
      legal_references: categoryData.laws,
      explanation: categoryData.description_en,
      authority: categoryData.complaint_authority,
      next_steps: [],
      draft: null,
      sources: [],
      facts: result.facts,
      message: polished,
      message_hint: result.message_hint,
      disambiguation: null,
    };
  }

  // Case 2b: all required facts collected — finalize with a draft.
  const draft = buildDraft(
    categoryData,
    result.facts,
    result.summary,
    CATEGORY_FIELDS[result.category]
  );

  const finalMessage =
    "Thank you. I have prepared your complaint draft, the legal references that may apply, and your suggested next steps. Open the results below to view and edit everything.";
  const polished = await polishMessage(finalMessage, groundingFacts, text);

  return {
    category: {
      id: categoryData.id,
      label: categoryData.label_en,
      label_ur: categoryData.label_ur,
      label_roman: categoryData.label_roman,
      icon: categoryData.icon,
      workflow_type: categoryData.workflow_type,
    },
    confidence: result.confidence,
    language: result.language,
    needs_follow_up: false,
    follow_up_questions: [],
    missing_fields: [],
    matched_fields: result.matched_fields,
    legal_references: categoryData.laws,
    explanation: categoryData.description_en,
    authority: categoryData.complaint_authority,
    next_steps: categoryData.next_steps,
    draft,
    sources: legalDb.getSourcesForCategory(categoryData.id),
    facts: result.facts,
    message: polished,
    message_hint: result.message_hint,
    disambiguation: null,
  };
}

module.exports = { analyze };
