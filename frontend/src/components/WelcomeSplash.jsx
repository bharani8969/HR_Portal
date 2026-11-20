import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import Logo from "./Logo.jsx";
import PoweredBy from "./PoweredBy.jsx";
import { BRAND } from "../brand.js";

// Shown once right after sign-in, then fades away on its own.
export default function WelcomeSplash({ name }) {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 2700); return () => clearTimeout(t); }, []);
  if (!show) return null;
  const first = (name || "").split(" ")[0];
  return (
    <Box className="splash" role="status" aria-live="polite">
      <span className="blob" style={{ width: 380, height: 380, background: "var(--teal)", opacity: .4, top: "-10%", left: "-8%" }} />
      <span className="blob" style={{ width: 320, height: 320, background: "var(--blue)", opacity: .5, bottom: "-12%", right: "-6%", animationDelay: "2s" }} />
      <Box sx={{ position: "relative", px: 3 }}>
        <Box className="fade-up" sx={{ display: "grid", placeItems: "center", mb: 3 }}><Logo size={92} /></Box>
        <Typography variant="h3" className="fade-up d2">Welcome{first ? `, ${first}` : ""}</Typography>
        <Typography variant="h6" className="fade-up d3" sx={{ mt: 1, opacity: .9, fontWeight: 500 }}>{BRAND.clientName} · {BRAND.appName}</Typography>
        <Box className="fade-up d4" sx={{ mt: 4 }}><PoweredBy light center variant="body2" /></Box>
      </Box>
    </Box>
  );
}
