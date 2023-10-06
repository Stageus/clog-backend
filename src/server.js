require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const redisClient = require("../config/database/redis");

const accountApi = require("./routes/account");
const authApi = require("./routes/auth");
const uploadApi = require("./routes/upload");
const clubApi = require("./routes/club");
const noticeApi = require("./routes/notice");
const boardApi = require("./routes/board");

const errorHandling = require("./middleware/errorHandling");

// connect redis client
redisClient.connect();

// global middleware
app.use(express.json());
app.use(cookieParser());

// api call middleware
app.use("/account", accountApi);
app.use("/auth", authApi);
app.use("/upload", uploadApi);
app.use("/club", clubApi);
app.use("/notice", noticeApi);
app.use("/board", boardApi);

// error handling muddleware
app.use(errorHandling());

module.exports = app;
