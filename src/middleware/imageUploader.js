require("dotenv").config();

const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3-transform");
const path = require("path");
const awsConfig = require('../config/aws');
const allowedExtensions = ['.png', '.jpg', '.jpeg'];
const { IMAGE } = require("../module/global");
const { BadRequestException } = require("../module/customError");

AWS.config.update(awsConfig);
const s3 = new AWS.S3();
const clubProfileUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, callback) => {
            const extension = path.extname(file.originalname);
            if (!allowedExtensions.includes(extension)) {
                return callback(new BadRequestException("파일 형식을 확인해주세요"));
            }
            callback(null, `club/profile/${Date.now()}_${file.originalname}`);
        },
        acl: "public-read-write"
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

const clubBannerUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, callback) => {
            const extension = path.extname(file.originalname);
            if (!allowedExtensions.includes(extension)) {
                return callback(new BadRequestException("파일 형식을 확인해주세요"));
            }
            callback(null, `club/banner/${Date.now()}_${file.originalname}`);
        },
        acl: "public-read-write"
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

const clubPostUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, callback) => {
            const extension = path.extname(file.originalname);
            if (!allowedExtensions.includes(extension)) {
                return callback(new BadRequestException("파일 형식을 확인해주세요"));
            }
            callback(null, `club/post/general/${Date.now()}_${file.originalname}`);
        },
        acl: "public-read-write"
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

const clubPromotionUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, callback) => {
            const extension = path.extname(file.originalname);
            if (!allowedExtensions.includes(extension)) {
                return callback(new BadRequestException("파일 형식을 확인해주세요"));
            }
            callback(null, `club/post/promotion/${Date.now()}_${file.originalname}`);
        },
        acl: "public-read-write"
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

const clubNoticeUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, callback) => {
            const extension = path.extname(file.originalname);
            if (!allowedExtensions.includes(extension)) {
                return callback(new BadRequestException("파일 형식을 확인해주세요"));
            }
            callback(null, `club/post/notice/${Date.now()}_${file.originalname}`);
        },
        acl: "public-read-write"
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

module.exports = {
    clubProfileUploader: () => {
        return async (req, res, next) => {
            clubProfileUpload.single("clubProfile")(req, res, (err) => {
                // 1. 단일 이미지가 아닐 경우
                if (err?.code === "LIMIT_UNEXPECTED_FILE") {
                    return next(new BadRequestException(`단일 이미지만 업로드 가능합니다`));
                }
                // 2. 이미지 용량이 큰 경우
                if (err?.code === "LIMIT_FILE_SIZE") {
                    return next(new BadRequestException(`이미지 용량이 너무 큽니다`));
                }
                if (err) {
                    return next(err);
                }
                console.log(`clubProfileUpload 실행`); // 개발환경 전용
                next();
            });
        }
    },

    clubBannerUploader: () => {
        return async (req, res, next) => {
            clubBannerUpload.single("clubBanner")(req, res, (err) => {
                // 1. 단일 이미지가 아닐 경우
                if (err?.code === "LIMIT_UNEXPECTED_FILE") {
                    return next(new BadRequestException(`단일 이미지만 업로드 가능합니다`));
                }
                // 2. 이미지 용량이 큰 경우
                if (err?.code === "LIMIT_FILE_SIZE") {
                    return next(new BadRequestException(`이미지 용량이 너무 큽니다`));
                }
                if (err) {
                    return next(err);
                }
                console.log(`clubBannerUploader 실행`); // 개발환경 전용
                next();
            });
        }
    },

    postUploader: () => {
        return async (req, res, next) => {
            clubPostUpload.array("postImages", IMAGE.MAX_POST_COUNT)(req, res, (err) => {
                // 1. 이미지 개수를 초과한 경우
                if (err?.code === "LIMIT_UNEXPECTED_FILE") {
                    return next(new BadRequestException(`이미지 개수는 ${IMAGE.MAX_NOTICE_COUNT}개 이하여야합니다`));
                }
                // 2. 이미지 용량이 큰 경우
                if (err?.code === "LIMIT_FILE_SIZE") {
                    return next(new BadRequestException(`이미지 용량이 너무 큽니다`));
                }
                if (err) {
                    return next(err);
                }
                console.log(`clubPostUploader 실행`); // 개발환경 전용
                next();
            });
        }
    },

    promotionUploader: () => {
        return async (req, res, next) => {
            clubPromotionUpload.array("postImages", IMAGE.MAX_PROMOTION_COUNT)(req, res, (err) => {
                // 1. 이미지 개수를 초과한 경우
                if (err?.code === "LIMIT_UNEXPECTED_FILE") {
                    return next(new BadRequestException(`이미지 개수는 ${IMAGE.MAX_PROMOTION_COUNT}개 이하여야합니다`));
                }
                // 2. 이미지 용량이 큰 경우
                if (err?.code === "LIMIT_FILE_SIZE") {
                    return next(new BadRequestException(`이미지 용량이 너무 큽니다`));
                }
                if (err) {
                    return next(err);
                }
                console.log(`clubPromotionUploader 실행`); // 개발환경 전용
                next();
            });
        }
    },

    noticeUploader: () => {
        return async (req, res, next) => {
            clubNoticeUpload.array("postImages", IMAGE.MAX_NOTICE_COUNT)(req, res, (err) => {
                // 1. 이미지 개수를 초과한 경우
                if (err?.code === "LIMIT_UNEXPECTED_FILE") {
                    return next(new BadRequestException(`이미지 개수는 ${IMAGE.MAX_NOTICE_COUNT}개 이하여야합니다`));
                }
                // 2. 이미지 용량이 큰 경우
                if (err?.code === "LIMIT_FILE_SIZE") {
                    return next(new BadRequestException(`이미지 용량이 너무 큽니다`));
                }
                if (err) {
                    return next(err);
                }
                console.log(`clubNoticeUploader 실행`); // 개발환경 전용
                next();
            });
        }
    },
}
