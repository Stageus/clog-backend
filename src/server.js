require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");

const authApi = require("./routes/auth");

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authApi);

module.exports = app;
