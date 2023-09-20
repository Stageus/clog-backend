require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT;

app.get("/", async (req, res, next) => {
    res.send("<div>gd</div>")
});

app.listen(PORT, (req, res, next) => {
    console.log(`${PORT}번 포트에서 실행`);
});
