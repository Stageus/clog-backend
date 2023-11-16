const router = require("express").Router();
const promotionApi = require("./promotion");
const commentApi = require("./comment");
const replyApi = require("./reply");

router.use("/", promotionApi);
router.use("/comment", commentApi);
router.use("/reply", replyApi);

module.exports = router;
