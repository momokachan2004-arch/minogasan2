/* 見逃さん LINE bot — STEP 5: プライバシーポリシー配信 ＋ リッチメニュー対応
 *
 * Cloudflare Workers にダッシュボードから貼り付けてデプロイする。
 *
 * ■ STEP 5 で増えたもの
 *   GET /privacy … プライバシーポリシーの HTML を返す（PRIVACY_HTML）
 *   text「プライバシー」 … その URL を返す
 *   unfollow イベント（ブロック／友だち削除）… 該当ユーザーの KV レコードを自動削除
 *   リッチメニュー自体は LINE Official Account Manager の GUI で作成する（本コードは変更不要）。
 *   各ボタンに「テキスト」アクションで キャンペーン / 急ぎ / 利用中 / ヘルプ / データ削除 を、
 *   プライバシーのボタンだけ「リンク」アクションで /privacy を割り当てる。画像は richmenu-maker.html。
 *
 * ■ Secret（Settings → Variables and Secrets、種類 Secret）
 *   CHANNEL_ACCESS_TOKEN … LINE Developers Console → Messaging API → チャネルアクセストークン（長期）
 *   CHANNEL_SECRET        … LINE Developers Console → Basic settings → チャネルシークレット
 *
 * ■ KV バインド（STEP 3 で追加。Bindings タブ → Add binding → KV namespace）
 *   変数名: USAGE  （ネームスペースは新規作成でよい。例: minogasan-usage）
 *   未バインドでも STEP 2（一覧）は動く。登録系コマンドだけ「準備中」を返す。
 *
 * ■ Cron Trigger（STEP 4 で追加。Settings → Trigger Events → Cron Triggers）
 *   "0 0 * * *"（毎日 00:00 UTC = 09:00 JST）を1本。
 *   scheduled() が全ユーザーの KV を走査し、無料期間の「終了3日前」と「当日」に
 *   push API で通知（1ユーザー分をまとめて1通）。送信済みは started[cid].n に記録して二重送信を防ぐ。
 *   push は課金対象（無料 200通/月）。1回の実行で最大 150通に制限。
 *
 * ■ データソース
 *   GitHub Pages の campaigns.js を実行時 fetch して解析（アプリと単一ソース）。
 *   Workers は eval / new Function 不可のため、配列リテラルを自前パーサで読む。
 *
 * ■ KV に持つデータ
 *   key:   "u:" + LINE userId
 *   value: { started: { "<campaignId>": { d: "YYYY-MM-DD", s: "サービス名" }, ... }, updatedAt: "ISO" }
 *   ・登録操作をするまで何も書かない。「データ削除」で key ごと消す。
 */

const CAMPAIGNS_URL = "https://momokachan2004-arch.github.io/minogasan2/campaigns.js";
const BOT_URL = "https://minogasan-line-bot.momokachan2004.workers.dev";
const PRIVACY_URL = BOT_URL + "/privacy";
const CATS = ["動画", "音楽", "雑誌", "フード", "買い物", "くらし", "ゲーム"];
const CACHE_TTL_MS = 10 * 60 * 1000;

const HELP = ["ヘルプ", "へるぷ", "help", "使い方", "つかいかた", "?", "？", "メニュー", "menu"];
const LIST = ["キャンペーン", "きゃんぺーん", "一覧", "いちらん", "りすと", "list", "全部", "ぜんぶ", "お得", "おとく"];
const URGENT = ["急ぎ", "いそぎ", "締切", "しめきり", "終了間近", "そろそろ"];
const LISTUSAGE = ["利用中", "りようちゅう", "マイページ", "まいぺーじ", "登録済み"];
const WIPE = ["データ削除", "でーたさくじょ", "全部削除", "ぜんぶさくじょ", "リセット", "りせっと"];
const PRIVACY = ["プライバシー", "ぷらいばしー", "privacy", "プライバシーポリシー", "個人情報"];

export default {
  // Cron Trigger（1日1回）。無料期間の「終了3日前」と「当日」にプッシュ通知。
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },

  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      const path = new URL(request.url).pathname;
      if (path === "/privacy") {
        return new Response(PRIVACY_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("minogasan LINE bot: OK (STEP 5)", { status: 200 });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const bodyText = await request.text();

    // --- 署名検証（なりすまし防止） ---
    const signature = request.headers.get("x-line-signature") || "";
    const ok = await verifySignature(bodyText, signature, env.CHANNEL_SECRET);
    if (!ok) {
      return new Response("Bad signature", { status: 401 });
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }

    // LINE には即 200 を返し、返信処理は裏で走らせる
    ctx.waitUntil(handleEvents(payload.events || [], env));
    return new Response("OK", { status: 200 });
  },
};

// ============================================================================
// イベント処理
// ============================================================================

async function handleEvents(events, env) {
  for (const event of events) {
    try {
      const userId = event.source && event.source.userId;
      if (event.type === "follow") {
        await reply(event.replyToken, [textMsg("友だち追加ありがとうございます！\n\n" + helpText())], env);
      } else if (event.type === "unfollow") {
        // ブロック／友だち解除。返信はできない。記録を削除する。
        if (env.USAGE && userId) {
          try {
            await env.USAGE.delete("u:" + userId);
          } catch (e) {
            console.log("unfollow delete failed", e && e.message);
          }
        }
      } else if (event.type === "postback") {
        await reply(event.replyToken, await handlePostback(event, env), env);
      } else if (event.type === "message" && event.message && event.message.type === "text") {
        await reply(event.replyToken, await handleText(event.message.text, env, userId), env);
      }
    } catch (e) {
      console.log("handleEvent error", e && e.message);
    }
  }
}

async function handleText(raw, env, userId) {
  const t = norm(raw);

  if (HELP.includes(t)) return [textMsg(helpText())];
  if (PRIVACY.includes(t)) {
    return [textMsg("プライバシーポリシー（保存するデータ・削除方法）:\n" + PRIVACY_URL + "\n\n記録を消すには「データ削除」。")];
  }
  if (WIPE.includes(t)) return [wipeConfirmMsg()];

  let campaigns;
  try {
    campaigns = await getCampaigns();
  } catch (e) {
    console.log("getCampaigns failed", e && e.message);
    return [textMsg("いま処理できませんでした。少し時間をおいて、もう一度お試しください。")];
  }

  if (LISTUSAGE.includes(t)) return listUsage(env, userId, campaigns);

  // 解約 X ／ X やめた ／ X 解約 ／ 削除 X
  let m;
  if ((m = t.match(/^(?:解約|かいやく|削除|さくじょ)\s+(.+)$/)) || (m = t.match(/^(.+?)\s*(?:を)?\s*(?:やめた|解約|かいやく|削除)$/))) {
    return cancelUsage(env, userId, m[1], campaigns);
  }

  // 登録: サービス名 + 日付（「今日から」「3日前」「8/20」など）
  const ps = parseStart(t);
  if (ps) {
    const hits = matchCampaigns(ps.service, campaigns);
    if (hits.length === 1) return doRegister(env, userId, hits[0], ps.iso);
    if (hits.length === 0) {
      return [textMsg(`「${ps.service.trim()}」に一致するキャンペーンが見つかりませんでした。\n「一覧」で掲載中のサービス名を確認できます。`)];
    }
    return [textMsg("候補が複数あります:\n" + hits.slice(0, 8).map((c) => "・" + c.service).join("\n") + "\nもう少し正確なサービス名で送ってください。")];
  }

  // STEP 2: 一覧系
  if (LIST.includes(t)) return listFlex(campaigns, "掲載中のキャンペーン", () => true);
  if (URGENT.includes(t)) return listFlex(campaigns, "締切があるキャンペーン", (c) => daysLeft(c.deadline) != null);
  const cat = CATS.find((c) => norm(c) === t);
  if (cat) return listFlex(campaigns, `「${cat}」のキャンペーン`, (c) => c.category === cat);

  // サービス名だけ送られた → 開始日を選ぶボタンを出す
  const hits = matchCampaigns(t, campaigns);
  if (hits.length === 1) return [datePickMsg(hits[0])];
  if (hits.length > 1 && hits.length <= 6) {
    return [textMsg("どのサービス？ 正確な名前で送ってください:\n" + hits.map((c) => "・" + c.service).join("\n"))];
  }

  return [textMsg("『" + raw.trim() + "』はコマンドとして分かりませんでした。\n\n" + helpText())];
}

async function handlePostback(event, env) {
  const userId = event.source && event.source.userId;
  const p = new URLSearchParams(event.postback && event.postback.data ? event.postback.data : "");
  const action = p.get("action");

  if (action === "wipe") {
    if (p.get("confirm") === "yes") {
      if (env.USAGE && userId) await env.USAGE.delete("u:" + userId);
      return [textMsg("あなたの利用記録をすべて削除しました。")];
    }
    return [textMsg("削除をキャンセルしました。")];
  }

  if (!env.USAGE) return [textMsg("記録機能はまだ準備中です（KV 未設定）。")];
  if (!userId) return [textMsg("ユーザーID が取得できませんでした。")];

  if (action === "start") {
    const cid = p.get("cid");
    const ago = parseInt(p.get("ago") || "0", 10);
    let campaigns;
    try {
      campaigns = await getCampaigns();
    } catch {
      return [textMsg("いま処理できませんでした。少し後でお試しください。")];
    }
    const c = campaigns.find((x) => String(x.id) === String(cid));
    if (!c) return [textMsg("対象のキャンペーンが見つかりませんでした。")];
    return doRegister(env, userId, c, isoDaysAgo(isFinite(ago) ? ago : 0));
  }

  if (action === "del") {
    const cid = p.get("cid");
    const u = await loadUser(env, userId);
    if (u.started[cid]) {
      const rec = u.started[cid];
      const s = (typeof rec === "object" && rec.s) || "ID " + cid;
      delete u.started[cid];
      await saveUser(env, userId, u);
      return [textMsg(`「${s}」の登録を削除しました。`)];
    }
    return [textMsg("その登録は見つかりませんでした。")];
  }

  return [textMsg("操作を認識できませんでした。「ヘルプ」で使い方を確認できます。")];
}

// ============================================================================
// 登録・一覧・削除
// ============================================================================

async function doRegister(env, userId, c, iso) {
  if (!env.USAGE) {
    return [textMsg("記録機能はまだ準備中です。\nCloudflare で KV ネームスペースを作り、変数名 USAGE で Worker にバインドしてください。")];
  }
  if (!userId) return [textMsg("ユーザーID が取得できませんでした。友だち追加し直すと直ることがあります。")];
  const u = await loadUser(env, userId);
  // f=freeDays を控えておくと、後で campaigns.js から消えてもリマインドできる。
  // n=送信済みリマインドのマイルストーン（["d3","d0"]）。登録し直すと自動でリセット。
  u.started[String(c.id)] = { d: iso, s: c.service, f: c.freeDays != null ? c.freeDays : null, n: [] };
  await saveUser(env, userId, u);
  return [textMsg(startedConfirm(c, iso))];
}

function startedConfirm(c, d) {
  if (c.freeDays) {
    const end = addDays(d, c.freeDays);
    const n = daysLeft(end);
    const tail =
      n >= 0
        ? `無料期間は ${end} まで（あと${n}日）。`
        : `無料期間（${c.freeDays}日）はすでに過ぎている計算です（${end}）。`;
    return `「${c.service}」を開始日 ${d} で登録しました。\n${tail}\n「利用中」でいつでも確認できます。`;
  }
  return `「${c.service}」を開始日 ${d} で登録しました。\n「利用中」で確認できます。`;
}

async function listUsage(env, userId, campaigns) {
  if (!env.USAGE) return [textMsg("記録機能はまだ準備中です（KV 未設定）。")];
  if (!userId) return [textMsg("ユーザーID が取得できませんでした。")];

  const u = await loadUser(env, userId);
  const ids = Object.keys(u.started);
  if (!ids.length) {
    return [textMsg("まだ登録がありません。\n使っているサービス名を送ると登録できます（例:「Spotify」→ 開始日ボタンが出ます）。")];
  }

  const rows = ids
    .map((id) => {
      const rec = normRec(u.started[id]);
      const c = campaigns.find((x) => String(x.id) === String(id));
      const service = (c && c.service) || rec.s || "ID " + id;
      const icon = (c && c.icon) || "🎫";
      const freeDays = c && c.freeDays != null ? c.freeDays : rec.f;
      let end = null;
      let n = null;
      if (freeDays) {
        end = addDays(rec.d, freeDays);
        n = daysLeft(end);
      }
      return { id, d: rec.d, service, icon, freeDays, end, n, known: !!c };
    })
    .sort((a, b) => {
      if (a.n == null && b.n == null) return 0;
      if (a.n == null) return 1;
      if (b.n == null) return -1;
      return a.n - b.n;
    });

  const shown = rows.slice(0, 12);
  return [
    textMsg(`利用中の登録 ${rows.length}件（無料期間が近い順）`),
    {
      type: "flex",
      altText: `利用中の登録（${rows.length}件）`,
      contents: { type: "carousel", contents: shown.map(usageBubble) },
    },
  ];
}

async function cancelUsage(env, userId, query, campaigns) {
  if (!env.USAGE) return [textMsg("記録機能はまだ準備中です（KV 未設定）。")];
  if (!userId) return [textMsg("ユーザーID が取得できませんでした。")];

  const u = await loadUser(env, userId);
  const ids = Object.keys(u.started);
  if (!ids.length) return [textMsg("登録がありません。")];

  const q = norm(query);
  const cand = ids
    .map((id) => {
      const rec = u.started[id];
      const snap = typeof rec === "object" && rec.s ? rec.s : null;
      const c = campaigns.find((x) => String(x.id) === String(id));
      return { id, s: (c && c.service) || snap || "ID " + id };
    })
    .filter((x) => {
      const ns = norm(x.s);
      return ns === q || ns.includes(q) || q.includes(ns);
    });

  if (cand.length === 0) {
    return [textMsg(`「${query.trim()}」に一致する登録が見つかりませんでした。「利用中」で一覧を確認できます。`)];
  }
  if (cand.length > 1) {
    return [textMsg("複数一致しました。正確な名前で送ってください:\n" + cand.map((c) => "・" + c.s).join("\n"))];
  }
  delete u.started[cand[0].id];
  await saveUser(env, userId, u);
  return [textMsg(`「${cand[0].s}」の登録を削除しました。`)];
}

// ============================================================================
// メッセージ組み立て
// ============================================================================

function textMsg(text) {
  return { type: "text", text: String(text).slice(0, 4900) };
}

function qr(label, data) {
  return { type: "action", action: { type: "postback", label, data, displayText: label } };
}

function wipeConfirmMsg() {
  return {
    type: "text",
    text: "あなたの利用記録をすべて削除します。よろしいですか？",
    quickReply: {
      items: [qr("はい、削除する", "action=wipe&confirm=yes"), qr("キャンセル", "action=wipe&confirm=no")],
    },
  };
}

function datePickMsg(c) {
  return {
    type: "text",
    text: `「${c.service}」をいつから使ってる？`,
    quickReply: {
      items: [
        qr("今日", `action=start&cid=${c.id}&ago=0`),
        qr("昨日", `action=start&cid=${c.id}&ago=1`),
        qr("3日前", `action=start&cid=${c.id}&ago=3`),
        qr("1週間前", `action=start&cid=${c.id}&ago=7`),
        qr("2週間前", `action=start&cid=${c.id}&ago=14`),
        qr("1か月前", `action=start&cid=${c.id}&ago=30`),
      ],
    },
  };
}

function listFlex(campaigns, label, filterFn) {
  const active = campaigns
    .map((c) => ({ ...c, _left: daysLeft(c.deadline) }))
    .filter((c) => (c._left == null || c._left >= 0) && filterFn(c));
  if (!active.length) {
    return [textMsg(`${label}は今のところありません。\n「キャンペーン」で全件を表示できます。`)];
  }
  active.sort((a, b) => {
    const ap = a._left == null;
    const bp = b._left == null;
    if (ap !== bp) return ap ? 1 : -1;
    if (!ap) return a._left - b._left;
    return String(b.addedAt || "").localeCompare(String(a.addedAt || ""));
  });
  const shown = active.slice(0, 12);
  const head =
    `${label} ${active.length}件` +
    (active.length > shown.length ? `（近い順に${shown.length}件表示）` : "（近い順）") +
    `\nカテゴリで絞る: ${CATS.join(" / ")}`;
  return [textMsg(head), flexMsg(label, shown)];
}

function flexMsg(label, list) {
  return {
    type: "flex",
    altText: `${label}（${list.length}件）`.slice(0, 390),
    contents: { type: "carousel", contents: list.map(bubble) },
  };
}

function bubble(c) {
  const left = c._left;
  let dText;
  let dColor;
  if (left == null) {
    dText = "通年・いつでも開始OK";
    dColor = "#888888";
  } else if (left === 0) {
    dText = "本日が締切";
    dColor = "#D32F2F";
  } else if (left <= 3) {
    dText = `締切まで あと${left}日 (${c.deadline})`;
    dColor = "#D32F2F";
  } else if (left <= 10) {
    dText = `締切まで あと${left}日 (${c.deadline})`;
    dColor = "#F57C00";
  } else {
    dText = `締切まで あと${left}日 (${c.deadline})`;
    dColor = "#2E7D32";
  }

  const meta = [];
  if (c.freeDays) meta.push(`無料${c.freeDays}日間`);
  meta.push(c.source === "公式" || c.source === "運営確認" ? "✓ 条件確認済み" : "未確認情報");

  const body = {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: [
      { type: "text", text: `${c.icon || "🎫"} ${c.service || "サービス"}`, weight: "bold", size: "md", wrap: true },
      { type: "text", text: c.title || "キャンペーン", size: "sm", color: "#333333", wrap: true },
      { type: "text", text: dText, size: "xs", color: dColor, wrap: true },
      { type: "text", text: meta.join("  ・  "), size: "xs", color: "#888888", wrap: true },
    ],
  };
  if (c.detail) {
    body.contents.push({ type: "text", text: String(c.detail), size: "xs", color: "#aaaaaa", wrap: true });
  }

  const bub = { type: "bubble", size: "kilo", body };
  const uri = typeof c.url === "string" && /^https:\/\//.test(c.url) ? c.url : null;
  if (uri) {
    bub.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#1DB446",
          height: "sm",
          action: { type: "uri", label: "詳細を見る", uri },
        },
      ],
    };
  }
  return bub;
}

function usageBubble(r) {
  let endText;
  let endColor;
  if (r.freeDays == null) {
    endText = r.known ? "無料期間なし（開始日のみ記録）" : "掲載終了・開始日のみ記録";
    endColor = "#888888";
  } else if (r.n < 0) {
    endText = `無料期間は終了（${r.end}）`;
    endColor = "#D32F2F";
  } else if (r.n === 0) {
    endText = `本日 無料期間終了（${r.end}）`;
    endColor = "#D32F2F";
  } else if (r.n <= 3) {
    endText = `${r.end} まで無料（あと${r.n}日）`;
    endColor = "#D32F2F";
  } else if (r.n <= 7) {
    endText = `${r.end} まで無料（あと${r.n}日）`;
    endColor = "#F57C00";
  } else {
    endText = `${r.end} まで無料（あと${r.n}日）`;
    endColor = "#2E7D32";
  }

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: `${r.icon} ${r.service}`, weight: "bold", size: "md", wrap: true },
        { type: "text", text: `開始日 ${r.d}`, size: "xs", color: "#888888", wrap: true },
        { type: "text", text: endText, size: "xs", color: endColor, wrap: true },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: { type: "postback", label: "解約した / 消す", data: `action=del&cid=${r.id}`, displayText: `${r.service} を解約` },
        },
      ],
    },
  };
}

function helpText() {
  return [
    "見逃さん bot の使い方",
    "",
    "▼ キャンペーンを見る",
    "「キャンペーン」… 掲載中を締切が近い順に",
    "「急ぎ」… 締切が決まっているものだけ",
    "カテゴリ名… " + CATS.join(" / "),
    "",
    "▼ 使っているサービスを登録（解約リマインド用）",
    "サービス名を送る（例:「Spotify」）→ 開始日ボタンで選ぶ",
    "「Spotify 今日から」「U-NEXT 3日前」「dマガジン 8/20」でも登録可",
    "「利用中」… 登録内容と無料期間の残りを表示",
    "「解約 Spotify」… その登録を削除",
    "「データ削除」… 自分の記録をすべて消す",
    "",
    "無料期間の「終了3日前」と「当日」に自動でお知らせします。",
    "登録内容はリマインドのためサーバーに保存されます（「データ削除」でいつでも消去可）。",
    "「プライバシー」… 保存するデータと削除方法の説明",
    "掲載情報は目安です。条件は必ず公式サイトでご確認ください。",
  ].join("\n");
}

// ============================================================================
// プライバシーポリシー（GET /privacy で配信）
// ============================================================================

const PRIVACY_HTML = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>見逃さん LINE bot プライバシーポリシー</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
    line-height: 1.8; margin: 0; padding: 24px 18px 64px; max-width: 720px; margin-inline: auto;
    background: #F6F1E4; color: #23302B; }
  @media (prefers-color-scheme: dark) { body { background: #1b241f; color: #e7e3d5; } a { color: #7fd3b4; } }
  h1 { font-size: 1.35rem; border-bottom: 3px solid #2E7D5B; padding-bottom: 8px; }
  h2 { font-size: 1.05rem; margin-top: 2em; color: #2E7D5B; }
  ul { padding-left: 1.2em; }
  li { margin: 4px 0; }
  .meta { font-size: .85rem; opacity: .7; }
  code { background: rgba(127,127,127,.18); padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<h1>見逃さん LINE bot プライバシーポリシー</h1>
<p class="meta">最終更新: 2026-08-31</p>

<p>「見逃さん LINE bot」（以下、本サービス）は、サブスクリプションやキャンペーンの無料期間の終了を
見逃さないためのリマインドを提供する個人運営のサービスです。本ポリシーは、本サービスが取り扱う情報について説明します。</p>

<h2>1. 取得・保存する情報</h2>
<ul>
  <li><strong>LINEユーザーID</strong>（本アカウント内で割り当てられる識別子）。リマインドの送信先を特定するために使います。</li>
  <li><strong>あなたが登録したサービスの利用情報</strong>: キャンペーンの識別子、サービス名、あなたが選んだ「利用開始日」、送信済みリマインドの記録。</li>
</ul>
<p>これらは、あなたが「利用中サービスの登録」を行ったときにのみ保存されます。トークに送信した文章そのものや、
LINEのプロフィール情報・友だちリスト・支払い情報などは取得しません。</p>

<h2>2. 利用目的</h2>
<ul>
  <li>「利用中」の一覧表示</li>
  <li>無料期間の「終了3日前」「当日」の通知</li>
</ul>
<p>広告配信や第三者への提供・販売は行いません。</p>

<h2>3. 保存場所</h2>
<p>情報は Cloudflare, Inc. のキー・バリューストレージ（Workers KV）に保存されます。
サーバーは日本国外に所在する場合があります。通信はすべて暗号化（HTTPS）されます。</p>

<h2>4. 保存期間・削除</h2>
<ul>
  <li>トークで「<code>解約 サービス名</code>」を送ると、その登録を削除します。</li>
  <li>トークで「<code>データ削除</code>」を送ると、あなたの記録をすべて削除します。</li>
  <li>本アカウントをブロック／友だち削除すると、あなたの記録は自動的に削除されます。</li>
</ul>

<h2>5. 第三者サービス</h2>
<ul>
  <li><strong>LINE（LINEヤフー株式会社）</strong>: メッセージの送受信に利用します。LINEのプライバシーポリシーが別途適用されます。</li>
  <li><strong>Cloudflare, Inc.</strong>: 本サービスの実行およびデータ保存に利用します。</li>
</ul>

<h2>6. 免責</h2>
<p>掲載しているキャンペーン情報は目安です。最新かつ正確な条件は各サービスの公式サイトでご確認ください。
情報の誤り・リマインドの不達などにより生じた損害について、運営者は責任を負いかねます。</p>

<h2>7. 改定</h2>
<p>本ポリシーは予告なく改定されることがあります。重要な変更がある場合はトークでお知らせします。</p>

<h2>8. お問い合わせ</h2>
<p>本アカウントのトークにて「ヘルプ」または「プライバシー」とお送りください。</p>
</body>
</html>`;

// ============================================================================
// リマインド（Cron Trigger から呼ばれる）
// ============================================================================

const MILESTONES = [3, 0]; // 無料期間終了の「3日前」と「当日」。1件につき最大2回。
const MAX_PUSH_PER_RUN = 150; // 無料枠（200通/月）の暴発防止

async function runReminders(env) {
  if (!env.USAGE) {
    console.log("reminders: KV 未設定のためスキップ");
    return;
  }

  let campaigns = [];
  try {
    campaigns = await getCampaigns();
  } catch (e) {
    console.log("reminders: getCampaigns 失敗（f 控えのみで続行）", e && e.message);
  }

  let pushCount = 0;
  let scanned = 0;
  let cursor;

  do {
    const page = await env.USAGE.list({ prefix: "u:", cursor });
    cursor = page.list_complete ? null : page.cursor;

    for (const k of page.keys) {
      scanned++;
      const userId = k.name.slice(2);
      let u;
      try {
        u = await loadUser(env, userId);
      } catch {
        continue;
      }
      const started = u.started || {};
      const due = [];
      let changed = false;

      for (const cid of Object.keys(started)) {
        const rec = normRec(started[cid]);
        const c = campaigns.find((x) => String(x.id) === String(cid));
        const freeDays = rec.f != null ? rec.f : c ? c.freeDays : null;
        if (!freeDays) continue;

        const end = addDays(rec.d, freeDays);
        const left = daysLeft(end);
        if (left == null) continue;

        for (const ms of MILESTONES) {
          if (left !== ms) continue;
          const tag = "d" + ms;
          if (rec.n.includes(tag)) continue;
          due.push({ cid, name: (c && c.service) || rec.s || "ID " + cid, end, left, ms, url: c && c.url });
          rec.n.push(tag);
          started[cid] = rec;
          changed = true;
        }
      }

      if (due.length && pushCount < MAX_PUSH_PER_RUN) {
        const ok = await pushReminder(env, userId, due);
        if (ok) {
          pushCount++;
          if (changed) await saveUser(env, userId, u); // 送信成功時のみ「送信済み」を保存
        }
      }
    }
  } while (cursor);

  console.log(`reminders done: scanned=${scanned} pushes=${pushCount}`);
}

async function pushReminder(env, userId, due) {
  const blocks = due.map((x) => {
    if (x.ms === 0) {
      return `⏰「${x.name}」の無料期間は本日まで（${x.end}）\nこのあと自動で有料に切り替わります。やめるなら早めに解約を。`;
    }
    return `⏰「${x.name}」の無料期間、あと${x.left}日（${x.end}まで）\n続けるならそのまま、やめるなら解約を。`;
  });
  const text =
    blocks.join("\n\n") +
    `\n\n「利用中」で一覧、「解約 ${due[0].name}」で登録削除できます。`;

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + env.CHANNEL_ACCESS_TOKEN,
    },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
  });
  if (!res.ok) {
    console.log("push failed", res.status, await res.text());
    return false;
  }
  return true;
}

// KV レコードの形を正規化（旧形式: 文字列 / f・n 無しにも対応）
function normRec(rec) {
  if (typeof rec === "string") return { d: rec, s: null, f: null, n: [] };
  return {
    d: rec.d,
    s: rec.s || null,
    f: rec.f != null ? rec.f : null,
    n: Array.isArray(rec.n) ? rec.n : [],
  };
}

// ============================================================================
// campaigns.js の取得・解析
// ============================================================================

let _cache = { at: 0, data: null };

async function getCampaigns() {
  const now = Date.now();
  if (_cache.data && now - _cache.at < CACHE_TTL_MS) return _cache.data;

  const res = await fetch(CAMPAIGNS_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error("campaigns.js fetch " + res.status);
  const text = await res.text();
  const list = extractCampaignsArray(text);
  if (!Array.isArray(list)) throw new Error("parsed value is not an array");

  _cache = { at: now, data: list };
  return list;
}

// campaigns.js の `window.CAMPAIGNS = [ ... ];` の配列リテラルだけを取り出して読む。
function extractCampaignsArray(src) {
  const mi = src.indexOf("window.CAMPAIGNS");
  if (mi < 0) throw new Error("CAMPAIGNS marker not found");
  const start = src.indexOf("[", src.indexOf("=", mi));
  if (start < 0) throw new Error("CAMPAIGNS array not found");
  return new LiteralParser(src, start).parseValue();
}

// JS のオブジェクト/配列リテラル（コメント・末尾カンマ・引用符なしキー・シングルクオート可）
// を JSON 相当の値に変換する最小パーサ。eval を使えない Workers 用。
class LiteralParser {
  constructor(s, i) {
    this.s = s;
    this.i = i || 0;
  }
  error(m) {
    throw new Error(`parse error at ${this.i}: ${m}`);
  }
  ws() {
    const s = this.s;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") {
        this.i++;
        continue;
      }
      if (c === "/" && s[this.i + 1] === "/") {
        this.i += 2;
        while (this.i < s.length && s[this.i] !== "\n") this.i++;
        continue;
      }
      if (c === "/" && s[this.i + 1] === "*") {
        this.i += 2;
        while (this.i < s.length && !(s[this.i] === "*" && s[this.i + 1] === "/")) this.i++;
        this.i += 2;
        continue;
      }
      break;
    }
  }
  parseValue() {
    this.ws();
    const c = this.s[this.i];
    if (c === "[") return this.parseArray();
    if (c === "{") return this.parseObject();
    if (c === '"' || c === "'") return this.parseString();
    if (c === "-" || (c >= "0" && c <= "9")) return this.parseNumber();
    if (this.s.startsWith("true", this.i)) {
      this.i += 4;
      return true;
    }
    if (this.s.startsWith("false", this.i)) {
      this.i += 5;
      return false;
    }
    if (this.s.startsWith("null", this.i)) {
      this.i += 4;
      return null;
    }
    this.error(`unexpected '${c}'`);
  }
  parseArray() {
    this.i++; // [
    const arr = [];
    for (;;) {
      this.ws();
      if (this.s[this.i] === "]") {
        this.i++;
        break;
      }
      arr.push(this.parseValue());
      this.ws();
      const c = this.s[this.i];
      if (c === ",") {
        this.i++;
        continue;
      }
      if (c === "]") {
        this.i++;
        break;
      }
      this.error(`expected ',' or ']' but got '${c}'`);
    }
    return arr;
  }
  parseObject() {
    this.i++; // {
    const obj = {};
    for (;;) {
      this.ws();
      if (this.s[this.i] === "}") {
        this.i++;
        break;
      }
      const c = this.s[this.i];
      const key = c === '"' || c === "'" ? this.parseString() : this.parseIdent();
      this.ws();
      if (this.s[this.i] !== ":") this.error("expected ':'");
      this.i++;
      obj[key] = this.parseValue();
      this.ws();
      const d = this.s[this.i];
      if (d === ",") {
        this.i++;
        continue;
      }
      if (d === "}") {
        this.i++;
        break;
      }
      this.error(`expected ',' or '}' but got '${d}'`);
    }
    return obj;
  }
  parseIdent() {
    const s = this.s;
    let j = this.i;
    while (j < s.length && /[A-Za-z0-9_$]/.test(s[j])) j++;
    if (j === this.i) this.error("expected identifier");
    const id = s.slice(this.i, j);
    this.i = j;
    return id;
  }
  parseString() {
    const s = this.s;
    const q = s[this.i];
    this.i++;
    let out = "";
    while (this.i < s.length) {
      const c = s[this.i++];
      if (c === "\\") {
        const e = s[this.i++];
        if (e === "n") out += "\n";
        else if (e === "t") out += "\t";
        else if (e === "r") out += "\r";
        else if (e === "u") {
          out += String.fromCharCode(parseInt(s.slice(this.i, this.i + 4), 16));
          this.i += 4;
        } else out += e;
        continue;
      }
      if (c === q) return out;
      out += c;
    }
    this.error("unterminated string");
  }
  parseNumber() {
    const s = this.s;
    let j = this.i;
    if (s[j] === "-") j++;
    while (j < s.length && /[0-9.eE+\-]/.test(s[j])) j++;
    const num = Number(s.slice(this.i, j));
    if (Number.isNaN(num)) this.error("bad number");
    this.i = j;
    return num;
  }
}

// ============================================================================
// KV
// ============================================================================

async function loadUser(env, userId) {
  if (!env.USAGE || !userId) return { started: {} };
  const raw = await env.USAGE.get("u:" + userId);
  if (!raw) return { started: {} };
  try {
    const o = JSON.parse(raw);
    o.started = o.started || {};
    return o;
  } catch {
    return { started: {} };
  }
}

async function saveUser(env, userId, data) {
  data.updatedAt = new Date().toISOString();
  await env.USAGE.put("u:" + userId, JSON.stringify(data));
}

// ============================================================================
// 小物
// ============================================================================

// 全角英数字→半角、前後空白除去、小文字化
function norm(t) {
  return String(t || "")
    .trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

// 「サービス名 + 日付表現」を { service, iso } に。該当しなければ null。
function parseStart(t) {
  let m;
  if ((m = t.match(/^(.+?)\s*(?:を)?\s*(?:今日|きょう|本日)(?:から)?$/))) return { service: m[1], iso: isoDaysAgo(0) };
  if ((m = t.match(/^(.+?)\s*(?:を)?\s*(?:昨日|きのう)(?:から)?$/))) return { service: m[1], iso: isoDaysAgo(1) };
  if ((m = t.match(/^(.+?)\s*(\d{1,3})\s*日前(?:から)?$/))) return { service: m[1], iso: isoDaysAgo(+m[2]) };
  if ((m = t.match(/^(.+?)\s*(\d{1,2})\s*(?:週間|週)前(?:から)?$/))) return { service: m[1], iso: isoDaysAgo(+m[2] * 7) };
  if ((m = t.match(/^(.+?)\s*(\d{1,2})\s*(?:か月|ヶ月|カ月|かげつ)前(?:から)?$/))) return { service: m[1], iso: isoDaysAgo(+m[2] * 30) };
  if ((m = t.match(/^(.+?)\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:から)?$/))) return { service: m[1], iso: ymd(+m[2], +m[3], +m[4]) };
  if ((m = t.match(/^(.+?)\s*(\d{1,2})[/月](\d{1,2})日?(?:から)?$/))) {
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    let y = now.getUTCFullYear();
    if (ymd(y, +m[2], +m[3]) > now.toISOString().slice(0, 10)) y -= 1; // 未来日付なら前年とみなす
    return { service: m[1], iso: ymd(y, +m[2], +m[3]) };
  }
  return null;
}

function ymd(y, mo, d) {
  const p = (x) => String(x).padStart(2, "0");
  return `${y}-${p(mo)}-${p(d)}`;
}

// JST の「n 日前」を YYYY-MM-DD で
function isoDaysAgo(n) {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  d.setUTCDate(d.getUTCDate() - (isFinite(n) ? n : 0));
  return d.toISOString().slice(0, 10);
}

// YYYY-MM-DD に n 日足す
function addDays(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" と JST の今日から残り日数。無ければ null。
function daysLeft(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!m) return null;
  const jst = new Date(Date.now() + 9 * 3600 * 1000);
  const today = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
  const target = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return Math.round((target - today) / 86400000);
}

// サービス名クエリに一致するキャンペーン（完全一致優先、なければ部分一致）
function matchCampaigns(query, campaigns) {
  const q = norm(query);
  if (!q) return [];
  const exact = campaigns.filter((c) => norm(c.service) === q);
  if (exact.length) return exact;
  return campaigns.filter((c) => {
    const s = norm(c.service);
    return s.includes(q) || q.includes(s);
  });
}

async function reply(replyToken, messages, env) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + env.CHANNEL_ACCESS_TOKEN,
    },
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
  });
  if (!res.ok) {
    // Cloudflare の Logs で確認できる
    console.log("LINE reply failed", res.status, await res.text());
  }
}

async function verifySignature(bodyText, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(bodyText));
  const digest = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return timingSafeEqual(digest, signature);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
