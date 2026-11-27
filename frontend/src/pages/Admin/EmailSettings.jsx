import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Grid, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField, Tooltip, Typography } from "@mui/material";
import MailOutlineRounded from "@mui/icons-material/MailOutlineRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import { api } from "../../services/apiClient.js";
import { useAuth } from "../../context/AuthContext.jsx";
import Panel from "../../components/Panel.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { humanize } from "../../constants.js";

const PROVIDERS = { resend: "Resend", smtp: "SMTP", console: "Console (development)" };
const STATUS = { SENT: "success", FAILED: "error", CONSOLE: "default" };

export default function EmailSettings() {
  const { user } = useAuth();
  const [s, setS] = useState(null); const [err, setErr] = useState("");
  const [addr, setAddr] = useState(""); const [addrErr, setAddrErr] = useState(""); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  const [to, setTo] = useState(user?.email ?? ""); const [toErr, setToErr] = useState(""); const [result, setResult] = useState(null); const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState(null); const [page, setPage] = useState(0);

  const loadSettings = useCallback(() => api("/admin/email/settings").then(setS).catch((e) => setErr(e.message)), []);
  const loadLogs = useCallback(() => api(`/admin/email/logs?page=${page + 1}&pageSize=10`, { quiet: true }).then(setLogs).catch(() => {}), [page]);
  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const save = async (list) => api("/admin/email/settings", { method: "PUT", body: { recipients: list }, label: "Saving destinations…" });
  const add = async () => {
    setAddrErr("");
    try { const r = await save([...s.recipients, addr.trim()]); setS({ ...s, recipients: r.recipients }); setAddr(""); }
    catch (e) { setAddrErr(e.fields?.recipients || e.message); }
  };
  const remove = async () => {
    setBusy(true);
    try { const r = await save(s.recipients.filter((x) => x !== del)); setS({ ...s, recipients: r.recipients }); } catch (e) { setErr(e.fields?.recipients || e.message); }
    setBusy(false); setDel(null);
  };
  const sendTest = async () => {
    setToErr(""); setResult(null); setSending(true);
    try { const r = await api("/admin/email/test", { method: "POST", body: { to: to.trim() }, label: "Sending a test email…" }); setResult(r); loadLogs(); }
    catch (e) { setToErr(e.fields?.to || e.message); }
    setSending(false);
  };

  return (
    <>
      <Typography variant="h4" className="fade-up">Email</Typography>
      <Typography color="text.secondary" className="fade-up d1" sx={{ mb: 3 }}>Choose where messages are delivered, check the connection, and see every email the system sends.</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={5}>
          <Panel title="Email provider" subtitle="Sends password resets, invitations and concerns" delay="d2">
            {!s ? <Typography color="text.secondary">Loading…</Typography> : (<>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: 3, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(135deg,var(--blue),var(--teal))" }}><MailOutlineRounded /></Box>
                <Box><Typography fontWeight={800}>{PROVIDERS[s.provider] ?? s.provider}</Typography>
                  <Chip size="small" icon={s.ready ? <CheckCircleRounded /> : <ErrorOutlineRounded />} label={s.ready ? "Connected" : "Not connected"} color={s.ready ? "success" : "warning"} /></Box>
              </Box>
              <Typography variant="caption" sx={{ color: "#6B7A99" }} fontWeight={800}>SENDS FROM</Typography>
              <Typography fontWeight={600} sx={{ mb: 2, wordBreak: "break-word" }}>{s.from}</Typography>
              {s.notes.map((n) => <Alert key={n} severity="info" sx={{ mb: 1.5 }}>{n}</Alert>)}
              <Typography variant="caption" color="text.secondary">The provider key and sender address are server settings (RESEND_API_KEY, EMAIL_FROM) and are not stored here.</Typography>
            </>)}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={7}>
          <Panel title="Destination emails" subtitle="Messages from the “Powered by” concern form are delivered to every address below (up to 5)" delay="d3">
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5, minHeight: 36 }}>
              {s?.recipients.map((r) => (
                <Chip key={r} label={r} onDelete={s.recipients.length > 1 ? () => setDel(r) : undefined} sx={{ bgcolor: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", fontWeight: 700, py: 2.2 }} />
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <TextField fullWidth size="small" type="email" label="Add a destination email" value={addr} onChange={(e) => setAddr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
                error={!!addrErr} helperText={addrErr || (s && s.recipients.length === 1 ? "At least one destination is always kept" : " ")} />
              <Button variant="contained" startIcon={<AddRounded />} onClick={add} sx={{ height: 40 }} disabled={!addr.trim()}>Add</Button>
            </Box>
            {s && <Typography variant="caption" color="text.secondary">Default until you add your own: {s.defaultRecipient}</Typography>}
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Panel title="Send a test email" subtitle="Confirms the connection and shows the exact reason if delivery fails" delay="d4">
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
              <TextField size="small" type="email" label="Send test to" value={to} onChange={(e) => setTo(e.target.value)} sx={{ minWidth: 320 }}
                error={!!toErr} helperText={toErr || " "} InputProps={{ startAdornment: <InputAdornment position="start"><MailOutlineRounded fontSize="small" /></InputAdornment> }} />
              <Button variant="contained" endIcon={<SendRounded />} onClick={sendTest} disabled={sending || !to.trim()} sx={{ height: 40 }}>{sending ? "Sending…" : "Send test"}</Button>
            </Box>
            {result?.sent && <Alert severity="success" icon={<CheckCircleRounded className="check-pop" />} sx={{ mt: 1 }}>Sent to {to}. It usually arrives within a minute; also check the spam folder.</Alert>}
            {result?.console && <Alert severity="info" sx={{ mt: 1 }}>Email is in console mode, so nothing was sent. The message was printed in the server log.</Alert>}
            {result && !result.sent && !result.console && <Alert severity="error" sx={{ mt: 1 }}><b>Not delivered:</b> {result.error}</Alert>}
          </Panel>
        </Grid>
      </Grid>

      <Panel title="Delivery log" subtitle="Every email the system tried to send (message contents are never stored)" delay="d5"
        action={<Tooltip title="Refresh"><IconButton aria-label="refresh log" onClick={loadLogs}><RefreshRounded /></IconButton></Tooltip>}>
        <Box sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>When</TableCell><TableCell>Type</TableCell><TableCell>To</TableCell><TableCell>Status</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
            <TableBody>
              {!logs && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
              {logs?.items.length === 0 && <TableRow><TableCell colSpan={5}>No emails yet.</TableCell></TableRow>}
              {logs?.items.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{humanize(l.type)}</TableCell>
                  <TableCell sx={{ maxWidth: 240, wordBreak: "break-word" }}>{l.to}</TableCell>
                  <TableCell><Chip size="small" label={l.status === "CONSOLE" ? "Console" : humanize(l.status)} color={STATUS[l.status]} variant={l.status === "CONSOLE" ? "outlined" : "filled"} /></TableCell>
                  <TableCell sx={{ maxWidth: 360, color: l.error ? "#B3261E" : "text.secondary" }}>{l.error ?? l.subject}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <TablePagination component="div" count={logs?.total ?? 0} page={page} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
      </Panel>

      <ConfirmDialog open={!!del} busy={busy} confirmLabel="Remove" title="Remove this destination?" message={`${del} will no longer receive concerns from the contact form.`} onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}
