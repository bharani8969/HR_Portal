import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import { api, apiBlob, apiUpload } from "../services/apiClient.js";

const CATS = [["CV", "CV"], ["AADHAAR", "Aadhaar Card"], ["BANK_PROOF", "Bank Proof"], ["EDUCATION_PROOF", "Education Proof"], ["PREVIOUS_EMPLOYMENT", "Previous Employment Proof"], ["OFFER_LETTER", "Offer Letter"], ["PAN_CARD", "PAN Card"], ["PHOTO", "Photo"]];
const STATUS = { ACTIVE: ["Uploaded (scan clean)", "success"], REJECTED: ["Rejected by security scan", "error"], FAILED: ["Scan failed, retry", "warning"], PENDING: ["Pending scan", "default"] };

export default function DocumentsPanel({ employeeId, readOnly = false }) {
  const [data, setData] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(null); const [extraName, setExtraName] = useState("");
  const pick = useRef(null); const target = useRef(null);

  const load = useCallback(() => api(`/employees/${employeeId}/documents`).then(setData).catch((e) => setErr(e.message)), [employeeId]);
  useEffect(() => { load(); }, [load]);

  const upload = async (cat, file, doc, name) => {
    setErr(""); setBusy(cat + (doc?.id ?? ""));
    const f = new FormData(); f.append("file", file);
    try {
      if (doc?.hasFile) await apiUpload(`/documents/${doc.id}/versions`, f);
      else { f.append("category", cat); if (name) f.append("name", name); await apiUpload(`/employees/${employeeId}/documents`, f); }
    } catch (e) { setErr(e.message); }
    setBusy(""); setConfirm(null); load();
  };
  const choose = (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const { cat, doc } = target.current;
    if (doc?.hasFile) setConfirm({ cat, doc, file }); // replacement needs confirmation
    else upload(cat, file, doc, cat === "ADDITIONAL" ? extraName.trim() : undefined);
  };
  const open = (cat, doc) => { target.current = { cat, doc }; pick.current.accept = cat === "PHOTO" ? ".jpg,.jpeg,.png" : ".pdf"; pick.current.click(); };
  const fetchFile = async (doc, inline) => {
    try {
      const blob = await apiBlob(`/documents/${doc.id}/download${inline ? "?inline=1" : ""}`, { label: inline ? "Opening your document…" : "Preparing your download…" });
      const url = URL.createObjectURL(blob);
      if (inline) window.open(url, "_blank", "noopener"); else { const a = document.createElement("a"); a.href = url; a.download = doc.name; a.click(); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setErr(e.message); }
  };

  const byCat = (c) => data?.items.find((i) => i.category === c);
  const extras = data?.items.filter((i) => i.category === "ADDITIONAL") ?? [];
  const row = (cat, label, doc) => {
    const st = doc ? STATUS[doc.status] : ["Missing", "default"];
    return (
      <Paper key={doc?.id ?? cat} variant="outlined" sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 160 }}><Typography fontWeight={700}>{label}</Typography>
          <Chip size="small" label={st[0]} color={st[1]} variant="outlined" /></Box>
        {doc?.hasFile && <><Button size="small" onClick={() => fetchFile(doc, true)}>Preview</Button><Button size="small" onClick={() => fetchFile(doc, false)}>Download</Button></>}
        {!readOnly && <Button size="small" variant="outlined" disabled={!!busy} onClick={() => open(cat, doc)}>{busy === cat + (doc?.id ?? "") ? "Scanning…" : doc?.hasFile ? "Replace" : "Upload"}</Button>}
      </Paper>
    );
  };

  if (!data) return <Typography color="text.secondary">{err || "Loading documents…"}</Typography>;
  const { done, total } = data.completion;
  return (
    <Box>
      <input type="file" hidden ref={pick} onChange={choose} />
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">{done} of {total} required documents uploaded and clean</Typography>
        <LinearProgress variant="determinate" value={(done / total) * 100} sx={{ height: 8, borderRadius: 4, mt: .5 }} />
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}
      <Box sx={{ display: "grid", gap: 1 }}>
        {CATS.map(([c, l]) => row(c, l, byCat(c)))}
        <Typography fontWeight={700} sx={{ mt: 2 }}>Additional documents</Typography>
        {extras.map((d) => row("ADDITIONAL", d.name, d))}
        {!readOnly && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField size="small" label="Display name" value={extraName} onChange={(e) => setExtraName(e.target.value)} />
            <Button variant="outlined" disabled={!extraName.trim() || !!busy} onClick={() => open("ADDITIONAL", undefined)}>Add document (PDF)</Button>
          </Box>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>Files are checked, scanned and stored privately. They are unavailable until the scan is clean.</Typography>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>Replace this document?</DialogTitle>
        <DialogContent><Typography>A new version is created. The previous version is kept in history.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirm(null)}>Cancel</Button><Button variant="contained" onClick={() => upload(confirm.cat, confirm.file, confirm.doc)}>Replace</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
