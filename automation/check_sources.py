#!/usr/bin/env python3
"""
見逃さん キャンペーン巡回チェック（Lite）
----------------------------------------
automation/sources.json の各ページを取得し、前回（automation/snapshots/）と比べて
- sources / aggregators : 内容が変わったページ
- discovery             : 新しく現れた見出し（＝新サービス・新キャンペーンの候補）
を automation/LAST_REPORT.md にまとめる。GitHub Actions が実行し、何かあれば PR を作る。
中身の判断（campaigns.js をどう直すか）は人がやる。

依存ライブラリなし（Python 標準ライブラリのみ）。
"""

import json
import os
import re
import sys
import html as htmllib
import difflib
import pathlib
import datetime
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_FILE = ROOT / "automation" / "sources.json"
SNAP_DIR = ROOT / "automation" / "snapshots"
REPORT_FILE = ROOT / "automation" / "LAST_REPORT.md"
CAMP_FILE = ROOT / "campaigns.js"

STALE_DAYS = 90  # lastChecked がこれより古いエントリは「再確認」に出す

# 「発見」の見出しから落とすノイズ語（BtoB・IR・調査系など、見逃さんに載せない類）。
# 誤って消したくなければ語を削る。逆に増やせば静かになる。
NOISE = [
    "請求書", "課金基盤", "決済基盤", "決済代行", "サブスク管理", "サブスクリプション管理",
    "BtoB", "B2B", "SaaS", "API連携", "システム連携", "業務効率化ツール",
    "ウェビナー", "セミナー", "展示会", "カンファレンス", "勉強会", "登壇", "出展",
    "資金調達", "シリーズA", "シリーズB", "業務提携", "資本提携", "M&A", "子会社化",
    "導入事例", "代理店", "パートナー募集", "調査を実施", "意識調査", "実態調査",
    "白書", "レポートを公開", "人事", "役員", "オフィス移転", "本社移転",
    "認証取得", "ISO", "ISMS", "Pマーク", "特許取得", "上場", "IPO", "決算", "統合報告書",
]

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
TIMEOUT = 20
MAX_TEXT = 9000

SNAP_DIR.mkdir(parents=True, exist_ok=True)


def slugify(url: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", url.lower()).strip("-")[:90] or "x"


def get_html(url: str) -> str:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read()
        enc = r.headers.get_content_charset() or "utf-8"
    return raw.decode(enc, errors="replace")


def strip_noise(html: str) -> str:
    html = re.sub(r"(?is)<(script|style|noscript|template|svg)\b[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?is)<!--.*?-->", " ", html)
    return html


def to_text(html: str) -> str:
    """ページ全体を1つの文字列に（sources / aggregators の差分比較用）。"""
    html = strip_noise(html)
    m = re.search(r"(?is)<(main|article)\b[^>]*>(.*?)</\1>", html)
    body = m.group(2) if m else html
    text = re.sub(r"(?s)<[^>]+>", " ", body)
    text = htmllib.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_TEXT]


def to_headlines(html: str) -> list:
    """見出しっぽいテキストの一覧（discovery の新着検出用）。"""
    html = strip_noise(html)
    parts = re.split(r"(?is)</(?:h[1-6]|a|li|title|figcaption)>", html)
    seen, out = set(), []
    for p in parts:
        t = re.sub(r"(?s)<[^>]+>", " ", p)
        t = htmllib.unescape(t)
        t = re.sub(r"\s+", " ", t).strip()
        if 12 <= len(t) <= 140 and t not in seen:
            seen.add(t)
            out.append(t)
    return out


def load(kind: str):
    data = json.loads(SRC_FILE.read_text(encoding="utf-8"))
    items = []
    for s in data.get(kind, []):
        if s.get("url"):
            items.append((s.get("service") or s.get("name") or "?", s["url"]))
    return items


def is_noise(text: str) -> bool:
    return any(w.lower() in text.lower() for w in NOISE)


def scan_campaigns():
    """campaigns.js を読み、期限切れ・情報が古いエントリを洗い出す。"""
    expired, stale = [], []
    if not CAMP_FILE.exists():
        return expired, stale
    txt = CAMP_FILE.read_text(encoding="utf-8")
    # 冒頭の説明コメント（書き方の例に id: 3001 等が入っている）を除外
    txt = txt.split("window.CAMPAIGNS", 1)[-1]
    today = datetime.date.today().isoformat()
    cutoff = (datetime.date.today() - datetime.timedelta(days=STALE_DAYS)).isoformat()
    for m in re.finditer(r"\bid:\s*(\d+)", txt):
        chunk = txt[m.start(): m.start() + 700]
        svc = re.search(r'service:\s*"([^"]+)"', chunk)
        name = svc.group(1) if svc else f"id {m.group(1)}"
        dl = re.search(r'deadline:\s*"(\d{4}-\d{2}-\d{2})"', chunk)
        if dl and dl.group(1) < today:
            expired.append((name, dl.group(1)))
        lc = re.search(r'lastChecked:\s*"(\d{4}-\d{2}-\d{2})"', chunk)
        if lc and lc.group(1) < cutoff:
            stale.append((name, lc.group(1)))
    return expired, stale


def main() -> int:
    changed, gone, soft_fail, created, discoveries = [], [], [], [], []

    # ---- sources / aggregators : ページ内容の差分 ----
    for name, url in load("sources") + load("aggregators"):
        snap = SNAP_DIR / (slugify(url) + ".txt")
        try:
            html = get_html(url)
        except urllib.error.HTTPError as e:
            (gone if e.code in (404, 410) else soft_fail).append((name, url, f"HTTP {e.code}"))
            continue
        except Exception as e:  # noqa: BLE001
            soft_fail.append((name, url, str(e)[:120]))
            continue

        new = to_text(html)
        if not snap.exists():
            snap.write_text(new, encoding="utf-8")
            created.append((name, url))
            continue
        old = snap.read_text(encoding="utf-8")
        if old == new:
            continue
        diff = "\n".join(difflib.unified_diff(
            old.split(". "), new.split(". "),
            fromfile="前回", tofile="今回", lineterm="", n=1))
        changed.append((name, url, diff[:1800]))
        snap.write_text(new, encoding="utf-8")

    # ---- discovery : 新しく現れた見出し ----
    for name, url in load("discovery"):
        snap = SNAP_DIR / ("discovery-" + slugify(url) + ".txt")
        try:
            html = get_html(url)
        except urllib.error.HTTPError as e:
            (gone if e.code in (404, 410) else soft_fail).append((name, url, f"HTTP {e.code}"))
            continue
        except Exception as e:  # noqa: BLE001
            soft_fail.append((name, url, str(e)[:120]))
            continue

        heads = to_headlines(html)
        if not snap.exists():
            snap.write_text("\n".join(heads), encoding="utf-8")
            created.append((name + "（発見）", url))
            continue
        old = set(snap.read_text(encoding="utf-8").splitlines())
        fresh = [h for h in heads if h not in old and not is_noise(h)]
        if fresh:
            discoveries.append((name, url, fresh[:20]))
        snap.write_text("\n".join(heads), encoding="utf-8")

    # ---- campaigns.js の点検（期限切れ・情報が古い）----
    expired, stale = scan_campaigns()

    # ---- レポート ----
    today = datetime.date.today().isoformat()
    out = [f"# キャンペーン巡回レポート {today}", ""]

    if expired:
        out.append(f"## ⏰ 締切を過ぎているエントリ（{len(expired)}件）— campaigns.js を更新 or 削除")
        out.append("")
        for name, d in expired:
            out.append(f"- **{name}** — deadline `{d}` は過去。受付終了なら削除、続いているなら日付更新")
        out.append("")

    if stale:
        out.append(f"## 🕰️ 確認から{STALE_DAYS}日以上（{len(stale)}件）— そろそろ再確認")
        out.append("")
        for name, d in stale:
            out.append(f"- {name} — 最終確認 `{d}`")
        out.append("")

    if discoveries:
        total = sum(len(f) for _, _, f in discoveries)
        out.append(f"## 🆕 新サービス・新キャンペーンの候補（{total}件）— 見逃さんに合うものを CANDIDATES.md へ")
        out.append("")
        for name, url, fresh in discoveries:
            out.append(f"### {name}")
            out.append(url)
            out.append("")
            for h in fresh:
                out.append(f"- {h}")
            out.append("")

    if changed:
        out.append(f"## 🔺 変化あり（{len(changed)}件）— 公式で条件を再確認してください")
        out.append("")
        for name, url, diff in changed:
            out += [f"### {name}", url, "", "```diff", diff, "```", ""]

    if gone:
        out.append(f"## ❌ ページが消えた/移動（{len(gone)}件）— キャンペーン終了の可能性")
        out.append("")
        for name, url, why in gone:
            out.append(f"- **{name}** — {url} （{why}）")
        out.append("")

    if soft_fail:
        out.append(f"## ⚠️ 取得できず（{len(soft_fail)}件）— 一時的な可能性。続くようなら要確認")
        out.append("")
        for name, url, why in soft_fail:
            out.append(f"- {name} — {url} （{why}）")
        out.append("")

    if created:
        out.append(f"## 📸 初回スナップショットを作成（{len(created)}件）")
        out.append("")
        for name, url in created:
            out.append(f"- {name} — {url}")
        out.append("")

    if not (discoveries or changed or gone or created or expired):
        out.append("変化なし。" + (f"（{len(stale)}件が確認から日数経過）" if stale else ""))

    report = "\n".join(out)
    REPORT_FILE.write_text(report + "\n", encoding="utf-8")
    print(report)

    # PR を作るのは実際に手を動かす必要があるとき。stale / soft_fail だけでは作らない。
    has_changes = bool(discoveries or changed or gone or created or expired)
    summary = (f"{len(discoveries)} discover, {len(changed)} changed, {len(expired)} expired, "
               f"{len(gone)} gone, {len(soft_fail)} failed, {len(stale)} stale, {len(created)} new")
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a", encoding="utf-8") as f:
            f.write(f"has_changes={'true' if has_changes else 'false'}\n")
            f.write(f"summary={summary}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
