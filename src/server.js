require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");

const authApi = require("./routes/auth");
const accountApi = require("./routes/account");
const errorHandling = require("./middleware/errorHandling");

// config global middleware
app.use(express.json());
app.use(cookieParser());

// api call middleware
app.use("/auth", authApi);
app.use("/account", accountApi);

// error handling middleware
app.use(errorHandling());

module.exports = app;
