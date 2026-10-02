const { getUser } = require("../service/auth");

// Attach req.user from either an "Authorization: Bearer <token>" header
// (API clients) or the "uid" cookie (browser). Invalid tokens become null.
function checkForAuthentication(req, res, next) {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith("Bearer ") ? header.slice(7) : null;

    req.user = getUser(bearerToken || req.cookies?.uid);
    return next();
}

function restrictTo(...roles) {
    return function (req, res, next) {
        if (!req.user) return res.redirect("/login");
        if (!roles.includes(req.user.role)) return res.status(403).send("Forbidden");

        return next();
    };
}

function restrictToLoggedinUserOnly(req, res, next) {
    if (!req.user) return res.redirect("/login");
    return next();
}

function redirectIfLoggedIn(req, res, next) {
    if (req.user) return res.redirect("/");
    return next();
}

module.exports = {
    checkForAuthentication,
    restrictTo,
    restrictToLoggedinUserOnly,
    redirectIfLoggedIn,
};
