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
**「受け取ったよ: 〜」** が返れば STEP 1 完了。

### うまくいかないとき

- **Verify が 401 Unauthorized** … このコードは署名検証に失敗したときだけ 401 を返す。ほぼ `CHANNEL_SECRET` の値ずれ（長いトークンやチャネルIDを入れた／前後に空白・改行）か、Secret 保存後に **Deploy を押していない**。Basic settings のチャネルシークレットを入れ直して再 Deploy。
- **Verify がその他のエラー / タイムアウト** … トークン未登録 or 平文のまま。Secret にして再 Deploy。URL は末尾スラッシュ無しの workers.dev ルートでよい。
- **Verify は通るのに実メッセージに返信が来ない** … 応答メッセージが「オン」のまま／アクセストークンが誤り。Worker 画面 → **Logs** → Begin log stream でエラーを確認。
- 無料枠は 1 日 10 万リクエスト。個人利用では当たらない。

---

## この先（未着手）

- STEP 2: キャンペーン一覧を Flex Message で返す（`campaigns.js` を Worker に読み込む or KV に入れる）
- STEP 3: 「サービス名 今日から」で利用開始日を KV に記録
- STEP 4: Cron Trigger で「終了3日前」プッシュ（ここから push 課金対象。リマインドだけなら無料枠 200/月 に収まる）
- STEP 5: リッチメニュー＋使い方＋プライバシーポリシー（サーバーがユーザーデータを持つので「端末内だけ」の説明は不可に）
- STEP 6: 友だちに配ってオフィシャルアカウントマネージャーの分析を見る
