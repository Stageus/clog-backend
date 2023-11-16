const router = require("express").Router();
const pool = require("../config/database/postgresql");
const loginAuth = require("../middleware/loginAuth");
const validate = require("../module/validation");
const bcryptUtil = require("../module/bcrypt");
const personalColor = require("../module/personalColor");
const CONSTRAINT = require("../module/constraint");
const { BadRequestException, NotFoundException } = require("../module/customError");

// 회원가입
router.post("/", async (req, res, next) => {
    const { email, pw, name, major, entryYear } = req.body;
    const result = {
        message: "",
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
                     VALUES 
                            ($1, $2, $3, $4, $5, $6)`;

        const params = [major, email, hashedPassword, name, entryYear, personalColor()];
        const data = await pool.query(sql, params);
        if (data.rowCount !== 0) {
            result.message = "회원가입 성공";
        }
    } catch (error) {
        if (error.constraint === CONSTRAINT.UNIQUE_EMAIL_TO_ACCOUNT_TB) {
            return next(new BadRequestException("중복된 이메일이 존재합니다"));
        }
        if (error.constraint === CONSTRAINT.FK_MAJOR_TO_ACCOUNT_TB) {
            return next(new BadRequestException("해당하는 전공이 존재하지 않습니다"));
        }
        return next(error);
    }
    res.send(result);
});

// 프로필 조회
router.get("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    }

    try {
        const selectProfileSql = `SELECT
                                        account_tb.name,
                                        account_tb.personal_color AS "personalColor",
                                        major_tb.name AS "major",
                                        account_tb.entry_year AS "entryYear",
                                        TO_CHAR(account_tb.created_at, 'yyyy.mm.dd') AS "createdAt"
                                    FROM
                                        account_tb
                                    JOIN
                                        major_tb
                                    ON
                                        account_tb.major = major_tb.id
                                    WHERE
                                        account_tb.id = $1`;
        const selectProfileParam = [userId];
        const selectProfileData = await pool.query(selectProfileSql, selectProfileParam);
        if (selectProfileData.rowCount === 0) {
            throw new NotFoundException("해당하는 사용자가 없습니다");
        }
        result.data = selectProfileData.rows[0]
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 계정정보 수정
router.put("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { name, entryYear, major } = req.body;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(name, "name").checkInput().checkNameRegex();
        validate(major, "major").checkInput().isNumber();
        validate(entryYear, "entryYear").checkInput().isNumber();

        const updateProfileSql = `UPDATE
                                        account_tb
                                    SET
                                        name = $1,
                                        entry_year = $2,
                                        major = $3
                                    WHERE
                                        id = $4`;
        const updateProfileParam = [name, entryYear, major, userId];
        const updateProfileData = await pool.query(updateProfileSql, updateProfileParam);
        if (updateProfileData.rowCount === 0) {
            throw new BadRequestException("해당하는 사용자가 존재하지 않습니다");
        }

    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_MAJOR_TO_ACCOUNT_TB) {
            return next(new BadRequestException("해당하는 전공이 없습니다"));
        }
        return next(error)
    }
    res.send(result);
});

// 회원 탈퇴
// 토큰 블랙리스트?
router.delete("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    }
    try {
        const deleteUserSql = `DELETE
                                    FROM
                                        account_tb
                                    WHERE
                                        id = $1`;
        const deleteUserParam = [userId];
        const deleteUserData = await pool.query(deleteUserSql, deleteUserParam);
        console.log(deleteUserData)
        if (deleteUserData.rowCount === 0) {
            throw new BadRequestException("해당하는 사용자가 존재하지 않습니다");
        }
    } catch (error) {
        return next(error);
    }
    res.clearCookie("accessToken");
    res.send(result);
});

// 비밀번호 재설정
router.put("/pw", async (req, res, next) => {
    const { userId, newPw } = req.body
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(userId, "userId").checkInput().isNumber();
        validate(newPw, "newPw").checkInput().checkPwRegex();

        const hashedPassword = await bcryptUtil.hashing(newPw);

        const sql = `UPDATE account_tb SET pw = $1 WHERE id = $2 `;
        const params = [hashedPassword, userId];
        const data = await pool.query(sql, params);

        if (data.rowCount !== 0) {
            result.message = "비밀번호 재설정 완료";
            result.data = data.rows[0]
        }

        res.send(result);
    } catch (error) {
        next(error);
    }
});

// 비밀번호 재설정 (로그인 한 상태에서)
router.put("/loged-in/pw", loginAuth, async (req, res, next) => {
    const { newPw } = req.body
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(newPw, "newPw").checkInput().checkPwRegex();

        const hashedPassword = await bcryptUtil.hashing(newPw);

        const sql = `UPDATE account_tb SET pw = $1 WHERE id = $2 `;
        const params = [hashedPassword, req.decoded.id];
        const data = await pool.query(sql, params);

        if (data.rowCount !== 0) {
            result.message = "비밀번호 재설정 완료";
            result.data = data.rows[0]
        }

        res.send(result);
    } catch (error) {
        next(error);
    }
});


module.exports = router;
