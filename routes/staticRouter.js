const express = require("express");
const URL = require("../models/url");
const { restrictToLoggedinUserOnly } = require("../middlewares/auth");

const router = express.Router();

router.get("/signup", (req, res) => {
    return res.render("signup");
});
router.get("/login", (req, res) => {
    return res.render("login");
});

router.get("/", restrictToLoggedinUserOnly, async (req, res) => {
    const query = req.user.role === "ADMIN" ? {} : { createdBy: req.user._id };
    const userUrls = await URL.find(query).sort({ createdAt: -1 });

    return res.render("home", {
        urls: userUrls,
        user: req.user,
    });
});

module.exports = router;