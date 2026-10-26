import { ImageResponse } from "next/og";

// Raster logo for Organization structured data (Google requires a crawlable bitmap).
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf7f2" }}>
        <svg viewBox="0 0 32 32" width="400" height="400">
          <circle cx="16" cy="16" r="13" fill="none" stroke="#b4461e" strokeWidth="1.5" />
          <path d="M16 5.5 19 16l-3 10.5L13 16Z" fill="#b4461e" />
          <path d="M16 5.5 19 16h-6Z" fill="#1c1b19" />
          <circle cx="16" cy="16" r="1.6" fill="#faf7f2" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
