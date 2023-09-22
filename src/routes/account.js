const pool = require("../../config/database/postgresql");
const router = require("express").Router();
const validate = require("../module/validation");
const bcryptUtil = require("../module/bcryptUtil");
const { BadRequestException } = require("../module/customError");

// personal color 만드는 헬퍼함수 module에 분리시켜서 회원가입 성공 시 params 마지막 인자에 넣어주면 감사하겠습ㄴ
router.post("/", async (req, res, next) => {
    const { email, pw, name, major, entryYear } = req.body;
    const result = {
        message: "" | null,
        data: {}
    }

    try {
        validate(email, "email").checkInput().checkEmailRegex();
        validate(pw, "pw").checkInput().checkPwRegex();
        validate(name, "name").checkInput().checkNameRegex();
        validate(major, "major").checkInput().isNumber();
        validate(entryYear, "entryYear").checkInput().isNumber();

        // 비밀번호 암호화
        const hashedPassword = await bcryptUtil.hashing(pw);

        const sql = `INSERT INTO 
                        account_TB (major, email, pw, name, entry_year, personal_color)
                        VALUES ($1, $2, $3, $4, $5, $6)`;

        const params = [major, email, hashedPassword, name, entryYear, "111111"];
        const data = await pool.query(sql, params);
        if (data.rowCount !== 0) {
            result.message = "회원가입 성공";
        }

        res.send(result);

    } catch (error) {
        if (error.code === '23505' && error.constraint === 'unique_email') {
            return next(new BadRequestException("중복된 이메일이 존재합니다"));
        }
        next(error);
    }
});

module.exports = router;
