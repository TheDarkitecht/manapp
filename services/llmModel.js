// services/llmModel.js
// Groq-språkmodellen som alla LLM-anrop använder. Samlad här eftersom Groq
// pensionerar modeller utan förvarning: llama-3.3-70b-versatile försvann
// 2026 och gav 404 model_not_found på 14 ställen samtidigt.
// Byt modell via env GROQ_LLM_MODEL utan kodändring.
//
// gpt-oss är en resonerande modell — resonemanget räknas mot max_tokens.
// 'low' håller svarstid och tokenåtgång i nivå med den gamla llama-modellen.

const GROQ_LLM_MODEL = process.env.GROQ_LLM_MODEL || 'openai/gpt-oss-120b';
const GROQ_REASONING_EFFORT = process.env.GROQ_REASONING_EFFORT || 'low';

module.exports = { GROQ_LLM_MODEL, GROQ_REASONING_EFFORT };
