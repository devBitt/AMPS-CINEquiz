import Fuse from "fuse.js";

export function isAnswerCorrect(submitted: string, acceptedAnswers: string[]): boolean {
  const normalized = submitted.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");

  // Exact match first
  const exactMatch = acceptedAnswers.some(
    (ans) => ans.toLowerCase().trim() === normalized
  );
  if (exactMatch) return true;

  // Fuzzy match with threshold 0.3 (allows ~1-2 char typos)
  const fuse = new Fuse(acceptedAnswers, {
    threshold: 0.3,
    includeScore: true,
  });
  const results = fuse.search(normalized);
  return results.length > 0 && (results[0].score ?? 1) < 0.3;
}
