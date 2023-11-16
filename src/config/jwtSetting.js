require("dotenv").config();

module.exports = {
    secretKey: process.env.JWT_SECRET_KEY,
    accessTokenOption: {
        "algorithm": "HS256",
        "expiresIn": "1h",
        "issuer": "clog.com"
    }
}
