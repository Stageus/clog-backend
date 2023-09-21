require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");

const authApi = require("./routes/auth");
const accountApi = require("./routes/account");
const errorHandling = require("./middleware/errorHandling");

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authApi);
app.use("/account", accountApi);

module.exports = app;
