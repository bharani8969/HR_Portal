import { useState } from "react";
import { AppBar, Avatar, Box, Chip, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip, Typography } from "@mui/material";
import MenuRounded from "@mui/icons-material/MenuRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import BadgeRounded from "@mui/icons-material/BadgeRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import BrandHeader from "../components/BrandHeader.jsx";
import PoweredBy from "../components/PoweredBy.jsx";
import WelcomeSplash from "../components/WelcomeSplash.jsx";
import { SOON } from "../modules.jsx";

const W = 272;
const ADMIN_NAV = [
  ["/admin", "Dashboard", <DashboardRounded />], ["/admin/hr", "HR Management", <BadgeRounded />], ["/admin/employees", "Employees", <GroupsRounded />],
  ["/admin/departments", "Departments", <ApartmentRounded />], ["/admin/fields", "Form Fields", <TuneRounded />], ["/reports", "Reports", <InsightsRounded />],
  ["/admin/logs", "Activity Logs", <HistoryRounded />], ["/security", "Security", <ShieldRounded />],
];
const HR_NAV = [
  ["/dashboard", "Dashboard", <DashboardRounded />], ["/employees", "Employees", <GroupsRounded />], ["/employees/new", "Add Employee", <PersonAddAlt1Rounded />],
  ["/reports", "Reports", <InsightsRounded />], ["/security", "Security", <ShieldRounded />],
];
const Label = ({ children }) => <Typography variant="caption" sx={{ px: 2, pt: 2, pb: .5, display: "block", fontWeight: 800, letterSpacing: ".1em", color: "#7A89A8" }}>{children}</Typography>;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [splash] = useState(() => { const s = sessionStorage.getItem("welcome") === "1"; sessionStorage.removeItem("welcome"); return s; });
  const nav = user?.role === "ADMIN" ? ADMIN_NAV : HR_NAV;
  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const menu = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", pt: "88px", pb: 2, px: 1.5, overflowY: "auto" }}>
      <Label>MENU</Label>
      <List sx={{ display: "grid", gap: .5, py: 0 }}>
        {nav.map(([to, label, icon], i) => (
          <ListItemButton key={to} component={NavLink} to={to} end onClick={() => setOpen(false)} className="fade-up" style={{ animationDelay: `${i * 0.04}s` }}
            sx={{ borderRadius: 3, py: 1.05, color: "#34445F", transition: "all .2s ease",
              "&:hover": { background: "color-mix(in srgb, var(--blue) 9%, transparent)", transform: "translateX(4px)" },
              "&.active": { color: "#fff", background: "linear-gradient(90deg,var(--blue),var(--teal))", boxShadow: "0 10px 22px color-mix(in srgb, var(--blue) 30%, transparent)", "&:hover": { transform: "none" } } }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{icon}</ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }} />
          </ListItemButton>
        ))}
      </List>
      <Label>HR TOOLS</Label>
      <List sx={{ display: "grid", gap: .5, py: 0 }}>
        {SOON.map((m) => (
          <Tooltip key={m.key} title="Under development" placement="right" arrow>
            <span style={{ display: "block", cursor: "not-allowed" }}>
              <ListItemButton disabled sx={{ borderRadius: 3, py: 1.05, "&.Mui-disabled": { opacity: .75 } }}>
                <ListItemIcon sx={{ color: "#8A97B2", minWidth: 40 }}>{m.icon}</ListItemIcon>
                <ListItemText primary={m.label} primaryTypographyProps={{ fontWeight: 700, fontSize: 14, color: "#6B7A99", noWrap: true }} />
                <Chip size="small" label="Soon" sx={{ height: 20, fontSize: 10, bgcolor: "#E4EAF7", color: "#5B6B8C" }} />
              </ListItemButton>
            </span>
          </Tooltip>
        ))}
      </List>
      <Box sx={{ mt: "auto", pt: 2 }}>
        <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: "#F4F7FE", border: "1px solid #E4EAF7" }}><PoweredBy variant="caption" /></Box>
      </Box>
    </Box>
  );
  const paper = { width: W, border: 0, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", borderRight: "1px solid #E4EAF7" };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {splash && <WelcomeSplash name={user?.name} />}
      {/* White glass header so the logo, name and "Powered by" text are always readable */}
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: "rgba(255,255,255,.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E4EAF7", color: "text.primary" }}>
        <Toolbar sx={{ justifyContent: "space-between", minHeight: 72 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton aria-label="menu" onClick={() => setOpen(true)} sx={{ display: { md: "none" } }}><MenuRounded /></IconButton>
            <BrandHeader />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
              <Typography fontWeight={800} lineHeight={1.2} sx={{ color: "#0B1F4B" }}>{user?.name}</Typography>
              <Typography variant="caption" sx={{ color: "#5B6B8C", fontWeight: 700 }}>{user?.role === "ADMIN" ? "Administrator" : "HR"}</Typography>
            </Box>
            <Avatar sx={{ width: 42, height: 42, fontWeight: 800, background: "linear-gradient(135deg,var(--blue),var(--teal))", color: "#fff" }}>{initials}</Avatar>
            <Tooltip title="Sign out"><IconButton aria-label="sign out" onClick={async () => { await logout(); navigate("/login"); }} sx={{ color: "#34445F" }}><LogoutRounded /></IconButton></Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": paper }} open>{menu}</Drawer>
      <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": paper }}>{menu}</Drawer>
      <Box component="main" sx={{ ml: { md: `${W}px` }, pt: "96px", px: { xs: 2, md: 4, xl: 6 }, pb: 6 }}>
        <Box key={pathname} className="page-enter" sx={{ maxWidth: 1760, mx: "auto" }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
