require("dotenv").config();

const express = require("express");
const app = express();

const authApi = require("./routes/auth");

app.use(express.json());

app.use("/auth", authApi);

module.exports = app;
