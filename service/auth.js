const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

const TOKEN_TTL = "7d";

// Sessions are signed JWTs rather than an in-memory Map, so they survive
// server restarts and don't grow memory forever. Only non-sensitive fields
// go into the token (never the password hash).
function setUser(user) {
    return jwt.sign(
        {
            _id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        { expiresIn: TOKEN_TTL }
    );
}

function getUser(token) {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
        return null;
    }
}

module.exports = {
    setUser,
    getUser,
};
