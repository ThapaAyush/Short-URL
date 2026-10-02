const crypto = require("crypto");
const Url = require("../models/url");
const { BASE_URL } = require("../config");

const MAX_ID_ATTEMPTS = 5;

// Only accept absolute http(s) URLs so short links can't point at
// javascript:, data: or other unsafe schemes.
function normalizeUrl(input) {
    if (typeof input !== "string") return null;
    try {
        const parsed = new URL(input.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:"
            ? parsed.href
            : null;
    } catch {
        return null;
    }
}

function wantsJson(req) {
    return req.accepts(["html", "json"]) === "json";
}

function getBaseUrl(req) {
    return BASE_URL || `${req.protocol}://${req.get("host")}`;
}

// Admins see every link; everyone else only sees their own.
function linksQueryFor(user) {
    return user.role === "ADMIN" ? {} : { createdBy: user._id };
}

async function renderHome(req, res, { status = 200, error } = {}) {
    const urls = await Url.find(linksQueryFor(req.user)).sort({ createdAt: -1 });
    const created = typeof req.query.created === "string" ? req.query.created : null;
    const id = created && urls.some((u) => u.shortId === created) ? created : undefined;

    return res.status(status).render("home", {
        urls,
        user: req.user,
        id,
        error,
        baseUrl: getBaseUrl(req),
    });
}

async function createShortUrl(data) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await Url.create({
                ...data,
                shortId: crypto.randomBytes(6).toString("base64url"),
                visitHistory: [],
            });
        } catch (err) {
            // 11000 = duplicate shortId; try again with a fresh one.
            if (err.code !== 11000 || attempt >= MAX_ID_ATTEMPTS) throw err;
        }
    }
}

async function handleGenerateNewShortURL(req, res) {
    const redirectURL = normalizeUrl(req.body?.url);

    if (!redirectURL) {
        const error = "Please enter a valid URL starting with http:// or https://";
        if (wantsJson(req)) return res.status(400).json({ error });
        return renderHome(req, res, { status: 400, error });
    }

    const entry = await createShortUrl({ redirectURL, createdBy: req.user._id });

    if (wantsJson(req)) {
        return res.status(201).json({
            id: entry.shortId,
            shortUrl: `${getBaseUrl(req)}/${entry.shortId}`,
        });
    }
    // Redirect after POST so refreshing the page doesn't create a duplicate link.
    return res.redirect(`/?created=${encodeURIComponent(entry.shortId)}`);
}

async function handleGetAnalytics(req, res) {
    const entry = await Url.findOne({
        shortId: req.params.shortId,
        ...linksQueryFor(req.user),
    });

    if (!entry) {
        return res.status(404).json({ error: "Short URL not found" });
    }

    return res.json({
        shortId: entry.shortId,
        redirectURL: entry.redirectURL,
        totalClicks: entry.visitHistory.length,
        analytics: entry.visitHistory,
    });
}

async function handleRedirect(req, res) {
    const entry = await Url.findOneAndUpdate(
        { shortId: req.params.shortId },
        { $push: { visitHistory: { timestamp: Date.now() } } }
    );

    // Re-checking the scheme also guards links saved before validation existed.
    const target = entry && normalizeUrl(entry.redirectURL);
    if (!target) {
        return res.status(404).json({ error: "Short URL not found" });
    }

    return res.redirect(target);
}

module.exports = {
    renderHome,
    handleGenerateNewShortURL,
    handleGetAnalytics,
    handleRedirect,
};
