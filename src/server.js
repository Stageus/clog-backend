require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const redisClient = require("./config/database/redis");
const cors = require("cors");

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
const generalApi = require("./routes/posts/general");
const promotionApi = require("./routes/posts/promotion");
const noticeApi = require("./routes/posts/notice");
const searchApi = require("./routes/search");

const errorHandling = require("./middleware/errorHandling");

// connect redis client
redisClient.connect();

// global middleware
app.use(morgan(morganFormat, { stream: logger.stream })); // morgan 로그 설정 
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

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

// error handling middleware
app.use(errorHandling());

module.exports = app;
