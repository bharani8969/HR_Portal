import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Avatar, Box, Button, Chip, Drawer, Grid, IconButton, InputAdornment, MenuItem, Pagination, Paper, Skeleton, Tab, Tabs, TextField, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import PersonSearchRounded from "@mui/icons-material/PersonSearchRounded";
import FilterAltOffRounded from "@mui/icons-material/FilterAltOffRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import BadgeRounded from "@mui/icons-material/BadgeRounded";
import { useNavigate } from "react-router-dom";
import DocumentsPanel from "../../components/DocumentsPanel.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { api } from "../../services/apiClient.js";
import { archiveEmployee, getEmployee, getSensitive, listDepartments, listEmployees } from "../../services/employeeService.js";

const Field = ({ label, value }) => (
  <Grid item xs={12} sm={6}><Typography variant="caption" sx={{ color: "#6B7A99" }} fontWeight={800}>{label.toUpperCase()}</Typography><Typography fontWeight={600} sx={{ wordBreak: "break-word" }}>{value || "-"}</Typography></Grid>
);
const Section = ({ title, children }) => (
  <Box sx={{ mb: 3.5 }}><Typography fontWeight={800} sx={{ mb: 1.5, pb: 1, borderBottom: "2px solid color-mix(in srgb, var(--blue) 14%, transparent)" }}>{title}</Typography><Grid container spacing={2.5}>{children}</Grid></Box>
);
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "");
const Avt = ({ e, size = 52 }) => (
  <Avatar sx={{ width: size, height: size, fontWeight: 800, fontSize: size / 2.8, color: "#fff", background: "linear-gradient(135deg,var(--blue),var(--teal))", boxShadow: "0 8px 18px color-mix(in srgb, var(--blue) 28%, transparent)" }}>{e.firstName[0]}{e.lastName[0]}</Avatar>
);

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const [q, setQ] = useState(""); const [registration, setRegistration] = useState(""); const [departmentId, setDepartmentId] = useState(""); const [sort, setSort] = useState("newest"); const [page, setPage] = useState(1);
  const [list, setList] = useState(null); const [counts, setCounts] = useState({}); const [depts, setDepts] = useState([]); const [defs, setDefs] = useState([]);
  const [sel, setSel] = useState(null); const [emp, setEmp] = useState(null); const [tab, setTab] = useState(0);
  const [revealed, setRevealed] = useState(null); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const timer = useRef();
  const PAGE = 12;

  const load = useCallback(() => { listEmployees({ q, registration, departmentId, sort, page, pageSize: PAGE }).then(setList).catch((e) => setErr(e.message)); }, [q, registration, departmentId, sort, page]);
  useEffect(() => { setList(null); const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    api("/reports/employee-count").then((c) => setCounts(c.registration)).catch(() => {});
    listDepartments().then((d) => setDepts(d.items)).catch(() => {});
    api("/custom-fields").then((d) => setDefs(d.items)).catch(() => {});
  }, []);
  useEffect(() => {
    setRevealed(null); setTab(0);
    if (sel) getEmployee(sel).then((d) => setEmp(d.employee)).catch((e) => setErr(e.message)); else setEmp(null);
  }, [sel]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const reveal = async () => { try { setRevealed(await getSensitive(sel)); clearTimeout(timer.current); timer.current = setTimeout(() => setRevealed(null), 15000); } catch (e) { setErr(e.message); } };
  const remove = async () => {
    setBusy(true);
    try { await archiveEmployee(sel); setSel(null); } catch (e) { setErr(e.message); }
    setBusy(false); setConfirm(false); load(); api("/reports/employee-count").then((c) => setCounts(c.registration)).catch(() => {});
  };
  const sv = (k) => (revealed ? revealed[k] : emp?.sensitive[k]);
  const cf = (section) => defs.filter((c) => c.section === section).map((c) => <Field key={c.id} label={c.label} value={emp?.customData?.[c.fieldKey] === undefined ? "" : String(emp.customData[c.fieldKey])} />);
  const filtered = q || registration || departmentId;
  const clear = () => { setQ(""); setRegistration(""); setDepartmentId(""); setPage(1); };
  const all = (counts.COMPLETE ?? 0) + (counts.DRAFT ?? 0);
  const pills = [["", "All", all], ["COMPLETE", "Complete", counts.COMPLETE ?? 0], ["DRAFT", "Drafts", counts.DRAFT ?? 0]];

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box><Typography variant="h4" className="fade-up">Employee Directory</Typography>
          <Typography color="text.secondary" className="fade-up d1">Search, filter and open the records you manage.</Typography></Box>
        <Button variant="contained" size="large" onClick={() => navigate("/employees/new")}>Add Employee</Button>
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}

      <Paper className="fade-up d1" elevation={0} sx={{ p: 2.5, mb: 3, border: "1px solid #E4EAF7", boxShadow: "0 10px 34px rgba(11,31,75,.05)" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField fullWidth placeholder="Search by name or employee code" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded sx={{ color: "var(--blue)" }} /></InputAdornment>, endAdornment: q && <InputAdornment position="end"><IconButton size="small" aria-label="clear search" onClick={() => setQ("")}><CloseRounded fontSize="small" /></IconButton></InputAdornment> }} />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField select fullWidth label="Department" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
              <MenuItem value=""><em>All departments</em></MenuItem>{depts.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField select fullWidth label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
              <MenuItem value="newest">Newest first</MenuItem><MenuItem value="name">Name (A to Z)</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", mt: 2.5 }}>
          {pills.map(([v, l, n]) => {
            const on = registration === v;
            return (
              <Button key={l} size="small" onClick={() => { setRegistration(v); setPage(1); }} className="tap"
                sx={{ borderRadius: 99, px: 2, py: .7, fontWeight: 800, border: "1.5px solid", borderColor: on ? "transparent" : "#DCE3F3", color: on ? "#fff" : "#34445F", background: on ? "linear-gradient(90deg,var(--blue),var(--teal))" : "#fff", boxShadow: on ? "0 8px 18px color-mix(in srgb, var(--blue) 28%, transparent)" : "none" }}>
                {l}<Box component="span" sx={{ ml: 1, px: .9, borderRadius: 99, fontSize: 12, bgcolor: on ? "rgba(255,255,255,.25)" : "#EEF2FB" }}>{n}</Box>
              </Button>
            );
          })}
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary" fontWeight={700}>{list ? `${list.total} result${list.total === 1 ? "" : "s"}` : "Loading…"}</Typography>
          {filtered && <Button size="small" startIcon={<FilterAltOffRounded />} onClick={clear}>Clear filters</Button>}
        </Box>
      </Paper>

      <Grid container spacing={2.5}>
        {!list && Array.from({ length: 8 }).map((_, i) => <Grid item xs={12} sm={6} lg={4} xl={3} key={i}><Skeleton variant="rounded" height={170} className="skeleton" /></Grid>)}
        {list?.items.map((e, i) => (
          <Grid item xs={12} sm={6} lg={4} xl={3} key={e.id}>
            <Paper className="fade-up lift card-top tap" style={{ animationDelay: `${Math.min(i, 10) * 0.045}s` }} elevation={0} onClick={() => setSel(e.id)} role="button" tabIndex={0} onKeyDown={(k) => k.key === "Enter" && setSel(e.id)}
              sx={{ p: 2.5, border: "1px solid #E4EAF7", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column", gap: 1.75 }}>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Avt e={e} />
                <Box sx={{ minWidth: 0 }}><Typography fontWeight={800} noWrap sx={{ color: "#0B1F4B" }}>{e.firstName} {e.lastName}</Typography>
                  <Typography variant="caption" sx={{ color: "#5B6B8C", fontWeight: 700 }}>{e.employeeCode}</Typography></Box>
              </Box>
              <Box sx={{ display: "grid", gap: .5, color: "#44536F" }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}><BadgeRounded sx={{ fontSize: 17, color: "var(--blue)" }} /><Typography variant="body2" noWrap fontWeight={600}>{e.designation ?? "No designation"}</Typography></Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}><ApartmentRounded sx={{ fontSize: 17, color: "var(--blue)" }} /><Typography variant="body2" noWrap fontWeight={600}>{e.department ?? "No department"}</Typography></Box>
              </Box>
              <Box sx={{ mt: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Chip size="small" label={e.registrationStatus === "COMPLETE" ? "Complete" : "Draft"} color={e.registrationStatus === "COMPLETE" ? "success" : "warning"} />
                <Typography variant="caption" sx={{ color: "#6B7A99" }} fontWeight={700}>{e.dateOfJoining ? `Joined ${fmt(e.dateOfJoining)}` : ""}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
        {list?.items.length === 0 && (
          <Grid item xs={12}>
            <Paper className="fade-up" elevation={0} sx={{ p: 6, textAlign: "center", border: "1px dashed #CBD6EE" }}>
              <PersonSearchRounded sx={{ fontSize: 64, color: "#9AA7C2" }} />
              <Typography variant="h6" sx={{ mt: 1 }}>{filtered ? "No employees match your filters" : "No employees yet"}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>{filtered ? "Try a different search or clear the filters." : "Add your first employee to get started."}</Typography>
              {filtered ? <Button variant="outlined" onClick={clear}>Clear filters</Button> : <Button variant="contained" onClick={() => navigate("/employees/new")}>Add Employee</Button>}
            </Paper>
          </Grid>
        )}
      </Grid>
      {list && list.total > PAGE && <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><Pagination count={Math.ceil(list.total / PAGE)} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" /></Box>}

      <Drawer anchor="right" open={!!sel} onClose={() => setSel(null)} sx={{ zIndex: (t) => t.zIndex.drawer + 5 }} PaperProps={{ sx: { width: { xs: "100%", md: 640 }, borderRadius: { md: "24px 0 0 24px" } } }}>
        {emp && (
          <Box key={emp.id} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box className="hero-gradient" sx={{ p: 3, color: "#fff", position: "relative" }}>
              <IconButton aria-label="close" onClick={() => setSel(null)} sx={{ position: "absolute", top: 12, right: 12, color: "#fff" }}><CloseRounded /></IconButton>
              <Box sx={{ display: "flex", gap: 2.5, alignItems: "center" }}>
                <Avt e={emp} size={72} />
                <Box><Typography variant="h5">{emp.firstName} {emp.lastName}</Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                    <Chip size="small" label={emp.employeeCode} sx={{ bgcolor: "rgba(255,255,255,.2)", color: "#fff" }} />
                    <Chip size="small" label={emp.registrationStatus === "COMPLETE" ? "Complete" : "Draft"} sx={{ bgcolor: "#fff", color: "#0B1F4B" }} />
                  </Box></Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1, mt: 2.5 }}>
                <Button size="small" variant="contained" startIcon={<EditRounded />} onClick={() => navigate(`/employees/${emp.id}/edit`)} sx={{ bgcolor: "#fff", color: "#0B1F4B", background: "#fff", boxShadow: "none", "&:hover": { background: "#F4F7FE" } }}>Edit</Button>
                <Button size="small" variant="outlined" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirm(true)} sx={{ color: "#fff", borderColor: "rgba(255,255,255,.6)", "&:hover": { borderColor: "#fff", background: "rgba(255,255,255,.12)" } }}>Delete</Button>
              </Box>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: "1px solid #E4EAF7" }}><Tab label="Details" /><Tab label="Documents" /></Tabs>
            <Box key={tab} className="page-enter" sx={{ p: 3, overflowY: "auto", flex: 1 }}>
              {tab === 0 ? (<>
                <Section title="Personal"><Field label="Date of birth" value={fmt(emp.dob)} /><Field label="Gender" value={emp.gender} /><Field label="Mobile" value={emp.personalMobile} />
                  <Field label="Emergency contact" value={emp.emergencyContact} /><Field label="Personal email" value={emp.personalEmail} /><Field label="Current address" value={emp.currentAddress} />{cf("PERSONAL")}</Section>
                <Section title="Employment"><Field label="Department" value={emp.department} /><Field label="Designation" value={emp.designation} /><Field label="Joined" value={fmt(emp.dateOfJoining)} />
                  <Field label="Type" value={emp.employmentType} /><Field label="Reporting manager" value={emp.reportingManager} /><Field label="Official email" value={emp.officialEmail} />{cf("EMPLOYMENT")}</Section>
                <Section title="Statutory & Bank">
                  <Field label="Aadhaar" value={sv("aadhaar")} /><Field label="PAN" value={sv("pan")} /><Field label="UAN" value={sv("uan")} />
                  <Field label="Bank account" value={sv("bankAccount")} /><Field label="IFSC" value={emp.sensitive.ifsc} /><Field label="Bank" value={emp.sensitive.bankName} />{cf("BANK")}
                  <Grid item xs={12}>{revealed ? <Button size="small" onClick={() => setRevealed(null)}>Hide now</Button> : <Button size="small" variant="outlined" onClick={reveal}>Reveal sensitive values (audited, hides after 15s)</Button>}</Grid>
                </Section>
                {defs.some((c) => c.section === "ADDITIONAL") && <Section title="Additional details">{cf("ADDITIONAL")}</Section>}
              </>) : <DocumentsPanel key={emp.id} employeeId={emp.id} />}
            </Box>
          </Box>
        )}
      </Drawer>
      <ConfirmDialog open={confirm} busy={busy} title={`Delete ${emp?.firstName} ${emp?.lastName}?`} confirmLabel="Delete employee"
        message="They will disappear from your lists and counts. The record is retained securely for audit and cannot be restored from the app."
        onConfirm={remove} onClose={() => setConfirm(false)} />
    </>
  );
}
