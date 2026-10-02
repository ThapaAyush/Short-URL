const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { setUser } = require("../service/auth");
const { isProduction } = require("../config");

const SESSION_COOKIE = "uid";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", secure: isProduction };
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Form fields must be plain strings. This also blocks NoSQL injection such as
// {"email": {"$ne": null}, "password": {"$ne": null}} sent as a JSON body.
const text = (value) => (typeof value === "string" ? value.trim() : "");
const secret = (value) => (typeof value === "string" ? value : "");

function startSession(res, user) {
    res.cookie(SESSION_COOKIE, setUser(user), {
        ...COOKIE_OPTIONS,
        maxAge: SESSION_MAX_AGE_MS,
    });
    return res.redirect("/");
}

// Accounts created before passwords were hashed still hold plain text.
// Accept those once and upgrade them to a bcrypt hash so nobody is locked out.
async function passwordMatches(user, password) {
    if (/^\$2[aby]\$\d{2}\$/.test(user.password)) {
        return bcrypt.compare(password, user.password);
    }
    if (user.password !== password) return false;

    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await user.save();
    return true;
}

async function handleUserSignup(req, res) {
    const body = req.body ?? {};
    const name = text(body.name);
    const email = text(body.email).toLowerCase();
    const password = secret(body.password);

    const fail = (status, error) =>
        res.status(status).render("signup", { error, name, email });

    if (!name || !email || !password) {
        return fail(400, "Name, email and password are all required.");
    }
    if (!EMAIL_PATTERN.test(email)) {
        return fail(400, "Please enter a valid email address.");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return fail(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (await User.exists({ email })) {
        return fail(409, "An account with this email already exists.");
    }

    try {
        const user = await User.create({
            name,
            email,
            password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        });
        return startSession(res, user);
    } catch (error) {
        if (error.code === 11000) {
            return fail(409, "An account with this email already exists.");
        }
        throw error;
    }
}

async function handleUserLogin(req, res) {
    const body = req.body ?? {};
    const email = text(body.email).toLowerCase();
    const password = secret(body.password);

    const user = email && password ? await User.findOne({ email }) : null;
    if (!user || !(await passwordMatches(user, password))) {
        return res.status(401).render("login", {
            error: "Invalid email or password.",
            email,
        });
    }
    return startSession(res, user);
}

function handleUserLogout(req, res) {
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
    return res.redirect("/login");
}

module.exports = {
    handleUserSignup,
    handleUserLogin,
    handleUserLogout,
};
