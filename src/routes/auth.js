const router = require("express").Router();
const pool = require("../config/database/postgresql");
const redisClient = require("../config/database/redis");
const validate = require("../module/validation");
const bcryptUtil = require("../module/bcrypt");
const jwtUtil = require("../module/jwt");
const { BadRequestException } = require('../module/customError');
const { AUTH, ACCOUNT } = require("../module/global");
const emailHandler = require("../module/emailHandler");
require("dotenv").config();
const bcrypt = require("bcrypt");

// 로그인 api
router.post("/login", async (req, res, next) => {
    const { email, pw } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(email, "email").checkInput().checkLength(1, ACCOUNT.MAX_EMAIL_LENGTH);
        validate(pw, "pw").checkInput().checkLength(1, ACCOUNT.MAX_PW_LENGTH);

        const selectUserSql = "SELECT id, pw FROM account_TB WHERE email = $1";
        const selectUserParams = [email];
        const selectUserData = await pool.query(selectUserSql, selectUserParams);
        if (selectUserData.rowCount === 0) {
            throw new BadRequestException("아이디 또는 비밀번호가 올바르지 않습니다");
        }

        const userData = selectUserData.rows[0];
        // 입력받은 pw와 암호화된 pw가 일치할경우 accessToken 발급
        const passwordMatch = await bcryptUtil.compare(pw, userData.pw);
        if (!passwordMatch) {
            throw new BadRequestException("아이디 또는 비밀번호가 올바르지 않습니다");
        }
        const accessToken = jwtUtil.userSign(userData);
        res.cookie("accessToken", accessToken, {
            secure: true,
            sameSite: 'none',
        });
        result.data = {
            userId: userData.id
        }
    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 로그아웃 api
router.post("/logout", (req, res, next) => {
    const result = {
        message: "",
        data: {}
    }

    try {
        res.clearCookie("accessToken");
    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 이메일 중복 체크 api
router.get("/duplicate/email/:email", async (req, res, next) => {
    const result = {
        message: "",
        data: {}
    };
    const { email } = req.params;

    try {
        validate(email, "email").checkInput().checkEmailRegex();

        const sql = `SELECT id FROM account_tb WHERE email = $1`;
        const params = [email];
        const data = await pool.query(sql, params);

        // 중복된 이메일이 존재하는 경우
        if (data.rowCount !== 0) {
            throw new BadRequestException("중복된 이메일이 존재합니다");
        }
    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 이메일 인증번호 전송 api
router.post("/send-code", async (req, res, next) => {
    const { email } = req.body;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(email, "email").checkInput().checkEmailRegex();
        await emailHandler.sendVerifyEmail(email);
    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 회원가입을 위한 이메일 인증 api
router.post("/signup/verify-email", async (req, res, next) => {
    const { email, code } = req.body;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(email, "email").checkInput().checkEmailRegex();
        validate(code, "code").checkInput().isNumber().checkLength(AUTH.CERTIFIED_LENGTH, AUTH.CERTIFIED_LENGTH);

        const data = await redisClient.get(email);
        // redis에 이메일이 존재하지 않는 경우
        if (!data) {
            throw new BadRequestException("인증번호를 요청한 이메일이 존재하지 않습니다");
        }
        // 인증번호가 유효하지 않은 경우
        if (data !== code) {
            throw new BadRequestException("인증번호가 올바르지 않습니다");
        }
        // 인증번호가 유효한 경우
        result.message = "인증이 완료되었습니다";
        await redisClient.del(email);
    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 비밀번호 재설정을 위한 이메일 인증 api
router.post("/reset-pw/verify-email", async (req, res, next) => {
    const { email, code } = req.body;
    const result = {
        message: "",
        data: {}
    }

    try {
        // validate(email, "email").checkInput().checkEmailRegex();
        validate(code, "code").checkInput().isNumber().checkLength(1, AUTH.CERTIFIED_LENGTH);

        const savedVerifyCode = await redisClient.get(email);
        // redis에 이메일이 존재하지 않는 경우
        if (!savedVerifyCode) {
            throw new BadRequestException("인증번호를 요청한 이메일이 존재하지 않습니다");
        }
        // 인증번호가 유효하지 않은 경우
        if (savedVerifyCode !== code) {
            throw new BadRequestException("인증번호가 올바르지 않습니다");
        }
        // 인증번호가 유효한 경우 해당 이메일을 가진 유저를 조회
        const findUserSql = "SELECT id FROM account_tb WHERE email = $1";
        const params = [email];
        const userData = await pool.query(findUserSql, params);

        if (userData.rowCount === 0) {
            throw new BadRequestException("해당하는 사용자가 존재하지 않습니다");
        }
        const userPk = userData.rows[0].id;
        result.data.userId = userPk;

        await redisClient.del(email);
    } catch (error) {
        return next(error);
    }

    res.send(result);
});

module.exports = router;
