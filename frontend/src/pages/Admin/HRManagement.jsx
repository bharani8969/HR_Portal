import { useCallback, useEffect, useState } from "react";
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField, Tooltip, Typography } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import { api } from "../../services/apiClient.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { fe } from "../../utils/forms.js";

export default function HRManagement() {
  const [data, setData] = useState(null); const [q, setQ] = useState(""); const [page, setPage] = useState(0); const [err, setErr] = useState("");
  const [add, setAdd] = useState(false); const [form, setForm] = useState({ name: "", email: "", phone: "" }); const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null); const [toggle, setToggle] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api(`/admin/hr-users?page=${page + 1}&pageSize=10&q=${encodeURIComponent(q)}`).then(setData).catch((e) => setErr(e.message)); }, [page, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const create = async () => {
    setErrors({});
    try {
      const body = { name: form.name.trim(), email: form.email.trim(), ...(form.phone.trim() && { phone: form.phone.trim() }) };
      setCreated(await api("/admin/hr-users", { method: "POST", body }));
      setAdd(false); setForm({ name: "", email: "", phone: "" }); load();
    } catch (e) { setErrors(Object.keys(e.fields).length ? e.fields : { email: e.message }); }
  };
  const doToggle = async () => {
    setBusy(true);
    try { await api(`/admin/hr-users/${toggle.id}/status`, { method: "PATCH", body: { status: toggle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } }); } catch (e) { setErr(e.message); }
    setBusy(false); setToggle(null); load();
  };
  const doDelete = async () => {
    setBusy(true);
    try { await api(`/admin/hr-users/${del.id}`, { method: "DELETE" }); } catch (e) { setErr(e.message); }
    setBusy(false); setDel(null); load();
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box><Typography variant="h4" className="fade-up">HR Management</Typography>
          <Typography color="text.secondary" className="fade-up d1">Invite, search, deactivate or delete HR accounts.</Typography></Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => { setErrors({}); setAdd(true); }}>Add HR</Button>
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}
      <Paper className="fade-up d2" elevation={0} sx={{ border: "1px solid #E4EAF7", overflow: "auto" }}>
        <Box sx={{ p: 2 }}><TextField size="small" label="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></Box>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Status</TableCell><TableCell align="right">Employees</TableCell><TableCell>Last login</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {!data && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
            {data?.items.length === 0 && <TableRow><TableCell colSpan={5}>No HR users found.</TableCell></TableRow>}
            {data?.items.map((h) => (
              <TableRow key={h.id} hover>
                <TableCell><Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 800, background: "linear-gradient(135deg,var(--blue),var(--teal))" }}>{h.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</Avatar>
                  <Box><Typography fontWeight={700} lineHeight={1.2}>{h.name}</Typography><Typography variant="caption" color="text.secondary">{h.email}</Typography></Box></Box></TableCell>
                <TableCell><Chip size="small" label={h.status} color={h.status === "ACTIVE" ? "success" : "default"} /></TableCell>
                <TableCell align="right">{h.employees}</TableCell>
                <TableCell>{h.lastLoginAt ? new Date(h.lastLoginAt).toLocaleString() : "Never"}</TableCell>
                <TableCell align="right">
                  <Button size="small" color={h.status === "ACTIVE" ? "warning" : "primary"} onClick={() => setToggle(h)}>{h.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button>
                  <Tooltip title="Delete HR"><IconButton color="error" aria-label={`delete ${h.name}`} onClick={() => setDel(h)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
      </Paper>

      <Dialog open={add} onClose={() => setAdd(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add HR user</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2.5, pt: "8px !important" }}>
          <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} {...fe(errors, "name")} />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} {...fe(errors, "email")} />
          <TextField label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} {...fe(errors, "phone")} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setAdd(false)}>Cancel</Button><Button variant="contained" onClick={create}>Send invitation</Button></DialogActions>
      </Dialog>

      <Dialog open={!!created} onClose={() => setCreated(null)} fullWidth maxWidth="xs">
        <DialogTitle>Invitation sent</DialogTitle>
        <DialogContent>
          <Typography>An email with a single-use link (valid 72 hours) was sent to <b>{created?.user.email}</b> so they can set their own password.</Typography>
          {created?.inviteLink && <><Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>Development mode: email is printed in the server log. Link:</Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mt: 1, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", userSelect: "all" }}>{created.inviteLink}</Paper></>}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button variant="contained" onClick={() => setCreated(null)}>Done</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={!!toggle} busy={busy} danger={toggle?.status === "ACTIVE"} confirmLabel={toggle?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        title={`${toggle?.status === "ACTIVE" ? "Deactivate" : "Activate"} ${toggle?.name}?`}
        message={toggle?.status === "ACTIVE" ? "They will be signed out everywhere and cannot log in. Employee records are kept." : "They will be able to log in again."}
        onConfirm={doToggle} onClose={() => setToggle(null)} />
      <ConfirmDialog open={!!del} busy={busy} title={`Delete ${del?.name}?`} confirmLabel="Delete HR"
        message="This removes their login permanently. It is blocked while they still have employees: transfer or delete those first. History stays in the audit log."
        onConfirm={doDelete} onClose={() => setDel(null)} />
    </>
  );
}
