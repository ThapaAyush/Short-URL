const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectToMongoDB } = require("./connect");
const urlRoute = require("./routes/url");
const {
    checkForAuthentication,
    restrictTo,
    restrictToLoggedinUserOnly,
} = require("./middlewares/auth");
const URL = require("./models/url");
const staticRoute = require("./routes/staticRouter");
const userRoute = require("./routes/user");

const app = express();

const PORT = 8001;

app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthentication);

app.set("view engine", "ejs");

app.set("views", path.resolve("./views"));

app.get("/test", restrictToLoggedinUserOnly, async (req, res) => {
    const query = req.user.role === "ADMIN" ? {} : { createdBy: req.user._id };
    const userUrls = await URL.find(query).sort({ createdAt: -1 });

    return res.render("home", {
        urls: userUrls,
        user: req.user,
    });
});

connectToMongoDB("mongodb://127.0.0.1:27017/short-url")
    .then(() => console.log("Mongodb connected"))
    .catch((err) => console.log("MongoDB connection error:", err));

app.use("/url", restrictTo("NORMAL", "ADMIN"), urlRoute);

app.use("/user", userRoute);

app.use("/", staticRoute);


app.get("/:shortId", async (req, res) => {
    const shortId = req.params.shortId;

    const entry = await URL.findOneAndUpdate(
        {
            shortId,
        },
        {
            $push: {
                visitHistory: {
                    timestamp: Date.now(),
                },
            },
        }
    );

    if (!entry) {
        return res.status(404).json({
            error: "Short URL not found",
        });
    }

    return res.redirect(entry.redirectURL);
});

app.listen(PORT, () => {
    console.log(`Server Started at PORT: ${PORT}`);
});