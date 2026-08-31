/* 見逃さん LINE bot — STEP 2: キャンペーン一覧を Flex Message で返す
 *
 * Cloudflare Workers にダッシュボードから貼り付けてデプロイする。
 * 秘密情報はここには書かない。Cloudflare の Worker 設定 → Settings → Variables and Secrets に
 * 以下2つを「Secret」で登録する:
 *   CHANNEL_ACCESS_TOKEN … LINE Developers Console → Messaging API → チャネルアクセストークン（長期）
 *   CHANNEL_SECRET        … LINE Developers Console → Basic settings → チャネルシークレット
 *
 * データソース:
 *   GitHub Pages の campaigns.js をそのまま fetch して解析する（アプリと単一ソース）。
 *   → git push でアプリを更新すれば bot 側も自動で最新になる。
 *   Workers は eval / new Function を使えないので、必要な配列リテラルだけを小さなパーサで読む。
 *
 * 動作:
 *   GET  … 生存確認用に "OK" を返すだけ
 *   POST … LINE からの Webhook。署名検証 → イベント処理
 *     - follow（友だち追加）      … 使い方を返す
 *     - text「ヘルプ」            … 使い方を返す
 *     - text「キャンペーン」/「一覧」… 掲載中を締切が近い順に Flex カルーセルで返す
 *     - text カテゴリ名（動画 等） … そのカテゴリだけ
 *     - text「急ぎ」              … 締切が決まっているものだけ
 *     - それ以外のテキスト         … 使い方を案内
 */

const CAMPAIGNS_URL = "https://momokachan2004-arch.github.io/minogasan2/campaigns.js";
const CATS = ["動画", "音楽", "雑誌", "フード", "買い物", "くらし", "ゲーム"];
const CACHE_TTL_MS = 10 * 60 * 1000;

export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response("minogasan LINE bot: OK (STEP 2)", { status: 200 });
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
      if (event.type === "follow") {
        await reply(
          event.replyToken,
          [textMsg("友だち追加ありがとうございます！\n\n" + helpText())],
          env
        );
      } else if (
        event.type === "message" &&
        event.message &&
        event.message.type === "text"
      ) {
        const msgs = await handleText(event.message.text, env);
        await reply(event.replyToken, msgs, env);
      }
    } catch (e) {
      console.log("handleEvent error", e && e.message);
    }
  }
}

async function handleText(raw, env) {
  const t = norm(raw);

  const HELP = ["ヘルプ", "へるぷ", "help", "使い方", "つかいかた", "?", "？", "メニュー", "menu"];
  const LIST = ["キャンペーン", "きゃんぺーん", "一覧", "いちらん", "りすと", "list", "全部", "ぜんぶ", "お得", "おとく"];
  const URGENT = ["急ぎ", "いそぎ", "締切", "しめきり", "終了間近", "そろそろ"];

  if (HELP.includes(t)) return [textMsg(helpText())];

  let campaigns;
  try {
    campaigns = await getCampaigns();
  } catch (e) {
    console.log("getCampaigns failed", e && e.message);
    return [textMsg("いま一覧を取得できませんでした。少し時間をおいて、もう一度「キャンペーン」と送ってください。")];
  }

  // 期限切れ（残り日数 < 0）は除外
  const active = campaigns
    .map((c) => ({ ...c, _left: daysLeft(c.deadline) }))
    .filter((c) => c._left == null || c._left >= 0);

  let picked = null;
  let label = "";

  if (LIST.includes(t)) {
    picked = active;
    label = "掲載中のキャンペーン";
  } else if (URGENT.includes(t)) {
    picked = active.filter((c) => c._left != null);
    label = "締切があるキャンペーン";
  } else {
    const cat = CATS.find((c) => norm(c) === t);
    if (cat) {
      picked = active.filter((c) => c.category === cat);
      label = `「${cat}」のキャンペーン`;
    }
  }

  if (!picked) {
    return [textMsg("『" + raw.trim() + "』はコマンドとして分かりませんでした。\n\n" + helpText())];
  }
  if (picked.length === 0) {
    return [textMsg(`${label}は今のところありません。\n「キャンペーン」で全件を表示できます。`)];
  }

  // 締切が近い順 → 通年は後ろ（掲載日が新しい順）
  picked.sort((a, b) => {
    const ap = a._left == null;
    const bp = b._left == null;
    if (ap !== bp) return ap ? 1 : -1;
    if (!ap) return a._left - b._left;
    return String(b.addedAt || "").localeCompare(String(a.addedAt || ""));
  });

  const shown = picked.slice(0, 12); // Flex カルーセルは最大12枚
  const head =
    `${label} ${picked.length}件` +
    (picked.length > shown.length ? `（近い順に${shown.length}件表示）` : "（近い順）") +
    `\nカテゴリで絞る: ${CATS.join(" / ")}`;

  return [textMsg(head), flexMsg(label, shown)];
}

// ============================================================================
// メッセージ組み立て
// ============================================================================

function textMsg(text) {
  return { type: "text", text: String(text).slice(0, 4900) };
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

function helpText() {
  return [
    "見逃さん bot の使い方",
    "",
    "「キャンペーン」… 掲載中の一覧（締切が近い順）",
    "「急ぎ」… 締切が決まっているものだけ",
    "カテゴリ名… そのカテゴリだけ表示",
    "　" + CATS.join(" / "),
    "「ヘルプ」… この案内",
    "",
    "各カードの「詳細を見る」で公式ページを確認できます。",
    "掲載情報は目安です。最新の条件は必ず公式サイトでご確認ください。",
  ].join("\n");
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
// 小物
// ============================================================================

// 全角英数字→半角、前後空白除去、小文字化
function norm(t) {
  return String(t || "")
    .trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

// "YYYY-MM-DD" と JST の今日から残り日数。deadline が無ければ null。
function daysLeft(deadline) {
  if (!deadline) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(deadline).trim());
  if (!m) return null;
  const jst = new Date(Date.now() + 9 * 3600 * 1000);
  const today = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
  const dl = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return Math.round((dl - today) / 86400000);
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
