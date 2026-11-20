import { Box, Paper, Typography } from "@mui/material";
import useCountUp from "../hooks/useCountUp.js";

export default function StatCard({ icon, label, value = 0, delay = "d1" }) {
  const n = useCountUp(value);
  return (
    <Paper className={`fade-up lift ${delay}`} elevation={0} sx={{ p: 3, border: "1px solid #E4EAF7", display: "flex", alignItems: "center", gap: 2, height: "100%" }}>
      <Box sx={{ width: 54, height: 54, borderRadius: 3.5, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(135deg,var(--blue),var(--teal))", boxShadow: "0 10px 22px color-mix(in srgb, var(--blue) 30%, transparent)" }}>{icon}</Box>
      <Box><Typography variant="h4" lineHeight={1.1}>{n}</Typography><Typography color="text.secondary" variant="body2" fontWeight={600}>{label}</Typography></Box>
    </Paper>
  );
}
