import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

// Horizontal bar that grows in when it appears.
export default function BarRow({ label, value = 0, max = 1, note }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(max ? Math.min(100, (value / max) * 100) : 0), 250); return () => clearTimeout(t); }, [value, max]);
  return (
    <Box sx={{ mb: 1.6 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: .5 }}>
        <Typography variant="body2" fontWeight={700}>{label}</Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={700}>{note ?? value}</Typography>
      </Box>
      <Box sx={{ height: 9, borderRadius: 99, bgcolor: "#E9EEF9", overflow: "hidden" }}><div className="bar-fill" style={{ width: `${w}%` }} /></Box>
    </Box>
  );
}
