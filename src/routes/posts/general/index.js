const router = require("express").Router();
const generalPostApi = require("./post");
const generalCommentApi = require("./comment");
const generalReplyApi = require("./reply");

router.use("/post", generalPostApi);
router.use("/comment", generalCommentApi);
router.use("/reply", generalReplyApi);

module.exports = router;
