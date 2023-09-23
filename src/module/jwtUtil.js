const jwt = require("jsonwebtoken");
const { secretKey, accessTokenOption } = require("../../config/jwtSetting");

const userSign = (user) => {
    const payload = {
        userId: user.id,
    }

    return jwt.sign(payload, secretKey, accessTokenOption);
}

module.exports = {
    userSign
};
