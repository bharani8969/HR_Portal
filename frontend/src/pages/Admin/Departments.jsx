import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import ApartmentIcon from "@mui/icons-material/ApartmentRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreIcon from "@mui/icons-material/RestoreRounded";
import { api } from "../../services/apiClient.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { fe } from "../../utils/forms.js";

export default function Departments() {
  const [items, setItems] = useState(null); const [err, setErr] = useState("");
  const [dlg, setDlg] = useState(null); // { mode: "add" | "rename", dept? }
  const [name, setName] = useState(""); const [errors, setErrors] = useState({});
  const [newDes, setNewDes] = useState({}); const [desErr, setDesErr] = useState({});
  const [del, setDel] = useState(null); const [busy, setBusy] = useState(false); // { type: "dept" | "desig", dept, desig? }

  const load = useCallback(() => api("/admin/departments").then((d) => setItems(d.items)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setErrors({});
    try {
      if (dlg.mode === "add") await api("/admin/departments", { method: "POST", body: { name: name.trim() } });
      else await api(`/admin/departments/${dlg.dept.id}`, { method: "PUT", body: { name: name.trim() } });
      setDlg(null); load();
    } catch (e) { setErrors(Object.keys(e.fields).length ? e.fields : { name: e.message }); }
  };
  const addDesignation = async (dept) => {
    setDesErr((x) => ({ ...x, [dept.id]: "" }));
    try { await api(`/admin/departments/${dept.id}/designations`, { method: "POST", body: { name: (newDes[dept.id] || "").trim() } }); setNewDes((x) => ({ ...x, [dept.id]: "" })); load(); }
    catch (e) { setDesErr((x) => ({ ...x, [dept.id]: e.fields?.name || e.message })); }
  };
  const confirmDelete = async () => {
    setBusy(true);
    try {
      if (del.type === "dept") await api(`/admin/departments/${del.dept.id}`, { method: "DELETE" });
      else await api(`/admin/designations/${del.desig.id}`, { method: "DELETE" });
    } catch (e) { setErr(e.message); }
    setBusy(false); setDel(null); load();
  };
  const restore = async (d) => { try { await api(`/admin/departments/${d.id}/restore`, { method: "POST" }); load(); } catch (e) { setErr(e.message); } };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box><Typography variant="h4" className="fade-up">Departments</Typography>
          <Typography color="text.secondary" className="fade-up d1">These appear as dropdown options when HR fills the employee form.</Typography></Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setName(""); setErrors({}); setDlg({ mode: "add" }); }}>Add department</Button>
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}
      {items?.length === 0 && <Alert severity="info">No departments yet. Add your first one.</Alert>}
      <Grid container spacing={3}>
        {items?.map((d, i) => (
          <Grid item xs={12} md={6} key={d.id}>
            <Paper className={`fade-up lift d${Math.min(i + 1, 6)}`} elevation={0} sx={{ p: 3, border: "1px solid #E4EAF7", opacity: d.status === "ACTIVE" ? 1 : .6, height: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 3, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(135deg,var(--blue),var(--teal))" }}><ApartmentIcon /></Box>
                <Box sx={{ flex: 1 }}><Typography fontWeight={800}>{d.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{d.employees} employee{d.employees === 1 ? "" : "s"}{d.status !== "ACTIVE" ? " · removed" : ""}</Typography></Box>
                {d.status === "ACTIVE" ? (<>
                  <Tooltip title="Rename"><IconButton aria-label={`rename ${d.name}`} onClick={() => { setName(d.name); setErrors({}); setDlg({ mode: "rename", dept: d }); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton color="error" aria-label={`delete ${d.name}`} onClick={() => setDel({ type: "dept", dept: d })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </>) : <Button size="small" startIcon={<RestoreIcon />} onClick={() => restore(d)}>Restore</Button>}
              </Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>DESIGNATIONS</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, my: 1.5, minHeight: 32 }}>
                {d.designations.filter((g) => g.status === "ACTIVE").length === 0 && <Typography variant="body2" color="text.secondary">None yet</Typography>}
                {d.designations.filter((g) => g.status === "ACTIVE").map((g) => (
                  <Chip key={g.id} label={g.name} onDelete={d.status === "ACTIVE" ? () => setDel({ type: "desig", dept: d, desig: g }) : undefined} sx={{ bgcolor: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)" }} />
                ))}
              </Box>
              {d.status === "ACTIVE" && (
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField size="small" fullWidth label="New designation" value={newDes[d.id] || ""} onChange={(e) => setNewDes((x) => ({ ...x, [d.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addDesignation(d)} {...fe({ n: desErr[d.id] }, "n")} />
                  <Button variant="outlined" onClick={() => addDesignation(d)} sx={{ height: 40 }}>Add</Button>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={!!dlg} onClose={() => setDlg(null)} fullWidth maxWidth="xs">
        <DialogTitle>{dlg?.mode === "add" ? "Add department" : "Rename department"}</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField autoFocus fullWidth label="Department name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} {...fe(errors, "name")} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} busy={busy} confirmLabel="Delete"
        title={del?.type === "dept" ? `Delete ${del?.dept.name}?` : `Delete "${del?.desig?.name}"?`}
        message={del?.type === "dept" ? "It disappears from the dropdowns. Employees already in this department keep their record, and you can restore it later." : "It disappears from the designation dropdown. Employees who already have it keep it."}
        onConfirm={confirmDelete} onClose={() => setDel(null)} />
    </>
  );
}
