#!/usr/bin/env python3
"""
見逃さん Full版：巡回で見つかった変化を Claude に読ませ、campaigns.js の修正案を作る。
----------------------------------------------------------------------------------
- check_sources.py の後に実行される（GitHub Actions のオプションステップ）。
- 環境変数 ANTHROPIC_API_KEY が無ければ何もせず終了（＝Lite版のまま動く）。
- LAST_REPORT.md（差分・新着）と campaigns.js を渡し、修正案を Markdown で受け取り、
  LAST_REPORT.md の末尾に「## 🤖 修正案（AI・要確認）」として追記する。
- campaigns.js 自体は書き換えない。人が PR を見て判断する。
- 依存ライブラリなし（標準ライブラリの urllib で API を呼ぶ）。
"""

import json
import os
import sys
import pathlib
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPORT_FILE = ROOT / "automation" / "LAST_REPORT.md"
CAMP_FILE = ROOT / "campaigns.js"

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-haiku-4-5-20251001"   # 軽くて安いモデルで十分な作業
MAX_TOKENS = 1500

SYSTEM = (
    "あなたは日本のサブスク／キャンペーン通知アプリ「見逃さん」の運営アシスタントです。"
    "巡回レポート（各ページの差分・新着見出し）と現在の campaigns.js を渡します。"
    "レポートの内容だけを根拠に、campaigns.js への具体的な修正案を出してください。"
    "\n\nルール："
    "\n- レポートに書かれていないことを推測しない。数値や日付を勝手に作らない。"
    "\n- 変更の必要が無ければ「変更提案なし」と書く。"
    "\n- 出力は日本語の Markdown。次の見出しで箇条書き："
    "\n  ### 更新（既存エントリの修正）  … サービス名 / 変える項目 / 変更後の値 / 根拠（レポートの該当箇所）"
    "\n  ### 追加（新規エントリの候補） … サービス名 / 想定 title・freeDays・deadline / 公式URL / 確度"
    "\n  ### 削除の検討            … サービス名 / 理由"
    "\n- 各項目に確度（高／中／低）を付ける。低いものは「要公式確認」と明記。"
    "\n- 最大 20 項目。長い説明は不要、要点のみ。"
)


def call_api(api_key: str, report: str, campaigns: str) -> str:
    user = (
        "## 巡回レポート\n\n" + report[:8000]
        + "\n\n## 現在の campaigns.js（抜粋可）\n\n" + campaigns[:14000]
        + "\n\n上のレポートを根拠に、campaigns.js の修正案を出してください。"
    )
    body = json.dumps({
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL, data=body, method="POST",
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
    return "\n".join(parts).strip()


def main() -> int:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        print("ANTHROPIC_API_KEY 未設定のためスキップ（Lite版のまま）")
        return 0
    if not REPORT_FILE.exists():
        print("LAST_REPORT.md が無いためスキップ")
        return 0

    report = REPORT_FILE.read_text(encoding="utf-8")
    campaigns = CAMP_FILE.read_text(encoding="utf-8") if CAMP_FILE.exists() else ""

    try:
        suggestion = call_api(api_key, report, campaigns)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        print(f"API エラー HTTP {e.code}: {detail}")
        return 0  # 失敗しても PR 作成は止めない
    except Exception as e:  # noqa: BLE001
        print(f"API 呼び出し失敗: {e}")
        return 0

    if not suggestion:
        print("修正案は空でした")
        return 0

    with REPORT_FILE.open("a", encoding="utf-8") as f:
        f.write("\n\n---\n\n## 🤖 修正案（AI・要確認）\n\n")
        f.write("> Claude がレポートを読んで作った下書きです。**必ず公式で裏を取ってから** "
                "campaigns.js に反映してください。\n\n")
        f.write(suggestion + "\n")
    print("修正案を LAST_REPORT.md に追記しました")
    return 0


if __name__ == "__main__":
    sys.exit(main())
