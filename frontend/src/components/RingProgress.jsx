import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

export default function RingProgress({ value = 0, size = 160, stroke = 14, label, sub }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(Math.max(0, Math.min(100, value))), 200); return () => clearTimeout(t); }, [value]);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <defs><linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: "var(--blue)" }} /><stop offset="1" style={{ stopColor: "var(--teal)" }} /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E4EAF7" strokeWidth={stroke} fill="none" />
        <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} stroke="url(#ringG)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <Box><Typography variant="h4" lineHeight={1}>{label}</Typography>{sub && <Typography variant="caption" color="text.secondary" fontWeight={700}>{sub}</Typography>}</Box>
      </Box>
    </Box>
  );
}
