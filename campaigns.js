/* =============================================================================
   見逃さん  ―  掲載キャンペーンデータ（手動キュレーション）
   -----------------------------------------------------------------------------
   このファイルだけを編集すればキャンペーンを追加・更新できます。
   index.html はこのファイルを読み込んで一覧を表示します。

   ▼ 1件のキャンペーンの書き方
   {
     id:        3001,              // 他と重複しない数値。既存のものは変更しない
     service:   "Netflix",         // サービス名
     icon:      "🎬",              // 絵文字1つ（アイコン代わり）
     category:  "動画",            // 下の CATEGORIES のいずれか
     title:     "初回1か月無料",   // キャンペーンの見出し（自分の言葉で要約する）
     detail:    "新規登録が対象",  // 補足（公式サイトの文章を転載しない）
     url:       "https://…",       // 公式の案内ページ（「詳細を見る」で開く）
     deadline:  "2026-09-01",      // 公開されている受付締切日 (YYYY-MM-DD)。
                                   //   終了日の告知がない“通年”トライアルは null（一覧では「通年」表示）
     freeDays:  30,                // 無料期間の長さ（日数）。無料期間が無いものは null
     hasCancellation: true,        // 解約の概念があるか。還元系など解約不要なら false
     addedAt:   "2026-08-27",      // このアプリに掲載した日 (YYYY-MM-DD)。新着通知の基準
     tags:      ["tanshin"],       // ★任意。下の SITUATION_TAGS の id を複数指定できる。
                                   //   関心タグを登録したユーザーの「あなた向け」に出る。
     lastChecked: "2026-08-29",    // ★任意。公式サイトで条件を確認した日。カードに「✓ 8/29 確認」と表示
     source:      "公式"           // ★任意。"公式" / "プレスリリース" など。未記入＝未確認扱い
   }

   ・「残り日数」は deadline と今日の日付から自動計算されます（固定値は持ちません）。
   ・利用開始日を記録すると freeDays から「個人の無料期間終了日」を自動計算します。
   ・hasCancellation が false のキャンペーンには利用開始日トラッキングを表示しません。
   ・tags を付けたキャンペーンは、その状況タグを選んだ人のホーム「あなた向け」に表示され、
     新着追加時の通知対象にもなります。tags 未指定でも一覧には通常どおり出ます。
   ・lastChecked が無い項目は「未確認（サンプルデータ）」と詳細画面に表示されます。
   ・掲載情報は参考です。最新・正確な条件は必ず各サービスの公式サイトで確認する前提です。
   ・★印の付いた lastChecked / source 以外で、下記の 3020〜3082 は動作確認用のサンプル（未確認）です。
     実運用時は自分で確認した情報に差し替えてください。
   ============================================================================= */

window.CATEGORIES = ["すべて", "動画", "音楽", "雑誌", "フード", "買い物", "くらし"];

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
  /* ---- 全国共通の一般キャンペーン ---- */
  // 2026-08-29 削除：Netflix（無料トライアルは2019年以降 実施なし）、
  //            DAZN（無料トライアルは2022年に終了、現在は有料の割引のみ）。
  //            いずれも「見逃す」対象が無いためリストから除外。
  {
    id: 3002, service: "FOD", icon: "📺", category: "動画",
    title: "2週間無料 ＋ 割引クーポン", detail: "初回登録・過去に未加入の人が対象",
    url: "https://fod.fujitv.co.jp/",
    deadline: "2026-09-03", freeDays: 14, hasCancellation: true, addedAt: "2026-08-20",
    tags: ["tanshin"],
  },
  {
    id: 3004, service: "Amazon Music Unlimited", icon: "🎵", category: "音楽",
    title: "3か月100円キャンペーン", detail: "プライム会員はさらに条件が良くなる場合あり",
    url: "https://www.amazon.co.jp/music/unlimited",
    deadline: "2026-09-10", freeDays: 90, hasCancellation: true, addedAt: "2026-08-15",
    tags: ["tanshin"],
  },
  {
    id: 3005, service: "楽天ミュージック", icon: "🎧", category: "音楽",
    title: "年額プランのポイント還元", detail: "コード入力で数千ポイント還元",
    url: "https://music.rakuten.co.jp/",
    deadline: "2026-09-18", freeDays: 30, hasCancellation: true, addedAt: "2026-08-10",
  },
  {
    // 2026-08-29 公式サイトで確認：Premium Standard は「Premium 未利用者」が対象、3か月無料、
    // その後は月額1,080円。キャンペーン終了日 2026-09-23。
    id: 3006, service: "Spotify", icon: "🎶", category: "音楽",
    title: "Premium Standard 3か月無料", detail: "これまでにPremiumを利用したことがない人が対象",
    url: "https://www.spotify.com/jp/premium/",
    deadline: "2026-09-23", freeDays: 90, hasCancellation: true, addedAt: "2026-08-14",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "公式",
  },
  {
    // 2026-08-29 公式サイト（video.unext.jp）で確認：「31日間無料トライアル」。
    // 終了日の告知は無し＝通年扱い（deadline: null）。付与ポイント額は要都度確認。
    id: 3014, service: "U-NEXT", icon: "🎞️", category: "動画",
    title: "31日間の無料トライアル", detail: "初回登録が対象。トライアル中にポイント付与あり",
    url: "https://video.unext.jp/",
    deadline: null, freeDays: 31, hasCancellation: true, addedAt: "2026-08-29",
    tags: ["tanshin"],
    lastChecked: "2026-08-29", source: "公式",
  },
  {
    id: 3007, service: "タブホ", icon: "📖", category: "雑誌",
    title: "初月無料の雑誌読み放題", detail: "1,000誌以上が対象",
    url: "https://tabuho.jp/",
    deadline: "2026-09-06", freeDays: 31, hasCancellation: true, addedAt: "2026-08-22",
    tags: ["senior"],
  },
  {
    id: 3008, service: "Kindle Unlimited", icon: "📚", category: "雑誌",
    title: "30日間の無料体験", detail: "対象タイトルが読み放題",
    url: "https://www.amazon.co.jp/kindle-dbs/hz/subscribe/ku",
    deadline: "2026-08-31", freeDays: 30, hasCancellation: true, addedAt: "2026-08-25",
    tags: ["shukatsu", "senior"],
  },
  {
    id: 3009, service: "dマガジン", icon: "🗞️", category: "雑誌",
    title: "初回31日間無料", detail: "初めて申し込む人が対象",
    url: "https://magazine.dmkt-sp.jp/",
    deadline: "2026-09-08", freeDays: 31, hasCancellation: true, addedAt: "2026-08-19",
    tags: ["senior"],
  },
  {
    id: 3010, service: "Uber One", icon: "🍔", category: "フード",
    title: "1か月の無料トライアル", detail: "配達料無料などの特典つきメンバーシップ",
    url: "https://www.ubereats.com/jp",
    deadline: "2026-09-12", freeDays: 30, hasCancellation: true, addedAt: "2026-08-18",
    tags: ["tanshin"],
  },
  {
    id: 3011, service: "Wolt", icon: "🥡", category: "フード",
    title: "配達料無料パス 14日間", detail: "新規のパス登録が対象",
    url: "https://wolt.com/ja/jpn",
    deadline: "2026-09-05", freeDays: 14, hasCancellation: true, addedAt: "2026-08-21",
    tags: ["tanshin"],
  },
  {
    id: 3012, service: "Amazon プライム", icon: "📦", category: "買い物",
    title: "30日間の無料体験", detail: "初めて利用する人が対象",
    url: "https://www.amazon.co.jp/amazonprime",
    deadline: "2026-09-20", freeDays: 30, hasCancellation: true, addedAt: "2026-08-12",
    tags: ["kosodate", "tanshin"],
  },
  {
    id: 3013, service: "楽天ペイ", icon: "💳", category: "買い物",
    title: "最大20%還元キャンペーン", detail: "エントリー＋対象店舗での支払いが条件",
    url: "https://pay.rakuten.co.jp/",
    deadline: "2026-09-14", freeDays: null, hasCancellation: false, addedAt: "2026-08-16",
  },

  /* ---- 子育て中 ---- */
  {
    id: 3020, service: "こどもちゃれんじ", icon: "🧸", category: "買い物",
    title: "初回2週間の無料体験", detail: "年齢別の教材セットを試せる",
    url: "https://www2.shimajiro.co.jp/",
    deadline: "2026-09-16", freeDays: 14, hasCancellation: true, addedAt: "2026-08-26",
    tags: ["kosodate", "ninshin"],
  },
  {
    id: 3021, service: "Amazon ファミリー", icon: "👶", category: "買い物",
    title: "おむつ・おしりふき 定期おトク便が割引", detail: "登録は無料。対象商品がまとめ買いでお得に",
    url: "https://www.amazon.co.jp/family",
    deadline: "2026-09-25", freeDays: null, hasCancellation: false, addedAt: "2026-08-24",
    tags: ["kosodate", "ninshin"],
  },
  {
    id: 3022, service: "楽天ママ割", icon: "🍼", category: "買い物",
    title: "エントリーで対象日ポイントアップ", detail: "メンバー登録＋対象日の買い物が条件",
    url: "https://event.rakuten.co.jp/family/",
    deadline: "2026-09-09", freeDays: null, hasCancellation: false, addedAt: "2026-08-27",
    tags: ["kosodate", "ninshin"],
  },

  /* ---- 介護中 ---- */
  {
    id: 3030, service: "みまもり見守りカメラ", icon: "📹", category: "くらし",
    title: "初月無料の見守りサービス", detail: "離れて暮らす家族の様子を確認できる",
    url: "https://example.com/mimamori",
    deadline: "2026-09-11", freeDays: 30, hasCancellation: true, addedAt: "2026-08-23",
    tags: ["kaigo", "senior"],
  },
  {
    id: 3031, service: "介護用品の宅配", icon: "🚚", category: "くらし",
    title: "初回注文 送料無料 ＋ 10%オフ", detail: "紙おむつ・介護食などが対象",
    url: "https://example.com/kaigo-haitatsu",
    deadline: "2026-09-07", freeDays: null, hasCancellation: false, addedAt: "2026-08-25",
    tags: ["kaigo"],
  },

  /* ---- 就職・転職活動中 ---- */
  {
    id: 3040, service: "Udemy", icon: "🎓", category: "買い物",
    title: "対象講座 大幅割引セール", detail: "ビジネス・IT・資格系の講座が対象",
    url: "https://www.udemy.com/ja/",
    deadline: "2026-09-04", freeDays: null, hasCancellation: false, addedAt: "2026-08-28",
    tags: ["shukatsu"],
  },
  {
    id: 3041, service: "日経電子版", icon: "📰", category: "雑誌",
    title: "初月無料", detail: "登録から1か月は購読料がかからない",
    url: "https://www.nikkei.com/promotion/",
    deadline: "2026-09-13", freeDays: 31, hasCancellation: true, addedAt: "2026-08-20",
    tags: ["shukatsu", "senior"],
  },
  {
    id: 3042, service: "ビジネス書要約サービス", icon: "💡", category: "雑誌",
    title: "7日間の無料トライアル", detail: "1冊10分で読める要約が読み放題",
    url: "https://example.com/summary",
    deadline: "2026-09-06", freeDays: 7, hasCancellation: true, addedAt: "2026-08-27",
    tags: ["shukatsu"],
  },

  /* ---- 妊娠・出産予定 ---- */
  {
    id: 3050, service: "育児準備アプリ", icon: "🤰", category: "くらし",
    title: "プレミアム機能 1か月無料", detail: "週数に合わせた記事・体調記録",
    url: "https://example.com/ninshin-app",
    deadline: "2026-09-17", freeDays: 30, hasCancellation: true, addedAt: "2026-08-26",
    tags: ["ninshin", "kosodate"],
  },

  /* ---- 単身赴任・一人暮らし ---- */
  {
    id: 3060, service: "Oisix", icon: "🥗", category: "フード",
    title: "初回限定 おためしセットが大幅割引", detail: "1回だけのお試し。定期縛りなし",
    url: "https://www.oisix.com/",
    deadline: "2026-09-08", freeDays: null, hasCancellation: false, addedAt: "2026-08-24",
    tags: ["tanshin", "kosodate"],
  },
  {
    id: 3061, service: "家事代行サービス", icon: "🧹", category: "くらし",
    title: "初回 お試し利用が割引", detail: "掃除・料理などを依頼できる",
    url: "https://example.com/kaji",
    deadline: "2026-09-10", freeDays: null, hasCancellation: false, addedAt: "2026-08-22",
    tags: ["tanshin"],
  },
  {
    id: 3062, service: "nosh（ナッシュ）", icon: "🍱", category: "フード",
    title: "初回購入 割引クーポン", detail: "冷凍のヘルシー弁当が自宅に届く",
    url: "https://nosh.jp/",
    deadline: "2026-09-19", freeDays: null, hasCancellation: false, addedAt: "2026-08-18",
    tags: ["tanshin", "kenko"],
  },

  /* ---- シニア世代の暮らし ---- */
  {
    id: 3070, service: "大きな文字の電子書籍", icon: "🔎", category: "雑誌",
    title: "初月無料", detail: "文字サイズを大きくして読める読み放題",
    url: "https://example.com/large-text-books",
    deadline: "2026-09-21", freeDays: 30, hasCancellation: true, addedAt: "2026-08-17",
    tags: ["senior"],
  },
  {
    id: 3071, service: "健康サポートアプリ", icon: "🩺", category: "くらし",
    title: "プレミアム 3か月無料", detail: "血圧・歩数・服薬の記録とリマインド",
    url: "https://example.com/kenko-support",
    deadline: "2026-09-15", freeDays: 90, hasCancellation: true, addedAt: "2026-08-19",
    tags: ["senior", "kenko"],
  },

  /* ---- 健康・持病管理 ---- */
  {
    id: 3080, service: "あすけん", icon: "🥦", category: "くらし",
    title: "プレミアム 2週間の無料体験", detail: "食事の写真から栄養バランスを判定",
    url: "https://www.asken.jp/",
    deadline: "2026-09-09", freeDays: 14, hasCancellation: true, addedAt: "2026-08-25",
    tags: ["kenko"],
  },
  {
    id: 3081, service: "オンライン診療", icon: "💊", category: "くらし",
    title: "初回 予約手数料が無料", detail: "スマホで診察・薬の配送を依頼できる",
    url: "https://example.com/online-shinryo",
    deadline: "2026-09-12", freeDays: null, hasCancellation: false, addedAt: "2026-08-21",
    tags: ["kenko", "kaigo"],
  },
  {
    id: 3082, service: "フィットネス動画", icon: "🧘", category: "動画",
    title: "2週間の無料体験", detail: "自宅でできる運動プログラムが見放題",
    url: "https://example.com/fitness-douga",
    deadline: "2026-09-05", freeDays: 14, hasCancellation: true, addedAt: "2026-08-27",
    tags: ["kenko", "tanshin"],
  },
];
