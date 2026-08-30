#!/usr/bin/env python3
"""
見逃さん キャンペーン巡回チェック（Lite）
----------------------------------------
automation/sources.json の各ページを取得し、前回の内容（automation/snapshots/）と比べて
変化のあったページを automation/LAST_REPORT.md にまとめる。GitHub Actions から実行され、
変化があれば Pull Request が作られる。中身の判断（campaigns.js をどう直すか）は人がやる。

- 依存ライブラリなし（Python 標準ライブラリのみ）
- ページが JavaScript で描画されるタイプ（本文が空）だと差分は出にくい。
  まとめ記事のページ（sources.json の "aggregators"）はサーバー側で本文を返すので効きやすい。
"""

import json
import os
import re
import sys
import difflib
import pathlib
import datetime
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_FILE = ROOT / "automation" / "sources.json"
SNAP_DIR = ROOT / "automation" / "snapshots"
REPORT_FILE = ROOT / "automation" / "LAST_REPORT.md"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
TIMEOUT = 20
MAX_TEXT = 9000  # 比較に使う本文の最大文字数

SNAP_DIR.mkdir(parents=True, exist_ok=True)


def slugify(url: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", url.lower()).strip("-")[:90] or "x"


def extract_text(html: str) -> str:
    # スクリプト・スタイル等を除去
    html = re.sub(r"(?is)<(script|style|noscript|template|svg)\b[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?is)<!--.*?-->", " ", html)
    # 本文っぽい部分だけを対象にしてノイズ（ヘッダ・フッタ・広告）を減らす
    m = re.search(r"(?is)<(main|article)\b[^>]*>(.*?)</\1>", html)
    body = m.group(2) if m else html
    text = re.sub(r"(?s)<[^>]+>", " ", body)
    text = (text.replace("&nbsp;", " ").replace("&amp;", "&")
                .replace("&lt;", "<").replace("&gt;", ">").replace("&#39;", "'"))
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_TEXT]


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read()
        enc = r.headers.get_content_charset() or "utf-8"
    return extract_text(raw.decode(enc, errors="replace"))


def load_targets():
    data = json.loads(SRC_FILE.read_text(encoding="utf-8"))
    targets = []
    for s in data.get("sources", []):
        if s.get("url"):
            targets.append((s.get("service", "?"), s["url"]))
    for s in data.get("aggregators", []):
        if s.get("url"):
            targets.append((s.get("name", "まとめ記事"), s["url"]))
    return targets


def main() -> int:
    changed, gone, soft_fail, created = [], [], [], []

    for name, url in load_targets():
        snap = SNAP_DIR / (slugify(url) + ".txt")
        try:
            new = fetch(url)
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                gone.append((name, url, f"HTTP {e.code}"))
            else:
                soft_fail.append((name, url, f"HTTP {e.code}"))
            continue
        except Exception as e:  # noqa: BLE001
            soft_fail.append((name, url, str(e)[:120]))
            continue

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

    today = datetime.date.today().isoformat()
    out = [f"# キャンペーン巡回レポート {today}", ""]

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
        out.append(f"## ⚠️ 取得できず（{len(soft_fail)}件）— 一時的な可能性。次回も続くなら要確認")
        out.append("")
        for name, url, why in soft_fail:
            out.append(f"- {name} — {url} （{why}）")
        out.append("")

    if created:
        out.append(f"## 🆕 初回スナップショットを作成（{len(created)}件）")
        out.append("")
        for name, url in created:
            out.append(f"- {name} — {url}")
        out.append("")

    if not (changed or gone or created):
        out.append("変化なし。")

    report = "\n".join(out)
    REPORT_FILE.write_text(report + "\n", encoding="utf-8")
    print(report)

    # PR を作るのは「変化あり / ページ消失 / 初回作成」があったときだけ。
    # soft_fail だけのときは毎回 PR を作らない（ノイズになるため）。
    has_changes = bool(changed or gone or created)
    summary = f"{len(changed)} changed, {len(gone)} gone, {len(soft_fail)} failed, {len(created)} new"
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a", encoding="utf-8") as f:
            f.write(f"has_changes={'true' if has_changes else 'false'}\n")
            f.write(f"summary={summary}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
