require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", async (req, res, next) => {
    res.send("qwedr")
});

module.exports = app;
