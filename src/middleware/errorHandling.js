const errorHandling = () => {
    return (err, req, res, next) => {
        const result = {
            message: err.message,
        }
        // 개발환경 전용
        console.error(err);

        // 500 error
        if (!err.status) {
            err.status = 500;
            result.message = "서버에서 오류가 발생하였습니다";
            return res.status(err.status).send(result);
        }

        return res.status(err.status).send(result);
    }
}

module.exports = errorHandling;
