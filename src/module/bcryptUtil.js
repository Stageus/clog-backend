require("dotenv").config();

const bcrypt = require("bcrypt");

const hashing = (password) => {
    try {
        const saltRound = process.env.HASHING_SALT_ROUND;
        const salt = bcrypt.genSalt(saltRound);

        return bcrypt.hash(password, salt);
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
