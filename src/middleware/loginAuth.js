require("dotenv").config();

const jwt = require("jsonwebtoken");
const { UnauthorizedException } = require("../module/customError");

module.exports = (req, res, next) => {
    // 쿠키에 담긴 accessToken을 추출
    const { accessToken } = req.cookies;

    try {
        req.decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

        if (typeof req.decoded === 'string')
            return next(new UnauthorizedException("로그인 후 이용 가능합니다"));

        return next();
    } catch (error) {
        return next(new UnauthorizedException("로그인 후 이용 가능합니다"));
    }
}
