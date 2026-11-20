import { useEffect, useState } from "react";
import { Avatar, Box, Chip, Grid, List, ListItemAvatar, ListItemButton, ListItemText, Typography, Skeleton } from "@mui/material";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import PersonAddIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import FolderIcon from "@mui/icons-material/FolderCopyRounded";
import EditNoteIcon from "@mui/icons-material/EditNoteRounded";
import InsightsIcon from "@mui/icons-material/InsightsRounded";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/apiClient.js";
import StatCard from "../../components/StatCard.jsx";
import WelcomeBanner from "../../components/WelcomeBanner.jsx";
import Panel from "../../components/Panel.jsx";
import RingProgress from "../../components/RingProgress.jsx";
import BarRow from "../../components/BarRow.jsx";
import QuickAction from "../../components/QuickAction.jsx";
import ComingSoon from "../../components/ComingSoon.jsx";
import { DOC_LABELS } from "../../constants.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [d, setD] = useState({ total: 0, thisMonth: 0, drafts: 0, pendingDocuments: 0 });
  const [docs, setDocs] = useState(null); const [recent, setRecent] = useState(null);
  useEffect(() => {
    api("/dashboard/hr").then(setD).catch(() => {});
    api("/reports/document-status").then(setDocs).catch(() => {});
    api("/employees?pageSize=6").then(setRecent).catch(() => {});
  }, []);
  const pct = docs && docs.employees ? Math.round((docs.fullyDocumented / docs.employees) * 100) : 0;
  const up = (k) => docs?.byCategory.find((c) => c.category === k)?.uploaded ?? 0;

  return (
    <>
      <WelcomeBanner subtitle="Here is an overview of the employee records you manage." />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<PeopleIcon />} label="My employees" value={d.total} delay="d1" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<PersonAddIcon />} label="Added this month" value={d.thisMonth} delay="d2" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<FolderIcon />} label="Pending documents" value={d.pendingDocuments} delay="d3" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><StatCard icon={<EditNoteIcon />} label="Drafts" value={d.drafts} delay="d4" /></Grid>
      </Grid>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Panel title="Document completion" subtitle="Complete employees with every required document uploaded and clean" delay="d3">
            <Box sx={{ display: "flex", gap: 4, alignItems: "center", flexWrap: { xs: "wrap", md: "nowrap" } }}>
              <RingProgress value={pct} label={`${pct}%`} sub="COMPLETE" />
              <Box sx={{ flex: 1, minWidth: 260, width: "100%" }}>
                {Object.entries(DOC_LABELS).map(([k, l]) => <BarRow key={k} label={l} value={up(k)} max={docs?.employees || 1} note={`${up(k)} / ${docs?.employees ?? 0}`} />)}
              </Box>
            </Box>
          </Panel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Panel title="Quick actions" subtitle="Jump straight to what you do most" delay="d4">
            <Box sx={{ display: "grid", gap: 1.75 }}>
              <QuickAction delay="d4" icon={<PersonAddIcon />} title="Add employee" text="Start a new record" to="/employees/new" />
              <QuickAction delay="d5" icon={<PeopleIcon />} title="Employee directory" text="Search and open profiles" to="/employees" />
              <QuickAction delay="d6" icon={<InsightsIcon />} title="Reports" text="Documents and headcount" to="/reports" />
            </Box>
          </Panel>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Panel title="Recently added" subtitle="Your newest employee records" delay="d4"
            action={<Chip label="View all" onClick={() => navigate("/employees")} clickable color="primary" variant="outlined" />}>
            {!recent && [0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1.5 }} className="skeleton" />)}
            {recent?.items.length === 0 && <Typography color="text.secondary">No employees yet. Add your first one.</Typography>}
            <List disablePadding>
              {recent?.items.map((e, i) => (
                <ListItemButton key={e.id} onClick={() => navigate("/employees")} className="fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }} sx={{ borderRadius: 3, mb: .5 }}>
                  <ListItemAvatar><Avatar sx={{ fontWeight: 800, background: "linear-gradient(135deg,var(--blue),var(--teal))" }}>{e.firstName[0]}{e.lastName[0]}</Avatar></ListItemAvatar>
                  <ListItemText primary={`${e.firstName} ${e.lastName}`} primaryTypographyProps={{ fontWeight: 800 }} secondary={`${e.employeeCode} · ${e.designation ?? "No designation"} · ${e.department ?? "No department"}`} />
                  <Chip size="small" label={e.registrationStatus} color={e.registrationStatus === "COMPLETE" ? "success" : "warning"} variant="outlined" />
                </ListItemButton>
              ))}
            </List>
          </Panel>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Panel title="Coming soon" subtitle="More HR tools are on the way" delay="d5"><ComingSoon /></Panel>
        </Grid>
      </Grid>
    </>
  );
}
