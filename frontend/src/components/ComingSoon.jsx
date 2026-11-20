import { Box, Chip, Grid, Tooltip, Typography } from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";
import { SOON } from "../modules.jsx";

// Disabled previews of upcoming modules; hovering shows "Under development".
export default function ComingSoon({ columns = 2 }) {
  return (
    <Grid container spacing={1.5}>
      {SOON.map((m, i) => (
        <Grid item xs={12} sm={6 / (columns / 2) } md={12 / columns} key={m.key}>
          <Tooltip title="Under development" arrow placement="top">
            <Box className="fade-up" style={{ animationDelay: `${0.1 + i * 0.06}s` }}
              sx={{ p: 1.75, borderRadius: 3, border: "1px dashed #CBD6EE", bgcolor: "rgba(244,247,254,.7)", display: "flex", alignItems: "center", gap: 1.5, cursor: "not-allowed", color: "#6B7A99", transition: "all .25s ease", "&:hover": { bgcolor: "#EEF2FB", transform: "translateY(-2px)" } }}>
              <Box sx={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 2.5, bgcolor: "#E4EAF7" }}>{m.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} fontSize={14} noWrap>{m.label}</Typography><Typography variant="caption" noWrap sx={{ display: "block" }}>{m.text}</Typography></Box>
              <LockRounded sx={{ fontSize: 18, opacity: .6 }} />
            </Box>
          </Tooltip>
        </Grid>
      ))}
    </Grid>
  );
}
