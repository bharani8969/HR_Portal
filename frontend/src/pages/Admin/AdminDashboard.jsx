import { useEffect, useState } from "react";
import { Alert, Avatar, Box, Chip, Grid, List, ListItem, ListItemAvatar, ListItemText, Typography, Skeleton } from "@mui/material";
import GroupsIcon from "@mui/icons-material/GroupsRounded";
import BadgeIcon from "@mui/icons-material/BadgeRounded";
import PersonOffIcon from "@mui/icons-material/PersonOffRounded";
import ApartmentIcon from "@mui/icons-material/ApartmentRounded";
import TuneIcon from "@mui/icons-material/TuneRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import { api } from "../../services/apiClient.js";
import StatCard from "../../components/StatCard.jsx";
import WelcomeBanner from "../../components/WelcomeBanner.jsx";
import Panel from "../../components/Panel.jsx";
import RingProgress from "../../components/RingProgress.jsx";
import BarRow from "../../components/BarRow.jsx";
import QuickAction from "../../components/QuickAction.jsx";
import ComingSoon from "../../components/ComingSoon.jsx";
import { humanize } from "../../constants.js";

export default function AdminDashboard() {
  const [d, setD] = useState(null); const [docs, setDocs] = useState(null); const [deps, setDeps] = useState(null); const [logs, setLogs] = useState(null); const [err, setErr] = useState("");
  useEffect(() => {
    api("/dashboard/admin").then(setD).catch((e) => setErr(e.message));
    api("/reports/document-status").then(setDocs).catch(() => {});
    api("/admin/departments").then((x) => setDeps(x.items)).catch(() => {});
    api("/admin/audit-logs?pageSize=7").then(setLogs).catch(() => {});
  }, []);
  const pct = docs && docs.employees ? Math.round((docs.fullyDocumented / docs.employees) * 100) : 0;
  const maxHr = Math.max(1, ...(d?.hrWise.map((h) => h.employees) ?? [1]));
  const activeDeps = deps?.filter((x) => x.status === "ACTIVE").length ?? 0;

  return (
    <>
      <WelcomeBanner subtitle="Company-wide overview. Manage HR users, departments and the employee form." />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<GroupsIcon />} label="Total employees" value={d?.totalEmployees} delay="d1" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<BadgeIcon />} label="Active HR" value={d?.activeHr} delay="d2" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<ApartmentIcon />} label="Departments" value={activeDeps} delay="d3" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<PersonOffIcon />} label="Inactive HR" value={d?.inactiveHr} delay="d4" /></Grid>
      </Grid>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Panel title="Employees per HR" subtitle="Complete employees assigned to each HR user" delay="d3">
            {!d && [0, 1, 2].map((i) => <Skeleton key={i} height={34} className="skeleton" />)}
            {d?.hrWise.length === 0 && <Typography color="text.secondary">No HR users yet.</Typography>}
            {d?.hrWise.map((h) => <BarRow key={h.id} label={`${h.name}${h.status !== "ACTIVE" ? " (inactive)" : ""}`} value={h.employees} max={maxHr} />)}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Panel title="Document completion" subtitle="Employees with all required documents" delay="d4">
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
              <RingProgress value={pct} label={`${pct}%`} sub="COMPLETE" />
              <Box><Typography variant="h5">{docs?.fullyDocumented ?? 0} of {docs?.employees ?? 0}</Typography>
                <Typography color="text.secondary" variant="body2">complete employees have all {docs?.requiredCategories ?? 8} required documents</Typography></Box>
            </Box>
          </Panel>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Panel title="Quick actions" subtitle="Manage your organisation" delay="d4">
            <Box sx={{ display: "grid", gap: 1.75 }}>
              <QuickAction delay="d4" icon={<BadgeIcon />} title="Add HR user" text="Invite an HR by email" to="/admin/hr" />
              <QuickAction delay="d5" icon={<ApartmentIcon />} title="Departments" text="Departments and designations" to="/admin/departments" />
              <QuickAction delay="d6" icon={<TuneIcon />} title="Form fields" text="Add or remove employee fields" to="/admin/fields" />
            </Box>
          </Panel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Panel title="Recent activity" subtitle="Latest events across the company" delay="d5">
            {!logs && [0, 1, 2, 3].map((i) => <Skeleton key={i} height={44} className="skeleton" />)}
            <List disablePadding>
              {logs?.items.map((l, i) => (
                <ListItem key={l.id} disableGutters className="fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                  <ListItemAvatar sx={{ minWidth: 44 }}><Avatar sx={{ width: 34, height: 34, bgcolor: "color-mix(in srgb, var(--blue) 12%, transparent)", color: "var(--blue)" }}><BoltRounded fontSize="small" /></Avatar></ListItemAvatar>
                  <ListItemText primary={humanize(l.action)} primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }} secondary={`${l.actor} · ${new Date(l.createdAt).toLocaleString()}`} />
                </ListItem>
              ))}
            </List>
            {logs?.items.length === 0 && <Chip label="No activity yet" />}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={3}>
          <Panel title="Coming soon" subtitle="Planned modules" delay="d6"><ComingSoon columns={1} /></Panel>
        </Grid>
      </Grid>
    </>
  );
}
