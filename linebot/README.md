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
3. **Add binding** → 左の一覧で **KV namespace** を選ぶ → 右下の **Add Binding** を押す（ここは種類を選ぶだけの1段階目。入力欄はまだ出ない）
4. 次の画面で入力欄が出る:
   - Variable name: **`USAGE`**（コードがこの名前で参照する）
   - KV namespace: `minogasan-usage` を選択
5. **Add binding** / **Deploy** で確定

※ Edge などの自動翻訳を有効にしているとこのダイアログが壊れる（入力欄が出ない）ことがある。おかしいときは翻訳をオフにして再読み込み。

### 2. コードを貼り直す

エディタの中身を全消し → [`worker.js`](worker.js) を貼る → **Deploy**。

### KV に持つデータ

```
key:   u:<LINEのuserId>
value: { started: { "<campaignId>": { d: "YYYY-MM-DD", s: "サービス名", f: freeDays, n: ["d3"] }, ... }, updatedAt: "ISO" }
```

- 登録操作をするまで KV には何も書かない。
- `s`（サービス名）と `f`（freeDays）を控えるので、後で campaigns.js から消えても「利用中」もリマインドも動く。
- `n` は送信済みリマインドのマイルストーン（`d3` / `d0`）。登録し直すと空に戻る（＝リマインドが再度有効化）。
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

## STEP 4: 無料期間の終了リマインドをプッシュ（実装済み・要デプロイ＋Cron設定）

`worker.js` を STEP 4 版に差し替えた。`scheduled()` ハンドラを追加。

### 1. Cron Trigger を追加

1. **Workers & Pages** → `minogasan-line-bot` → **Settings** → **Trigger Events**（または Triggers）→ **Cron Triggers** → **Add Cron Trigger**
2. スケジュール: `0 0 * * *`（毎日 00:00 UTC = **09:00 JST**）
3. 保存

### 2. コードを貼り直す

エディタ全消し → [`worker.js`](worker.js) を貼る → **Deploy**。

### 動作

- 1日1回、`env.USAGE` の `u:` プレフィックス全キーを走査。
- 各登録について `開始日 + freeDays` の終了日を計算し、**残り3日** と **当日** にプッシュ。
- 1ユーザー分の複数件は**まとめて1通**（push 課金を節約）。
- 送信できたら `started[cid].n` に `d3` / `d0` を記録して二重送信を防止。送信失敗時は記録せず次回再試行。
- 1回の実行で最大 **150通**（`MAX_PUSH_PER_RUN`）。無料枠は 200通/月。
- `freeDays` が無い還元系は対象外。マイルストーンは `MILESTONES = [3, 0]`（1件あたり最大2通）。

### テスト方法

Cron の「今すぐ実行」はダッシュボードに無いので、いずれか:

- **一時的にスケジュールを `*/10 * * * *` にして** Worker → **Logs**（Begin log stream）で `reminders done: ...` を確認 → 確認後 `0 0 * * *` に戻す。
- テスト用の登録を作る: あるサービスを「開始日 = （その freeDays − 3）日前」で登録すると次の実行で「あと3日」通知が飛ぶ。例: freeDays 30 のサービスを「27日前」で登録。

`push failed 400 ...` が Logs に出る場合はアクセストークン、`... 403` は友だち解除済みユーザー（無視してよい）。

---

## STEP 5: プライバシーポリシー ＋ リッチメニュー（実装済み・要デプロイ＋メニュー設定）

`worker.js` を STEP 5 版に差し替えた。

### コード側で増えたもの（貼り直して Deploy するだけ）

- **`GET /privacy`** … プライバシーポリシーの HTML を返す（`PRIVACY_HTML` 定数。文面はここを直接編集）。
  URL: `https://minogasan-line-bot.momokachan2004.workers.dev/privacy`
- **text「プライバシー」「個人情報」** … 上記 URL を返信。
- **unfollow イベント**（ブロック／友だち削除）… その userId の KV レコードを自動削除。
- help に「プライバシー」の行を追加。

### リッチメニュー（LINE 側の GUI で設定。API 不要）

画像は [`richmenu-maker.html`](richmenu-maker.html) を自分のブラウザで開き「ダウンロード」→ `richmenu.png`。

1. **LINE Official Account Manager** → 対象アカウント → **リッチメニュー** → **作成**
2. 表示期間・タイトル（管理用）を入れる → デザインで **テンプレート「大」の6分割（2×3）** を選ぶ
3. `richmenu.png` をアップロード
4. 各エリアにアクションを設定:

   | 位置 | アクション | 値 |
   |---|---|---|
   | 左上 キャンペーン一覧 | テキスト | `キャンペーン` |
   | 中上 締切が近い | テキスト | `急ぎ` |
   | 右上 利用中 | テキスト | `利用中` |
   | 左下 使い方 | テキスト | `ヘルプ` |
   | 中下 データ削除 | テキスト | `データ削除` |
   | 右下 プライバシー | リンク | `https://minogasan-line-bot.momokachan2004.workers.dev/privacy` |

5. 保存 → 「表示する」に。メニューバーのテキストは「メニュー」でよい。

※「テキスト」アクションはユーザーがその言葉を送ったのと同じ扱いになり、bot 側の既存コマンドで処理される。

### 確認

- ブラウザで `/privacy` を開いてポリシーが表示される。
- トークで「プライバシー」→ URL が返る。
- リッチメニューの各ボタンが対応する応答を返す。

---

## この先（未着手）

- STEP 6: 友だちに配ってオフィシャルアカウントマネージャーの分析を見る
