import type { GeneratePostInput, GeneratedPost, Language, ScoredDraft } from "@/lib/ai/types";

function pickLanguageStrings(language: Language) {
  if (language === "pt-BR") {
    return {
      opener: "Uma ideia contraintuitiva sobre",
      takeaway: "O ponto principal:",
      question: "Qual foi a sua experiência com isso?",
      cta: "Se isso te ajudou, deixa um comentário com a sua opinião.",
    } as const;
  }
  return {
    opener: "A counterintuitive idea about",
    takeaway: "The takeaway:",
    question: "What has your experience been?",
    cta: "If this helped, share your take in the comments.",
  } as const;
}

function clampText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function generateMockPost(input: GeneratePostInput): GeneratedPost {
  const s = pickLanguageStrings(input.language);
  const topic = input.topic.trim();

  const hook = clampText(
    `${s.opener} ${topic}: most people optimize the wrong thing.`,
    180
  );

  const audienceLine = input.audience ? `Audience: ${input.audience}` : null;
  const toneLine = input.tone ? `Tone: ${input.tone}` : null;

  const bodyLines: string[] = [
    `Here is the pattern I keep seeing with ${topic}:`,
    "",
    "1) The obvious move is usually the noisy one.",
    "2) The boring move is usually the compounding one.",
    "3) Small consistency beats occasional intensity.",
    "",
    `${s.takeaway} ship one small improvement per day for 14 days.`,
    "",
    s.question,
  ];

  // If PT-BR, swap English list lines to Portuguese-ish, but keep it simple.
  if (input.language === "pt-BR") {
    bodyLines.splice(
      0,
      bodyLines.length,
      `Um padrão que eu vejo com ${topic}:`,
      "",
      "1) O óbvio quase sempre faz mais barulho.",
      "2) O chato quase sempre compõe ao longo do tempo.",
      "3) Consistência pequena vence intensidade ocasional.",
      "",
      `${s.takeaway} uma melhoria pequena por dia durante 14 dias.`,
      "",
      s.question
    );
  }

  const cta = s.cta;

  const meta: string[] = [];
  if (audienceLine) meta.push(audienceLine);
  if (toneLine) meta.push(toneLine);

  const fullText = [hook, "", ...bodyLines, "", cta, ...(meta.length ? ["", ...meta] : [])].join(
    "\n"
  );

  return { hook, body: bodyLines.join("\n"), cta, fullText };
}

export function scoreDraftHeuristics(text: string): ScoredDraft {
  const reasons: string[] = [];
  let score = 50;

  const len = text.trim().length;
  if (len >= 400 && len <= 1600) {
    score += 15;
    reasons.push("Good length for LinkedIn skimming.");
  } else if (len < 250) {
    score -= 10;
    reasons.push("Too short: might not deliver enough value.");
  } else if (len > 2000) {
    score -= 10;
    reasons.push("Too long: likely to lose attention.");
  }

  const hasQuestion = /\?\s*$/.test(text.trim()) || /\?\s*\n/.test(text);
  if (hasQuestion) {
    score += 10;
    reasons.push("Contains a question to invite comments.");
  }

  const lineBreaks = text.split("\n").length - 1;
  if (lineBreaks >= 6) {
    score += 10;
    reasons.push("Good whitespace for readability.");
  }

  const hasNumberedList = /\n1\)/.test(text) || /\n1\./.test(text);
  if (hasNumberedList) {
    score += 5;
    reasons.push("Has a structured list.");
  }

  score = Math.max(0, Math.min(100, score));
  if (reasons.length === 0) reasons.push("Baseline score.");
  return { score, reasons };
}

