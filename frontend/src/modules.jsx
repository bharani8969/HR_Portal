import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import BeachAccessRounded from "@mui/icons-material/BeachAccessRounded";
import PaymentsRounded from "@mui/icons-material/PaymentsRounded";
import PersonSearchRounded from "@mui/icons-material/PersonSearchRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";

// Planned HR modules. Shown disabled ("Under development") in the sidebar and on the dashboards.
export const SOON = [
  { key: "attendance", label: "Attendance", text: "Daily attendance, shifts and timesheets", icon: <EventAvailableRounded /> },
  { key: "leave", label: "Leave & Time Off", text: "Requests, balances and approvals", icon: <BeachAccessRounded /> },
  { key: "payroll", label: "Payroll", text: "Salary, payslips and deductions", icon: <PaymentsRounded /> },
  { key: "recruitment", label: "Recruitment", text: "Openings, candidates and offers", icon: <PersonSearchRounded /> },
  { key: "performance", label: "Performance", text: "Goals, reviews and feedback", icon: <TrendingUpRounded /> },
  { key: "training", label: "Training", text: "Courses and skill tracking", icon: <SchoolRounded /> },
];
