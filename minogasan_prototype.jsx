import React, { useState, useEffect } from "react";
import { Bell, Search, Home, Tag, Heart, Settings, Clock, ChevronRight, Flame, X, Loader2 } from "lucide-react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=JetBrains+Mono:wght@500;700&display=swap');`;

const CATEGORIES = ["すべて", "動画", "音楽", "雑誌", "フード", "買い物", "地域のお得"];

const CAMPAIGNS = [
  { id: 1, service: "Netflix", icon: "🎬", category: "動画", title: "初回1か月無料", detail: "スタンダードプラン新規登録で", days: 3, urgent: true, color: "#E5484D" },
  { id: 2, service: "FOD", icon: "📺", category: "動画", title: "2週間無料 + 半額クーポン", detail: "初回登録・過去未加入者限定", days: 5, urgent: true, color: "#F2A93B" },
  { id: 3, service: "Amazon Music", icon: "🎵", category: "音楽", title: "3か月100円キャンペーン", detail: "プライム会員はさらにお得に", days: 12, urgent: false, color: "#8FE3C7" },
  { id: 4, service: "楽天ミュージック", icon: "🎧", category: "音楽", title: "年額プラン半額ポイント還元", detail: "コード入力で4,650pt還元", days: 21, urgent: false, color: "#8FE3C7" },
  { id: 5, service: "タブホ", icon: "📖", category: "雑誌", title: "初月無料 雑誌読み放題", detail: "1,000誌以上が対象", days: 8, urgent: false, color: "#F2A93B" },
  { id: 6, service: "Kindle Unlimited", icon: "📚", category: "雑誌", title: "30日間無料体験", detail: "対象は5月21日まで", days: 2, urgent: true, color: "#E5484D" },
  { id: 7, service: "PayPay", icon: "💴", category: "地域のお得", title: "最大10%還元キャンペーン", detail: "千葉県内の対象店舗・上限5,000円/回", days: 6, urgent: true, color: "#E5484D", local: true },
  { id: 8, service: "杉並区", icon: "🎫", category: "地域のお得", title: "プレミアム付き商品券 30%お得", detail: "区内在住者限定・要事前申込", days: 15, urgent: false, color: "#8FE3C7", local: true },
];

function TicketCard({ c, isFav, onToggleFav }) {
  return (
    <div style={{ background: "#1D3F38", borderRadius: 18, position: "relative", display: "flex", overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,0.25)" }}>
      <div style={{ width: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: "rgba(255,255,255,0.04)" }}>
        {c.icon}
      </div>
      <div style={{ position: "relative", width: 0 }}>
        <div style={{ position: "absolute", top: -1, bottom: -1, left: -1, borderLeft: "2px dashed rgba(243,238,226,0.25)" }} />
        <div style={{ position: "absolute", top: -8, left: -9, width: 16, height: 16, borderRadius: "50%", background: "#14302B" }} />
        <div style={{ position: "absolute", bottom: -8, left: -9, width: 16, height: 16, borderRadius: "50%", background: "#14302B" }} />
      </div>
      <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 11, color: "#8FA79F", letterSpacing: 0.5 }}>{c.service}</div>
            <div style={{ fontFamily: "'Zen Maru Gothic', sans-serif", fontWeight: 700, fontSize: 15, color: "#F3EEE2", marginTop: 2, lineHeight: 1.3 }}>{c.title}</div>
            <div style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 12, color: "#6E9089", marginTop: 3 }}>{c.detail}</div>
          </div>
          <button
            onClick={() => onToggleFav(c.id)}
            aria-label={isFav ? "お気に入りから外す" : "お気に入りに追加"}
            style={{ background: "none", border: "none", padding: 4, cursor: "pointer", flexShrink: 0, display: "flex" }}
          >
            <Heart size={18} color={isFav ? "#E5484D" : "#4E655F"} fill={isFav ? "#E5484D" : "none"} />
          </button>
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: c.urgent ? "rgba(229,72,77,0.15)" : "rgba(143,227,199,0.12)", border: `1px solid ${c.color}`, borderRadius: 999, padding: "3px 9px" }}>
            {c.urgent ? <Flame size={12} color={c.color} /> : <Clock size={12} color={c.color} />}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: c.color }}>残り{c.days}日</span>
          </div>
          <span style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 11, color: "#4E655F", background: "rgba(255,255,255,0.05)", borderRadius: 999, padding: "3px 9px" }}>{c.category}</span>
          {c.local && <span style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 11, color: "#4E655F" }}>📍地域限定</span>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeCat, setActiveCat] = useState("すべて");
  const [favorites, setFavorites] = useState(new Set());
  const [loadingFavs, setLoadingFavs] = useState(true);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("favorites", false);
        if (result && result.value) {
          setFavorites(new Set(JSON.parse(result.value)));
        }
      } catch (e) {
        // key doesn't exist yet on first run — that's fine
      } finally {
        setLoadingFavs(false);
      }
    })();
  }, []);

  const toggleFavorite = async (id) => {
    const next = new Set(favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavorites(next);
    setSaveError(false);
    try {
      const result = await window.storage.set("favorites", JSON.stringify(Array.from(next)), false);
      if (!result) setSaveError(true);
    } catch (e) {
      setSaveError(true);
    }
  };

  let filtered = activeCat === "すべて" ? CAMPAIGNS : CAMPAIGNS.filter((c) => c.category === activeCat);
  if (showFavOnly) filtered = filtered.filter((c) => favorites.has(c.id));
  if (query.trim()) filtered = filtered.filter((c) => c.service.toLowerCase().includes(query.trim().toLowerCase()));
  const sorted = [...filtered].sort((a, b) => a.days - b.days);
  const urgentCount = CAMPAIGNS.filter((c) => c.urgent).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0F241F", display: "flex", justifyContent: "center", padding: "24px 12px" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ width: 380, background: "#14302B", borderRadius: 36, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 760, boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}>
        <div style={{ padding: "22px 20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Zen Maru Gothic', sans-serif", fontWeight: 900, fontSize: 26, color: "#F3EEE2", display: "flex", alignItems: "baseline", gap: 6 }}>
                見逃さん
                <span style={{ fontSize: 13, fontWeight: 500, color: "#8FE3C7", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>β</span>
              </div>
              <div style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 12.5, color: "#8FA79F", marginTop: 3 }}>サブスクのお得、逃さずキャッチ。</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowSearch((s) => !s)}
                aria-label="検索"
                style={{ width: 38, height: 38, borderRadius: 12, background: showSearch ? "rgba(143,227,199,0.16)" : "rgba(255,255,255,0.05)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                {showSearch ? <X size={17} color="#F3EEE2" /> : <Search size={17} color="#F3EEE2" />}
              </button>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Bell size={17} color="#F3EEE2" />
                <div style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#E5484D" }} />
              </div>
            </div>
          </div>

          {showSearch && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="サービス名で検索"
              style={{ width: "100%", boxSizing: "border-box", marginTop: 12, padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#F3EEE2", fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 13, outline: "none" }}
            />
          )}

          <button
            onClick={() => setShowFavOnly((v) => !v)}
            style={{
              marginTop: 16, width: "100%", boxSizing: "border-box", cursor: "pointer",
              background: showFavOnly ? "linear-gradient(90deg, rgba(229,72,77,0.2), rgba(229,72,77,0.04))" : "linear-gradient(90deg, rgba(229,72,77,0.16), rgba(229,72,77,0.02))",
              border: showFavOnly ? "1px solid #E5484D" : "1px solid rgba(229,72,77,0.35)",
              borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
            }}
          >
            <Flame size={16} color="#E5484D" />
            <span style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 12.5, color: "#F3EEE2" }}>
              まもなく終了のキャンペーンが <span style={{ color: "#E5484D", fontWeight: 700 }}>{urgentCount}件</span> あります
            </span>
          </button>

          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 12.5, color: "#F3EEE2" }}>千葉県 のお得情報を表示中</span>
            </div>
            <span style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 12, color: "#8FE3C7" }}>変更</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "0 20px 14px", overflowX: "auto" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              style={{
                fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 12.5, fontWeight: 500, padding: "7px 14px", borderRadius: 999,
                border: activeCat === cat ? "1px solid #8FE3C7" : "1px solid rgba(255,255,255,0.08)",
                background: activeCat === cat ? "rgba(143,227,199,0.14)" : "transparent",
                color: activeCat === cat ? "#8FE3C7" : "#8FA79F",
                whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFavOnly((v) => !v)}
          style={{
            margin: "0 20px 12px", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 12, color: showFavOnly ? "#8FE3C7" : "#6E9089",
          }}
        >
          <Heart size={13} color={showFavOnly ? "#8FE3C7" : "#6E9089"} fill={showFavOnly ? "#8FE3C7" : "none"} />
          {showFavOnly ? "お気に入りのみ表示中" : "お気に入りのみ表示"}
        </button>

        <div style={{ flex: 1, padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {loadingFavs ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#6E9089", fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 13, marginTop: 30 }}>
              <Loader2 size={16} className="spin" />
              読み込み中…
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6E9089", fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 13, marginTop: 30 }}>
              {showFavOnly ? "まだお気に入りがありません" : "このカテゴリのキャンペーンはまだありません"}
            </div>
          ) : (
            sorted.map((c) => (
              <TicketCard key={c.id} c={c} isFav={favorites.has(c.id)} onToggleFav={toggleFavorite} />
            ))
          )}
          {saveError && (
            <div style={{ textAlign: "center", color: "#E5484D", fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 11, marginTop: 4 }}>
              保存に失敗しました。もう一度お試しください
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 8px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
          {[
            { icon: Home, label: "ホーム", active: !showFavOnly },
            { icon: Tag, label: "カテゴリ", active: false },
            { icon: Heart, label: "お気に入り", active: showFavOnly },
            { icon: Settings, label: "設定", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              onClick={() => label === "お気に入り" && setShowFavOnly(true)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: label === "お気に入り" ? "pointer" : "default" }}
            >
              <Icon size={19} color={active ? "#8FE3C7" : "#5C766F"} />
              <span style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 10, color: active ? "#8FE3C7" : "#5C766F" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
