import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";
import { csrf } from "./middleware/csrf.js";
import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import employeeRoutes from "./modules/employees/employees.routes.js";
import departmentRoutes from "./modules/departments/departments.routes.js";
import adminEmployeeRoutes from "./modules/admin/adminEmployees.routes.js";
import documentRoutes from "./modules/documents/documents.routes.js";
import reportRoutes from "./modules/reports/reports.routes.js";
import adminSettingsRoutes from "./modules/admin/adminSettings.routes.js";
import customFieldRoutes from "./modules/customFields/customFields.routes.js";
import supportRoutes from "./modules/support/support.routes.js";
import { mountFrontend } from "./staticSite.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.ORIGINS, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(csrf);

app.get("/api/v1/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: "ok", app: env.APP_NAME, client: env.CLIENT_NAME, poweredBy: env.POWERED_BY } });
  } catch {
    res.status(503).json({ success: false, error: { message: "Database unavailable" } });
  }
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/admin", adminEmployeeRoutes);
app.use("/api/v1/admin", adminSettingsRoutes);
app.use("/api/v1/custom-fields", customFieldRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1", documentRoutes);

mountFrontend(app); // serves /brand.js and the built React app (only when public/index.html exists)

app.use((_req, res) => res.status(404).json({ success: false, error: { message: "Not found" } }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: { message: "Something went wrong" } });
});
export default app;
