const path = require("path");
const CLIENT_PATH = path.join(__dirname, '../../client/pages');
const multer = require("multer");

const errorHandling = () => {
    return (err, req, res, next) => {
        const result = {
            message: err.message,
        }
        console.error(err);

        if (err.status === 404) {
            return res.sendFile(path.join(CLIENT_PATH, "404.html"));
        }

        if (err instanceof multer.MulterError) {
            result.message = err.message;
            return res.status(404).send(result);
        }

        return res.status(err.status).send(result);
    }
}

module.exports = errorHandling;
