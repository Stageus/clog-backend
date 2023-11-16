const router = require("express").Router();
const loginAuth = require("../middleware/loginAuth");
const imageUploader = require("../middleware/imageUploader");
const { BadRequestException } = require('../module/customError');

// 동아리 프로필 이미지 업로드
router.post("/club-profile", loginAuth, imageUploader.clubProfileUploader(), async (req, res, next) => {
    const image = req.file;
    const result = {
        message: "",
        data: {},
    }

    result.data = image?.location;
    res.send(result);
});

// 동아리 배너 이미지 업로드
router.post("/club-banner", loginAuth, imageUploader.clubBannerUploader(), async (req, res, next) => {
    const image = req.file;
    const result = {
        message: "",
        data: {},
    }

    result.data = image?.location;
    res.send(result);
});

// 동아리 게시글 이미지 업로드
router.post("/post", loginAuth, imageUploader.postUploader(), async (req, res, next) => {
    const image = req.files;
    const result = {
        message: "",
        data: {},
    }

    result.data = image.map(item => item?.location);
    res.send(result);
});

// 동아리 홍보물 이미지 업로드
router.post("/promotion", loginAuth, imageUploader.promotionUploader(), async (req, res, next) => {
    const image = req.files;
    const result = {
        message: "",
        data: {},
    }

    result.data = image.map(item => item?.location);
    res.send(result);
});

// 동아리 공지글 이미지 업로드
router.post("/notice", loginAuth, imageUploader.noticeUploader(), async (req, res, next) => {
    const image = req.files;
    const result = {
        message: "",
        data: {},
    }

    result.data = image.map(item => item?.location);
    res.send(result);
});

module.exports = router;
