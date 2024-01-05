module.exports = {
    // 회원가입 시 제약
    UNIQUE_EMAIL_TO_ACCOUNT_TB: "unique_account_tb_email",
    FK_MAJOR_TO_ACCOUNT_TB: "fk_major_tb_to_account_tb",

    // 동아리 생성 시 fk 제약
    FK_BELONG_TO_CLUB_TB: "fk_belong_tb_to_club_tb",
    FK_BIG_CATEGORY_TO_CLUB_TB: "fk_big_category_tb_to_club_tb",
    FK_SMALL_CATEGORY_TO_CLUB_TB: "fk_small_category_tb_to_club_tb",
    UNIQUE_CLUB_NAME_TO_CLUB_TB: "unique_club_tb_name",

    // 동아리 가입 신청시 fk 제약
    FK_ACCOUNT_TO_JOIN_REQUEST_TB: "fk_account_tb_to_join_request_tb",
    FK_CLUB_TO_JOIN_REQUEST_TB: "fk_club_tb_to_join_request_tb",

    // 동아리 멤버 추가 시 fk제약
    FK_ACCOUNT_TO_CLUB_MEMBER_TB: "fk_account_tb_to_club_member_tb",
    FK_CLUB_TO_CLUB_MEMBER_TB: "fk_club_tb_to_club_member_tb",
    FK_POSITION_TO_CLUB_POSITION_TB: "fk_position_tb_to_club_member_tb",

    // 동아리 직급 변경 시 fk제약
    FK_POSITION_TO_CLUB_MEMBER_TB: "fk_position_tb_to_club_member_tb",

    // 동아리 게시판 추가 시 fk제약
    FK_CLUB_TO_BOARD_TB: "fk_club_tb_to_club_board_tb",

    // 일반게시글 작성 시 fk제약
    FK_BOARD_TO_CLUB_POST_TB: "fk_club_board_tb_to_club_post_tb",
    FK_ACCOUNT_TO_CLUB_POST_TB: "fk_account_tb_to_club_post_tb",
    FK_POST_TO_POST_IMG_TB: "fk_club_post_tb_to_post_img_tb",
    // 일반게시글에 댓글 작성 시 fk제약
    FK_ACCOUNT_TO_COMMENT_TB: "fk_account_tb_to_club_comment_tb",
    FK_CLUB_POST_TO_COMMENT_TB: "fk_club_post_tb_to_club_comment_tb",
    // 일반게시글에 답글 작성 시 fk제약
    FK_ACCOUNT_TO_CLUB_REPLY_TB: "fk_account_tb_to_club_reply_tb",
    FK_COMMENT_TO_CLUB_REPLY_TB: "fk_club_comment_tb_to_club_reply_tb",

    // 공지게시글에 답글 작성 시 fk제약
    FK_ACCOUNT_TO_NOTICE_REPLY_TB: "fk_account_tb_to_notice_reply_tb",
    FK_COMMENT_TO_NOTICE_REPLY_TB: "fk_notice_comment_tb_to_notice_reply_tb",

    // 홍보게시글 작성 시 fk제약
    FK_CLUB_TO_PROMOTION_POST_TB: "fk_club_tb_to_promotion_post_tb",
    // 홍보 게시글에 댓글 작성시 fk제약
    FK_ACCOUNT_TO_PROMOTION_COMMENT_TB: "fk_account_tb_to_promotion_comment_tb",
    FK_PROMOTION_TO_PROMOTION_COMMENT_TB: "fk_promotion_post_tb_to_promotion_comment_tb",
    // 홍보 게시글에 답글 작성 시 fk제약
    FK_ACCOUNT_TO_PROMOTION_REPLY_TB: "fk_account_tb_to_promotion_reply_tb",
    FK_PROMOTION_COMMENT_TO_PROMOTION_REPLY_TB: "fk_promotion_comment_tb_to_promotion_reply_tb"
}
