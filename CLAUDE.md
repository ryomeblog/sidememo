# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このリポジトリは **SideMemo**（Chrome / Edge 向け Manifest V3 のサイドパネル型 Markdown メモ拡張機能、ローカル IndexedDB のみで動作）の開発リポジトリ。現状は **Vite + React + TypeScript** の初期テンプレートが置かれているだけで（`src/App.tsx` には Vite 既定のウェルカム画面が残っている）、SideMemo としての機能はまだ何も実装されていない。

**仕様の正本は `doc/sidememo-design-v2.md`。** 些細でない変更を加える前に必ず参照すること。データモデル、レイヤー構成、manifest、ファイル配置、マイルストーン（M0〜M12）まで網羅されている。ワイヤーフレームは `doc/wireframe-*.svg` に同梱。リポジトリ直下の `README.md` は未編集の Vite テンプレートそのままなので、このプロジェクトの参考資料としては **使わないこと**。

## コマンド

```bash
npm run dev      # Vite 開発サーバ
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview  # 本番ビルドのプレビュー
```

**テストフレームワークは未導入**。設計上も意図的に見送られている（「Repository 層は将来的に Vitest を追加できる構造で実装する」）。投機的にテストを足さないこと。テストが必要そうな作業に当たった場合は Vitest 導入の可否と範囲をユーザーに確認してから進める。

## 維持すべきアーキテクチャ判断

仕様から実装へ落とす際、以下は自明でないが**ユーザーの明示的な合意なしに覆してはいけない**判断:

- **Markdown エディタは Milkdown（`@milkdown/crepe` 等）一択。`@uiw/react-md-editor` は不可。** 後者は edit / preview / live のモード切替型で、要件である「入力中にリアルタイム整形される真の WYSIWYG」を満たせないため不採用。設計書 §2.1 / §5.3 参照。
- **UI 層から Dexie を直接叩かない。** すべてのデータアクセスは Repository 層（`src/sidepanel/lib/db/notesRepo.ts`, `tagsRepo.ts` ほか）を経由させる。将来のクラウド同期差し替えに備えるための制約。§3.2 参照。
- **Service Worker はステートレス。** MV3 では SW が非アクティブ化されるため、永続状態は IndexedDB に置き、操作は基本的にサイドパネル側で行う。§13 参照。
- **タイトルはユーザー入力ではなく派生値。** 本文 1 行目の `# 見出し` から自動抽出する（無ければ「無題」）。§5.2 参照。`Note.title` フィールドはこの抽出結果のキャッシュ。
- **ページ添付は常に明示操作。** 「+ ページ添付」ボタン押下時のみ取り込む。メモ作成時に勝手にアクティブタブを取り込むことは **しない**。§5.7 参照。
- **空メモは自動削除しない。** 何も書かずに別メモへ移動しても「無題 / (空)」として残す。§5.2 参照。
- **`pinned` は `number`（0 / 1）であって `boolean` ではない。** Dexie / IndexedDB は boolean をインデックスできないため。§4.1 参照。
- **権限は最小限。** `host_permissions` は付与しない。URL / タイトル取得は `tabs` 権限のみで行う（ページ内容にはアクセスしない）。§8 / §10.3 参照。
- **外部通信は一切行わない。** テレメトリも解析も外部 fetch も無し。「データはローカル完結」がプロダクトのプライバシー上の核。

## コードスタイル

- **ダブルクォート統一**（Prettier `singleQuote: false`）と保存時フォーマットは設計で明示されている（§9.2）。現状の ESLint 設定は Vite テンプレート既定のままで未強制なので、Prettier を導入する際にこの方針で揃えること。
- TypeScript strict mode。
- Node.js 24 / npm。動作対象は Chrome / Edge 114 以降（`chrome.sidePanel` の要件）。

## レイアウトモード

サイドパネルは「自動 / 常時2ペイン / 常時1ペイン」の 3 モードを設定で切替可能。「自動」モードは **幅 400px をしきい値**として切替（≧400px で 2 ペイン、<400px で 1 ペインのタブ表示）。§5.4 参照。

## 想定ファイル構成

現状の `src/` はテンプレートそのまま。設計書 §7 の構成では `src/background/service-worker.ts`、`src/sidepanel/{components,hooks,lib}/...`、`src/types/` に分かれる。マイルストーンの進行に合わせて段階的に置き換えること。テンプレート由来のファイルは、それを置き換える実装が入るタイミングで初めて消す（先回りでまとめて移動しない）。
