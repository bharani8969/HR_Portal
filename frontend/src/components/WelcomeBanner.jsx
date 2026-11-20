import { Box, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";
import PoweredBy from "./PoweredBy.jsx";
import { BRAND } from "../brand.js";

export default function WelcomeBanner({ subtitle }) {
  const { user } = useAuth();
  const first = (user?.name || "").split(" ")[0] || "there";
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <Box className="fade-up" sx={{ mb: 4 }}>
    <Box className="hero-gradient" sx={{ position: "relative", overflow: "hidden", borderRadius: 5, p: { xs: 3, md: 4 }, color: "#fff", boxShadow: "0 24px 50px color-mix(in srgb, var(--blue) 28%, transparent)" }}>
      <span className="blob" style={{ width: 240, height: 240, background: "#fff", opacity: .12, top: -80, right: -40 }} />
      <span className="blob" style={{ width: 200, height: 200, background: "var(--teal)", opacity: .35, bottom: -90, left: "35%", animationDelay: "2s" }} />
      <Box sx={{ position: "relative" }}>
        <Typography sx={{ opacity: .85, fontWeight: 600 }}>{part}</Typography>
        <Typography variant="h4" sx={{ mt: .5 }}>Welcome back, {first} <span className="wave">👋</span></Typography>
        <Typography sx={{ mt: 1, opacity: .9, maxWidth: 560 }}>{subtitle ?? `${BRAND.appName} for ${BRAND.clientName}`}</Typography>
        <Box sx={{ mt: 2.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <PoweredBy light />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: .5, borderRadius: 99, bgcolor: "rgba(255,255,255,.16)" }}><span className="live-dot" /><Typography variant="caption" fontWeight={700}>{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</Typography></Box>
        </Box>
      </Box>
    </Box>
    </Box>
  );
}
