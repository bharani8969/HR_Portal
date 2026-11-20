import { useState } from "react";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/apiClient.js";
import { fe } from "../utils/forms.js";

export default function Security() {
  const { user, refresh } = useAuth();
  const [setup, setSetup] = useState(null); const [code, setCode] = useState(""); const [mfaErr, setMfaErr] = useState({});
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" }); const [pwErr, setPwErr] = useState({}); const [pwOk, setPwOk] = useState(false);
  const start = async () => { try { setSetup(await api("/auth/mfa/setup", { method: "POST" })); } catch (e) { setMfaErr({ code: e.message }); } };
  const enable = async () => { setMfaErr({}); try { await api("/auth/mfa/enable", { method: "POST", body: { code } }); setSetup(null); await refresh(); } catch (e) { setMfaErr(Object.keys(e.fields).length ? e.fields : { code: e.message }); } };
  const change = async () => {
    setPwErr({}); setPwOk(false);
    try { await api("/auth/change-password", { method: "POST", body: pw }); setPwOk(true); setPw({ currentPassword: "", newPassword: "" }); }
    catch (e) { setPwErr(Object.keys(e.fields).length ? e.fields : { currentPassword: e.message }); }
  };
  return (
    <>
      <Typography variant="h4" className="fade-up">Security</Typography>
      <Typography color="text.secondary" className="fade-up d1" sx={{ mb: 3 }}>Your password and optional two-step verification.</Typography>
      <Paper className="fade-up d2" elevation={0} sx={{ p: 3, border: "1px solid #E4EAF7", mb: 3, maxWidth: 520 }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>Change password</Typography>
        <Box sx={{ display: "grid", gap: 2 }}>
          <TextField type="password" label="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} {...fe(pwErr, "currentPassword")} />
          <TextField type="password" label="New password (12+ characters)" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} {...fe(pwErr, "newPassword")} />
          <Button variant="contained" onClick={change}>Change password</Button>
          {pwOk && <Alert severity="success">Password changed.</Alert>}
        </Box>
      </Paper>
      <Paper className="fade-up d3" elevation={0} sx={{ p: 3, border: "1px solid #E4EAF7", maxWidth: 520 }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>Two-step verification (optional)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Adds an authenticator-app code when you sign in. Not required.</Typography>
        {user.mfaEnabled ? <Alert severity="success">Enabled.</Alert> : !setup ? <Button variant="outlined" onClick={start}>Set up</Button> : (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="body2">Scan this QR code with Google or Microsoft Authenticator, then enter the 6-digit code.</Typography>
            <img src={setup.qr} alt="MFA QR code" width={200} height={200} />
            <Typography variant="caption" sx={{ fontFamily: "monospace", userSelect: "all" }}>Manual key: {setup.secret}</Typography>
            <TextField label="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} {...fe(mfaErr, "code")} />
            <Button variant="contained" onClick={enable} disabled={code.length !== 6}>Enable</Button>
          </Box>
        )}
      </Paper>
    </>
  );
}
