const router = require("express").Router();
const pool = require("../../../config/database/postgresql");
const loginAuth = require('../../middleware/auth/loginAuth');
const validate = require('../../module/validation');
const { COMMENT } = require('../../module/global');
const CONSTRAINT = require("../../module/constraint");
const { BadRequestException, NotFoundException, ForbbidenException } = require('../../module/customError');

// 게시글의 댓글 리스트 조회 api
// 권한: 해당 동아리에 가입되어있어야 함.
router.get("/list/post/:postId", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { postId } = req.params;
    const page = req.query.page || 1;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(postId, "post-id").checkInput().isNumber();
        validate(page, "page").isNumber().isPositive();
        const selectClubAuthSql = `SELECT
                                        (
                                            SELECT
                                                club_member_tb.position < 3
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.club_id = club_tb.id
                                            AND
                                                club_member_tb.account_id = $1
                                        ) AS "position"
                                    FROM
                                        club_post_tb
                                    JOIN
                                        club_board_tb
                                    ON
                                        club_post_tb.club_board_id = club_board_tb.id
                                    JOIN
                                        club_tb
                                    ON
                                        club_board_tb.club_id = club_tb.id
                                    WHERE
                                        club_post_tb.id = $2`;
        const selectClubAuthParam = [userId, postId];
        const selectClubAuthData = await pool.query(selectClubAuthSql, selectClubAuthParam);
        if (selectClubAuthData.rowCount === 0) {
            throw new NotFoundException("해당하는 게시글이 존재하지 않습니다");
        }
        console.log(selectClubAuthData.rows[0].position)
        if (!selectClubAuthData.rows[0].position) {
            throw new ForbbidenException("동아리에 가입하지 않은 사용자입니다");
        }
        const offset = (page - 1) * COMMENT.MAX_COMMENT_COUNT_PER_POST;
        const selectCommentCountSql = `SELECT 
                                            COUNT(*)::int
                                        FROM
                                            club_comment_tb
                                        WHERE
                                            club_post_id = $1`;
        const selectCommentCountParam = [postId];
        const selectCommentCountData = await pool.query(selectCommentCountSql, selectCommentCountParam);
        const selectCommentsSql = `SELECT 
                                        club_comment_tb.id, 
                                        account_tb.entry_year AS "entryYear", 
                                        club_comment_tb.content, 
                                        club_comment_tb.created_at AS "createdAt", 
                                        (
                                            SELECT
                                                count(*)::int
                                            FROM
                                                club_reply_tb
                                            WHERE
                                                club_reply_tb.club_comment_id = club_comment_tb.id
                                        )::int AS "replyCount",
                                        account_tb.id AS "authorId", 
                                        account_tb.name AS "authorName",
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
                                        account_tb.personal_color AS "authorPcolor", 
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR club_comment_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        ) AS "manageState"
                                    FROM 
                                        club_comment_tb 
                                    JOIN 
                                        account_tb 
                                    ON 
                                        club_comment_tb.account_id = account_tb.id 
                                    JOIN 
                                        club_post_tb 
                                    ON 
                                        club_comment_tb.club_post_id = club_post_tb.id 
                                    JOIN
                                        club_board_tb
                                    ON
                                        club_post_tb.club_board_id = club_board_tb.id
                                    JOIN
                                        club_tb
                                    ON
                                        club_board_tb.club_id = club_tb.id
                                    WHERE 
                                        club_comment_tb.club_post_id = $2
                                    ORDER BY
                                        club_comment_tb.created_at DESC
                                    OFFSET
                                        $3
                                    LIMIT
                                        $4`;
        const selectCommentParam = [userId, postId, offset, COMMENT.MAX_COMMENT_COUNT_PER_POST];
        const selectCommentData = await pool.query(selectCommentsSql, selectCommentParam);
        result.data = {
            count: selectCommentCountData.rows[0].count,
            comments: selectCommentData.rows
        };

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 댓글 작성 api
// 권한: 해당 동아리에 가입되어있어야 함.
router.post("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { postId, content } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(postId, "postId").checkInput().isNumber();
        validate(content, "content").checkInput().checkLength(1, COMMENT.MAX_COMMENT_CONTENT_LENGTH);
        const selectClubAuthSql = `SELECT 
                                        (
                                            SELECT 
                                                club_member_tb.account_id < 3
                                            FROM 
                                                club_member_tb
                                            WHERE 
                                                club_member_tb.club_id = club_tb.id
                                            AND 
                                                club_member_tb.account_id = $1 
                                        ) AS "position",
                                    FROM 
                                        club_post_tb 
                                    JOIN 
                                        club_board_tb 
                                    ON 
                                        club_post_tb.club_board_id = club_board_tb.id 
                                    JOIN 
                                        club_tb 
                                    ON 
                                        club_board_tb.club_id = club_tb.id 
                                    WHERE 
                                        club_post_tb.id = $2`;
        const selectClubAuthParam = [userId, postId];
        const selectClubAuthData = await pool.query(selectClubAuthSql, selectClubAuthParam);
        if (selectClubAuthData.rowCount === 0) {
            throw new NotFoundException("해당하는 게시글이 존재하지 않습니다");
        }
        if (!selectClubAuthData.rows[0].position) {
            throw new ForbbidenException("동아리에 가입하지 않은 사용자입니다");
        }

        const insertCommentSql = `INSERT INTO
                                            club_comment_tb (account_id, club_post_id, content)
                                        VALUES
                                            ($1, $2, $3)
                                        RETURNING
                                            id`;
        const insertCommentParam = [userId, postId, content];
        const insertCommentData = await pool.query(insertCommentSql, insertCommentParam);
        result.data = {
            commentId: insertCommentData.rows[0].id
        }
    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_COMMENT_TB) {
            return next(new BadRequestException("해당하는 사용자가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_CLUB_POST_TO_COMMENT_TB) {
            return next(new BadRequestException("해당하는 게시글이 존재하지 않습니다"));
        }
        return next(error);
    }
    res.send(result);
});

// 댓글 수정 api
// 권한: 해당 동아리에 가입되어있어야 함 && 본인이거나 해당 동아리의 관리자만
router.put("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId, content } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "commentId").checkInput().isNumber();
        validate(content, "content").checkInput().checkLength(1, COMMENT.MAX_COMMENT_CONTENT_LENGTH);

        const selectAuthSql = `SELECT
                                    club_comment_tb.account_id AS "accountId",
                                    (
                                        SELECT
                                            club_member_tb.position < 2 OR club_comment_tb.account_id = $1
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ) AS "manageAuth"
                                FROM
                                    club_comment_tb
                                JOIN
                                    club_post_tb
                                ON
                                    club_comment_tb.club_post_id = club_post_tb.id
                                JOIN
                                    club_board_tb
                                ON
                                    club_post_tb.club_board_id = club_board_tb.id
                                JOIN
                                    club_tb
                                ON
                                    club_board_tb.club_id = club_tb.id
                                WHERE
                                    club_comment_tb.id = $2`;
        const selectAuthParam = [userId, commentId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        // 수정 권한 체크
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new BadRequestException("수정 권한이 없습니다");
        }
        // 댓글 수정 시작
        const updateCommentSql = `UPDATE
                                        club_comment_tb
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

// 댓글 삭제 api
// 권한: 해당 동아리에 가입되어있어야 함 && 본인이거나 해당 동아리의 관리자만
router.delete("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "commentId").checkInput().isNumber();

        const selectAuthSql = `SELECT
                                    club_comment_tb.account_id AS "accountId",
                                    (
                                        SELECT
                                            club_member_tb.position < 2 OR club_comment_tb.account_id = $1
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ) AS "manageAuth"
                                FROM
                                    club_comment_tb
                                JOIN
                                    club_post_tb
                                ON
                                    club_comment_tb.club_post_id = club_post_tb.id
                                JOIN
                                    club_board_tb
                                ON
                                    club_post_tb.club_board_id = club_board_tb.id
                                JOIN
                                    club_tb
                                ON
                                    club_board_tb.club_id = club_tb.id
                                WHERE
                                    club_comment_tb.id = $2`;
        const selectAuthParam = [userId, commentId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        // 수정 권한 체크
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new BadRequestException("삭제 권한이 없습니다");
        }
        // 댓글 삭제 시작
        const updateCommentSql = `DELETE FROM
                                        club_comment_tb
                                    WHERE
                                        id = $1`;
        const updateCommentParam = [commentId];
        await pool.query(updateCommentSql, updateCommentParam);

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
