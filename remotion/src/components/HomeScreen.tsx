import { Clock, Grid, List, Book as BookIcon } from "lucide-react";
import { C, inter, CATEGORIES, BOOKS, GRADIENT_PRIMARY } from "../theme";
import { AppHeader } from "./AppHeader";
import { AppBookCard, BookData } from "./AppBookCard";

interface Props {
  sw: number;
  scrollY?: number;
  selectedCategory?: string;
  activeTab?: string;
  searchText?: string;
  searchFocused?: boolean;
  showCaret?: boolean;
  books?: BookData[];
}

const TABS = ["Discover", "Trending", "Subscribed", "Library"];

export const HomeScreen = ({
  sw,
  scrollY = 0,
  selectedCategory = "All",
  activeTab = "Discover",
  searchText = "",
  searchFocused = false,
  showCaret = false,
  books = BOOKS,
}: Props) => {
  const pad = sw * 0.04;
  const gap = sw * 0.025;
  const cols = 3;
  const cardW = (sw - pad * 2 - gap * (cols - 1)) / cols;

  return (
    <div style={{ width: "100%", height: "100%", background: `linear-gradient(180deg, ${C.appBg}, ${C.appBgGrad2})`, position: "relative", overflow: "hidden" }}>
      {/* sticky header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }}>
        <AppHeader sw={sw} searchText={searchText} searchFocused={searchFocused} showCaret={showCaret} />
      </div>

      {/* scrolling body */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${-scrollY}px)`, paddingTop: sw * 0.34 }}>
        <div style={{ padding: `0 ${pad}px` }}>
          {/* copyright warning (collapsed) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: sw * 0.02,
              borderRadius: sw * 0.025,
              border: `2px solid rgba(239,68,68,0.4)`,
              background: "rgba(239,68,68,0.08)",
              padding: `${sw * 0.028}px ${sw * 0.035}px`,
              marginBottom: sw * 0.035,
            }}
          >
            <span style={{ fontSize: sw * 0.045 }}>⚠️</span>
            <span style={{ flex: 1, fontFamily: inter, fontWeight: 700, fontSize: sw * 0.04, color: C.destructive }}>Copyright Warning</span>
            <span style={{ color: C.destructive, fontSize: sw * 0.04 }}>▾</span>
          </div>

          {/* category chips */}
          <div style={{ display: "flex", gap: sw * 0.022, marginBottom: sw * 0.04, overflow: "hidden" }}>
            {CATEGORIES.slice(0, 7).map((cat) => {
              const active = cat === selectedCategory;
              return (
                <div
                  key={cat}
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: sw * 0.012,
                    padding: `${sw * 0.022}px ${sw * 0.035}px`,
                    borderRadius: sw * 0.022,
                    fontFamily: inter,
                    fontWeight: 600,
                    fontSize: sw * 0.038,
                    border: active ? "none" : `1px solid ${C.border}`,
                    background: active ? GRADIENT_PRIMARY : C.card,
                    color: active ? "#fff" : C.foreground,
                  }}
                >
                  {cat === "All" ? <Grid size={sw * 0.038} /> : <BookIcon size={sw * 0.038} />}
                  {cat}
                </div>
              );
            })}
          </div>

          {/* tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              background: C.muted,
              borderRadius: sw * 0.025,
              padding: sw * 0.012,
              marginBottom: sw * 0.05,
            }}
          >
            {TABS.map((t) => {
              const active = t === activeTab;
              return (
                <div
                  key={t}
                  style={{
                    textAlign: "center",
                    padding: `${sw * 0.025}px 0`,
                    borderRadius: sw * 0.018,
                    fontFamily: inter,
                    fontWeight: active ? 700 : 500,
                    fontSize: sw * 0.038,
                    background: active ? C.card : "transparent",
                    color: active ? C.foreground : C.mutedFg,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {t}
                </div>
              );
            })}
          </div>

          {/* section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sw * 0.04 }}>
            <div style={{ display: "flex", alignItems: "center", gap: sw * 0.02, fontFamily: inter, fontWeight: 700, fontSize: sw * 0.05, color: C.foreground }}>
              <Clock size={sw * 0.05} color={C.primary} />
              Recently Added
            </div>
            <div style={{ display: "flex", gap: sw * 0.015, color: C.mutedFg }}>
              <Grid size={sw * 0.05} />
              <List size={sw * 0.05} />
            </div>
          </div>

          {/* book grid */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap, justifyContent: "space-between" }}>
            {books.map((b, i) => (
              <AppBookCard key={i} book={b} w={cardW} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
