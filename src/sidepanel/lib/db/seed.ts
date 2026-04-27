import { v4 as uuidv4 } from "uuid";
import { db } from "./index";
import type { Note, Tag } from "../../../types";
import { extractTitle } from "../markdown/extractTitle";

// 設計書 §4.4 — 初回起動時のデフォルトタグとウェルカムメモを投入する。

const SEED_FLAG_KEY = "seeded";

const DEFAULT_TAGS: Array<Pick<Tag, "name" | "color">> = [
  { name: "Inbox", color: "#7F77DD" },
  { name: "Idea", color: "#1D9E75" },
  { name: "Work", color: "#D85A30" },
];

const WELCOME_CONTENT = `# ようこそ SideMemo へ

SideMemo はブラウザのサイドパネルで動作する Markdown メモ帳です。
データはすべてあなたの端末（IndexedDB）に保存され、外部には送信されません。

## 基本操作

- **新規メモ**：右上の「+ 新規」ボタン、または \`Ctrl+N\`
- **タイトル**：本文 1 行目の \`# 見出し\` が自動でタイトルになります
- **タグ**：Inbox / Idea / Work が初期タグです。設定画面から追加・編集できます
- **検索**：上部の検索バーでタイトル・本文・タグを横断検索

## ページ添付

エディタ上部の「+ ページ添付」ボタンで、現在開いているタブの URL とタイトルをメモに紐付けられます。

## エクスポート

設定画面から JSON 形式で全データをエクスポート／インポートできます。バックアップにご活用ください。

---

それでは、最初のメモを書いてみましょう。
`;

async function isSeeded(): Promise<boolean> {
  const flag = await db.settings.get(SEED_FLAG_KEY);
  return flag?.value === true;
}

export async function seedIfNeeded(): Promise<void> {
  if (await isSeeded()) return;

  await db.transaction("rw", db.tags, db.notes, db.settings, async () => {
    // 競合回避：トランザクション内で再チェック
    const flag = await db.settings.get(SEED_FLAG_KEY);
    if (flag?.value === true) return;

    const now = Date.now();
    const tags: Tag[] = DEFAULT_TAGS.map((t, i) => ({
      id: uuidv4(),
      name: t.name,
      color: t.color,
      createdAt: now + i,
    }));
    await db.tags.bulkAdd(tags);

    const inboxTag = tags.find((t) => t.name === "Inbox");
    const welcome: Note = {
      id: uuidv4(),
      title: extractTitle(WELCOME_CONTENT),
      content: WELCOME_CONTENT,
      tagIds: inboxTag ? [inboxTag.id] : [],
      pinned: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.notes.add(welcome);

    await db.settings.put({ key: SEED_FLAG_KEY, value: true });
  });
}
