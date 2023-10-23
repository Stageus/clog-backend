require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const redisClient = require("../config/database/redis");

// 로그
const morgan = require("morgan");
const logger = require("./module/logger");
const morganFormat = process.env.NODE_ENV !== "production" ? "dev" : combined; // NOTE: morgan 출력 형태 server.env에서 NODE_ENV 설정 production : 배포 dev : 개발

const accountApi = require("./routes/account");
const authApi = require("./routes/auth");
const uploadApi = require("./routes/upload");
const clubApi = require("./routes/club");
const notificationApi = require("./routes/notification");
const boardApi = require("./routes/board");
const generalApi = require("./routes/general");
const promotionApi = require("./routes/promotion");
const noticeApi = require("./routes/notice");
const searchApi = require("./routes/search");

const errorHandling = require("./middleware/errorHandling");

// connect redis client
redisClient.connect();

// global middleware
app.use(morgan(morganFormat, { stream: logger.stream })); // morgan 로그 설정 
app.use(express.json());
app.use(cookieParser());

// api call middleware
app.use("/account", accountApi);
app.use("/auth", authApi);
app.use("/upload", uploadApi);
app.use("/club", clubApi);
app.use("/notification", notificationApi);
app.use("/board", boardApi);
app.use("/search", searchApi);
app.use("/general", generalApi);
app.use("/notice", noticeApi);
app.use("/promotion", promotionApi);

// error handling muddleware
app.use(errorHandling());

module.exports = app;
