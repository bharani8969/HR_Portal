import { useState } from "react";
import { Alert, Button, TextField, Link as MLink } from "@mui/material";
import { Link } from "react-router-dom";
import AuthCard from "../../components/AuthCard.jsx";
import { api } from "../../services/apiClient.js";
import { fe } from "../../utils/forms.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [done, setDone] = useState(false); const [errors, setErrors] = useState({});
  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    try { await api("/auth/forgot-password", { method: "POST", body: { email: email.trim() } }); setDone(true); }
    catch (x) { setErrors(Object.keys(x.fields).length ? x.fields : { email: x.message }); }
  };
  return (
    <AuthCard title="Forgot password" subtitle="We'll email you a single-use link that expires in 30 minutes.">
      {done ? <Alert severity="success">If that account exists, an email has been sent.</Alert> : (
        <form onSubmit={submit} noValidate>
          <TextField fullWidth type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} {...fe(errors, "email")} />
          <Button type="submit" fullWidth variant="contained" size="large">Send reset link</Button>
        </form>
      )}
      <MLink component={Link} to="/login" sx={{ display: "block", textAlign: "center", mt: 3 }}>Back to sign in</MLink>
    </AuthCard>
  );
}
