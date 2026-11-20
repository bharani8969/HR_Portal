import { Box, Paper, Typography } from "@mui/material";
import BrandHeader from "./BrandHeader.jsx";

export default function AuthCard({ title, subtitle, children }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3, background: "linear-gradient(160deg,#F4F7FE,#E6F4FF)" }}>
      <Paper className="fade-up" elevation={0} sx={{ p: { xs: 3, sm: 5 }, width: "100%", maxWidth: 440, border: "1px solid #E4EAF7", boxShadow: "0 24px 60px rgba(11,31,75,.08)" }}>
        <Box sx={{ mb: 3 }}><BrandHeader /></Box>
        <Typography variant="h5" fontWeight={800}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{subtitle}</Typography>
        {children}
      </Paper>
    </Box>
  );
}
