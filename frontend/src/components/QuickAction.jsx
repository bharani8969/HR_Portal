import { Box, Paper, Typography } from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";

export default function QuickAction({ icon, title, text, to, delay = "d2" }) {
  const navigate = useNavigate();
  return (
    <Paper className={`fade-up lift shine tap ${delay}`} elevation={0} onClick={() => navigate(to)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate(to)}
      sx={{ p: 2.25, border: "1px solid #E4EAF7", cursor: "pointer", display: "flex", gap: 2, alignItems: "center" }}>
      <Box sx={{ color: "#fff", display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 3, background: "linear-gradient(135deg,var(--blue),var(--teal))", boxShadow: "0 8px 18px color-mix(in srgb, var(--blue) 28%, transparent)" }}>{icon}</Box>
      <Box sx={{ flex: 1 }}><Typography fontWeight={800}>{title}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Box>
      <ArrowForward sx={{ color: "text.secondary" }} />
    </Paper>
  );
}
