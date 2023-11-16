const router = require("express").Router();
const pool = require('../../../config/database/postgresql');
const loginAuth = require('../../../middleware/loginAuth');
const { BadRequestException, NotFoundException } = require('../../../module/customError');
const { REPLY, MAX_PK_LENGTH } = require('../../../module/global');
const CONSTRAINT = require("../../../module/constraint");
const validate = require('../../../module/validation');

// 댓글의 답글 리스트를 조회
// 권한: 해당 동아리에 가입되어있어야 함
router.get("/list/comment/:commentId", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId } = req.params;
    const page = req.query.page || 1;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "commentId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(page, "page").isNumber().isPositive();
        const offset = (page - 1) * REPLY.MAX_REPLY_COUNT_PER_COMMENT;
        const selectClubAuthSql = `SELECT
                                        club_comment_tb.account_id AS "accountId",
                                        (
                                            SELECT
                                                club_member_tb.position
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.club_id = club_tb.id
                                            AND
                                                club_member_tb.account_id = $1
                                        ) AS "position"
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
        const selectClubAuthParam = [userId, commentId];
        const selectClubAuthResult = await pool.query(selectClubAuthSql, selectClubAuthParam);
        if (selectClubAuthResult.rowCount === 0) {
            throw new NotFoundException("댓글이 존재하지 않습니다");
        }
        if (selectClubAuthResult.rows[0].position === null) {
            throw new BadRequestException("해당 동아리에 가입되어있지 않습니다");
        }
        const selectReplySql = `SELECT
                                    club_reply_tb.id,
                                    club_reply_tb.content,
                                    club_reply_tb.created_at AS "createdAt",
                                    account_tb.id AS "accountId",
                                    account_tb.entry_year AS "entryYear",
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
                                    (
                                        SELECT
                                            major_tb.name
                                        FROM
                                            club_member_tb
                                        JOIN
                                            major_tb
                                        ON
                                            account_tb.major = major_tb.id
                                        WHERE
                                            club_member_tb.account_id = account_tb.id
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ) AS "authorMajor",
                                    account_tb.personal_color AS "authorPcolor",
                                    account_tb.id = $1 AS "authorState"
                                FROM
                                    club_reply_tb
                                JOIN
                                    account_tb
                                ON
                                    club_reply_tb.account_id = account_tb.id
                                JOIN
                                    club_comment_tb
                                ON
                                    club_reply_tb.club_comment_id = club_comment_tb.id
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
                                    club_reply_tb.club_comment_id = $2
                                ORDER BY
                                    club_reply_tb.created_at ASC
                                OFFSET
                                    $3
                                LIMIT
                                    $4`;
        const selectReplyParam = [userId, commentId, offset, REPLY.MAX_REPLY_COUNT_PER_COMMENT];
        const selectReplyData = await pool.query(selectReplySql, selectReplyParam);
        result.data = {
            replys: selectReplyData.rows
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 대댓글 작성 api
// 권한: 해당 동아리에 가입되어있어야 함
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

        // 권한 체크 (동아리에 가입되어있는 사용자인지)
        const selectClubAuthSql = `SELECT
                                        club_comment_tb.account_id AS "accountId",
                                        (
                                            SELECT
                                                club_member_tb.position
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.club_id = club_tb.id
                                            AND
                                                club_member_tb.account_id = $1
                                        ) AS "position"
                                    FROM
                                        club_comment_tb
                                    JOIN
                                        club_post_tb
                                    ON
                                        club_comment_tb.club_post_id = club_post_tb.id
                                    JOIN
                                        club_board_tb
                                    ON
                                        club_post_tb.club_board_id = club_board_id
                                    JOIN
                                        club_tb
                                    ON
                                        club_board_tb.club_id = club_tb.id
                                    WHERE
                                        club_comment_tb.id = $2`;
        const selectClubAuthParam = [userId, commentId];
        const selectClubAuthData = await pool.query(selectClubAuthSql, selectClubAuthParam);
        if (selectClubAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (selectClubAuthData.rows[0].position === null) {
            throw new BadRequestException("동아리에 가입하지 않은 사용자입니다");
        }
        // 대댓글 작성
        const insertReplySql = `INSERT INTO
                                            club_reply_tb (account_id, club_comment_id, content)
                                        VALUES
                                            ($1, $2, $3)
                                        RETURNING
                                            id`;
        const insertReplyParam = [userId, commentId, content];
        const insertReplyData = await pool.query(insertReplySql, insertReplyParam);
        result.data = {
            replys: insertReplyData.rows[0].id
        };
    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_CLUB_REPLY_TB) {
            throw new BadRequestException("해당하는 사용자가 존재하지 않습니다");
        }
        if (error.constraint === CONSTRAINT.FK_COMMENT_TO_CLUB_REPLY_TB) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        return next(error);
    }
    res.send(result);
});

// 대댓글 수정 api
// 권한: 본인이거나 해당 동아리의 운영진이거나
router.put("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { replyId, content } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(replyId, "replyId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(content, "content").checkInput().checkLength(1, REPLY.MAX_REPLY_CONTENT_LENGTH);

        // 권한 체크
        const selectAuthSql = `SELECT
                                    club_reply_tb.account_id AS "accountId",
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR club_reply_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageAuth"
                                FROM
                                    club_reply_tb
                                JOIN
                                    club_comment_tb
                                ON
                                    club_reply_tb.club_comment_id = club_comment_tb.id
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
                                    club_reply_tb.id = $2`;
        const selectAuthParam = [userId, replyId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new BadRequestException("수정 권한이 존재하지 않습니다");
        }

        // 댓글 수정 시작
        const updateReplySql = `UPDATE
                                    club_reply_tb 
                                SET
                                    content = $1
                                WHERE
                                    id = $2`;
        const updateReplyParam = [content, replyId];
        await pool.query(updateReplySql, updateReplyParam);

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 대댓글 삭제 api
// 권한: 본인이거나 해당 동아리의 운영진이거나
router.delete("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { replyId } = req.body;

    try {
        validate(replyId, "replyId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();

        // 권한 체크
        const selectAuthSql = `SELECT
                                    club_reply_tb.account_id AS "accountId",
                                    COALESCE
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR club_reply_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , flase) AS "manageAuth"
                                FROM
                                    club_reply_tb
                                JOIN
                                    club_comment_tb
                                ON
                                    club_reply_tb.club_comment_id = club_comment_tb.id
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
                                    club_reply_tb.id = $2`;
        const selectAuthParam = [userId, replyId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 댓글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new BadRequestException("삭제 권한이 존재하지 않습니다");
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
