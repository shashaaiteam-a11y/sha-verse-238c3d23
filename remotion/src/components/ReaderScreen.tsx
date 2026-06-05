import { ArrowLeft, ZoomOut, ZoomIn, Bookmark, BookmarkCheck, List, Settings, Sun, Type, Moon, Palette } from "lucide-react";
import { C, inter, playfair } from "../theme";

type Theme = "light" | "sepia" | "dark";

const THEMES: Record<Theme, { bg: string; text: string; sub: string; header: string; chip: string }> = {
  light: { bg: "#FFFFFF", text: "#18181B", sub: "#9A9AA5", header: "rgba(255,255,255,0.95)", chip: "#F1ECE2" },
  sepia: { bg: "#F4ECD8", text: "#5B4636", sub: "#A0876A", header: "rgba(232,220,200,0.95)", chip: "#E8DCC8" },
  dark: { bg: "#18181B", text: "#E4E4E7", sub: "#8A8F99", header: "rgba(39,39,42,0.95)", chip: "#27272A" },
};

const LINES = [12, 13, 11, 13, 9, 12, 13, 10, 13, 12, 11, 8, 13, 10];

interface Props {
  sw: number;
  theme?: Theme;
  progress?: number; // 0-100
  fontScale?: number;
  bookmarked?: boolean;
  showSettings?: boolean;
}

export const ReaderScreen = ({ sw, theme = "light", progress = 24, fontScale = 1, bookmarked = false, showSettings = false }: Props) => {
  const t = THEMES[theme];
  return (
    <div style={{ width: "100%", height: "100%", background: t.bg, position: "relative", overflow: "hidden", transition: "none" }}>
      {/* top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: t.header,
          borderBottom: `1px solid rgba(128,128,128,0.18)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${sw * 0.03}px ${sw * 0.04}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: sw * 0.03 }}>
          <ArrowLeft size={sw * 0.052} color={t.text} />
          <div>
            <div style={{ fontFamily: inter, fontWeight: 700, fontSize: sw * 0.04, color: t.text }}>The Silent Echo</div>
            <div style={{ fontFamily: inter, fontSize: sw * 0.03, color: t.sub }}>A. Rahman · {Math.round(progress)}%</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: sw * 0.022, color: t.text }}>
          <ZoomOut size={sw * 0.046} />
          <ZoomIn size={sw * 0.046} />
          {bookmarked ? <BookmarkCheck size={sw * 0.046} color="#EAB308" fill="#EAB308" /> : <Bookmark size={sw * 0.046} />}
          <List size={sw * 0.046} />
          <Settings size={sw * 0.046} />
        </div>
      </div>

      {/* page content */}
      <div style={{ position: "absolute", top: sw * 0.16, left: 0, right: 0, bottom: sw * 0.16, padding: `${sw * 0.04}px ${sw * 0.07}px`, overflow: "hidden" }}>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: sw * 0.08 * fontScale, color: t.text, marginBottom: sw * 0.05 }}>Chapter One</div>
        {LINES.map((wl, i) => (
          <div key={i} style={{ height: sw * 0.022 * fontScale, width: `${wl * 7.3}%`, background: t.text, opacity: 0.82, borderRadius: 4, marginBottom: sw * 0.032 * fontScale }} />
        ))}
      </div>

      {/* progress bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: `${sw * 0.03}px ${sw * 0.07}px ${sw * 0.045}px`, background: t.header }}>
        <div style={{ height: sw * 0.012, borderRadius: 6, background: t.chip, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: C.primary, borderRadius: 6 }} />
        </div>
        <div style={{ fontFamily: inter, fontWeight: 600, fontSize: sw * 0.032, color: t.sub, marginTop: sw * 0.022, textAlign: "center" }}>
          {Math.round(progress)}% · resume anytime
        </div>
      </div>

      {/* settings sheet (bottom) */}
      {showSettings && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            background: theme === "dark" ? "#1F1F23" : "#fff",
            borderTopLeftRadius: sw * 0.05,
            borderTopRightRadius: sw * 0.05,
            boxShadow: "0 -10px 40px rgba(0,0,0,0.25)",
            padding: sw * 0.05,
          }}
        >
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: sw * 0.05, color: theme === "dark" ? "#fff" : C.foreground, marginBottom: sw * 0.04 }}>Reading Settings</div>
          <div style={{ display: "flex", alignItems: "center", gap: sw * 0.02, fontFamily: inter, fontWeight: 600, fontSize: sw * 0.04, color: theme === "dark" ? "#ddd" : C.foreground, marginBottom: sw * 0.025 }}>
            <Palette size={sw * 0.045} /> Theme
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: sw * 0.025 }}>
            {([
              { key: "light", Icon: Sun, label: "Light" },
              { key: "sepia", Icon: Type, label: "Sepia" },
              { key: "dark", Icon: Moon, label: "Dark" },
            ] as const).map(({ key, Icon, label }) => {
              const active = key === theme;
              const bg = active ? (key === "sepia" ? "#d4a574" : C.primary) : "transparent";
              const col = active ? (key === "sepia" ? "#3d2b1f" : "#fff") : theme === "dark" ? "#ccc" : C.foreground;
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: sw * 0.015,
                    height: sw * 0.11,
                    borderRadius: sw * 0.022,
                    border: active ? "none" : `1px solid ${C.border}`,
                    background: bg,
                    color: col,
                    fontFamily: inter,
                    fontWeight: 600,
                    fontSize: sw * 0.038,
                  }}
                >
                  <Icon size={sw * 0.045} /> {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
