const pool = require("../../config/database/postgresql");
const router = require("express").Router();
const validate = require("../module/validation");
const { maxEmailLength, maxPwLength } = require("../module/global");
const bcryptUtil = require("../module/bcryptUtil");
const jwtUtil = require("../module/jwtUtil")

router.post("/login", async (req, res, next) => {
    const { email, pw } = req.body;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(email, "email").checkInput().checkLength(1, maxEmailLength);
        validate(pw, "pw").checkInput().checkLength(1, maxPwLength);

        const sql = "SELECT id, pw FROM account_TB WHERE email = $1";
        const params = [email];
        const data = await pool.query(sql, params);
        if (data.rows.length !== 0) {
            const userData = data.rows[0];
            // 입력받은 pw와 암호화된 pw가 일치할경우 accessToken 발급
            const passwordMatch = await bcryptUtil.compare(pw, userData.pw);
            if (passwordMatch) {
                const accessToken = await jwtUtil.userSign(userData);
                res.cookie("accessToken", accessToken, {
                    httpOnly: false,
                    secure: false,
                });
                result.message = "로그인 성공";
                return res.send(result);
            }
        }

        result.message = "아이디 또는 비밀번호가 올바르지 않습니다";
        res.send(result);
    } catch (error) {
        console.error(error);
    }
});

module.exports = router;
