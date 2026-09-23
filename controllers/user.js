const {v4: uuidv4} = require('uuid');
const User = require("../models/user");
const {setUser} = require('../service/auth');

async function handleUserSignup(req, res) {
    const { name, email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        return res.status(409).render("signup", {
            error: "An account with this email already exists.",
        });
    }

    let user;
    try {
        user = await User.create({
            name,
            email: normalizedEmail,
            password,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).render("signup", {
                error: "An account with this email already exists.",
            });
        }
        throw error;
    }
    const sessionId = uuidv4();
    setUser(sessionId, user);
    res.cookie("uid", sessionId);
    return res.redirect("/");
}
async function handleUserLogin(req, res) {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user)
        return res.render("login", {
            error: "Invalid Username or Password",
        });
    const sessionId = uuidv4();
    setUser(sessionId, user);
    res.cookie("uid", sessionId);
    return res.redirect("/");
}

module.exports = {
    handleUserSignup,
    handleUserLogin,
}