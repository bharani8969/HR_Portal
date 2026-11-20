import { useEffect, useState } from "react";
import { Alert, Grid, LinearProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { api } from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const Tile = ({ label, value, i }) => (
  <Grid item xs={6} md={3}><Paper className={`fade-up lift d${i}`} elevation={0} sx={{ p: 3, border: "1px solid #E4EAF7" }}>
    <Typography variant="h4" fontWeight={800}>{value ?? 0}</Typography><Typography color="text.secondary" variant="body2">{label}</Typography></Paper></Grid>
);

export default function Reports() {
  const { user } = useAuth();
  const admin = user.role === "ADMIN";
  const [c, setC] = useState(null); const [d, setD] = useState(null); const [h, setH] = useState(null); const [err, setErr] = useState("");
  useEffect(() => {
    api("/reports/employee-count").then(setC).catch((e) => setErr(e.message));
    api("/reports/document-status").then(setD).catch((e) => setErr(e.message));
    if (admin) api("/reports/hr-wise-employees").then(setH).catch((e) => setErr(e.message));
  }, [admin]);
  const pct = d && d.employees ? Math.round((d.fullyDocumented / d.employees) * 100) : 0;
  return (
    <>
      <Typography variant="h4" fontWeight={800} className="fade-up">Reports</Typography>
      <Typography color="text.secondary" className="fade-up d1" sx={{ mb: 3 }}>{admin ? "Company-wide aggregates." : "Summaries for your assigned employees."}</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Tile i={1} label="Complete employees" value={c?.registration.COMPLETE} /><Tile i={2} label="Drafts" value={c?.registration.DRAFT} />
        <Tile i={3} label="Active" value={c?.employment.ACTIVE} /><Tile i={4} label="Inactive / on leave / exited" value={(c?.employment.INACTIVE ?? 0) + (c?.employment.ON_LEAVE ?? 0) + (c?.employment.EXITED ?? 0)} />
      </Grid>
      <Paper className="fade-up d3" elevation={0} sx={{ p: 3, border: "1px solid #E4EAF7", mb: 3 }}>
        <Typography fontWeight={800}>Document completion</Typography>
        <Typography variant="body2" color="text.secondary">{d ? `${d.fullyDocumented} of ${d.employees} complete employees have all ${d.requiredCategories} required documents (clean).` : "Loading…"}</Typography>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 10, borderRadius: 5, mt: 1.5 }} />
        <Typography variant="caption">{pct}%</Typography>
        {d?.byCategory.length > 0 && <Table size="small" sx={{ mt: 2 }}><TableHead><TableRow><TableCell>Category</TableCell><TableCell align="right">Uploaded</TableCell></TableRow></TableHead>
          <TableBody>{d.byCategory.map((x) => <TableRow key={x.category}><TableCell>{x.category}</TableCell><TableCell align="right">{x.uploaded}</TableCell></TableRow>)}</TableBody></Table>}
      </Paper>
      {admin && (
        <Paper className="fade-up d4" elevation={0} sx={{ border: "1px solid #E4EAF7", overflow: "auto" }}>
          <Table><TableHead><TableRow><TableCell>HR user</TableCell><TableCell>Status</TableCell><TableCell align="right">Complete</TableCell><TableCell align="right">Draft</TableCell></TableRow></TableHead>
            <TableBody>{(h?.items ?? []).map((x) => <TableRow key={x.id} hover><TableCell>{x.name}</TableCell><TableCell>{x.status}</TableCell><TableCell align="right">{x.complete}</TableCell><TableCell align="right">{x.draft}</TableCell></TableRow>)}</TableBody></Table>
        </Paper>
      )}
    </>
  );
}
