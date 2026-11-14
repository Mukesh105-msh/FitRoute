const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

function getPoolConfig() {
  const host = (process.env.DB_HOST || "localhost").trim();
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(host.toLowerCase());

  // SSL is enabled if DB_SSL is explicitly "true", or automatically for cloud hosts
  const useSsl =
    process.env.DB_SSL === "true" ||
    (!isLocalHost && process.env.DB_SSL !== "false");

  const sslConfig = useSsl
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
      }
    : undefined;

  // Support validated connection strings (e.g. DATABASE_URL / MYSQL_URL from cloud hosts)
  const connectionString = (process.env.DATABASE_URL || process.env.MYSQL_URL || "").trim();

  if (connectionString) {
    try {
      const parsedUrl = new URL(connectionString);
      if (parsedUrl.protocol === "mysql:") {
        return {
          uri: connectionString,
          ssl: sslConfig,
          waitForConnections: true,
          connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000
        };
      }
    } catch {
      console.warn("Invalid DATABASE_URL format. Falling back to discrete DB_* variables.");
    }
  }

  // Discrete configuration (preserves local development setup)
  return {
    host,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fitroute_db",
    port: Number(process.env.DB_PORT || 3306),
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  };
}

const pool = mysql.createPool(getPoolConfig());

module.exports = pool;
