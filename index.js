const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { PORT, MONGO_URL } = require("./config");
const { connectToMongoDB } = require("./connect");
const { checkForAuthentication, restrictTo } = require("./middlewares/auth");
const { handleRedirect } = require("./controllers/url");
const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const userRoute = require("./routes/user");

const app = express();

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthentication);
// Browsers request this automatically; it does not need a database connection.
app.get("/favicon.ico", (req, res) => res.status(204).end());

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

if (require.main === module) {
    connectToMongoDB(MONGO_URL)
        .then(() => {
            console.log("MongoDB connected");
            app.listen(PORT, () => {
                console.log(`Server started at http://localhost:${PORT}`);
            });
        })
        .catch((err) => {
            console.error("MongoDB connection error:", err.message);
            process.exit(1);
        });
}

module.exports = app;
