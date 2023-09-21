const jwt = require("jsonwebtoken");
const { secretKey, accessTokenOption } = require("../../config/jwtSetting");

const userSign = async (user) => {
    const payload = {
        userPk: user.id,
    }

    return jwt.sign(payload, secretKey, accessTokenOption);
}

module.exports = {
    userSign
};
