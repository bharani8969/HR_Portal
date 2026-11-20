import { useCallback, useEffect, useState } from "react";
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import SwapIcon from "@mui/icons-material/SwapHorizRounded";
import { api } from "../../services/apiClient.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { fe } from "../../utils/forms.js";

export default function AdminEmployees() {
  const [data, setData] = useState(null); const [q, setQ] = useState(""); const [page, setPage] = useState(0); const [err, setErr] = useState("");
  const [hrs, setHrs] = useState([]); const [tr, setTr] = useState(null); const [to, setTo] = useState(""); const [reason, setReason] = useState(""); const [trErr, setTrErr] = useState({});
  const [hist, setHist] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/admin/employees?page=${page + 1}&pageSize=10&q=${encodeURIComponent(q)}`).then(setData).catch((e) => setErr(e.message));
    api("/admin/transfers?pageSize=10").then(setHist).catch(() => {});
  }, [page, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api("/admin/hr-users?pageSize=100").then((d) => setHrs(d.items.filter((h) => h.status === "ACTIVE"))).catch(() => {}); }, []);

  const transfer = async () => {
    setTrErr({});
    if (!to) return setTrErr({ newHrId: "Choose the HR to transfer to" });
    try { await api(`/admin/employees/${tr.id}/transfer`, { method: "POST", body: { newHrId: to, ...(reason && { reason }) } }); setTr(null); setTo(""); setReason(""); load(); }
    catch (e) { setTrErr(Object.keys(e.fields).length ? e.fields : { newHrId: e.message }); }
  };
  const doDelete = async () => {
    setBusy(true);
    try { await api(`/admin/employees/${del.id}`, { method: "DELETE" }); } catch (e) { setErr(e.message); }
    setBusy(false); setDel(null); load();
  };
  return (
    <>
      <Typography variant="h4" className="fade-up">Employee Overview</Typography>
      <Typography color="text.secondary" className="fade-up d1" sx={{ mb: 3 }}>Operational view. Sensitive data and documents are not shown here.</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}
      <Paper className="fade-up d2" elevation={0} sx={{ border: "1px solid #E4EAF7", overflow: "auto", mb: 4 }}>
        <Box sx={{ p: 2 }}><TextField size="small" label="Search name or code" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></Box>
        <Table>
          <TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Department</TableCell><TableCell>Status</TableCell><TableCell>Assigned HR</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {!data && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
            {data?.items.length === 0 && <TableRow><TableCell colSpan={5}>No employees found.</TableCell></TableRow>}
            {data?.items.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell><Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 800, background: "linear-gradient(135deg,var(--blue),var(--teal))" }}>{e.firstName[0]}{e.lastName[0]}</Avatar>
                  <Box><Typography fontWeight={700} lineHeight={1.2}>{e.firstName} {e.lastName}</Typography><Typography variant="caption" color="text.secondary">{e.employeeCode}</Typography></Box></Box></TableCell>
                <TableCell>{e.department ?? "-"}</TableCell>
                <TableCell><Chip size="small" variant="outlined" label={e.registrationStatus} color={e.registrationStatus === "COMPLETE" ? "success" : "warning"} /></TableCell>
                <TableCell>{e.assignedHr}</TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<SwapIcon />} onClick={() => { setTrErr({}); setTr(e); }}>Transfer</Button>
                  <Tooltip title="Delete employee"><IconButton color="error" aria-label={`delete ${e.firstName}`} onClick={() => setDel(e)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
      </Paper>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Recent transfers</Typography>
      <Paper className="fade-up d3" elevation={0} sx={{ border: "1px solid #E4EAF7", overflow: "auto" }}>
        <Table size="small"><TableHead><TableRow><TableCell>When</TableCell><TableCell>Employee</TableCell><TableCell>From</TableCell><TableCell>To</TableCell><TableCell>By</TableCell><TableCell>Reason</TableCell></TableRow></TableHead>
          <TableBody>{(hist?.items ?? []).length === 0 && <TableRow><TableCell colSpan={6}>No transfers yet.</TableCell></TableRow>}
            {(hist?.items ?? []).map((t) => <TableRow key={t.id}><TableCell>{new Date(t.at).toLocaleString()}</TableCell><TableCell>{t.employee}</TableCell><TableCell>{t.from}</TableCell><TableCell>{t.to}</TableCell><TableCell>{t.by}</TableCell><TableCell>{t.reason ?? "-"}</TableCell></TableRow>)}</TableBody></Table>
      </Paper>
      <Dialog open={!!tr} onClose={() => setTr(null)} fullWidth maxWidth="xs">
        <DialogTitle>Transfer {tr?.firstName} {tr?.lastName}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2.5, pt: "8px !important" }}>
          <Typography variant="body2">The current HR loses access immediately and the new HR gains it. Creator history is kept.</Typography>
          <TextField select label="New HR" value={to} onChange={(e) => setTo(e.target.value)} {...fe(trErr, "newHrId")}>
            {hrs.filter((h) => h.id !== tr?.assignedHrUserId).map((h) => <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>)}</TextField>
          <TextField label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 300 }} {...fe(trErr, "reason")} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setTr(null)}>Cancel</Button><Button variant="contained" onClick={transfer}>Confirm transfer</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} busy={busy} title={`Delete ${del?.firstName} ${del?.lastName}?`} confirmLabel="Delete employee"
        message="They will disappear from every list and count. The record is retained securely for audit and cannot be restored from the app."
        onConfirm={doDelete} onClose={() => setDel(null)} />
    </>
  );
}
