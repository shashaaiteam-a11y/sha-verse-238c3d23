import React from "react";

interface Props {
  children: React.ReactNode;
  w?: number;
}

// A clean modern phone frame to showcase the in-app reading experience.
export const PhoneFrame = ({ children, w = 420 }: Props) => {
  const h = w * 2.03;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: w * 0.13,
        background: "#05070F",
        padding: w * 0.028,
        boxShadow: "0 40px 90px rgba(0,0,0,0.6)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: w * 0.108,
          overflow: "hidden",
          position: "relative",
          background: "#fff",
        }}
      >
        {children}
      </div>
      {/* notch */}
      <div
        style={{
          position: "absolute",
          top: w * 0.05,
          left: "50%",
          transform: "translateX(-50%)",
          width: w * 0.34,
          height: w * 0.055,
          borderRadius: w * 0.05,
          background: "#05070F",
          zIndex: 5,
        }}
      />
    </div>
  );
};
