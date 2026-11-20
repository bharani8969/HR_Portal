import { fail } from "../utils/helpers.js";
// Role always comes from the server-side session, never from the request.
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json(fail("Forbidden"));
