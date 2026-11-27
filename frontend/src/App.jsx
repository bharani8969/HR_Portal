import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Auth/Login.jsx";
import ForgotPassword from "./pages/Auth/ForgotPassword.jsx";
import ResetPassword from "./pages/Auth/ResetPassword.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import Dashboard from "./pages/HR/Dashboard.jsx";
import EmployeeDirectory from "./pages/HR/EmployeeDirectory.jsx";
import EmployeeForm from "./pages/HR/EmployeeForm.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import HRManagement from "./pages/Admin/HRManagement.jsx";
import AdminEmployees from "./pages/Admin/AdminEmployees.jsx";
import Departments from "./pages/Admin/Departments.jsx";
import FormFields from "./pages/Admin/FormFields.jsx";
import EmailSettings from "./pages/Admin/EmailSettings.jsx";
import ActivityLogs from "./pages/Admin/ActivityLogs.jsx";
import Reports from "./pages/Reports.jsx";
import Security from "./pages/Security.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AppLayout />}>
        <Route element={<ProtectedRoute />}><Route path="/security" element={<Security />} /><Route path="/reports" element={<Reports />} /></Route>
        <Route element={<ProtectedRoute role="HR" />}>
          <Route path="/dashboard" element={<Dashboard />} /><Route path="/employees" element={<EmployeeDirectory />} />
          <Route path="/employees/new" element={<EmployeeForm />} /><Route path="/employees/:id/edit" element={<EmployeeForm />} />
        </Route>
        <Route element={<ProtectedRoute role="ADMIN" />}>
          <Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/hr" element={<HRManagement />} /><Route path="/admin/employees" element={<AdminEmployees />} />
          <Route path="/admin/departments" element={<Departments />} /><Route path="/admin/fields" element={<FormFields />} /><Route path="/admin/email" element={<EmailSettings />} /><Route path="/admin/logs" element={<ActivityLogs />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
