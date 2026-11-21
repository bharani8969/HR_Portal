import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Box, Typography } from "@mui/material";
import Logo from "./Logo.jsx";
import { BRAND } from "../brand.js";
import { subscribe, getSnapshot } from "../services/loadingStore.js";

const MESSAGES = ["Fetching your data…", "Securing your connection…", "Almost there…", "Still working on it…"];

// Thin progress bar for any request + a branded full-screen loader that blocks clicks while data loads.
export default function GlobalLoading() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!snap.count) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(id);
  }, [snap]);

  const oldest = snap.count ? Math.min(...snap.entries.map((e) => e.start)) : now;
  const blocking = snap.entries.filter((e) => e.blocking && now - e.start >= e.delay);
  const showOverlay = blocking.length > 0;
  const showBar = snap.count > 0 && now - oldest >= 150;
  const elapsed = showOverlay ? now - Math.min(...blocking.map((e) => e.start)) : 0;
  const label = blocking.find((e) => e.label)?.label;

  // While the loader is up, nothing underneath can be clicked or tabbed to.
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    if (showOverlay) root.setAttribute("inert", ""); else root.removeAttribute("inert");
    return () => root.removeAttribute("inert");
  }, [showOverlay]);

  return createPortal(
    <>
      {showBar && <div className="top-progress" role="progressbar" aria-label="Loading" />}
      {showOverlay && (
        <div className="loader-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="loader-card">
            <Box sx={{ position: "relative", width: 112, height: 112, mx: "auto", mb: 2.5, display: "grid", placeItems: "center" }}>
              <span className="loader-ring" />
              <Logo size={58} />
            </Box>
            <Typography variant="h6" className="gradient-text" sx={{ fontWeight: 800 }}>{label ?? MESSAGES[Math.min(Math.floor(elapsed / 2500), MESSAGES.length - 1)]}</Typography>
            <Typography variant="body2" sx={{ color: "#5B6B8C", mt: .75, minHeight: 40 }}>
              {elapsed > 7000 ? "The server is waking up. The first request after a quiet period can take up to a minute. Please wait, there is no need to click again." : "Please wait a moment. Clicking again is not needed."}
            </Typography>
            <div className="loader-bar" />
            <Typography variant="caption" sx={{ display: "block", mt: 2, color: "#6B7A99", fontWeight: 700 }}>{BRAND.clientName} · Powered by {BRAND.poweredBy}</Typography>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
