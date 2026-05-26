import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "linear-gradient(135deg, #d97030 0%, #4f82ec 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: "-0.5px",
      }}
    >
      j.
    </div>,
    { ...size },
  )
}
