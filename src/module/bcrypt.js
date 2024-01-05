require("dotenv").config();

const bcrypt = require("bcrypt");

const hashing = async (password) => {
    try {
        const saltRound = process.env.HASHING_SALT_ROUND;
        const salt = await bcrypt.genSalt(parseInt(saltRound));

        return await bcrypt.hash(password, salt);
    } catch (error) {
        console.log(error);
    }
}

const compare = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.log(error);
    }
}

module.exports = { hashing, compare };
