const { InternerServerException } = require("../module/customError");

const errorHandling = () => {
    return (err, req, res, next) => {
        const result = {
            message: err.message,
        }
        // 개발환경 전용
        console.error(err);

        // 500 error
        if (!err.status) {
            const serverError = new InternerServerException();
            return res.status(serverError.status).send({message: serverError.message});
        }

        return res.status(err.status).send(result);
    }
}

module.exports = errorHandling;
