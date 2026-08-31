# 見逃さん LINE bot

PWA（`../index.html`）とは別チャネル。`campaigns.js` のデータや `automation/` の巡回はそのまま流用し、
表示先として LINE を足す構想。ロードマップ全体は Claude が作った「見逃さん LINE bot ロードマップ」アーティファクト参照。

デプロイは **Cloudflare のダッシュボードにコードを貼るだけ**（Node / npm / wrangler 不要）。

---

## STEP 1: echo bot（デプロイ済み・稼働中）

デプロイ先: `https://minogasan-line-bot.momokachan2004.workers.dev`
（GET で開くと `minogasan LINE bot: OK` が返る）

> Cloudflare ダッシュボードは 2025〜2026 に UI が変わった。単独の「Create Worker」ボタンは廃止され、
> 「Create」1つに統合。以下は現行 UI の手順。

### 1. Worker を作る

1. https://dash.cloudflare.com/ → 左メニュー **Compute (Workers)**（旧 **Workers & Pages**）
2. 右上 **Create** → **Start with Hello World** カードを選ぶ → **Get started**
3. 名前を `minogasan-line-bot` にして **Deploy**
   - 初めて Worker を作る場合、**workers.dev のサブドメイン名**を1回だけ聞かれる（アカウント共通）。
     ここで入れた名前が URL の `<サブドメイン>` になる（このプロジェクトでは `momokachan2004`）
4. デプロイ完了画面 → **Continue to project**（または `</>` **Edit code**）→ エディタの中身を全部消して
   [`worker.js`](worker.js) の内容を貼り付け → 右上 **Deploy**

### 2. シークレットを登録

**Variables and Secrets は独立タブではなく Settings タブ内のセクション。**

Worker の中に入る → **Settings** タブ → 下にスクロール → **Variables and Secrets** セクションの **+ Add** を2回：

| 名前 | 値 | 種類 |
|---|---|---|
| `CHANNEL_ACCESS_TOKEN` | LINE Developers Console → 対象チャネル → **Messaging API** タブ → チャネルアクセストークン（長期）を発行してコピー | Secret |
| `CHANNEL_SECRET` | 同チャネル → **Basic settings** タブ → チャネルシークレット（32文字程度の短い英数字。チャネルID＝数字だけ、や長いトークンと間違えない） | Secret |

2個目は「**Add variable**」で行を増やす。値の前後に空白・改行が混入しないよう注意。
登録後、セクション下部の **Deploy** を押す（押さないと反映されない）。

### 3. Worker の URL を確認

`https://minogasan-line-bot.momokachan2004.workers.dev`
ブラウザで開いて `minogasan LINE bot: OK` が出ればデプロイ成功。
URL は Worker の中 → **Settings** → **Domains & Routes** セクションでも確認できる。

### 4. LINE に Webhook URL を登録

1. LINE Developers Console → 対象チャネル → **Messaging API** タブ → **Webhook URL** の Edit → 上記 URL を入れて **Update**
2. **Verify** → "Success"（署名検証込みで 200 が返っている証拠）
3. **Use webhook** を **オン**
4. LINE Official Account Manager（https://manager.line.biz/）→ 設定 → 応答設定：
   - 応答メッセージ **オフ**
   - あいさつメッセージ **オン**（内容は仮でよい）
   - チャット **オフ**
   - Webhook **オン**

### 5. 動作確認

Messaging API タブの QR から自分の LINE で友だち追加 → 適当にメッセージ送信 →
返信が来れば OK（STEP 2 導入後は「ヘルプ」で使い方が返る）。

### うまくいかないとき

- **Verify が 401 Unauthorized** … このコードは署名検証に失敗したときだけ 401 を返す。ほぼ `CHANNEL_SECRET` の値ずれ（長いトークンやチャネルIDを入れた／前後に空白・改行）か、Secret 保存後に **Deploy を押していない**。Basic settings のチャネルシークレットを入れ直して再 Deploy。
- **Verify がその他のエラー / タイムアウト** … トークン未登録 or 平文のまま。Secret にして再 Deploy。URL は末尾スラッシュ無しの workers.dev ルートでよい。
- **Verify は通るのに実メッセージに返信が来ない** … 応答メッセージが「オン」のまま／アクセストークンが誤り。Worker 画面 → **Logs** → Begin log stream でエラーを確認。
- 無料枠は 1 日 10 万リクエスト。個人利用では当たらない。

---

## STEP 2: キャンペーン一覧を返す（実装済み）

### データの持ち方

Worker が実行時に **GitHub Pages の `campaigns.js` をそのまま fetch** して解析する
（`CAMPAIGNS_URL` 定数）。アプリと単一ソースなので、`git push` でアプリを更新すれば bot も自動で最新になる。

- Workers は `eval` / `new Function` を使えないため、`window.CAMPAIGNS = [ ... ]` の配列リテラルだけを
  取り出して小さな自前パーサ（`LiteralParser`：コメント／末尾カンマ／引用符なしキー対応）で読む。
- 取得結果は isolate 内メモリに 10 分キャッシュ。

### 反応するコマンド（すべて返信メッセージ＝無料・無制限）

| 送る言葉 | 返すもの |
|---|---|
| `ヘルプ` / `使い方` / `メニュー` | 使い方の案内 |
| `キャンペーン` / `一覧` / `お得` | 掲載中の全件を締切が近い順に Flex カルーセル（最大12枚） |
| `急ぎ` / `締切` | `deadline` があるものだけ |
| カテゴリ名（`動画` `音楽` `雑誌` `フード` `買い物` `くらし` `ゲーム`） | そのカテゴリだけ |
| 上記以外 | 使い方を案内 |
| （友だち追加イベント） | あいさつ＋使い方 |

期限切れ（残り日数 < 0）は自動で非表示。各カードの「詳細を見る」は `campaign.url`（https のみ）を開く。

### デプロイ後の確認

友だちのトークで「キャンペーン」と送る → カード一覧が返れば STEP 2 完了。
返信が来ない／エラー時は Worker → **Logs**（Observability → Logs → Begin log stream）を確認。
`getCampaigns failed` が出る場合は GitHub Pages の URL か公開状態を確認。

---

## STEP 3: 利用開始日を記録して「利用中」を返す（実装済み・要デプロイ＋KV設定）

`worker.js` を STEP 3 版に差し替えた。**まず KV をバインドしてから、エディタに貼り直して Deploy**。
シークレットの再設定は不要。KV 未設定でも STEP 2（一覧）は動く。

### 1. KV ネームスペースを作ってバインド

1. Cloudflare ダッシュボード左メニュー → **Storage & Databases** → **KV**（Workers KV）→ **Create instance**（表記により Create a namespace）→ 名前 `minogasan-usage`
2. **Workers & Pages** → `minogasan-line-bot` を開く → 上部タブの **Bindings**（Metrics / Deployments / Bindings / Settings … と並ぶ。**Settings の中ではなく独立タブ**）
   - 古い UI の場合は **Settings → Variables → KV Namespace Bindings**
3. **Add binding** → **KV namespace**
   - Variable name: **`USAGE`**（コードがこの名前で参照する）
   - KV namespace: `minogasan-usage` を選択
4. **Add binding**（デプロイまで入る）

### 2. コードを貼り直す

エディタの中身を全消し → [`worker.js`](worker.js) を貼る → **Deploy**。

### KV に持つデータ

```
key:   u:<LINEのuserId>
value: { started: { "<campaignId>": { d: "YYYY-MM-DD", s: "サービス名" }, ... }, updatedAt: "ISO" }
```

- 登録操作をするまで KV には何も書かない。
- サービス名スナップショット `s` も持つので、後で campaigns.js から消えても「利用中」に名前が残る。
- 無料枠: 読み 10万/日・書き 1000/日。個人利用では当たらない。

### 追加コマンド（すべて返信メッセージ＝無料）

| 送る言葉 | 動作 |
|---|---|
| サービス名だけ（例 `Spotify`） | 「今日 / 昨日 / 3日前 / 1週間前 / 2週間前 / 1か月前」のクイックリプライを出す → タップで登録 |
| `Spotify 今日から` / `U-NEXT 3日前` / `dマガジン 8/20` / `... 2026-08-01` | その日付で直接登録 |
| `利用中` / `マイページ` | 登録内容を「無料期間の終了日・残り日数」付きで Flex 表示（各カードに解約ボタン） |
| `解約 Spotify` / `Spotify やめた` | その登録を削除 |
| `データ削除` | 確認クイックリプライ → 自分の記録を key ごと削除 |

- 開始日 + `campaign.freeDays` から個人の無料期間終了日を計算。`freeDays` が無い還元系は開始日のみ記録。
- サービス名は完全一致優先→部分一致。複数ヒット時は候補を返して聞き返す。
- postback（クイックリプライ／解約ボタン）は `event.type === "postback"` で処理。`data` は `action=start&cid=..&ago=..` 等。

### デプロイ後の確認

「Spotify」→ 日付ボタン → 「今日」タップ → 登録完了メッセージ → 「利用中」で一覧に出れば STEP 3 完了。
`記録機能はまだ準備中です（KV 未設定）` が返る場合はバインドの Variable name が `USAGE` か確認。

---

## この先（未着手）

- STEP 4: Cron Trigger で「終了3日前」プッシュ（ここから push 課金対象。リマインドだけなら無料枠 200/月 に収まる）
- STEP 5: リッチメニュー＋使い方＋プライバシーポリシー（サーバーがユーザーデータを持つので「端末内だけ」の説明は不可に）
- STEP 6: 友だちに配ってオフィシャルアカウントマネージャーの分析を見る
