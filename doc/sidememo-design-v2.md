# SideMemo 設計書 v2

ブラウザ右側にサイドパネルとして表示される、Markdown対応のメモ取り拡張機能。

| 項目 | 内容 |
|------|------|
| プロダクト名 | SideMemo（仮称） |
| バージョン | 0.1.0 |
| 対象ブラウザ | Chrome / Edge（Chromium系、v114以降） |
| 拡張規格 | Manifest V3 |
| データ保存 | IndexedDB（ローカルのみ、外部送信なし） |
| 配布 | Chrome ウェブストア / Edge アドオン |
| 最終更新 | 2026-04-27 |

---

## 1. 概要

### 1.1 目的

Webブラウジング中に手早くメモを取れるサイドパネル型の拡張機能を提供する。リアルタイムで整形表示される WYSIWYG 型の Markdown エディタ・タグ管理・全文検索・エクスポート/インポートを備え、データはすべてユーザーのローカル環境（IndexedDB）に保存することでプライバシーを担保する。

### 1.2 想定ユーザー

- 調べ物をしながら情報を整理したい開発者・研究者
- ブログ執筆や学習メモを取るユーザー
- ローカル完結のシンプルなメモツールを求めるユーザー

### 1.3 主要機能

1. サイドパネルでの即時プレビュー型 Markdown 編集（Milkdown 採用）
2. 常時表示のエディタツールバー（見出し・装飾・リスト・挿入）
3. ユーザー選択可能な3種のレイアウトモード（自動 / 2ペイン / 1ペイン）
4. タグによる分類とフィルタリング（デフォルトタグ：Inbox / Idea / Work）
5. 全文検索（タイトル・本文・タグ横断、Fuse.js）
6. JSON 形式でのエクスポート／インポート
7. 現在開いているページの URL / タイトルをボタンでメモに添付
8. 起動経路：ツールバーアイコン・キーボードショートカット・右クリックメニュー
9. 初回起動時のウェルカムメモ自動作成

---

## 2. 技術スタック

| 領域 | 採用技術 | バージョン目安 |
|------|---------|--------------|
| Node.js | Node.js 24 | - |
| パッケージマネージャ | npm | - |
| 拡張機能規格 | Manifest V3 | - |
| サイドパネル | chrome.sidePanel API | Chrome/Edge 114+ |
| UI フレームワーク | React + TypeScript | React 18, TS 5 |
| ビルドツール | Vite + @crxjs/vite-plugin | Vite 6 系 |
| スタイリング | Tailwind CSS | 3 系 |
| Markdown エディタ | **Milkdown**（@milkdown/crepe または core+commonmark+listener） | 7 系 |
| データベース | IndexedDB（Dexie.js） | 4 系 |
| リアクティブ取得 | dexie-react-hooks（useLiveQuery） | - |
| 全文検索 | Fuse.js | 7 系 |
| ID 生成 | uuid v4 | 9 系 |
| サニタイズ | DOMPurify | - |
| Lint / Format | ESLint + Prettier（ダブルクォート、保存時フォーマット） | - |

### 2.1 採用判断のポイント

- **Milkdown**：当初想定の `@uiw/react-md-editor` は edit/preview/live の3モード切替型であり、要望の「書きながら即時整形される WYSIWYG」には弱い。Milkdown は ProseMirror ベースで、入力中にリアルタイムで Markdown 構文が整形表示される真の WYSIWYG を提供する。プラグインでツールバー・スラッシュコマンド・チェックリストなどを拡張可能。
- **CRXJS Vite Plugin**：MV3 拡張機能の HMR 対応で事実上の標準。
- **テストフレームワーク**：今回は不採用（個人開発・動作優先）。Repository 層は将来的に Vitest を追加できる構造で実装する。

---

## 3. アーキテクチャ

### 3.1 全体構成

```
┌──────────────────────────────────────────────────┐
│ Browser                                          │
│                                                  │
│  ┌──────────────┐         ┌────────────────────┐ │
│  │ Active Tab   │         │ Side Panel (右側)  │ │
│  │ (Webページ)  │         │  ┌──────────────┐  │ │
│  │              │         │  │ React App    │  │ │
│  │              │         │  │ + Milkdown   │  │ │
│  │              │         │  │ + Dexie      │  │ │
│  └──────┬───────┘         │  └──────┬───────┘  │ │
│         │                 └─────────┼──────────┘ │
│         │ chrome.tabs.query         │            │
│         ▼                           ▼            │
│  ┌──────────────────────────────────────────┐   │
│  │ Service Worker (background)              │   │
│  │  - パネル開閉制御                        │   │
│  │  - commands / contextMenus 処理          │   │
│  │  - 選択テキスト挿入の中継                │   │
│  └──────────────────────────────────────────┘   │
│                     │                            │
│                     ▼                            │
│  ┌──────────────────────────────────────────┐   │
│  │ IndexedDB (via Dexie.js)                 │   │
│  │  - notes / tags / settings / revisions   │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### 3.2 レイヤー構成（Side Panel 内）

```
┌──────────────────────────────────────┐
│ UI Layer (React Components)          │
├──────────────────────────────────────┤
│ Hooks Layer                          │
│  - useNotes / useTags / useSearch    │
│  - useLayoutMode / useSettings       │
│  - useLiveQuery (dexie-react-hooks)  │
├──────────────────────────────────────┤
│ Repository Layer                     │
│  - notesRepo / tagsRepo / backup     │
├──────────────────────────────────────┤
│ Data Layer                           │
│  - Dexie.js → IndexedDB              │
└──────────────────────────────────────┘
```

UI 層から IndexedDB へ直接アクセスせず、Repository 層を介在させる。これにより将来的なバックエンド差し替え（クラウド同期など）に備える。

---

## 4. データモデル

### 4.1 Dexie スキーマ定義

```typescript
import Dexie, { Table } from "dexie";

export interface Note {
  id: string;              // UUID v4 (主キー)
  title: string;           // 1行目の # 見出しから自動抽出
  content: string;         // Markdown 本文
  tagIds: string[];        // 多対多 (multiEntry インデックス)
  pinned: number;          // 0/1 (indexable のため number)
  pageRef?: PageRef;       // 紐付け Web ページ (任意・明示添付)
  createdAt: number;       // Unix ms
  updatedAt: number;
}

export interface PageRef {
  url: string;
  title: string;
  favicon?: string;
  capturedAt: number;
}

export interface Tag {
  id: string;
  name: string;            // ユニーク
  color: string;           // #RRGGBB
  createdAt: number;
}

export interface Setting {
  key: string;             // 'theme' | 'fontSize' | 'layoutMode' ...
  value: unknown;
}

export interface NoteRevision {
  id: number;              // ++auto
  noteId: string;
  content: string;
  savedAt: number;
}

class SideMemoDB extends Dexie {
  notes!: Table<Note, string>;
  tags!: Table<Tag, string>;
  settings!: Table<Setting, string>;
  revisions!: Table<NoteRevision, number>;

  constructor() {
    super("SideMemoDB");
    this.version(1).stores({
      notes:     "id, updatedAt, createdAt, pinned, *tagIds, title",
      tags:      "id, &name, createdAt",
      settings:  "key",
      revisions: "++id, noteId, savedAt",
    });
  }
}

export const db = new SideMemoDB();
```

### 4.2 インデックス設計の意図

| インデックス | 用途 |
|--------------|------|
| `notes.updatedAt` | 一覧の更新順ソート高速化 |
| `notes.createdAt` | 作成順ソート |
| `notes.pinned` | ピン留めメモの抽出 |
| `notes.*tagIds` | multiEntry：特定タグを含むメモを即座に取得 |
| `notes.title` | タイトル前方一致検索 |
| `tags.&name` | タグ名のユニーク制約 |
| `revisions.noteId` | 特定メモの履歴一覧 |

### 4.3 マイグレーション方針

スキーマ変更時は `version(N).stores({...}).upgrade(...)` で段階的に移行。Dexie は旧バージョン DB を自動アップグレードする。

### 4.4 初期データ（初回起動時）

#### デフォルトタグ

| name | color |
|------|-------|
| Inbox | #7F77DD（Purple 400） |
| Idea | #1D9E75（Teal 400） |
| Work | #D85A30（Coral 400） |

#### ウェルカムメモ

タイトル「ようこそ SideMemo へ」、本文に基本機能の使い方（メモ作成・タグ・検索・ページ添付・エクスポート）を Markdown で記述したメモを 1 件作成し、`Inbox` タグを付与する。

---

## 5. 機能仕様

### 5.1 サイドパネル起動

3 つの方法すべてに対応する。

| 起動方法 | 実装 |
|----------|------|
| ツールバーアイコンクリック | `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` |
| キーボードショートカット | `manifest.json` の `commands` に `_execute_action` を登録（既定: `Ctrl+Shift+M` / `Cmd+Shift+M`） |
| 右クリックメニュー | `chrome.contextMenus.create` で「SideMemo を開く」「選択テキストを現在のメモに挿入」を登録 |

### 5.2 メモ CRUD

| 操作 | 仕様 |
|------|------|
| 作成 | 「+ 新規」ボタン or ショートカット（`Ctrl+N`）。空メモを即作成 |
| 編集 | エディタで自動保存（debounce 500ms） |
| 削除 | ゴミ箱アイコン → **削除前確認ダイアログ** → 物理削除 |
| ピン留め | 一覧上部に固定表示。`pinned` フィールドで管理 |
| タイトル | **1行目の `# 見出し` の `#` を除いた文字列を自動抽出**。`#` がない場合は「無題」 |
| 空メモ | 何も書かずに別メモへ移動しても**自動削除しない**。「無題」として残す |

### 5.3 Markdown エディタ（Milkdown）

#### 5.3.1 表示方式

**即時プレビュー型 WYSIWYG**。編集モード/プレビューモードの切替を持たず、入力中にリアルタイムで以下が整形表示される。

- 見出し（`#`, `##`, `###`）→ サイズ・太さで段階表示
- `**bold**` → 太字
- `*italic*` / `_italic_` → 斜体
- `~~strike~~` → 取消線
- `- item` / `1. item` → リスト（インデント付き）
- `- [ ] task` → チェックボックス
- ` ``code`` ` → インラインコード
- ```` ```lang ``` ```` → コードブロック（簡易シンタックスハイライト）
- `> quote` → 引用ブロック
- `[text](url)` → リンク
- `---` → 水平線

Milkdown のプラグイン構成例：

```typescript
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

const crepe = new Crepe({
  root: containerEl,
  defaultValue: note.content,
  features: {
    [Crepe.Feature.Toolbar]: true,
    [Crepe.Feature.BlockEdit]: true,
    [Crepe.Feature.LinkTooltip]: true,
    [Crepe.Feature.CodeMirror]: true,
    [Crepe.Feature.ListItem]: true,
  },
});
crepe.create();
crepe.on(listener => {
  listener.markdownUpdated((_, markdown) => {
    debouncedSave(markdown);
  });
});
```

#### 5.3.2 ツールバー

エディタ上部に**常時表示**のツールバーを配置する。狭幅時は横スクロール対応。

| グループ | ボタン |
|----------|--------|
| 見出し | H1 / H2 / H3 |
| 装飾 | 太字 / 斜体 / 取消線 |
| リスト | 箇条書き / 番号付き / チェックリスト |
| 挿入 | リンク / インラインコード / 引用 / 区切り線 |

設定で「常時表示 / 自動非表示（カーソルが当たった時のみ）/ 非表示」を切替可能とする。

### 5.4 レイアウトモード

サイドパネルの幅は可変であるため、3 種類のレイアウトモードをユーザーが選択できる。

| モード | 動作 |
|--------|------|
| **自動**（既定） | 幅 ≧ 400px で2ペイン、< 400px で1ペイン（タブ切替）に自動切替 |
| **常時2ペイン** | 幅に関係なく一覧とエディタを並列表示（狭くなりすぎる場合はスクロール） |
| **常時1ペイン** | 幅に関係なく一覧とエディタをタブで切替表示 |

設定画面の「外観」セクション先頭でサムネイル付きカードから選択する UI を提供する。

#### 5.4.1 2ペインレイアウト

```
┌─────────────────────────────────────┐
│ [🔍 検索...]    [+ 新規] [⚙ 設定]    │
├─────────────────────────────────────┤
│ #タグ1 #タグ2 #タグ3       [クリア] │
├──────────┬──────────────────────────┤
│ メモ一覧 │ [タグチップ] [ページ添付]│
│ 📌メモA  ├──────────────────────────┤
│  メモB   │ [H1][H2][B][I][•]...     │
│  メモC   ├──────────────────────────┤
│  無題    │                          │
│          │  WYSIWYG エディタ        │
│          │  (即時プレビュー)        │
└──────────┴──────────────────────────┘
```

#### 5.4.2 1ペインレイアウト

タブ切替で「一覧 ⇄ エディタ」を遷移。エディタ画面には「← 戻る」ボタンで一覧へ戻る導線を確保する。

### 5.5 タグ管理

- タグの作成・編集・削除を専用 UI（設定画面内）で行う
- メモ編集画面ではチップ式 UI でタグを付け外し
- 一覧画面ではタグチップによる絞り込み（複数選択は OR 条件）
- 初回起動時にデフォルトタグ（Inbox / Idea / Work）を作成

### 5.6 検索

ハイブリッド戦略：IndexedDB のインデックスで対象を絞り込み、Fuse.js であいまい検索を行う。

```typescript
async function searchNotes(query: string, tagId?: string) {
  const candidates = tagId
    ? await db.notes.where("tagIds").equals(tagId).toArray()
    : await db.notes.toArray();

  if (!query.trim()) return candidates;
  const fuse = new Fuse(candidates, {
    keys: ["title", "content"],
    threshold: 0.4,
    ignoreLocation: true,
  });
  return fuse.search(query).map(r => r.item);
}
```

### 5.7 ページ参照（PageRef）

#### 5.7.1 添付方法

エディタ上部のページ情報バーに「+ ページ添付」ボタンを表示。クリックでアクティブタブの URL・タイトル・ファビコンを `pageRef` フィールドに保存する。**自動添付は行わない。**

```typescript
async function attachCurrentPage(noteId: string) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;
  await db.notes.update(noteId, {
    pageRef: {
      url: tab.url ?? "",
      title: tab.title ?? "",
      favicon: tab.favIconUrl,
      capturedAt: Date.now(),
    },
    updatedAt: Date.now(),
  });
}
```

#### 5.7.2 表示

添付されたページはチップ風 UI で表示され、クリックで該当ページを新規タブで開く。デタッチ（× ボタン）も可能。

### 5.8 選択テキストの挿入

右クリックメニュー「選択テキストを現在のメモに挿入」を選択すると：

1. Service Worker が選択テキストを取得
2. Side Panel が開いていなければ開く
3. `chrome.runtime.sendMessage` で Side Panel に内容を送信
4. **既存の編集中メモのカーソル位置にテキストを挿入**
5. メモを開いていない場合は新規メモを作成して挿入

### 5.9 エクスポート／インポート

```typescript
async function exportAll(): Promise<Blob> {
  const data = {
    schemaVersion: 1,
    exportedAt: Date.now(),
    notes: await db.notes.toArray(),
    tags: await db.tags.toArray(),
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}

async function importAll(json: ImportPayload, mode: "merge" | "replace") {
  await db.transaction("rw", db.notes, db.tags, async () => {
    if (mode === "replace") {
      await db.notes.clear();
      await db.tags.clear();
    }
    await db.tags.bulkPut(json.tags);
    await db.notes.bulkPut(json.notes);
  });
}
```

エクスポートは `chrome.downloads.download` で JSON ファイルをダウンロード。インポートは `<input type="file">` 経由で受け取り、merge / replace を選択可能。

### 5.10 設定

| 項目 | 選択肢 / 値 |
|------|------------|
| レイアウトモード | 自動 / 常時2ペイン / 常時1ペイン |
| テーマ | 自動 / ライト / ダーク |
| 既定エディタモード | 削除（即時プレビュー固定のため） |
| フォントサイズ | 12 / 13 / 14 / 16 / 18 px |
| ツールバー表示 | 常時表示 / 自動非表示 / 非表示 |
| 自動保存 debounce | 250 / 500 / 1000 ms |
| ストレージ使用量表示 | `navigator.storage.estimate()` 連動 |

---

## 6. UI レイアウト詳細

### 6.1 ヘッダー部

検索バー（フルテキスト検索）、新規ボタン、設定ボタンを配置。検索は入力都度インクリメンタルに動作。

### 6.2 タグフィルタバー

選択中のタグを強調表示し、未選択タグは淡色で表示。「クリア」で絞り込み解除。

### 6.3 メモ一覧

- ピン留めメモは背景色付きで上部に固定
- 各アイテムにタイトル / 本文プレビュー1行 / 更新日時を表示
- 空メモは「無題」「(空)」と淡色で表示
- 選択中のメモは背景色（Blue 50）でハイライト

### 6.4 エディタ部（上から下へ）

1. **メタ情報バー**：選択中タグチップ、ピン留め、削除ボタン
2. **ページ情報バー**：添付ページ表示 or「+ ページ添付」ボタン
3. **ツールバー**：見出し・装飾・リスト・挿入の各ボタン
4. **本文エディタ**：Milkdown による即時プレビュー型 WYSIWYG

---

## 7. ファイル構成

```
sidememo/
├── manifest.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── .eslintrc.cjs
├── .prettierrc                   # ダブルクォート設定
├── .vscode/
│   └── settings.json             # 保存時フォーマット
├── public/
│   └── icons/                    # 仮アイコン（自前作成予定）
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
└── src/
    ├── background/
    │   └── service-worker.ts
    ├── sidepanel/
    │   ├── index.html
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── Header.tsx
    │   │   ├── TagFilterBar.tsx
    │   │   ├── NoteList.tsx
    │   │   ├── NoteListItem.tsx
    │   │   ├── editor/
    │   │   │   ├── EditorContainer.tsx
    │   │   │   ├── MilkdownEditor.tsx
    │   │   │   ├── EditorToolbar.tsx
    │   │   │   ├── TagChips.tsx
    │   │   │   └── PageRefBar.tsx
    │   │   ├── settings/
    │   │   │   ├── SettingsScreen.tsx
    │   │   │   ├── LayoutModeSelector.tsx
    │   │   │   ├── TagManager.tsx
    │   │   │   └── ImportExport.tsx
    │   │   └── common/
    │   │       ├── ConfirmDialog.tsx
    │   │       └── Spinner.tsx
    │   ├── hooks/
    │   │   ├── useNotes.ts
    │   │   ├── useTags.ts
    │   │   ├── useSearch.ts
    │   │   ├── useSettings.ts
    │   │   └── useLayoutMode.ts
    │   ├── lib/
    │   │   ├── db/
    │   │   │   ├── index.ts
    │   │   │   ├── notesRepo.ts
    │   │   │   ├── tagsRepo.ts
    │   │   │   ├── search.ts
    │   │   │   ├── backup.ts
    │   │   │   └── seed.ts        # 初回データ投入
    │   │   ├── chrome/
    │   │   │   └── tabs.ts
    │   │   └── markdown/
    │   │       ├── extractTitle.ts
    │   │       └── sanitize.ts
    │   └── styles/
    │       └── globals.css
    └── types/
        └── index.ts
```

---

## 8. manifest.json

```json
{
  "manifest_version": 3,
  "name": "SideMemo",
  "version": "0.1.0",
  "description": "Markdown対応のサイドパネル型メモ拡張機能",
  "permissions": [
    "sidePanel",
    "storage",
    "tabs",
    "contextMenus",
    "downloads"
  ],
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "action": {
    "default_title": "SideMemo を開く",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png"
    }
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "mac": "Command+Shift+M"
      },
      "description": "SideMemo を開く"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

`host_permissions` は不要（ページ内容にアクセスせず、`tabs` 権限で URL / タイトルのみ取得するため）。最小権限の原則に従う。

---

## 9. 開発環境

### 9.1 必須ツール

- Node.js 24
- npm

### 9.2 ESLint + Prettier 設定方針

- **ダブルクォート**統一（`"prettier.singleQuote": false`）
- **保存時フォーマット**有効化（`.vscode/settings.json` に `"editor.formatOnSave": true`）
- TypeScript strict mode
- `eslint-config-prettier` で競合回避

### 9.3 セットアップ手順

```bash
npm create vite@latest sidememo -- --template react-ts
cd sidememo
npm install
npm install -D @crxjs/vite-plugin@beta
npm install -D tailwindcss postcss autoprefixer
npm install -D eslint prettier eslint-config-prettier
npm install dexie dexie-react-hooks
npm install @milkdown/crepe @milkdown/core @milkdown/preset-commonmark @milkdown/preset-gfm @milkdown/plugin-listener @milkdown/react
npm install fuse.js uuid dompurify
```

### 9.4 npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  }
}
```

---

## 10. 非機能要件

### 10.1 パフォーマンス

- 起動 → 初回描画：500ms 以内
- メモ 1000 件規模で一覧スクロールが滑らか（仮想スクロールは v2 検討）
- 自動保存の debounce：既定 500ms（設定で変更可）

### 10.2 ストレージ永続化

IndexedDB はストレージ逼迫時にブラウザから自動削除される可能性があるため、初回起動時に永続化を要求する。

```typescript
async function requestPersistence() {
  if (navigator.storage?.persist) {
    const granted = await navigator.storage.persist();
    if (!granted) {
      console.warn("Storage may be evicted under pressure.");
    }
  }
}
```

### 10.3 セキュリティ

| 観点 | 対策 |
|------|------|
| XSS | Milkdown の出力をサニタイズ、外部リンクは `rel="noopener noreferrer"` |
| CSP | manifest 既定値（外部スクリプト読込禁止） |
| 外部送信 | 一切行わない。テレメトリ・解析も非搭載 |
| 権限 | 必要最小限（`host_permissions` なし） |
| プライバシーポリシー | ストア掲載時に「ローカルのみで動作・データ送信なし」を明記 |

### 10.4 アクセシビリティ

- キーボード操作のみで全機能にアクセス可能
- ARIA ラベル付与
- フォーカスリングを明示
- ツールバーボタンは tooltip 付き

### 10.5 国際化（v2 以降）

初版は日本語のみ。`chrome.i18n` ベースで多言語化できる構造にしておく。

---

## 11. 開発ロードマップ

| フェーズ | 内容 | 状態 |
|----------|------|------|
| **M0** | Vite + React + manifest.json、空サイドパネル表示 | - |
| **M1** | Dexie 定義、Repository、初回シード（デフォルトタグ + ウェルカムメモ） | - |
| **M2** | メモの作成・一覧・編集・削除（プレーンテキスト UI） | - |
| **M3** | Milkdown 組込、即時プレビュー WYSIWYG エディタ | - |
| **M4** | エディタツールバー実装 | - |
| **M5** | タグ管理、Fuse.js 検索、フィルタリング | - |
| **M6** | レイアウトモード切替（自動 / 2ペイン / 1ペイン） | - |
| **M7** | ページ添付ボタン、選択テキスト挿入 | - |
| **M8** | コマンド・コンテキストメニュー登録 | - |
| **M9** | エクスポート／インポート、設定画面 | - |
| **M10** | 永続化要求、容量表示、確認ダイアログ整備 | - |
| **M11** | アクセシビリティ対応、アイコン作成 | - |
| **M12** | ストア掲載準備（説明文・スクリーンショット・プライバシーポリシー） | - |

---

## 12. 将来拡張の候補

- 添付ファイル（画像など、IndexedDB に Blob として保存）
- メモ間リンク（`[[noteId]]` 記法）
- ゴミ箱機能（30日保持）
- 検索インデックスの永続化（数千件超でのパフォーマンス対策）
- バックアップの自動エクスポート（週次など）
- クラウド同期（Repository 層を差し替えて実現）
- 多言語対応（chrome.i18n）
- スラッシュコマンド（Milkdown BlockEdit プラグインを活用）
- 仮想スクロール（react-virtual など）
- テーマカスタマイズ

---

## 13. 注意事項・既知の制約

- **Service Worker の制約**：MV3 の Service Worker は非アクティブ化される。状態を保持しないこと。IndexedDB 操作は基本 Side Panel 側で行う。
- **Side Panel の対応バージョン**：Chrome / Edge ともに 114 以降が必要。それ以前のバージョンでは動作しない。
- **キーボードショートカットの競合**：`Ctrl+Shift+M` は他の拡張機能と競合する可能性がある。Chrome の `chrome://extensions/shortcuts` でユーザーが変更可能。
- **IndexedDB の自動削除**：永続化が許可されない場合、ストレージ逼迫時にデータが失われる可能性がある。定期的なエクスポートを推奨する旨を UI で案内。
- **Milkdown の学習コスト**：ProseMirror ベースのため、カスタマイズには ProseMirror の知識が必要となる場面がある。基本機能は Crepe プリセットで完結する。
- **ストア審査**：Chrome ウェブストア / Edge アドオンへの公開時、レビューに数日〜数週間かかる場合がある。プライバシー実務（データ収集なし）を申告フォームで適切に記入する必要がある。
