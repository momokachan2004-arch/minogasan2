/* =============================================================================
   見逃さん  ―  掲載キャンペーンデータ（手動キュレーション）
   -----------------------------------------------------------------------------
   このファイルだけを編集すればキャンペーンを追加・更新できます。
   index.html はこのファイルを読み込んで一覧を表示します。

   ▼ 1件のキャンペーンの書き方
   {
     id:        3001,              // 他と重複しない数値。既存のものは変更しない
     service:   "サービス名",
     icon:      "🎬",              // 絵文字1つ（アイコン代わり）
     category:  "動画",            // 下の CATEGORIES のいずれか
     title:     "初回1か月無料",   // キャンペーンの見出し（公式の文章は転載せず自分の言葉で）
     detail:    "新規登録が対象",  // 補足
     url:       "https://…",       // 公式の案内ページ（「詳細を見る」で開く。実在URLのみ）
     deadline:  "2026-09-01",      // 公開されている「受付締切日」。
                                   //   ★「初月無料」「初回◯日無料」のように誰でもいつでも
                                   //     始められて締切の告知が無いものは null（一覧で「通年」表示）。
                                   //     null なら「残り◯日」は出さない。
     freeDays:  30,                // 無料期間の長さ（日数）。無料期間が無い還元系は null
     hasCancellation: true,        // 解約の概念があるか。還元系など解約不要なら false
     addedAt:   "2026-08-27",      // このアプリに掲載した日 (YYYY-MM-DD)。新着通知の基準
     tags:      ["tanshin"],       // ★任意。下の SITUATION_TAGS の id を複数指定できる
     lastChecked: "2026-08-29",    // ★任意。公式サイトで条件を確認した日。カードに「✓ 8/29 確認」
     source:      "公式"           // ★任意。未記入だと詳細画面に「未確認（サンプルデータ）」と表示
   }

   ・「残り日数」は deadline と今日の日付から自動計算（固定値は持たない）。deadline: null は「通年」。
   ・利用開始日を記録すると freeDays から「個人の無料期間終了日」を自動計算。
   ・hasCancellation が false のものには利用開始日トラッキングを出さない。
   ・掲載情報は参考。最新・正確な条件は必ず各サービスの公式サイトで確認する前提。

   ▼ このファイルの状態（2026-08-29 時点）
   ・最初に入れていた作り話のサンプル（架空の締切／実在しないキャンペーン／example.com リンク）は
     すべて削除しました。
   ・「確認済み」＝ 公式ページを開いて条件を確認できたもの（lastChecked / source 付き）。
   ・「未確認」＝ 実在サービスだが、この環境から公式ページを開けず条件を確認しきれていないもの。
     詳細画面に「未確認（サンプルデータ）」と出ます。次回の更新で確認 or 差し替えます。
   ============================================================================= */

window.CATEGORIES = ["すべて", "動画", "音楽", "雑誌", "買い物", "くらし"];

// 状況・関心タグ（初期ラインナップ）。id を campaign.tags で参照する。
window.SITUATION_TAGS = [
  { id: "kosodate", label: "子育て中" },
  { id: "kaigo",    label: "介護中" },
  { id: "shukatsu", label: "就職・転職活動中" },
  { id: "ninshin",  label: "妊娠・出産予定" },
  { id: "tanshin",  label: "単身赴任・一人暮らし" },
  { id: "senior",   label: "シニア世代の暮らし" },
  { id: "kenko",    label: "健康・持病管理" },
];

window.CAMPAIGNS = [
  /* ============ 確認済み（2026-08-29 公式サイトで条件を確認）============ */
  {
    // Premium Standard は「これまでPremium未利用」の人が対象。3か月無料、その後は月額1,080円。
    // キャンペーン終了日 2026-09-23。
    id: 3006, service: "Spotify", icon: "🎶", category: "音楽",
    title: "Premium Standard 3か月無料", detail: "これまでにPremiumを利用したことがない人が対象。終了後は月額1,080円",
    url: "https://www.spotify.com/jp/premium/",
    deadline: "2026-09-23", freeDays: 90, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "公式",
  },
  {
    // 「31日間無料トライアル」。終了日の告知なし＝通年（deadline: null）。トライアル中にポイント付与。
    id: 3014, service: "U-NEXT", icon: "🎞️", category: "動画",
    title: "31日間の無料トライアル", detail: "初回登録が対象。トライアル中にポイント付与あり",
    url: "https://video.unext.jp/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "公式",
  },
  {
    // 「はじめの1カ月無料」。受付締切の記載なし＝通年。有料会員・法人は対象外。以降 月額4,277円。
    id: 3041, service: "日経電子版", icon: "📰", category: "雑誌",
    title: "はじめの1カ月無料", detail: "日経電子版に初めて登録する人が対象。有料会員・法人は対象外",
    url: "https://www.nikkei.com/promotion/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["shukatsu", "senior"],
    lastChecked: "2026-08-29", source: "公式",
  },
  {
    // 「31日間無料」。初回限定。締切の記載なし＝通年。31日以内の解約で料金なし。以降 月額580円。
    id: 3009, service: "dマガジン", icon: "🗞️", category: "雑誌",
    title: "31日間無料", detail: "初回限定。31日以内の解約で料金なし。以降 月額580円",
    url: "https://dmagazine.docomo.ne.jp/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["senior", "shukatsu"],
    lastChecked: "2026-08-29", source: "公式",
  },
  {
    // 「31日間無料」。楽天会員かつ初回登録が対象。締切の記載なし＝通年。以降 月額597円（アプリ申込は710円）。
    id: 3043, service: "楽天マガジン", icon: "📗", category: "雑誌",
    title: "31日間無料", detail: "楽天会員で初回登録の人が対象。以降 月額597円（アプリ申込は710円）",
    url: "https://magazine.rakuten.co.jp/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["senior"],
    lastChecked: "2026-08-29", source: "公式",
  },
  {
    // 「会員登録後7日間はプレミアムサービスを無料で体験」。締切の記載なし＝通年。
    id: 3080, service: "あすけん", icon: "🥦", category: "くらし",
    title: "プレミアム 7日間の無料体験", detail: "会員登録後7日間、食事記録のプレミアム機能を無料で試せる",
    url: "https://www.asken.jp/",
    deadline: null, freeDays: 7, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["kenko"],
    lastChecked: "2026-08-29", source: "公式",
  },

  /* ============ 未確認（実在サービスだが、この環境から公式ページを開けず未確認）============ */
  /* 詳細画面に「未確認」と表示されます。次回更新で公式確認 or 差し替え。 */
  {
    id: 3012, service: "Amazon プライム", icon: "📦", category: "買い物",
    title: "30日間の無料体験", detail: "初めて利用する人が対象（Prime Student は6か月）",
    url: "https://www.amazon.co.jp/amazonprime",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin", "kosodate"],
  },
  {
    id: 3008, service: "Kindle Unlimited", icon: "📚", category: "雑誌",
    title: "30日間の無料体験", detail: "対象タイトルが読み放題。増量キャンペーン時は2〜3か月無料のことも",
    url: "https://www.amazon.co.jp/kindle-dbs/hz/subscribe/ku",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["shukatsu", "senior"],
  },

  /* ============ まとめ記事で確認（複数の比較サイトで一致・要公式確認）============ */
  /* カードに「8/29 調査」、詳細に「まとめ記事・要公式確認」と表示。無料期間の長さは */
  /* 各社ずっと同じ傾向だが、対象条件や増量キャンペーンは公式で要確認。 */
  {
    id: 3101, service: "Lemino", icon: "📱", category: "動画",
    title: "初回31日間の無料トライアル", detail: "NTTドコモの動画配信。dアカウントで登録",
    url: "https://lemino.docomo.ne.jp/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3102, service: "dアニメストア", icon: "🎨", category: "動画",
    title: "初回31日間の無料お試し", detail: "アニメ専門。月額550円",
    url: "https://animestore.docomo.ne.jp/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3103, service: "DMM TV", icon: "🎬", category: "動画",
    title: "初回14日間の無料お試し", detail: "アニメ・作品が対象。登録特典ポイントあり",
    url: "https://tv.dmm.com/vod/",
    deadline: null, freeDays: 14, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3104, service: "TSUTAYA DISCAS", icon: "📀", category: "動画",
    title: "初回30日間の無料お試し", detail: "DVD/CD の宅配レンタル。動画配信も一部含む",
    url: "https://www.discas.net/",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3105, service: "Apple Music", icon: "🍎", category: "音楽",
    title: "1か月の無料体験", detail: "新規登録が対象（対象オーディオ機器の購入で長期になる場合あり）",
    url: "https://music.apple.com/jp/",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3106, service: "YouTube Premium", icon: "▶️", category: "音楽",
    title: "1か月の無料トライアル", detail: "過去に利用したことがない人が対象。広告なし再生＋YouTube Music",
    url: "https://www.youtube.com/premium",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3107, service: "LINE MUSIC", icon: "🎤", category: "音楽",
    title: "無料トライアル（1〜3か月）", detail: "時期により無料期間が変動。要公式確認",
    url: "https://music.line.me/",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3108, service: "ブック放題", icon: "📕", category: "雑誌",
    title: "初回1か月の無料お試し", detail: "雑誌・マンガが読み放題。月額550円",
    url: "https://www.bookhodai.jp/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["senior"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
  {
    id: 3109, service: "コミックシーモア 読み放題", icon: "📘", category: "雑誌",
    title: "初回7日間の無料お試し", detail: "マンガ読み放題。フル/ライトの2プラン",
    url: "https://www.cmoa.jp/lp/yomihoudai/",
    deadline: null, freeDays: 7, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["shukatsu"],
    lastChecked: "2026-08-29", source: "まとめ記事・要公式確認",
  },
];
