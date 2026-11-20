import { useEffect, useState } from "react";
import { Paper, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Typography, MenuItem, TextField, Box } from "@mui/material";
import { api } from "../../services/apiClient.js";

const ACTIONS = ["", "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT", "PASSWORD_CHANGED", "HR_CREATED", "HR_UPDATED", "HR_ACTIVATED", "HR_DEACTIVATED"];

export default function ActivityLogs() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`/admin/audit-logs?page=${page + 1}&pageSize=20${action ? `&action=${action}` : ""}`).then(setData).catch((e) => setErr(e.message));
  }, [page, action]);
  return (
    <>
      <Typography variant="h4" fontWeight={800} className="fade-up">Activity Logs</Typography>
      <Typography color="text.secondary" className="fade-up d1" sx={{ mb: 3 }}>Security and account events across the company.</Typography>
      {err && <Typography color="error" role="alert">{err}</Typography>}
      <Paper className="fade-up d2" elevation={0} sx={{ border: "1px solid #E4EAF7", overflow: "auto" }}>
        <Box sx={{ p: 2 }}>
          <TextField select size="small" label="Action" value={action} sx={{ minWidth: 220 }} onChange={(e) => { setAction(e.target.value); setPage(0); }}>
            {ACTIONS.map((a) => <MenuItem key={a} value={a}>{a || "All actions"}</MenuItem>)}
          </TextField>
        </Box>
        <Table size="small">
          <TableHead><TableRow><TableCell>When</TableCell><TableCell>Actor</TableCell><TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>IP</TableCell></TableRow></TableHead>
          <TableBody>
            {!data && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
            {data?.items.length === 0 && <TableRow><TableCell colSpan={5}>No events found.</TableCell></TableRow>}
            {data?.items.map((r) => (
              <TableRow key={r.id} hover><TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell><TableCell>{r.actor}</TableCell>
                <TableCell>{r.action}</TableCell><TableCell>{r.entityType}</TableCell><TableCell>{r.ip ?? "-"}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_, p) => setPage(p)} />
      </Paper>
    </>
  );
}
