const multer = require("multer");

const errorHandling = () => {
    return (err, req, res, next) => {
        const result = {
            message: err.message,
        }
        // 개발환경 전용
        console.error(err);

        return res.status(err.status).send(result);
    }
}

module.exports = errorHandling;
