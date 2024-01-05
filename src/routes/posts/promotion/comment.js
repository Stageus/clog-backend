const router = require("express").Router();
const pool = require("../../../config/database/postgresql");
const loginAuth = require("../../../middleware/loginAuth");
const validate = require("../../../module/validation");
const { PROMOTION_COMMENT, MAX_PK_LENGTH } = require("../../../module/global");
const { BadRequestException } = require('../../../module/customError');
const CONSTRAINT = require("../../../module/constraint");

// 홍보 게시글의 댓글 리스트를 조회
// 권한: 로그인한 유저라면 전부 다
router.get("/:promotionId/list", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { promotionId } = req.params;
    const page = req.query.page || 1;
    const offset = (page - 1) * PROMOTION_COMMENT.MAX_COMMENT_COUNT_PER_POST;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(promotionId, "promotionId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(page, "page").isNumber().isPositive();

        const selectCommentCountSql = `SELECT
                                            COUNT(*)::int
                                        FROM
                                            promotion_comment_tb
                                        WHERE
                                            promotion_comment_tb.post_id = $1`;
        const selectCommentCountParam = [promotionId];
        const selectCommentCountData = await pool.query(selectCommentCountSql, selectCommentCountParam);
        const selectCommentSql = `SELECT
                                        promotion_comment_tb.id,
                                        promotion_comment_tb.content,
                                        COALESCE(
                                            (
                                                SELECT
                                                    club_member_tb.position < 2 OR club_member_tb.account_id = $1
                                                FROM
                                                    club_member_tb
                                                WHERE
                                                    club_member_tb.club_id = club_tb.id
                                                AND
                                                    club_member_tb.account_id = $1
                                            ), false) AS "manageState",
                                        TO_CHAR(promotion_comment_tb.created_at, 'YYYY.MM.DD') AS "createdAt",
                                        (
                                            SELECT
                                                count(*)
                                            FROM
                                                promotion_reply_tb
                                            WHERE
                                                promotion_reply_tb.comment_id = promotion_comment_tb.id
                                        )::int AS "replyCount",
                                        promotion_comment_tb.account_id AS "authorId",
                                        (
                                            SELECT
                                                major_tb.name
                                            FROM
                                                major_tb
                                            WHERE
                                                major_tb.id = account_tb.id
                                        ) AS "authorMajor",
                                        (
                                            SELECT
                                                position_tb.name
                                            FROM
                                                club_member_tb
                                            JOIN
                                                position_tb
                                            ON
                                                club_member_tb.position = position_tb.id
                                            WHERE
                                                club_member_tb.account_id = account_tb.id
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        ) AS "authorPosition",
                                        account_tb.entry_year AS "entryYear",
                                        account_tb.personal_color AS "authorPcolor"
                                    FROM
                                        promotion_comment_tb
                                    JOIN
                                        account_tb
                                    ON
                                        promotion_comment_tb.account_id = account_tb.id
                                    JOIN
                                        promotion_tb
                                    ON
                                        promotion_comment_tb.post_id = promotion_tb.id
                                    JOIN
                                        club_tb
                                    ON
                                        promotion_tb.club_id = club_tb.id
                                    WHERE
                                        promotion_comment_tb.post_id = $2
                                    ORDER BY
                                        promotion_comment_tb.created_at DESC
                                    OFFSET
                                        $3
                                    LIMIT
                                        $4`;
        const selectCommentParam = [userId, promotionId, offset, PROMOTION_COMMENT.MAX_COMMENT_COUNT_PER_POST];
        const selectCommentData = await pool.query(selectCommentSql, selectCommentParam);
        result.data = {
            count: selectCommentCountData.rows[0].count,
            comments: selectCommentData.rows,
        };
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 홍보 게시물에 댓글 작성 api
// 권한: 로그인한 유저라면 전부 다
router.post("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { promotionId, content } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(promotionId, "promotionId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(content, "content").checkInput().checkLength(1, PROMOTION_COMMENT.MAX_COMMENT_CONTENT_LENGTH);

        const insertCommentSql = `INSERT INTO
                                            promotion_comment_tb(account_id, post_id, content)
                                        VALUES
                                            ($1, $2, $3)
                                        RETURNING
                                            id`;
        const insertCommentParam = [userId, promotionId, content];
        const insertCommentData = await pool.query(insertCommentSql, insertCommentParam);
        result.data = {
            commentId: insertCommentData.rows[0]
        };

    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_PROMOTION_COMMENT_TB) {
            return next(new BadRequestException("해당하는 사용자가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_PROMOTION_TO_PROMOTION_COMMENT_TB) {
            return next(new BadRequestException("해당하는 홍보글이 존재하지 않습니다"));
        }
        return next(error);
    }
    res.send(result);
});

// 홍보 게시물의 댓글 수정 api
// 권한: 해당 동아리의 관리자
router.put("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId, content } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "commentId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(content, "content").checkInput().checkLength(1, PROMOTION_COMMENT.MAX_COMMENT_CONTENT_LENGTH)

        // 권한 체크
        const selectAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR club_member_tb.account_id = $1
                                            FROM
                                                club_member_Tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                    ), false) AS "manageState"
                                FROM
                                    promotion_comment_tb
                                JOIN
                                    promotion_tb
                                ON
                                    promotion_comment_tb.post_id = promotion_tb.id
                                JOIN
                                    club_tb
                                ON
                                    promotion_tb.club_id = club_tb.id
                                WHERE
                                    promotion_comment_tb.id = $2`;
        const selectAuthParam = [userId, commentId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        
        if (!selectAuthData.rows[0].manageState) {
            throw new BadRequestException("수정 권한이 없습니다");
        }
        const updateCommentSql = `UPDATE
                                        promotion_comment_tb
                                    SET
                                        content = $1
                                    WHERE
                                        id = $2`;
        const updateCommentParam = [content, commentId];
        await pool.query(updateCommentSql, updateCommentParam);

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 홍보 게시물의 댓글 삭제 api
// 권한: 해당 동아리의 관리자 OR 본인
router.delete("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "commentId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        // 권한 체크
        const selectAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR club_member_tb.account_id = $1
                                            FROM
                                                club_member_Tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                    ), false) AS "manageState"
                                FROM
                                    promotion_comment_tb
                                JOIN
                                    promotion_tb
                                ON
                                    promotion_comment_tb.post_id = promotion_tb.id
                                JOIN
                                    club_tb
                                ON
                                    promotion_tb.club_id = club_tb.id
                                WHERE
                                    promotion_comment_tb.id = $2`;
        const selectAuthParam = [userId, commentId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageState) {
            throw new BadRequestException("삭제 권한이 없습니다");
        }

        // 삭제 시작
        const deleteCommentSql = `DELETE FROM
                                            promotion_comment_tb
                                        WHERE
                                            id = $1`;
        const deleteCommentParam = [commentId];
        const deleteCommentData = await pool.query(deleteCommentSql, deleteCommentParam);
        if (deleteCommentData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
