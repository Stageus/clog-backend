const router = require("express").Router();
const noticeApi = require("./notice");
const commentApi = require("./comment");
const replyApi = require("./reply");

router.use("/", noticeApi);
router.use("/comment", commentApi);
router.use("/reply", replyApi);

module.exports = router;
