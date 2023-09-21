require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", async (req, res, next) => {
    res.send("<div>gd</div>")
});

module.exports = app;
