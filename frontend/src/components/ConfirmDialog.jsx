import { Box, Button, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";

// Confirmation popup used before every delete / removal.
export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", danger = true, busy = false, onConfirm, onClose }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ pt: 4, textAlign: "center" }}>
        <Box sx={{ width: 60, height: 60, borderRadius: "50%", mx: "auto", mb: 2, display: "grid", placeItems: "center", bgcolor: danger ? "#FDECEC" : "#E8F0FF", color: danger ? "#D32F2F" : "var(--blue)" }}>
          <WarningAmberRounded fontSize="large" />
        </Box>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0, justifyContent: "center", gap: 1 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color={danger ? "error" : "primary"} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
