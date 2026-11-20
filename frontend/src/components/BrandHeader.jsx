import { Box, Typography } from "@mui/material";
import Logo from "./Logo.jsx";
import PoweredBy from "./PoweredBy.jsx";
import { BRAND } from "../brand.js";

export const APP_NAME = BRAND.appName;
export const APP_TAGLINE = BRAND.tagline;

// Client logo + client name, with "Powered by <vendor>" directly below.
export default function BrandHeader({ light = false }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Logo />
      <Box>
        <Typography variant="h6" fontWeight={800} lineHeight={1.1} className={light ? "" : "gradient-text"} sx={light ? { color: "#fff" } : {}}>
          {BRAND.clientName}
        </Typography>
        <PoweredBy light={light} />
      </Box>
    </Box>
  );
}
