/* 見逃さん LINE bot — STEP 1: echo bot
 *
 * Cloudflare Workers にダッシュボードから貼り付けてデプロイする。
 * 秘密情報はここには書かない。Cloudflare の Worker 設定 → Variables and Secrets に
 * 以下2つを「Encrypt（Secret）」で登録する:
 *   CHANNEL_ACCESS_TOKEN … LINE Developers Console → Messaging API → チャネルアクセストークン（長期）
 *   CHANNEL_SECRET        … LINE Developers Console → Basic settings → チャネルシークレット
 *
 * 動作:
 *   GET  … 生存確認用に "OK" を返すだけ
 *   POST … LINE からの Webhook。署名検証 → テキストメッセージなら
 *          「受け取ったよ: 〜」とオウム返し
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response("minogasan LINE bot: OK", { status: 200 });
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

async function handleEvents(events, env) {
  for (const event of events) {
    if (
      event.type === "message" &&
      event.message &&
      event.message.type === "text"
    ) {
      await replyText(event.replyToken, "受け取ったよ: " + event.message.text, env);
    }
  }
}

async function replyText(replyToken, text, env) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + env.CHANNEL_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
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
