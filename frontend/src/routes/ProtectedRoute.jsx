import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, homeFor } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <div className="boot"><div className="boot-ring" /></div>; // same spinner as the static first paint; the full loader appears only if this takes >0.4 s
  if (!user) return <Navigate to="/login" replace />;
  if (user.mfaSetupRequired && pathname !== "/security") return <Navigate to="/security" replace />; // Admin must enable MFA first
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
