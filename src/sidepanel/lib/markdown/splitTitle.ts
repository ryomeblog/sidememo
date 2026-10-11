// 本文 1 行目の `# 見出し` を「タイトル」、それ以降を「本文」として分割・結合する。
// タイトルは保存されるテキストから派生させる（設計書 §5.2）。extractTitle と同じ判定規則を使う。

const HEADING_PATTERN = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

export interface SplitContent {
  title: string;
  body: string;
}

export function splitTitle(content: string): SplitContent {
  const lines = content.split(/\r?\n/);
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first === -1) return { title: "", body: "" };

  const match = HEADING_PATTERN.exec(lines[first].trim());
  if (!match) return { title: "", body: content };

  const body = lines
    .slice(first + 1)
    .join("\n")
    .replace(/^(\s*\n)+/, "");
  return { title: match[1].trim(), body };
}

export function joinTitle(title: string, body: string): string {
  const cleanTitle = title.replace(/[\r\n]+/g, " ").trim();
  if (cleanTitle === "") return body;
  return body === "" ? `# ${cleanTitle}\n` : `# ${cleanTitle}\n\n${body}`;
}
