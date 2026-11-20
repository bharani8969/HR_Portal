import { createContext, useContext, useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, InputAdornment, MenuItem, TextField, Typography } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import MailOutlineRounded from "@mui/icons-material/MailOutlineRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import { api } from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BRAND } from "../brand.js";
import { fe } from "../utils/forms.js";

const Ctx = createContext({ open: () => {} });
export const useSupport = () => useContext(Ctx);

const FALLBACK = ["Bug or issue", "Feature request", "Account or access", "Billing or licence", "Other"];

export function SupportProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (<Ctx.Provider value={{ open: () => setOpen(true) }}>{children}<ConcernDialog open={open} onClose={() => setOpen(false)} /></Ctx.Provider>);
}

function ConcernDialog({ open, onClose }) {
  const { user } = useAuth();
  const [info, setInfo] = useState({ to: "", categories: FALLBACK });
  const [f, setF] = useState({ name: "", email: "", category: FALLBACK[0], message: "" });
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null);

  useEffect(() => {
    if (!open) return;
    api("/support/info").then(setInfo).catch(() => {});
    setF((p) => ({ ...p, name: p.name || user?.name || "", email: p.email || user?.email || "" }));
  }, [open, user]);

  const close = () => { onClose(); setTimeout(() => { setDone(null); setErrors({}); setF((p) => ({ ...p, message: "" })); }, 300); };
  const send = async () => {
    setErrors({}); setBusy(true);
    try { setDone(await api("/support/concern", { method: "POST", body: { name: f.name.trim(), email: f.email.trim(), category: f.category, message: f.message.trim() } })); }
    catch (e) { setErrors(Object.keys(e.fields).length ? e.fields : { message: e.message }); }
    setBusy(false);
  };
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="sm">
      <Box className="hero-gradient" sx={{ p: 3, color: "#fff", display: "flex", alignItems: "center", gap: 2, position: "relative" }}>
        <Box sx={{ width: 52, height: 52, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,.18)" }}><SupportAgentRounded fontSize="large" /></Box>
        <Box><Typography variant="h5">Enter your concern</Typography><Typography sx={{ opacity: .9 }}>Tell the {BRAND.poweredBy} team what you need.</Typography></Box>
        <IconButton aria-label="close" onClick={close} sx={{ position: "absolute", top: 10, right: 10, color: "#fff" }}><CloseRounded /></IconButton>
      </Box>
      {done ? (
        <DialogContent sx={{ py: 5, textAlign: "center" }}>
          <CheckCircleRounded className="check-pop" sx={{ fontSize: 72, color: "#22C55E" }} />
          <Typography variant="h5" sx={{ mt: 1 }}>Thank you!</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 420, mx: "auto" }}>
            {done.emailed ? `Your concern was emailed to ${info.to}. They will reply to ${f.email}.` : `Your concern was recorded. Email delivery is not switched on for this server yet, so ${info.to} has not been emailed.`}
          </Typography>
          <Button variant="contained" sx={{ mt: 3 }} onClick={close}>Close</Button>
        </DialogContent>
      ) : (<>
        <DialogContent sx={{ display: "grid", gap: 2.5, pt: "24px !important" }}>
          <TextField label="Send to" value={info.to} InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><MailOutlineRounded /></InputAdornment> }} helperText="Concerns are delivered to this address" />
          <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { sm: "1fr 1fr" } }}>
            <TextField label="Your name" value={f.name} onChange={set("name")} {...fe(errors, "name")} />
            <TextField label="Your email" type="email" value={f.email} onChange={set("email")} {...fe(errors, "email")} />
          </Box>
          <TextField select label="Category" value={f.category} onChange={set("category")} {...fe(errors, "category")}>{info.categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
          <TextField multiline minRows={4} label="Your concern" value={f.message} onChange={set("message")} inputProps={{ maxLength: 2000 }} {...fe(errors, "message")}
            helperText={errors.message || `${f.message.length}/2000`} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="contained" endIcon={<SendRounded />} onClick={send} disabled={busy}>{busy ? "Sending…" : "Send concern"}</Button>
        </DialogActions>
      </>)}
    </Dialog>
  );
}
