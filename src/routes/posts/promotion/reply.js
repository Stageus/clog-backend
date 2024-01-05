const router = require("express").Router();
const loginAuth = require('../../../middleware/loginAuth');
const { REPLY, MAX_PK_LENGTH } = require('../../../module/global');
const validate = require('../../../module/validation');
const pool = require("../../../config/database/postgresql");
const CONSTRAINT = require("../../../module/constraint");
const { BadRequestException } = require('../../../module/customError');


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
        validate(commentId, "commentId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(page, "page").isNumber().isPositive();

        // manageState 권한은 답글의 작성자이거나 해당 동아리의 관리자여야함
        const selectReplySql = `SELECT
                                        promotion_reply_tb.id,
                                        promotion_reply_tb.content,
                                        TO_CHAR(promotion_reply_tb.created_at, 'YYYY.MM.DD.MM:SS') AS "createdAt",
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
                                                    club_member_tb.position < 2 OR club_member_tb.account_id = promotion_reply_tb.account_id
                                                FROM
                                                    club_member_tb
                                                WHERE
                                                    club_member_tb.account_id = $1
                                                AND
                                                    club_member_tb.club_id = club_tb.id
                                            )
                                        , false) AS "manageState"
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

// 홍보 게시물 댓글의 답글 작성
// 권한: 로그인한 유저
router.post("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId, content } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "commentId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(content, "content").checkInput().checkLength(1, REPLY.MAX_REPLY_CONTENT_LENGTH);

        // 답글 작성
        const insertReplySql = `INSERT INTO
                                        promotion_reply_tb (account_id, comment_id, content) 
                                    VALUES 
                                        ($1, $2, $3)
                                    RETURNING
                                        id`;
        const insertReplyParam = [userId, commentId, content];
        const insertReplyData = await pool.query(insertReplySql, insertReplyParam);
        result.data = {
            replyId: insertReplyData.rows[0].id
        };
    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_PROMOTION_REPLY_TB) {
            return next(new BadRequestException("해당하는 사용자가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_PROMOTION_COMMENT_TO_PROMOTION_REPLY_TB) {
            return next(new BadRequestException("해당하는 댓글이 존재하지 않습니다"));
        }
        return next(error);
    }
    res.send(result);
});

// 홍보 게시물 답글 수정
// 권한: 해당 동아리 관리자 or 답글 작성자
router.put("/", loginAuth, async (req, res, next) => {
    const { replyId, content } = req.body;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(replyId, "replyId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(content, "content").checkInput().checkLength(1, REPLY.MAX_REPLY_CONTENT_LENGTH);

        const selectAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR promotion_reply_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageState"
                                FROM
                                    promotion_reply_tb
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
                                    promotion_reply_tb.id = $2`;
        const selectAuthParam = [userId, replyId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageState) {
            throw new BadRequestException("댓글 수정 권한이 없습니다");
        }
        const updateReplySql = `UPDATE 
                                    promotion_reply_tb
                                SET
                                    content = $1
                                WHERE
                                    id = $2`;
        const updateReplyParam = [content, replyId];
        const updateReplyData = await pool.query(updateReplySql, updateReplyParam);
        if (updateReplyData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 홍보 게시물 답글 삭제
// 권한: 해당 동아리 관리자 or 답글 작성자
router.delete("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { replyId } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(replyId, "replyId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();

        const selectAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR promotion_reply_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageState"
                                FROM
                                    promotion_reply_tb
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
                                    promotion_reply_tb.id = $2`;
        const selectAuthParam = [userId, replyId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageState) {
            throw new BadRequestException("댓글 삭제 권한이 없습니다");
        }
        // 삭제 시작
        const deleteReplySql = `DELETE FROM
                                        promotion_reply_tb
                                    WHERE
                                        id = $1`;
        const deleteReplyParam = [replyId];
        const deleteReplyData = await pool.query(deleteReplySql, deleteReplyParam);
        if (deleteReplyData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
