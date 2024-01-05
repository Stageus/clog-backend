require("dotenv").config();

const app = require("../src/server");
const PORT = process.env.PORT;

app.listen(PORT, (req, res) => {
    console.log(PORT + "번에서 실행");
});
