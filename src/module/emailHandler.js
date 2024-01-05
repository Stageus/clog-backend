require("dotenv").config();

const nodeMailer = require("nodemailer");
const redisClient = require("../config/database/redis");
const { AUTH: auth } = require("../module/global");

const sendVerifyEmail = async (email) => {
    const transporter = nodeMailer.createTransport({
        service: "naver",
        host: "smtp.naver.com",
        port: 587,
        auth: {
            user: process.env.NODEMAILER_ID,
            pass: process.env.NODEMAILER_PW
        }
    });
    const authCode = Math.floor(Math.random() * 89999) + 10000;
    redisClient.set(email, authCode.toString());
    redisClient.expire(email, auth.CERTIFIED_EXPIRE_TIME);

    const option = {
        from: process.env.NODEMAILER_ID,
        to: email,
        subject: "인증번호입니당",
        text: `인증번호: ${authCode}`,
    }

    return await transporter.sendMail(option);
}

module.exports = {
    sendVerifyEmail,
};