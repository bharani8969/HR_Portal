import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreIcon from "@mui/icons-material/RestoreRounded";
import ArrowUp from "@mui/icons-material/KeyboardArrowUpRounded";
import ArrowDown from "@mui/icons-material/KeyboardArrowDownRounded";
import { api } from "../../services/apiClient.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { SECTIONS } from "../../constants.js";
import { fe } from "../../utils/forms.js";

const TYPES = [["TEXT", "Text"], ["NUMBER", "Number"], ["DATE", "Date"], ["DROPDOWN", "Dropdown"]];
const blank = { label: "", fieldType: "TEXT", section: "PERSONAL", required: false, optionsText: "" };

export default function FormFields() {
  const [items, setItems] = useState(null); const [err, setErr] = useState("");
  const [dlg, setDlg] = useState(null); const [f, setF] = useState(blank); const [errors, setErrors] = useState({});
  const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/admin/custom-fields").then((d) => setItems(d.items)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const open = (field) => { setErrors({}); setF(field ? { label: field.label, fieldType: field.fieldType, section: field.section, required: field.required, optionsText: field.options.join("\n") } : blank); setDlg(field ?? {}); };
  const save = async () => {
    setErrors({});
    const body = { label: f.label.trim(), fieldType: f.fieldType, section: f.section, required: f.required, ...(f.fieldType === "DROPDOWN" && { options: f.optionsText.split("\n").map((o) => o.trim()).filter(Boolean) }) };
    try {
      if (dlg.id) await api(`/admin/custom-fields/${dlg.id}`, { method: "PUT", body });
      else await api("/admin/custom-fields", { method: "POST", body });
      setDlg(null); load();
    } catch (e) { setErrors(Object.keys(e.fields).length ? e.fields : { label: e.message }); }
  };
  const move = async (x, direction) => { try { await api(`/admin/custom-fields/${x.id}/move`, { method: "POST", body: { direction } }); load(); } catch (e) { setErr(e.message); } };
  const remove = async () => { setBusy(true); try { await api(`/admin/custom-fields/${del.id}`, { method: "DELETE" }); } catch (e) { setErr(e.message); } setBusy(false); setDel(null); load(); };
  const restore = async (x) => { try { await api(`/admin/custom-fields/${x.id}/restore`, { method: "POST" }); load(); } catch (e) { setErr(e.message); } };

  const active = items?.filter((x) => x.status === "ACTIVE") ?? [];
  const removed = items?.filter((x) => x.status !== "ACTIVE") ?? [];
  const row = (x, i, group) => (
    <TableRow key={x.id} hover sx={{ opacity: x.status === "ACTIVE" ? 1 : .55 }}>
      <TableCell><Typography fontWeight={700}>{x.label}</Typography>{x.fieldType === "DROPDOWN" && <Typography variant="caption" color="text.secondary">{x.options.join(" · ")}</Typography>}</TableCell>
      <TableCell>{TYPES.find((t) => t[0] === x.fieldType)?.[1]}</TableCell>
      <TableCell>{x.required ? "Yes" : "No"}</TableCell>
      <TableCell align="right">
        {x.status === "ACTIVE" ? (<>
          <Tooltip title="Move up"><span><IconButton size="small" disabled={i === 0} aria-label={`move ${x.label} up`} onClick={() => move(x, "up")}><ArrowUp /></IconButton></span></Tooltip>
          <Tooltip title="Move down"><span><IconButton size="small" disabled={i === group.length - 1} aria-label={`move ${x.label} down`} onClick={() => move(x, "down")}><ArrowDown /></IconButton></span></Tooltip>
          <Tooltip title="Edit"><IconButton aria-label={`edit ${x.label}`} onClick={() => open(x)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Remove from form"><IconButton color="error" aria-label={`remove ${x.label}`} onClick={() => setDel(x)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </>) : <Button size="small" startIcon={<RestoreIcon />} onClick={() => restore(x)}>Restore</Button>}
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box><Typography variant="h4" className="fade-up">Form Fields</Typography>
          <Typography color="text.secondary" className="fade-up d1">Add your own fields inside the Personal, Employment or Statutory & Bank steps, or remove the ones you do not need.</Typography></Box>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => open(null)}>Add field</Button>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>Core fields (name, date of birth, department, Aadhaar, PAN, bank, documents and so on) are built in and always present. Pick the section a new field belongs to; it then appears inside that step of the employee form. Choose "Additional" only if you want a separate step.</Alert>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}
      {!items && <Typography color="text.secondary">Loading…</Typography>}
      {items && items.length === 0 && <Paper elevation={0} sx={{ p: 5, textAlign: "center", border: "1px dashed #CBD6EE" }}><Typography color="text.secondary">No custom fields yet. Press "Add field".</Typography></Paper>}
      {SECTIONS.map(([key, name], si) => {
        const group = active.filter((x) => x.section === key);
        if (!group.length) return null;
        return (
          <Box key={key} sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}><Typography variant="h6">{name}</Typography><Chip size="small" label={`${group.length} field${group.length > 1 ? "s" : ""}`} /></Box>
            <Paper className={`fade-up d${Math.min(si + 1, 6)}`} elevation={0} sx={{ border: "1px solid #E4EAF7", overflow: "auto" }}>
              <Table size="small"><TableHead><TableRow><TableCell>Field</TableCell><TableCell>Type</TableCell><TableCell>Required</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>{group.map((x, i) => row(x, i, group))}</TableBody></Table>
            </Paper>
          </Box>
        );
      })}
      {removed.length > 0 && (
        <Box sx={{ mb: 3 }}><Typography variant="h6" sx={{ mb: 1.5 }}>Removed</Typography>
          <Paper elevation={0} sx={{ border: "1px solid #E4EAF7", overflow: "auto" }}><Table size="small"><TableBody>{removed.map((x, i) => row(x, i, removed))}</TableBody></Table></Paper></Box>
      )}

      <Dialog open={!!dlg} onClose={() => setDlg(null)} fullWidth maxWidth="xs">
        <DialogTitle>{dlg?.id ? "Edit field" : "Add field"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2.5, pt: "8px !important" }}>
          <TextField autoFocus label="Field name" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} {...fe(errors, "label")} />
          <TextField select label="Show in section" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} {...fe(errors, "section")}
            helperText={errors.section || (f.section === "ADDITIONAL" ? "Creates a separate 'Additional' step" : "Appears inside this existing step of the form")}>
            {SECTIONS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          <TextField select label="Field type" value={f.fieldType} disabled={!!dlg?.id} onChange={(e) => setF({ ...f, fieldType: e.target.value })} {...fe(errors, "fieldType")}
            helperText={errors.fieldType || (dlg?.id ? "Type cannot be changed after creation" : undefined)}>
            {TYPES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          {f.fieldType === "DROPDOWN" && <TextField multiline minRows={3} label="Dropdown options" value={f.optionsText} onChange={(e) => setF({ ...f, optionsText: e.target.value })} {...fe(errors, "options")} helperText={errors.options || "One option per line"} />}
          <FormControlLabel control={<Switch checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked })} />} label="Required to submit an employee" />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} busy={busy} confirmLabel="Remove field" title={`Remove "${del?.label}"?`}
        message="It disappears from the employee form. Values already saved on employees are kept, and you can restore the field later."
        onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}
