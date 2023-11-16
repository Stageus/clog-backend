const router = require("express").Router();
const pool = require("../../../config/database/postgresql");
const loginAuth = require("../../../middleware/loginAuth");
const createNotification = require("../../../module/createNotification");
const validate = require("../../../module/validation");
const { NOTICE_COMMENT, MAX_PK_LENGTH, COMMENT } = require("../../../module/global");
const { BadRequestException, ForbbidenException, NotFoundException } = require("../../../module/customError");

// 공지 게시물 댓글 리스트 조회
// 권한: 해당 동아리에 가입되어있어야 함
router.get("/:noticeId/list", loginAuth, async (req, res, next) => {
    const { noticeId } = req.params;
    const page = req.query.page || 1;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(noticeId, "notice-id").checkInput().isNumber().checkLength(1, MAX_PK_LENGTH);
        validate(page, "page").checkInput().isPositive();
        const offset = (page - 1) * NOTICE_COMMENT.MAX_COMMENT_COUNT_PER_POST;

        // 권한 체크
        const selectPositionSql = `SELECT 
                                        position < 3 AS "clubAuthState"
                                    FROM
                                        club_member_tb
                                    WHERE
                                        account_id = $1
                                    AND
                                        club_id = (
                                                    SELECT
                                                        notice_tb.club_id
                                                    FROM
                                                        notice_tb
                                                    WHERE
                                                        notice_tb.id = $2
                                                )`;
        const selectPositionParams = [userId, noticeId];
        const selectPositionResult = await pool.query(selectPositionSql, selectPositionParams);
        if (selectPositionResult.rowCount === 0) {
            throw new NotFoundException("해당하는 게시글이 존재하지 않습니다");
        }
        if (!selectPositionResult.rows[0].clubAuthState) {
            throw new ForbbidenException("권한이 없습니다");
        }

        // 전체 댓글 수 조회
        const selectCommentCountSql = `SELECT
                                            (COUNT(DISTINCT notice_comment_tb.id) + COUNT(DISTINCT notice_reply_tb.id))::int AS "commentCount"
                                        FROM
                                            notice_comment_tb
                                        LEFT JOIN
                                            notice_reply_tb
                                        ON
                                            notice_comment_tb.id = notice_reply_tb.comment_id
                                        WHERE
                                            notice_comment_tb.post_id = $1`;
        const selectCommentCountParams = [noticeId];
        const selectCommentCountResult = await pool.query(selectCommentCountSql, selectCommentCountParams);

        // 댓글 목록 조회
        const selectCommentListSql = `SELECT
                                            notice_comment_tb.id,
                                            notice_comment_tb.content,
                                            TO_CHAR(notice_comment_tb.created_at, 'yyyy.mm.dd') AS "createdAt",
                                            (
                                                SELECT
                                                    COUNT(notice_reply_tb.*)
                                                FROM
                                                    notice_reply_tb
                                                WHERE
                                                    notice_reply_tb.comment_id = notice_comment_tb.id
                                            )::int AS "replyCount",
                                            notice_comment_tb.account_id AS "authorId",
                                            account_tb.name AS "authorName",
                                            account_tb.personal_color AS "authorPersonalColor",
                                            COALESCE(
                                                (
                                                    SELECT
                                                        club_member_tb.position < 2 OR club_member_tb.account_id = account_tb.id
                                                    FROM
                                                        club_member_tb
                                                    WHERE
                                                        club_member_tb.club_id = club_tb.id
                                                    AND
                                                        club_member_tb.account_id = $3
                                                ), false) AS "manageState"
                                        FROM
                                            notice_comment_tb
                                        JOIN
                                            account_tb
                                        ON
                                            notice_comment_tb.account_id = account_tb.id
                                        JOIN
                                            notice_tb
                                        ON
                                            notice_comment_tb.post_id = notice_tb.id
                                        JOIN
                                            club_tb
                                        ON
                                            notice_tb.club_id = club_tb.id
                                        WHERE
                                            notice_tb.id = $4
                                        ORDER BY
                                            notice_comment_tb.created_at DESC
                                        OFFSET
                                            $1
                                        LIMIT
                                            $2`;
        const selectCommentListParams = [offset, COMMENT.MAX_COMMENT_COUNT_PER_POST, userId, noticeId];
        const selectCommentListResult = await pool.query(selectCommentListSql, selectCommentListParams);
        result.data = {
            count: selectCommentCountResult.rows[0].commentCount,
            comments: selectCommentListResult.rows
        };
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 공지 게시물 댓글 작성
// 권한: 해당 동아리의 가입되어있어야 함
router.post("/", loginAuth, async (req, res, next) => {
    const { noticeId, content } = req.body;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(noticeId, "noticeId").checkInput().isNumber().checkLength(1, MAX_PK_LENGTH);
        validate(content, "content").checkInput().checkLength(1, NOTICE_COMMENT.MAX_COMMENT_CONTENT_LENGTH);

        // 작성 권한 체크
        const selectClubAuthSql = `SELECT
                                        position < 3 AS "clubAuthState"
                                    FROM
                                        club_member_tb
                                    WHERE
                                        account_id = $1
                                    AND
                                        club_id = (
                                                    SELECT
                                                        notice_tb.club_id
                                                    FROM
                                                        notice_tb
                                                    WHERE
                                                        notice_tb.id = $2
                                                )`;
        const selectClubAuthParams = [userId, noticeId];
        const selectClubAuthResult = await pool.query(selectClubAuthSql, selectClubAuthParams);
        if (selectClubAuthResult.rowCount === 0) {
            throw new BadRequestException("해당하는 동아리가 존재하지 않습니다");
        }
        if (!selectClubAuthResult.rows[0].clubAuthState) {
            throw new ForbbidenException("해당하는 동아리에 가입되어있지 않습니다");
        }
        const insertCommentSql = `INSERT INTO
                                            notice_comment_tb (account_id, post_id, content)
                                        VALUES
                                            ($1, $2, $3)
                                        RETURNING
                                                id`;
        const insertCommentParam = [userId, noticeId, content];
        const insertCommentResult = await pool.query(insertCommentSql, insertCommentParam);
        result.data = {
            commentId: insertCommentResult.rows[0].id
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 공지 게시물 댓글 수정
// 권한: 해당 동아리 관리자 OR 댓글 작성자
router.put("/", loginAuth, async (req, res, next) => {
    const { commentId, content } = req.body
    const userId = req.decoded.id
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(commentId, "commentId").checkInput().isNumber().checkLength(1, MAX_PK_LENGTH);
        validate(content, "content").checkInput().checkLength(1, NOTICE_COMMENT.MAX_COMMENT_CONTENT_LENGTH);
        // 권한 체크
        const selectCheckAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR club_member_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                    ), false) AS "manageState"
                                FROM
                                    notice_comment_tb
                                JOIN
                                    notice_tb
                                ON
                                    notice_comment_tb.post_id = notice_tb.id
                                JOIN
                                    club_tb
                                ON
                                    notice_tb.club_id = club_tb.id
                                WHERE
                                    notice_comment_tb.id = $2`;
        const selectCheckAuthParam = [userId, commentId];
        const selectCheckAuthResult = await pool.query(selectCheckAuthSql, selectCheckAuthParam);
        if (selectCheckAuthResult.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectCheckAuthResult.rows[0].manageState) {
            throw new ForbbidenException("수정 권한이 없습니다");
        }
        // 공지 댓글 수정
        const updateCommentSql = `UPDATE
                                        notice_comment_tb 
                                    SET 
                                        content = $1 
                                    WHERE 
                                        notice_comment_tb.id = $2`;
        const updateCommentParams = [content, commentId];
        await pool.query(updateCommentSql, updateCommentParams);
    } catch (error) {
        return next(error)
    }
    res.send(result)
});

// 댓글 삭제
// 권한: 해당 동아리 관리자 OR 댓글 작성자
router.delete("/", loginAuth, async (req, res, next) => {
    const { commentId } = req.body
    const userId = req.decoded.id
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(commentId, "commentId").checkInput().isNumber().checkLength(1, MAX_PK_LENGTH);
        // 권한 체크
        const selectCheckAuthSql = `SELECT
                                        COALESCE(
                                            (
                                                SELECT
                                                    club_member_tb.position < 2 OR club_member_tb.account_id = $1
                                                FROM
                                                    club_member_tb
                                                WHERE
                                                    club_member_tb.account_id = $1
                                                AND
                                                    club_member_tb.club_id = club_tb.id
                                        ), false) AS "manageState"
                                    FROM
                                        notice_comment_tb
                                    JOIN
                                        notice_tb
                                    ON
                                        notice_comment_tb.post_id = notice_tb.id
                                    JOIN
                                        club_tb
                                    ON
                                        notice_tb.club_id = club_tb.id
                                    WHERE
                                        notice_comment_tb.id = $2`;
        const selectCheckAuthParam = [userId, commentId];
        const selectCheckAuthResult = await pool.query(selectCheckAuthSql, selectCheckAuthParam);
        if (selectCheckAuthResult.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectCheckAuthResult.rows[0].manageState) {
            throw new ForbbidenException("삭제 권한이 없습니다");
        }
        // 공지 댓글 삭제
        const deleteCommentSql = `DELETE FROM
                                            notice_comment_tb
                                        WHERE
                                            notice_comment_tb.id = $1`;
        const deleteCommentParams = [commentId];
        await pool.query(deleteCommentSql, deleteCommentParams);
    } catch (error) {
        return next(error)
    }
    res.send(result)
});

module.exports = router