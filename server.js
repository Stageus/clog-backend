const express = require("express");
const app = express();
require("dotenv").config();

const PORT = process.env.PORT;

app.get("/", (req, res) => {
    console.log("ㅎㅇ");
});

app.listen(PORT, (req, res) => {
    console.log(`${PORT}번 포트에서 실행`);
});
