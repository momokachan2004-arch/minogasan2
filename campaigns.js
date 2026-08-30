/* =============================================================================
   見逃さん  ―  掲載キャンペーンデータ（手動キュレーション）
   -----------------------------------------------------------------------------
   このファイルだけを編集すればキャンペーンを追加・更新できます。
   index.html はこのファイルを読み込んで一覧を表示します。

   ★ 追加・修正・削除の具体的な手順とデプロイ方法は「campaigns編集ガイド.md」を参照。

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

window.CATEGORIES = ["すべて", "動画", "音楽", "雑誌", "フード", "買い物", "くらし", "ゲーム"];

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
    // 2026-08-30 運営が公式で確認：初月100円キャンペーン、受付 7/21〜9/2。
    // 「初月100円」= 安い期間の長さを 30日 とみなし、利用開始日を記録すると
    // 通常料金(976円)になる30日前にリマインド。過去に加入歴のある人は対象外。
    id: 3160, service: "FOD", icon: "📺", category: "動画",
    title: "初月100円キャンペーン", detail: "初回登録・過去に未加入の人が対象。翌月以降は月額976円",
    url: "https://fod.fujitv.co.jp/",
    deadline: "2026-09-02", freeDays: 30, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["tanshin"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
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
  {
    // 2026-08-30 公式で確認：スタンダードは初回1か月無料（学生プランは90日）。締切なし＝通年。
    // 以降 月額980円（楽天カード/モバイル対象プランは780円）。A8.net で提携済み。
    id: 3005, service: "楽天ミュージック", icon: "🎧", category: "音楽",
    title: "スタンダード 初回1か月無料", detail: "学生プランは90日無料。以降 月額980円（楽天カード/モバイル対象は780円）",
    url: "https://music.rakuten.co.jp/",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["tanshin"],
    lastChecked: "2026-08-30", source: "公式",
  },
  {
    // 2026-08-30 公式で確認：30日間無料体験。締切なし＝通年。以降 プレミアム月額1,500円。
    // 現在は2〜3か月無料の増量キャンペーンの記載なし。A8.net で提携済み。
    id: 3110, service: "Audible", icon: "🎧", category: "雑誌",
    title: "30日間の無料体験", detail: "本をプロの朗読で聴けるサービス。以降 プレミアム月額1,500円",
    url: "https://www.audible.co.jp/",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["tanshin", "shukatsu"],
    lastChecked: "2026-08-30", source: "公式",
  },
  {
    // 2026-08-30 公式で確認：聴き放題プラン「14日間無料体験」。初めて聴き放題に登録する人が対象。
    // 締切なし＝通年。以降 年割833円/月・月額1,330円。
    id: 3111, service: "audiobook.jp", icon: "🎧", category: "雑誌",
    title: "聴き放題 14日間の無料体験", detail: "初めて聴き放題プランに登録する人が対象。以降 833円/月（年割）〜",
    url: "https://audiobook.jp/",
    deadline: null, freeDays: 14, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["tanshin", "shukatsu"],
    lastChecked: "2026-08-30", source: "公式",
  },
  {
    // 2026-08-30 公式で確認：全コース「初回1週間無料」。締切なし＝通年。
    // 以降 新日常英会話2,178円/月、TOEIC・ビジネス英語3,278円/月。
    id: 3120, service: "スタディサプリ ENGLISH", icon: "🗣️", category: "くらし",
    title: "初回1週間の無料体験", detail: "新日常英会話・TOEIC対策・ビジネス英語 全コース対象",
    url: "https://eigosapuri.jp/",
    deadline: null, freeDays: 7, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["shukatsu"],
    lastChecked: "2026-08-30", source: "公式",
  },
  {
    // 2026-08-30 公式で確認：初回注文が3回に分けて合計3,000円OFF（1,500+1,000+500）。
    // 締切なし＝通年。冷凍弁当の都度購入なので解約の概念は薄い＝hasCancellation:false。
    id: 3130, service: "nosh（ナッシュ）", icon: "🍱", category: "フード",
    title: "初回 合計3,000円OFF", detail: "初回注文から3回に分けて割引（1,500円＋1,000円＋500円）",
    url: "https://nosh.jp/",
    deadline: null, freeDays: null, hasCancellation: false, addedAt: "2026-08-30",
    tags: ["tanshin", "kenko"],
    lastChecked: "2026-08-30", source: "公式",
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
  {
    id: 3112, service: "BOOK☆WALKER 読み放題", icon: "📓", category: "雑誌",
    title: "初回14日間の無料お試し", detail: "マンガコース／MAXコース。ラノベ・マンガに強い",
    url: "https://bookwalker.jp/select/yomihodai/",
    deadline: null, freeDays: 14, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["tanshin"],
    lastChecked: "2026-08-30", source: "まとめ記事・要公式確認",
  },
  {
    id: 3140, service: "Oisix", icon: "🥗", category: "フード",
    title: "初回限定 おためしセットが大幅割引", detail: "1回だけのお試し。定期加入の縛りなし",
    url: "https://www.oisix.com/",
    deadline: null, freeDays: null, hasCancellation: false, addedAt: "2026-08-30",
    tags: ["tanshin", "kosodate"],
    lastChecked: "2026-08-30", source: "まとめ記事・要公式確認",
  },

  /* ============ 運営確認（運営者が公式ページで内容を確認したもの）============ */
  {
    // 2026-08-30 PR TIMES『ワンコイン』のスナップショットから発見 → 運営が内容確認。
    // チョコクロ＋対象ドリンクのセットが期間中 終日500円（税込）。8/18〜9/4。
    // 一部店舗（関西国際空港店／ユニバーサル・シティウォーク店／茅ケ崎駅前店）は対象外。
    // ※ url は公式サイトのトップ。キャンペーン専用ページが分かれば差し替える。
    id: 3170, service: "サンマルクカフェ", icon: "🥐", category: "フード",
    title: "チョコクロ＋ドリンク ワンコイン（500円）", detail: "対象ドリンクとのセットが期間中 終日500円（税込）。一部店舗は対象外",
    url: "https://www.saint-marc.jp/",
    deadline: "2026-09-04", freeDays: null, hasCancellation: false, addedAt: "2026-08-30",
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3113, service: "Amazon Music Unlimited", icon: "🎵", category: "音楽",
    title: "新規登録で30日間無料", detail: "常時実施。再登録者向けに「3か月 月額300円」キャンペーンをやっていることも",
    url: "https://www.amazon.co.jp/music/unlimited",
    deadline: null, freeDays: 30, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["tanshin"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3121, service: "Duolingo", icon: "🦉", category: "くらし",
    title: "Super Duolingo 14日間の無料体験", detail: "広告なし・回数制限なしで学べる有料版のお試し",
    url: "https://ja.duolingo.com/",
    deadline: null, freeDays: 14, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["shukatsu"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3122, service: "LEAN BODY", icon: "🧘", category: "くらし",
    title: "2週間の無料体験", detail: "自宅向けオンラインフィットネス。12か月プラン登録で月額980円（通常1,980円）になる特典あり",
    url: "https://lean-body.jp/",
    deadline: null, freeDays: 14, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["kenko", "tanshin"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3150, service: "Nintendo Switch Online", icon: "🎮", category: "ゲーム",
    title: "7日間の無料体験", detail: "オンラインプレイやファミコン・スーファミが遊べる。初回のみ",
    url: "https://www.nintendo.com/jp/switch-online/",
    deadline: null, freeDays: 7, hasCancellation: true, addedAt: "2026-08-30",
    tags: ["tanshin"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3131, service: "ヨシケイ", icon: "🥘", category: "フード",
    title: "初めての人向け ミールキットお試し5days", detail: "月〜金の5日間セット。1食あたり約300円〜",
    url: "https://yoshikei-dvlp.co.jp/otameshi/",
    deadline: null, freeDays: null, hasCancellation: false, addedAt: "2026-08-30",
    tags: ["tanshin", "kosodate"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3132, service: "わんまいる", icon: "🍲", category: "フード",
    title: "初回注文 500円オフ", detail: "国産食材の冷凍おかず宅配。定期の初回が割引",
    url: "https://www.wanmile.jp/",
    deadline: null, freeDays: null, hasCancellation: false, addedAt: "2026-08-30",
    tags: ["tanshin", "kenko"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3133, service: "三ツ星ファーム", icon: "🍱", category: "フード",
    title: "初回注文 4,500円オフ ＋ 送料無料", detail: "一流シェフ監修の冷凍宅配弁当。初回限定",
    url: "https://mitsuboshifarm.jp/",
    deadline: null, freeDays: null, hasCancellation: false, addedAt: "2026-08-30",
    tags: ["tanshin", "kenko"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
  {
    id: 3134, service: "コープ（生協の宅配）", icon: "🛒", category: "フード",
    title: "資料請求で人気商品プレゼント／web初回登録で3,000円オフ", detail: "地域の生協により内容が異なる場合あり",
    url: "https://www.co-opdeli.jp/",
    deadline: null, freeDays: null, hasCancellation: false, addedAt: "2026-08-30",
    tags: ["kosodate", "senior"],
    lastChecked: "2026-08-30", source: "運営確認",
  },
];
