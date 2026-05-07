# SideMemo

ブラウザ右側のサイドパネルで動作する、Markdown 対応のメモ取り Chrome / Edge 拡張機能。データはすべて IndexedDB にローカル保存され、外部送信は一切行いません。

**Chrome ウェブストアで公開中:**

https://chromewebstore.google.com/detail/sidememo/kiapfojfgefpllfmhomandpbiohmkimk?authuser=0&hl=ja

## 特長

- **リアルタイム整形の Markdown エディタ** — Milkdown 採用。`#` が見出しに、`**` が太字に、`- [ ]` がチェックボックスに、入力したそばから整形されます（編集 / プレビューのモード切替はありません）。
- **3 種類のレイアウトモード** — 自動 / 常時 2 ペイン / 常時 1 ペイン。自動モードはパネル幅 400px をしきい値に切り替わります。
- **タグと全文検索** — Inbox / Idea / Work の初期タグから始められ、自由に追加・編集できます。検索はタイトル・本文・タグ横断のあいまい検索（Fuse.js）。
- **ページ参照（PageRef）** — 「+ ページ添付」で、現在開いているタブの URL / タイトルをメモに紐付け。明示操作のときだけ取り込みます。
- **選択テキストの取り込み** — ページ上で右クリック →「選択テキストを SideMemo に挿入」。
- **エクスポート / インポート** — メモとタグを JSON 1 ファイルでバックアップ・復元。マージと置き換えを選択可能。
- **ローカル完結** — IndexedDB のみを使用。外部サーバーへの送信・テレメトリ・解析は一切ありません。`host_permissions` も要求しません。

## 起動方法

- ツールバーの SideMemo アイコンをクリック
- キーボードショートカット `Ctrl+Shift+M`（Mac は `Cmd+Shift+M`）
- 任意のページで右クリック →「SideMemo を開く」

ショートカットは `chrome://extensions/shortcuts` から変更できます。

## 動作要件

- Chrome / Edge 114 以降（`chrome.sidePanel` API が必要）

## 技術スタック

| 領域 | 採用技術 |
|------|---------|
| 拡張機能規格 | Manifest V3 |
| UI | React 19 + TypeScript |
| ビルド | Vite + @crxjs/vite-plugin |
| Markdown エディタ | Milkdown（@milkdown/crepe） |
| データベース | IndexedDB（Dexie.js） |
| 全文検索 | Fuse.js |
| サニタイズ | DOMPurify |

## 開発

```bash
npm install
npm run dev      # Vite 開発サーバ
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # 本番ビルドのプレビュー
npm run pack     # 配布用 zip を生成
npm run release  # build + pack
```

Node.js 24 / npm を想定。

### 拡張機能としての読み込み

1. `npm run build` を実行し `dist/` を生成
2. `chrome://extensions/` を開き、デベロッパーモードを ON
3. 「パッケージ化されていない拡張機能を読み込む」で `dist/` を選択

## ドキュメント

- 設計書: [`doc/sidememo-design-v2.md`](doc/sidememo-design-v2.md)
- ワイヤーフレーム: [`doc/wireframe-*.svg`](doc/)
- ストア掲載文 / プライバシーポリシー: [`doc/store/`](doc/store/)

## プライバシー

すべてのメモ・タグ・設定はあなたの端末の IndexedDB に保存されます。サーバーへの送信や第三者との共有は行いません。
詳細は [`doc/store/privacy-policy.md`](doc/store/privacy-policy.md) を参照してください。

