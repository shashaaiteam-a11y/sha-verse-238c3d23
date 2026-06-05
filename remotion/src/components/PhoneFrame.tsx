import React from "react";
import { C, inter } from "../theme";

interface Props {
  children: React.ReactNode;
  w?: number;
  time?: string;
}

// A clean modern phone frame that shows the live app UI (status bar + screen).
export const PhoneFrame = ({ children, w = 880, time = "9:41" }: Props) => {
  const h = w * 2.06;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: w * 0.13,
        background: "#05070F",
        padding: w * 0.022,
        boxShadow: "0 50px 120px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.05)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: w * 0.112,
          overflow: "hidden",
          position: "relative",
          background: C.appBg,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* iOS-style status bar */}
        <div
          style={{
            height: w * 0.11,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${w * 0.07}px`,
            paddingTop: w * 0.02,
            fontFamily: inter,
            fontWeight: 700,
            fontSize: w * 0.035,
            color: C.foreground,
            background: "transparent",
            position: "relative",
            zIndex: 60,
          }}
        >
          <span>{time}</span>
          <div style={{ display: "flex", alignItems: "center", gap: w * 0.018 }}>
            {/* signal */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: w * 0.035 }}>
              {[0.45, 0.62, 0.8, 1].map((s, i) => (
                <div key={i} style={{ width: w * 0.01, height: `${s * 100}%`, background: C.foreground, borderRadius: 1 }} />
              ))}
            </div>
            {/* wifi */}
            <div style={{ fontSize: w * 0.032 }}>📶</div>
            {/* battery */}
            <div
              style={{
                width: w * 0.06,
                height: w * 0.03,
                borderRadius: w * 0.008,
                border: `${w * 0.004}px solid ${C.foreground}`,
                position: "relative",
                padding: w * 0.004,
              }}
            >
              <div style={{ width: "85%", height: "100%", background: C.foreground, borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* App screen content */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
      </div>

      {/* notch */}
      <div
        style={{
          position: "absolute",
          top: w * 0.04,
          left: "50%",
          transform: "translateX(-50%)",
          width: w * 0.32,
          height: w * 0.052,
          borderRadius: w * 0.05,
          background: "#05070F",
          zIndex: 70,
        }}
      />
    </div>
  );
};
