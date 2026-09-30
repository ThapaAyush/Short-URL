const express = require("express");
const crypto = require("crypto");
const URL = require("../models/url");

const router = express.Router();

router.post("/", async (req, res) => {
    const body = req.body;

    if (!body.url) {
        return res.status(400).send("URL is required");
    }

    const shortId = crypto.randomBytes(6).toString("base64url");

    await URL.create({
        shortId: shortId,
        redirectURL: body.url,
        createdBy: req.user._id,
        visitHistory: [],
    });

    const urls = await URL.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    return res.render("home", {
        id: shortId,
        urls,
        user: req.user,
    });
});

module.exports = router;