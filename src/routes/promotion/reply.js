const router = require("express").Router();
const loginAuth = require('../../middleware/auth/loginAuth');
const { REPLY } = require('../../module/global');
const validate = require('../../module/validation');
const pool = require("../../../config/database/postgresql");


// 홍보 게시물 댓글의 답글 리스트 조회
// 권한: 로그인한 유저
router.get("/list/comment/:commentId", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId } = req.params;
    const page = req.query.page || 1;
    const offset = (page - 1) * REPLY.MAX_REPLY_COUNT_PER_COMMENT;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "commentId").checkInput().isNumber();
        validate(page, "page").isNumber().isPositive();

        const selectReplySql = `SELECT
                                        promotion_reply_tb.id,
                                        promotion_reply_tb.content,
                                        TO_CHAR(promotion_reply_tb.created_at, 'YYYY.MM.DD') AS "createdAt",
                                        promotion_reply_tb.account_id AS "authorId",
                                        account_tb.entry_year AS "entryYear",
                                        account_tb.name AS "authorName",
                                        (
                                            SELECT
                                                major_tb.name
                                            FROM
                                                major_tb
                                            WHERE
                                                account_tb.major = major_tb.id
                                        ) AS "authorMajor",
                                        account_tb.personal_color AS "authorPcolor",
                                        COALESCE(
                                            (
                                                SELECT
                                                    club_member_tb.position < 2
                                                FROM
                                                    club_member_tb
                                                WHERE
                                                    club_member_tb.club_id = club_tb.id
                                                AND
                                                    club_member_tb.account_id = $1
                                            ), false) AS "manageState"
                                    FROM
                                        promotion_reply_tb
                                    JOIN
                                        account_tb
                                    ON
                                        promotion_reply_tb.account_id = account_tb.id        
                                    JOIN
                                        promotion_comment_tb
                                    ON
                                        promotion_reply_tb.comment_id = promotion_comment_tb.id
                                    JOIN
                                        promotion_tb
                                    ON
                                        promotion_comment_tb.post_id = promotion_tb.id
                                    JOIN
                                        club_tb
                                    ON
                                        promotion_tb.club_id = club_tb.id
                                    WHERE
                                        promotion_reply_tb.comment_id = $2
                                    ORDER BY
                                        promotion_reply_tb.created_at DESC
                                    OFFSET
                                        $3
                                    LIMIT
                                        $4`;
        const selectReplyParam = [userId, commentId, offset, REPLY.MAX_REPLY_COUNT_PER_COMMENT]
        const selectReplyData = await pool.query(selectReplySql, selectReplyParam);
        result.data = {
            message: selectReplyData.rows
        };
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;