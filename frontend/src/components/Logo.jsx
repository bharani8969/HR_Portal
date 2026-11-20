import { Box } from "@mui/material";
import { BRAND, monogram } from "../brand.js";

// Client logo. Uses the client's image if VITE_CLIENT_LOGO is set, otherwise a gradient hexagon monogram.
export default function Logo({ size = 44 }) {
  return (
    <Box className="logo-wrap" sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <span className="logo-ring" />
      {BRAND.logoUrl ? (
        <img src={BRAND.logoUrl} alt={`${BRAND.clientName} logo`} width={size} height={size} style={{ objectFit: "contain" }} />
      ) : (
        <svg className="logo-hex" width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`${BRAND.clientName} logo`}>
          <defs>
            <linearGradient id="clientG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--blue)" }} /><stop offset="1" style={{ stopColor: "var(--teal)" }} />
            </linearGradient>
          </defs>
          <path d="M24 3l18 10.5v21L24 45 6 34.5v-21z" fill="url(#clientG)" />
          <text className="logo-letter" x="24" y="31" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">{monogram}</text>
          <circle cx="34" cy="14" r="2.6" fill="#fff" />
        </svg>
      )}
    </Box>
  );
}
