import { useState } from "react";
import { Alert, Button, TextField, Link as MLink } from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import AuthCard from "../../components/AuthCard.jsx";
import { api } from "../../services/apiClient.js";
import { fe } from "../../utils/forms.js";

// Also used for HR invitations: the invite link sets the user's first password.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [done, setDone] = useState(false); const [errors, setErrors] = useState({}); const [general, setGeneral] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setGeneral("");
    const local = {};
    if (pw.length < 12) local.newPassword = "Use at least 12 characters";
    if (pw2 !== pw) local.confirm = "Passwords do not match";
    setErrors(local); if (Object.keys(local).length) return;
    try { await api("/auth/reset-password", { method: "POST", body: { token: params.get("token") || "", newPassword: pw } }); setDone(true); }
    catch (x) { Object.keys(x.fields).length ? setErrors(x.fields) : setGeneral(x.message); }
  };
  return (
    <AuthCard title="Set your password" subtitle="Choose a strong password of at least 12 characters.">
      {done ? <Alert severity="success">Password saved. You can sign in now.</Alert> : (
        <form onSubmit={submit} noValidate>
          {general && <Alert severity="error" sx={{ mb: 2 }}>{general}</Alert>}
          <TextField fullWidth type="password" label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} sx={{ mb: 2 }} {...fe(errors, "newPassword")} />
          <TextField fullWidth type="password" label="Confirm password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} sx={{ mb: 2 }} {...fe(errors, "confirm")} />
          <Button type="submit" fullWidth variant="contained" size="large">Save password</Button>
        </form>
      )}
      <MLink component={Link} to="/login" sx={{ display: "block", textAlign: "center", mt: 3 }}>Go to sign in</MLink>
    </AuthCard>
  );
}
