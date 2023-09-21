const path = require("path");
const CLIENT_PATH = path.join(__dirname, '../../client/pages');
const multer = require("multer");

const errorHandling = () => {
    return (err, req, res, next) => {
        const result = {
            message: err.message,
        }
        // 개발환경 전용
        console.error(err);

        if (err instanceof multer.MulterError) {
            result.message = err.message;
            return res.status(400).send(result);
        }

        return res.status(err.status).send(result);
    }
}

module.exports = errorHandling;
