import { Box, Paper, Typography } from "@mui/material";

// Standard dashboard card: title row + content, with a staggered entrance.
export default function Panel({ title, subtitle, action, children, delay = "d2", sx }) {
  return (
    <Paper className={`fade-up ${delay}`} elevation={0} sx={{ p: 3, border: "1px solid #E4EAF7", height: "100%", boxShadow: "0 8px 30px rgba(11,31,75,.04)", ...sx }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2.5 }}>
        <Box><Typography variant="h6" lineHeight={1.2}>{title}</Typography>{subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}</Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}
