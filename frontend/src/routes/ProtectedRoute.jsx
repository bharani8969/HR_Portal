import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth, homeFor } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mfaSetupRequired && pathname !== "/security") return <Navigate to="/security" replace />; // Admin must enable MFA first
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
