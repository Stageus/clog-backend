require("dotenv").config();

const app = require("../src/server");
const PORT = process.env.PORT;

app.listen(PORT, (req, res, next) => {
    console.log(`${PORT}번 포트에서 실행`);
});
