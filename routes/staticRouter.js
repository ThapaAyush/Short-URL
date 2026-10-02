const express = require("express");
const { renderHome } = require("../controllers/url");
const {
    restrictToLoggedinUserOnly,
    redirectIfLoggedIn,
} = require("../middlewares/auth");

const router = express.Router();

router.get("/signup", redirectIfLoggedIn, (req, res) => {
    return res.render("signup");
});
router.get("/login", redirectIfLoggedIn, (req, res) => {
    return res.render("login");
});

router.get("/", restrictToLoggedinUserOnly, (req, res) => renderHome(req, res));

module.exports = router;
