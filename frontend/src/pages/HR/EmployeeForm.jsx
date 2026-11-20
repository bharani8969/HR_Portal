import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, MenuItem, Paper, Step, StepLabel, Stepper, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import DocumentsPanel from "../../components/DocumentsPanel.jsx";
import { api } from "../../services/apiClient.js";
import { createEmployee, getEmployee, listDepartments, saveSensitive, updateEmployee } from "../../services/employeeService.js";
import { fe } from "../../utils/forms.js";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];
const PROFILE_KEYS = ["firstName", "lastName", "dob", "gender", "personalMobile", "emergencyContact", "personalEmail", "currentAddress", "permanentAddress", "dateOfJoining", "departmentId", "designationId", "reportingManager", "officialEmail", "employmentType"];
const SENS_KEYS = ["aadhaar", "pan", "uan", "bankAccount", "ifsc", "bankName"];
const STEP_OF = { firstName: "personal", lastName: "personal", dob: "personal", gender: "personal", personalMobile: "personal", emergencyContact: "personal", personalEmail: "personal", currentAddress: "personal", permanentAddress: "personal",
  dateOfJoining: "employment", departmentId: "employment", designationId: "employment", reportingManager: "employment", officialEmail: "employment", employmentType: "employment",
  aadhaar: "bank", pan: "bank", uan: "bank", bankAccount: "bank", ifsc: "bank", bankName: "bank" };
const clean = (o, keys) => Object.fromEntries(keys.filter((k) => String(o[k] ?? "").trim() !== "").map((k) => [k, String(o[k]).trim()]));
const label = (o) => o.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default function EmployeeForm() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [id, setId] = useState(routeId ?? null);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ customData: {} });
  const [masked, setMasked] = useState({});
  const [depts, setDepts] = useState([]);
  const [custom, setCustom] = useState([]);
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => { listDepartments().then((d) => setDepts(d.items)).catch(() => {}); api("/custom-fields").then((d) => setCustom(d.items)).catch(() => {}); }, []);
  useEffect(() => {
    if (!routeId) return;
    getEmployee(routeId).then(({ employee: e }) => {
      setF({ ...e, dob: e.dob?.slice(0, 10) ?? "", dateOfJoining: e.dateOfJoining?.slice(0, 10) ?? "", departmentId: e.departmentId ?? "", designationId: e.designationId ?? "",
        ifsc: e.sensitive.ifsc ?? "", bankName: e.sensitive.bankName ?? "", customData: e.customData ?? {} });
      setMasked(e.sensitive);
    }).catch((x) => setErr(x.message));
  }, [routeId]);

  const steps = useMemo(() => [{ key: "personal", label: "Personal" }, { key: "employment", label: "Employment" }, ...(custom.some((c) => c.section === "ADDITIONAL") ? [{ key: "additional", label: "Additional" }] : []), { key: "bank", label: "Statutory & Bank" }, { key: "documents", label: "Documents" }], [custom]);
  const cur = steps[step]?.key;
  const SEC_STEP = { PERSONAL: "personal", EMPLOYMENT: "employment", BANK: "bank", ADDITIONAL: "additional" };
  const stepOf = (k) => (k.startsWith("customData.") ? SEC_STEP[custom.find((c) => `customData.${c.fieldKey}` === k)?.section] : STEP_OF[k]);

  const text = (k, lbl, props = {}) => (
    <Grid item xs={12} sm={6}><TextField fullWidth label={lbl} value={f[k] ?? ""} onChange={set(k)} InputLabelProps={props.type === "date" ? { shrink: true } : undefined} {...props} {...fe(errors, k)} /></Grid>
  );
  const select = (k, lbl, options, onChange = set(k)) => (
    <Grid item xs={12} sm={6}><TextField select fullWidth label={lbl} value={f[k] ?? ""} onChange={onChange} {...fe(errors, k)}>
      <MenuItem value=""><em>None</em></MenuItem>{options.map((o) => <MenuItem key={o.value ?? o} value={o.value ?? o}>{o.label ?? label(o)}</MenuItem>)}</TextField></Grid>
  );
  const desigs = depts.find((d) => d.id === f.departmentId)?.designations ?? [];
  const customField = (c) => {
    const common = { fullWidth: true, label: c.label + (c.required ? " *" : ""), value: f.customData?.[c.fieldKey] ?? "", ...fe(errors, `customData.${c.fieldKey}`),
      onChange: (e) => setF((p) => ({ ...p, customData: { ...(p.customData || {}), [c.fieldKey]: e.target.value } })) };
    return (
      <Grid item xs={12} sm={6} key={c.id}>
        {c.fieldType === "DROPDOWN"
          ? <TextField select {...common}><MenuItem value=""><em>None</em></MenuItem>{c.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField>
          : <TextField {...common} type={c.fieldType === "NUMBER" ? "number" : c.fieldType === "DATE" ? "date" : "text"} InputLabelProps={c.fieldType === "DATE" ? { shrink: true } : undefined} />}
      </Grid>
    );
  };

  const bySection = (sec) => custom.filter((c) => c.section === sec).map(customField);

  const persist = async () => {
    const local = {};
    if (!String(f.firstName ?? "").trim()) local.firstName = "This field is required";
    if (!String(f.lastName ?? "").trim()) local.lastName = "This field is required";
    if (Object.keys(local).length) throw Object.assign(new Error("Please correct the highlighted fields"), { fields: local });
    const body = clean(f, PROFILE_KEYS);
    if (custom.length) body.customData = Object.fromEntries(custom.map((c) => [c.fieldKey, f.customData?.[c.fieldKey] ?? ""]));
    let eid = id;
    if (eid) await updateEmployee(eid, body); else { eid = (await createEmployee(body)).employee.id; setId(eid); }
    const sens = clean(f, SENS_KEYS);
    if (sens.pan) sens.pan = sens.pan.toUpperCase();
    if (sens.ifsc) sens.ifsc = sens.ifsc.toUpperCase();
    if (Object.keys(sens).length) await saveSensitive(eid, sens);
    return eid;
  };
  const run = async (fn) => {
    setBusy(true); setErr(""); setMsg(""); setErrors({});
    try { await fn(); }
    catch (e) {
      const fields = e.fields || {}; setErrors(fields);
      const first = Object.keys(fields)[0];
      if (first) { const idx = steps.findIndex((s) => s.key === stepOf(first)); if (idx >= 0) setStep(idx); setErr("Please correct the highlighted fields."); }
      else setErr(e.message);
    }
    setBusy(false);
  };
  const saveDraft = () => run(async () => { await persist(); setMsg("Draft saved."); });
  const next = () => run(async () => { await persist(); setStep((s) => s + 1); });
  const submit = () => run(async () => { const eid = await persist(); await updateEmployee(eid, { submit: true }); navigate("/employees"); });

  return (
    <>
      <Typography variant="h4" className="fade-up">{routeId ? "Edit Employee" : "Add Employee"}</Typography>
      <Typography color="text.secondary" className="fade-up d1" sx={{ mb: 3 }}>Drafts are not counted as completed employees. Fields marked * are required to submit.</Typography>
      <Paper className="fade-up d2" elevation={0} sx={{ border: "1px solid #E4EAF7", p: { xs: 2, md: 4 } }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>{steps.map((s) => <Step key={s.key}><StepLabel>{s.label}</StepLabel></Step>)}</Stepper>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
        <Box key={cur} className="page-enter">
          <Grid container spacing={2.5}>
            {cur === "personal" && <>
              {text("firstName", "First name *")}{text("lastName", "Last name *")}{text("dob", "Date of birth *", { type: "date" })}{select("gender", "Gender *", GENDERS)}
              {text("personalMobile", "Personal mobile *")}{text("emergencyContact", "Emergency contact")}{text("personalEmail", "Personal email", { type: "email" })}{bySection("PERSONAL")}
              <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Current address" value={f.currentAddress ?? ""} onChange={set("currentAddress")} {...fe(errors, "currentAddress")} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Permanent address" value={f.permanentAddress ?? ""} onChange={set("permanentAddress")} {...fe(errors, "permanentAddress")} /></Grid>
            </>}
            {cur === "employment" && <>
              {text("dateOfJoining", "Date of joining *", { type: "date" })}
              {select("departmentId", "Department *", depts.map((d) => ({ value: d.id, label: d.name })), (e) => setF((p) => ({ ...p, departmentId: e.target.value, designationId: "" })))}
              {select("designationId", "Designation *", desigs.map((d) => ({ value: d.id, label: d.name })))}
              {text("reportingManager", "Reporting manager")}{text("officialEmail", "Official email", { type: "email" })}{select("employmentType", "Employment type *", TYPES)}{bySection("EMPLOYMENT")}
              {depts.length === 0 && <Grid item xs={12}><Alert severity="info">No departments yet. Ask the Admin to add departments.</Alert></Grid>}
            </>}
            {cur === "additional" && bySection("ADDITIONAL")}
            {cur === "bank" && <>
              <Grid item xs={12}><Typography variant="body2" color="text.secondary">Stored encrypted. Leave a field blank to keep the existing value{masked.aadhaar ? ` (Aadhaar ${masked.aadhaar})` : ""}.</Typography></Grid>
              {text("aadhaar", "Aadhaar (12 digits)", { inputProps: { maxLength: 12 }, autoComplete: "off" })}{text("pan", "PAN", { inputProps: { maxLength: 10 }, autoComplete: "off" })}
              {text("uan", "UAN (12 digits)", { autoComplete: "off" })}{text("bankAccount", "Bank account", { autoComplete: "off" })}{text("ifsc", "IFSC")}{text("bankName", "Bank name")}{bySection("BANK")}
            </>}
            {cur === "documents" && (
              <Grid item xs={12}>{id ? <DocumentsPanel employeeId={id} /> : <Alert severity="info">Save the employee first (Save Draft) to upload documents.</Alert>}</Grid>
            )}
          </Grid>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: 4 }}>
          <Button disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>Previous</Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" disabled={busy} onClick={saveDraft}>Save Draft</Button>
            {step < steps.length - 1 ? <Button variant="contained" disabled={busy} onClick={next}>Save & Continue</Button>
              : <Button variant="contained" disabled={busy} onClick={submit}>Submit Employee</Button>}
          </Box>
        </Box>
      </Paper>
    </>
  );
}
