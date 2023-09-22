const { pwRegex, nameRegex, emailRegex } = require("../module/regex");
const { BadRequestException } = require("../module/customError");
const errorMessage = {
    invalidInput: "요청값이 잘못되었습니다",
    length: "길이가 비정상적입니다",
    regex: "정규표현식 실패",
    isNumber: "정수가 아닙니다",
}

function Validation(input, name) {
    this.checkInput = () => {
        if (input === undefined || input === "") this.setError(errorMessage.invalidInput);
        return this;
    }

    this.checkLength = (min, max) => {
        if (input.length < min || input.length > max) this.setError(errorMessage.length);
        return this;
    }

    this.checkPwRegex = () => {
        if (!pwRegex.test(input)) this.setError(errorMessage.regex);
        return this;
    }

    this.checkNameRegex = () => {
        if (!nameRegex.test(input)) this.setError(errorMessage.regex);
        return this;
    }

    this.checkEmailRegex = () => {
        if (!emailRegex.test(input)) this.setError(errorMessage.regex);
        return this;
    }

    this.isNumber = () => {
        if (isNaN(Number(input))) this.setError(errorMessage.isNumber);
        return this;
    }

    this.setError = (message) => {
        const error = new BadRequestException(`${name}: ${message}`);
        throw error;
    }
}

const validate = (input, name) => {
    const res = new Validation(input, name);
    return res;
}

module.exports = validate;
