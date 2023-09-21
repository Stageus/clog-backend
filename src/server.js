require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", async (req, res, next) => {
    res.send("asdf")
});

module.exports = app;
