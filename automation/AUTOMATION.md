# 自動巡回（GitHub Actions・Lite版）

`sources.json` の各ページを定期的に取得し、**前回と変わったページ**を Pull Request で知らせる仕組み。
中身の判断（`campaigns.js` をどう直すか）は人がやる。**APIキー不要・無料**。

## 構成

| ファイル | 役割 |
|---|---|
| `.github/workflows/campaign-check.yml` | 毎月1日・15日 09:00(JST) に自動実行。手動実行も可 |
| `automation/check_sources.py` | ページ取得 → 前回との差分検出 → `LAST_REPORT.md` 生成（Python標準ライブラリのみ） |
| `automation/propose_edits.py` | **Full版・任意**。`LAST_REPORT.md` を Claude に読ませ `campaigns.js` の修正案を `LAST_REPORT.md` に追記。`ANTHROPIC_API_KEY` が無ければ何もしない |
| `automation/sources.json` | 巡回対象。`sources`＝公式ページ、`aggregators`＝まとめ記事、`discovery`＝新サービスの発表が集まる場所（PR TIMES のキーワード別一覧など） |
| `automation/snapshots/` | 各ページの前回内容。スクリプトが自動生成・更新。手で触らない |
| `automation/LAST_REPORT.md` | 最新の巡回結果 |

## 初回セットアップ（1回だけ）

1. このリポジトリを push する（GitHub Desktop）
2. GitHub のリポジトリ → **Settings → Actions → General** を開く
   - **Workflow permissions** で「Read and write permissions」を選択
   - **「Allow GitHub Actions to create and approve pull requests」にチェック**（これが無いとPRを作れない）
   - Save
3. **Actions タブ** → 左の「campaign-check」→ **「Run workflow」** で手動実行してテスト
4. 初回は全ページのスナップショットを作る PR が1本出る → 中身を確認して **Merge**

以降は毎月1日・15日に自動で走り、**変化があったときだけ** PR が出ます。

## PR が来たら

`LAST_REPORT.md`（PR本文にも入る）を見る：

- **🆕 新サービス・新キャンペーンの候補** … `discovery` で新しく現れた見出し。見逃さんに合いそうなもの
  （無料トライアル／初回割引があって、締切があって、全国の一般サービス）を `CANDIDATES.md` に転記 →
  公式で確認 → `campaigns.js` へ。合わないもの（BtoB・情報商材・地域限定など）は無視。
  ※ ノイズ語は `check_sources.py` の `NOISE` で除外している。効きすぎ／足りなければ語を増減する。
- **⏰ 締切を過ぎているエントリ** … `campaigns.js` の `deadline` が過去。受付終了なら削除、続いているなら日付更新
- **🔺 変化あり** … そのページを公式で開いて条件を再確認 → 必要なら `campaigns.js` を修正
- **❌ ページが消えた/移動** … キャンペーン終了の可能性。該当エントリを削除 or `check-only` に
- **🕰️ 確認から90日以上** … `lastChecked` が古いエントリ。そろそろ公式で再確認（この項目だけでは PR は出ない）
- **⚠️ 取得できず** … 一時的な可能性。次回も続くようなら要確認（この項目だけでは PR は出ない）

アプリ側でも、`lastChecked` が120日以上前のカードには「⚠ 確認から◯日」と黄色で表示される。

> 「発見」の見出しには PR TIMES の性質上ノイズ（BtoB SaaS の課金基盤、セミナー告知など）が混じります。
> 人が「これは見逃さんに載せる価値がある一般消費者向けか？」で選別する前提です。

確認が済んだら PR を Merge（スナップショットが更新され、次回はそこからの差分になる）。
`campaigns.js` の修正は、同じ PR に足しても、別途手で直しても、どちらでもよい。

## 注意

- JavaScript で描画されるページ（本文が空で返る）は差分が出にくい。`aggregators` のまとめ記事は
  サーバー側で本文を返すので効きやすい。巡回に効くページを見つけたら `aggregators` に足す。
- GitHub Actions は、リポジトリが60日間まったく動かないとスケジュールを自動停止する。
  たまに手動実行するか、何かコミットしておけば維持される。
- 差分には広告ローテーション等のノイズが混じることがある。人が見て判断する前提。

## Full版（AIが修正案まで書く）

`propose_edits.py` とワークフローのステップは**もう入っている**。API キーを登録するだけで有効になる。
登録しなければ Lite版のまま（`propose_edits.py` は何もせず終了）。

### セットアップ

1. **Anthropic のアカウントを作る** … https://console.anthropic.com/
   - 「Billing」で支払い方法を登録し、クレジットを購入（最低 $5 程度）。使わなければ減らない。
2. **API キーを発行** … コンソールの「API Keys」→「Create Key」→ 表示された `sk-ant-...` をコピー
   （この文字列は二度と表示されないので、その場で次へ）
3. **リポジトリの Secret に入れる** …
   GitHub のリポジトリ → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Secret: 手順2でコピーした `sk-ant-...`
   - Add secret
4. 次回の巡回から、PR の `LAST_REPORT.md` の末尾に「🤖 修正案（AI・要確認）」が付く。

### コスト

軽量モデル（Haiku）を1回の巡回につき1回だけ呼ぶ。1回あたり数円、隔週なら**月10〜20円**程度。
変化が無い回は API を呼ばない（課金ゼロ）。

### 注意

- AI の修正案は**下書き**。数値・日付・対象者は**必ず公式で裏を取ってから** `campaigns.js` に反映する。
  「損害の免責」「情報の正確性」は AI 経由でも運営の責任。
- キーが漏れると不正利用され課金される。Secret 以外の場所（コード・コミット）に書かない。
  漏れたと思ったらコンソールで即 Revoke。
