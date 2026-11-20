// Safe defaults so unit tests run without a database.
process.env.DATABASE_URL ??= "mysql://u:p@localhost:3306/x";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.DATA_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
