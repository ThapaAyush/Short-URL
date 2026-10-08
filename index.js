const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { PORT, MONGO_URL } = require("./config");
const { connectToMongoDB } = require("./connect");
const { checkForAuthentication, restrictTo } = require("./middlewares/auth");
const { handleRedirect } = require("./controllers/url");
const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const mongoose = require("mongoose");
const userRoute = require("./routes/user");

const app = express();

app.disable("x-powered-by");
// Trust Render's reverse proxy for correct protocol (https) and client IPs
app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthentication);

// Browsers request this automatically; it does not need a database connection.
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Health check endpoint for Render monitoring
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? "connected" : "connecting",
    });
});

app.use(async (req, res, next) => {
    try {
        await connectToMongoDB(MONGO_URL);
        next();
    } catch (err) {
        next(err);
    }
});

app.use("/url", restrictTo("NORMAL", "ADMIN"), urlRoute);
app.use("/user", userRoute);
app.use("/", staticRoute);

app.get("/:shortId", handleRedirect);

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Express 5 forwards errors from async handlers here.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
        error: status >= 500 ? "Something went wrong" : err.message,
    });
});

let server;

if (require.main === module) {
    connectToMongoDB(MONGO_URL)
        .then(() => {
            console.log("MongoDB connected");
            server = app.listen(PORT, "0.0.0.0", () => {
                console.log(`Server started on port ${PORT} (http://0.0.0.0:${PORT})`);
            });
        })
        .catch((err) => {
            console.error("MongoDB connection error:", err.message);
            console.error("Ensure MONGO_URL is set in Render environment variables and Atlas Network Access allows 0.0.0.0/0.");
            process.exit(1);
        });
}

// Graceful shutdown handling for Render
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Gracefully closing HTTP server and database...");
    if (server) {
        server.close(async () => {
            await mongoose.connection.close(false);
            console.log("HTTP server and database connections closed.");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

module.exports = app;

