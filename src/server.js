require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const redisClient = require("../config/database/redis");

const accountApi = require("./routes/account");
const authApi = require("./routes/auth");
const errorHandling = require("./middleware/errorHandling");

// connect redis client
redisClient.connect();

// global middleware
app.use(express.json());
app.use(cookieParser());

// api call middleware
app.use("/account", accountApi);
app.use("/auth", authApi);

// error handling muddleware
app.use(errorHandling());

module.exports = app;
