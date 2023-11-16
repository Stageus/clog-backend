module.exports = {
    MAX_PK_LENGTH: 4,
    ACCOUNT: {
        MAX_EMAIL_LENGTH: 60,
        MAX_PW_LENGTH: 60
    },

    AUTH: {
        CERTIFIED_LENGTH: 5,
        CERTIFIED_EXPIRE_TIME: 180,
    },

    CLUB: {
        MAX_CLUB_COVER_LENGTH: 500,
        MAX_CLUB_BELONG_LENGTH: 5,
        MAX_CLUB_BIG_CATEGORY_LENGTH: 5,
        MAX_CLUB_SMALL_CATEGORY_LENGTH: 5,
        MAX_BANNER_IMAGE_LENGTH: 20000,
        MAX_PROFILE_IMAGE_LENGTH: 20000,
        MAX_ALL_POST_COUNT_PER_PAGE: 20,
        MAX_FIXED_NOTICE_COUNT_PER_PAGE: 5,
        MAX_BOARD_COUNT: 10
    },

    BOARD: {
        MAX_BOARD_LENGTH: 16
    },

    POST: {
        MAX_POST_TITLE_LENGTH: 32,
        MAX_POST_CONTENT_LENGTH: 500,
        MAX_POST_COUNT_PER_PAGE: 10
    },

    SEARCH: {
        MAX_CLUB_PER_PAGE: 10, // 논의(임시)
        MAX_CLUB_PER_PAGE_FOR_CLUBNAME: 6,
        MAX_PROMOTION_PER_PAGE: 15
    },

    PROMOTION: {
        MAX_PROMOTION_TITLE_LENGTH: 32,
        MAX_PROMOTION_CONTENT_LENGTH: 500,
        MAX_PROMOTION_COUNT_PER_PAGE: 10 // 논의(임시),
    },

    COMMENT: {
        MAX_COMMENT_COUNT_PER_POST: 10, // 논의 (임시)
        MAX_COMMENT_CONTENT_LENGTH: 300 // 논의 (임시)
    },

    PROMOTION_COMMENT: {
        MAX_COMMENT_COUNT_PER_POST: 10, // 논의 (임시)
        MAX_COMMENT_CONTENT_LENGTH: 300, // 논의 (임시)
    },

    REPLY: {
        MAX_REPLY_COUNT_PER_COMMENT: 10, // 논의 (임시)
        MAX_REPLY_CONTENT_LENGTH: 300
    },

    IMAGE: {
        MAX_POST_COUNT: 3, // 30개
        MAX_PROMOTION_COUNT: 3, // 5개
        MAX_NOTICE_COUNT: 3 // 30개
    },

    POSITION: {
        PRESIDENT: 0,   // 회장
        MANAGER: 1,     // 운영진
        MEMBER: 2       // 부원
    },

    NOTIFICATION_URL: {
        CLUB_COMMENT: "/comment",
        CLUB_REPLY: "/reply",

        NOTI_COMMENT: "/notice/comment",
        NOTI_REPLY: "/notice/reply",

        PR_COMMENT: "/promotion/comment",
        PR_REPLY: "/promotion/reply",
        
        GRADE_UPDATE: "/club/position",
        JOIN_ACCEPT: "/club/member"
    },

    NOTIFICATION: {
        ID_LENGTH: 24, // 임시
        LIMIT: 100 // 임시
    },

    NOTICE: {
        MAX_TITLE_LENGTH: 20, // 임시
        MAX_CONTENT_LENGTH: 500, // 임시
    },

    NOTICE_COMMENT: {
        MAX_COMMENT_COUNT_PER_POST : 10, // 임시
        MAX_COMMENT_CONTENT_LENGTH: 300, // 임시
    }
}