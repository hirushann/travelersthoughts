import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} – travel guides, itineraries and tips`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#faf7f2",
          color: "#1c1b19",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 600 }}>
          <svg viewBox="0 0 32 32" width="64" height="64">
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="#b4461e" strokeWidth="1.5" />
            <path d="M16 5.5 19 16l-3 10.5L13 16Z" fill="#b4461e" />
            <path d="M16 5.5 19 16h-6Z" fill="#1c1b19" />
          </svg>
          {site.name}
        </div>
        <div style={{ display: "flex", fontSize: 76, lineHeight: 1.05, fontWeight: 700, letterSpacing: -2, maxWidth: 960 }}>
          A travel blog for curious, budget-savvy explorers.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#b4461e" }}>Destination guides · Itineraries · Travel tips</div>
      </div>
    ),
    size,
  );
}
