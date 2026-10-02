const path = require("path");

// Load variables from a local .env file if one exists (built into Node 20.12+).
try {
    process.loadEnvFile(path.resolve(__dirname, ".env"));
} catch (err) {
    if (err.code !== "ENOENT") throw err;
}

const isProduction = process.env.NODE_ENV === "production";

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    if (isProduction) throw new Error("JWT_SECRET must be set in production.");
    JWT_SECRET = "dev-only-insecure-jwt-secret";
    console.warn("JWT_SECRET is not set; using an insecure development secret. Set it in .env.");
}

module.exports = {
    PORT: Number(process.env.PORT) || 8001,
    MONGO_URL: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/short-url",
    // Public origin used when showing short links, e.g. https://sho.rt
    // Falls back to the host of the incoming request.
    BASE_URL: (process.env.BASE_URL || "").replace(/\/+$/, ""),
    JWT_SECRET,
    isProduction,
};
