# ストア審査用の権限説明

Chrome ウェブストア / Edge アドオンの審査フォームに転記するためのテンプレートです。各権限について「なぜ必要か」を 1 文で答えるよう求められるので、以下の文をそのまま貼ってください。

## Single purpose（単一目的の説明）

> SideMemo は、ブラウザのサイドパネル上で動作する Markdown メモ取り拡張機能です。ユーザーは Web を閲覧しながらメモを作成・整理・検索でき、データはすべてユーザーの端末（IndexedDB）に保存されます。

## 各権限の justification

### `sidePanel`

> 拡張機能の UI 全体を `chrome.sidePanel` API を介してサイドパネルに描画するためです。本拡張機能はポップアップやオプションページではなく、サイドパネルとしてのみ動作します。

### `storage`

> ユーザーが設定した「レイアウトモード / テーマ / フォントサイズ / 自動保存遅延 / ツールバー表示」などの永続設定の保存と、右クリックで挿入された選択テキストを Service Worker から Side Panel へ受け渡すための一時的な session storage に使用します。

### `tabs`

> ユーザーが「+ ページ添付」ボタンを押したとき、現在アクティブなタブの URL・タイトル・ファビコンの URL のみを `chrome.tabs.query` で取得し、メモに紐付けるために使用します。タブのコンテンツやスクリプトにはアクセスしません。

### `contextMenus`

> 右クリックメニューに「SideMemo を開く」「選択テキストを SideMemo に挿入」の 2 項目を追加するために使用します。

### `downloads`

> ユーザーが設定画面の「エクスポート」を実行した際に、メモとタグを JSON ファイルとして端末に保存するために `chrome.downloads.download` を使用します。保存先はユーザーの選択に従います。

## Host permissions（要求していません）

> 本拡張機能はいかなるホスト権限も要求しません。ページコンテンツの読み書きを行わないためです。

## Remote code（リモートコードを実行していません）

> 本拡張機能はバンドル済みのコードのみを実行します。`eval`、外部スクリプトの動的ロード、外部 fetch、リモートコンフィグの取得は行いません。

## Data usage（データ利用申告 — チェック内容）

Chrome ウェブストアの「Data Usage」フォームでは、以下に **チェックを入れない** で構いません。

- [ ] Personally identifiable information
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information
- [ ] Personal communications
- [ ] Location
- [ ] Web history
- [ ] User activity
- [ ] Website content

すべてユーザーの端末上に留まるため、いずれにも該当しません。

「I do not collect or use user data.」を選び、続く項目（販売・分析・信用調査等への利用）にも該当なしを選択します。
