import { useState } from "react";
import { Alert, Box, Button, TextField, Typography, Paper, InputAdornment, IconButton, CircularProgress, Link as MLink } from "@mui/material";
import Visibility from "@mui/icons-material/VisibilityRounded";
import VisibilityOff from "@mui/icons-material/VisibilityOffRounded";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, homeFor } from "../../context/AuthContext.jsx";
import BrandHeader from "../../components/BrandHeader.jsx";
import PoweredBy from "../../components/PoweredBy.jsx";
import { BRAND } from "../../brand.js";
import { fe } from "../../utils/forms.js";

export default function Login() {
  const navigate = useNavigate();
  const { login, verifyMfa } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState(false);
  const [code, setCode] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [expired] = useState(() => { const x = sessionStorage.getItem("expired") === "1"; sessionStorage.removeItem("expired"); return x; });

  // The server decides the role; the form never sends one.
  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (mfa) {
      setBusy(true);
      try { navigate(homeFor(await verifyMfa(code.trim()))); } catch (err) { setErrors({ code: err.message }); setBusy(false); }
      return;
    }
    const local = {};
    if (!form.email.trim()) local.email = "Enter your email";
    if (!form.password) local.password = "Enter your password";
    if (Object.keys(local).length) return setErrors(local);
    setBusy(true);
    try {
      const r = await login(form.email.trim(), form.password);
      if (r.mfaRequired) { setMfa(true); setBusy(false); } else navigate(homeFor(r));
    } catch (err) { setErrors(Object.keys(err.fields).length ? err.fields : { password: err.message }); setBusy(false); }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" } }}>
      <Box className="hero-gradient" sx={{ position: "relative", overflow: "hidden", display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "space-between", p: 6, color: "#fff" }}>
        <span className="blob" style={{ width: 380, height: 380, background: "var(--blue)", top: -80, left: -80 }} />
        <span className="blob" style={{ width: 320, height: 320, background: "var(--teal)", bottom: -60, right: -40, animationDelay: "3s" }} />
        <Box className="fade-up" sx={{ position: "relative" }}><BrandHeader light /></Box>
        <Box sx={{ position: "relative" }}>
          <Typography variant="h3" className="fade-up d2">{BRAND.clientName}</Typography>
          <Typography variant="h6" sx={{ mt: 1, opacity: .88, fontWeight: 500 }} className="fade-up d3">{BRAND.appName} · {BRAND.tagline}</Typography>
        </Box>
        <Box sx={{ position: "relative" }}><PoweredBy light /></Box>
      </Box>

      <Box sx={{ display: "grid", placeItems: "center", p: 3 }}>
        <Paper className="fade-up d2" elevation={0} sx={{ p: { xs: 3, sm: 5 }, width: "100%", maxWidth: 440, border: "1px solid #E4EAF7", boxShadow: "0 24px 60px rgba(11,31,75,.08)" }}>
          <Box sx={{ display: { xs: "block", md: "none" }, mb: 3 }}><BrandHeader /></Box>
          <Typography variant="h5">{mfa ? "Two-step verification" : "Welcome back"}</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>{mfa ? "Enter the 6-digit code from your authenticator app." : "Sign in to manage employee records."}</Typography>
          {expired && !mfa && <Alert severity="info" sx={{ mb: 2 }}>Your session ended. Please sign in again.</Alert>}
          <form onSubmit={submit} noValidate>
            {mfa ? (
              <TextField fullWidth autoFocus label="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputProps={{ inputMode: "numeric", autoComplete: "one-time-code" }} {...fe(errors, "code")} />
            ) : (<>
              <TextField fullWidth label="Email" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} sx={{ mb: 2 }} {...fe(errors, "email")} />
              <TextField fullWidth label="Password" type={show ? "text" : "password"} autoComplete="current-password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} {...fe(errors, "password")}
                InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton aria-label="toggle password" onClick={() => setShow(!show)}>{show ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} />
              <Box sx={{ textAlign: "right", mt: 1 }}><MLink component={Link} to="/forgot-password" underline="hover" variant="body2">Forgot password?</MLink></Box>
            </>)}
            <Button type="submit" fullWidth size="large" variant="contained" disabled={busy} sx={{ mt: 3, py: 1.4 }}>
              {busy ? <CircularProgress size={24} color="inherit" /> : mfa ? "Verify" : "Sign in"}
            </Button>
          </form>
          <Box sx={{ textAlign: "center", mt: 3 }}><PoweredBy center /></Box>
        </Paper>
      </Box>
    </Box>
  );
}
