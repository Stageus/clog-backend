const jwt = require("jsonwebtoken");
const { secretKey, accessTokenOption } = require("../config/jwtSetting");

const userSign = (user) => {
    const payload = {
        id: user.id,
        email: user.email
    }

    return jwt.sign(payload, secretKey, accessTokenOption);
}

module.exports = {
    userSign
};
