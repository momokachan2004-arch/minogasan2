# キャンペーン巡回レポート 2026-08-30

## 🔺 変化あり（1件）— 公式で条件を再確認してください

### Audible
https://www.audible.co.jp/

```diff
--- 前回
+++ 今回
@@ -1,4 +1,2 @@
-Audible | Listen to Audiobooks, Podcasts, & Originals Based on your location you have been directed to audible.com Do you want to go to audible.co.jp ? Help English Español US Dollar Mexican Peso Sign in Audiobooks Podcasts Audible Originals Latino and Hispanic voices All categories Plans & Pricing Bestsellers Coming Soon New Releases Best of the Year Best of #BookTok Plus Catalog Gifts Help Center About Audible Blog Sales & Deals Accessibility Audiobooks You'll Love
-Podcasts You'll Binge
-Try one month free Try for $0.00 See all plans Auto renews for $8.99 a month after 30 days
+Audible | Listen to Audiobooks, Podcasts, & Originals Based on your location you have been directed to audible.com Do you want to go to audible.co.jp ? Help English Español US Dollar Mexican Peso Sign in Audiobooks Podcasts Audible Originals Latino and Hispanic voices All categories Plans & Pricing Bestsellers Coming Soon New Releases Best of the Year Best of #BookTok Plus Catalog Gifts Help Center About Audible Blog Sales & Deals Accessibility Stories that speak to you Try one month free Try for $0.00 See all plans Auto renews for $8.99 a month after 30 days
 Cancel anytime
@@ -18,13 +16,5 @@
 New genres that make you take the long way home From epic stories to self-improvement, there are audiobooks for everyone
-Sci-Fi & Fantasy Literature & Fiction Mystery & Thriller Comedy & Humour Biographies & Memoirs Romance Children Politics Arts & Entertainment Teen Self Development History What our members are saying Real customers, real quotes
-Ronnie S
-"Audible offers a truly fantastic way to enjoy books
-It allows for a wonderful "reading" experience through immersive audio narration." Jennifer S
-"Audible has been a great experience for me, especially because of th
```

## ❌ ページが消えた/移動（3件）— キャンペーン終了の可能性

- **BOOK☆WALKER 読み放題** — https://bookwalker.jp/select/yomihodai/ （HTTP 404）
- **ヨシケイ** — https://yoshikei-dvlp.co.jp/otameshi/ （HTTP 404）
- **Nintendo Switch Online** — https://www.nintendo.com/jp/switch-online/ （HTTP 404）

## ⚠️ 取得できず（8件）— 一時的な可能性。続くようなら要確認

- TSUTAYA DISCAS — https://www.discas.net/ （HTTP 500）
- Netflix — https://www.netflix.com/jp/ （IncompleteRead(688128 bytes read)）
- DAZN — https://www.dazn.com/ja-JP/ （HTTP 403）
- ブック放題 — https://www.bookhodai.jp/ （<urlopen error timed out>）
- Oisix — https://www.oisix.com/ （The read operation timed out）
- わんまいる — https://www.wanmile.jp/ （<urlopen error [Errno -2] Name or service not known>）
- 三ツ星ファーム — https://mitsuboshifarm.jp/ （HTTP 403）
- コープデリ — https://www.co-opdeli.jp/ （<urlopen error [Errno -2] Name or service not known>）



---

## 🤖 修正案（AI・要確認）

> Claude がレポートを読んで作った下書きです。**必ず公式で裏を取ってから** campaigns.js に反映してください。

# 修正案

### 削除の検討

| サービス名 | 理由 |
|-----------|------|
| BOOK☆WALKER 読み放題 | HTTP 404：ページが消えた/移動。キャンペーン終了の可能性が高い。確度：**高** |
| ヨシケイ | HTTP 404：ページが消えた/移動。キャンペーン終了の可能性が高い。確度：**高** |
| Nintendo Switch Online | HTTP 404：ページが消えた/移動。キャンペーン終了の可能性が高い。確度：**高** |

---

### 更新（既存エントリの修正）

| サービス名 | 変える項目 | 変更後の値 | 根拠（レポートの該当箇所） |
|-----------|----------|---------|----------------------|
| Audible | lastChecked | "2026-08-30" | レポート「Audible」差分より。本日、ページコンテンツが変動し、公式で条件を再確認してください、と記載。既存の lastChecked は "2026-08-30" なので変更不要、ただし source を **要公式確認** に更新推奨。確度：**中** |

---

### 追加（新規エントリの候補）

変更提案なし

---

## 補足

- **レポート「取得できず」の 8 件**（TSUTAYA DISCAS など）は HTTP エラーやタイムアウトなので、一時的な問題の可能性が高い。継続して取得できなければ要確認。
- **Audible の差分**：ページレイアウトが変わった（見出しテキストが削除）ものの、キャンペーン条件「30日間無料」の記載は残っている。既存エントリは有効と判断。ただし必ず公式で最新確認を推奨。
- **削除 3 件**はすべて HTTP 404 で、復帰の可能性は低い。campaigns.js から削除してください。
