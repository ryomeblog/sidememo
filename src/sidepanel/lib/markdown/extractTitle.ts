// 本文 1 行目の `# 見出し` からタイトルを抽出する。
// 設計書 §5.2 — `#` がない場合は「無題」。

const HEADING_PATTERN = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

export function extractTitle(content: string): string {
  if (!content) return "無題";
  // 先頭の空行をスキップして最初の非空行を取得
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = HEADING_PATTERN.exec(line);
    if (match) {
      const title = match[1].trim();
      return title.length > 0 ? title : "無題";
    }
    // 最初の非空行が見出しでなければ「無題」扱い
    return "無題";
  }
  return "無題";
}
