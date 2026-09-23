const { getUser } = require("../service/auth");

function checkForAuthentication(req, res, next) {
    const authorizationHeaderValue = req.headers["authorization"];
    const userUid = req.cookies?.uid;
    req.user = userUid ? getUser(userUid) : null;

    if (
        !authorizationHeaderValue ||
        !authorizationHeaderValue.startsWith("Bearer ")
    )
        return next();

    const token = authorizationHeaderValue.split("Bearer ")[1];
    const user = getUser(token);

    req.user = user;
    return next();
}

function restrictTo(...roles) {
    return function (req, res, next) {
        if (!req.user) return res.redirect("/login");
        const userRole = req.user.role || "NORMAL";
        if (!roles.includes(userRole)) return res.status(403).end("Unauthorized");

        return next();
    };
}

function restrictToLoggedinUserOnly(req, res, next) {
    const userUid = req.cookies?.uid;

    if (!userUid) return res.redirect("/login");
    const user = getUser(userUid);

    if (!user) return res.redirect("/login");

    req.user = user;
    next();
}

module.exports = {
    checkForAuthentication,
    restrictTo,
    restrictToLoggedinUserOnly,
};