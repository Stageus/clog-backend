const router = require("express").Router();
const pool = require("../../../config/database/postgresql");
const loginAuth = require('../../../middleware/loginAuth');
const validate = require('../../../module/validation');
const { REPLY, MAX_PK_LENGTH } = require("../../../module/global");
const { BadRequestException, NotFoundException, ForbbidenException } = require('../../../module/customError');
const CONSTRAINT = require("../../../module/constraint");

// 댓글의 답글 리스트 조회
// 권한: 로그인한 유저
router.get("/list/comment/:commentId", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { commentId } = req.params;
    const page = req.query.page || 1;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(commentId, "comment-id").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        const offset = (page - 1) * REPLY.MAX_REPLY_COUNT_PER_COMMENT;

        const selectReplySql = `SELECT
                                    notice_reply_tb.id,
                                    notice_reply_tb.content,
                                    TO_CHAR(notice_reply_tb.created_at, 'yyyy.mm.dd') AS "createdAt",
                                    notice_reply_tb.account_id AS "authorId",
                                    account_tb.entry_year AS "entryYear",
                                    account_tb.name AS "authorName",
                                    major_tb.name AS "authorMajor",
                                    account_tb.personal_color AS "authorPcolor",
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR club_member_tb.account_id = account_tb.id
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageState"
                                FROM
                                    notice_reply_tb
                                JOIN
                                    account_tb
                                ON
                                    notice_reply_tb.account_id = account_tb.id
                                JOIN
                                    major_tb
                                ON
                                    account_tb.major = major_tb.id
                                JOIN
                                    notice_comment_tb
                                ON
                                    notice_reply_tb.comment_id = notice_comment_tb.id
                                JOIN
                                    notice_tb
                                ON
                                    notice_comment_tb.post_id = notice_tb.id
                                JOIN
                                    club_tb
                                ON
                                    notice_tb.club_id = club_tb.id
                                WHERE
                                    notice_reply_tb.comment_id = $2
                                ORDER BY
                                    notice_reply_tb.created_at DESC
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

// 답글 작성 (공지 게시물)
// 권한: 동아리의 부원
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

        const selectAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position <= 2
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageAuth"
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

        const selectAuthParam = [userId, commentId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        console.log(selectAuthData);
        if (selectAuthData.rowCount === 0) {
            throw new NotFoundException("해당하는 댓글이 없습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new ForbbidenException("해당하는 동아리에 가입되어있지 않습니다");
        }
        // 작성 시작
        const insertPostSql = `INSERT INTO
                                        notice_reply_tb (account_id, comment_id, content)
                                    VALUES
                                        ($1, $2, $3)
                                    RETURNING
                                        id`;
        const insertPostParam = [userId, commentId, content];
        const insertPostData = await pool.query(insertPostSql, insertPostParam);
        result.data = {
            replyId: insertPostData.rows[0].id
        };
    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_NOTICE_REPLY_TB) {
            return next(new BadRequestException("해당하는 사용자가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_COMMENT_TO_NOTICE_REPLY_TB) {
            return next(new BadRequestException("해당하는 댓글이 존재하지 않습니다"));
        }
        return next(error);
    }
    res.send(result);
});

// 답글 수정 (공지 게시물)
// 권한: 동아리 관리자 OR 답글 작성자
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
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR notice_reply_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageState"
                                FROM
                                    notice_reply_tb
                                JOIN
                                    notice_comment_tb
                                ON
                                    notice_reply_tb.comment_id = notice_comment_tb.id
                                JOIN
                                    notice_tb
                                ON
                                    notice_comment_tb.post_id = notice_tb.id
                                JOIN
                                    club_tb
                                ON
                                    notice_tb.club_id = club_tb.id
                                WHERE
                                    notice_reply_tb.id = $2`;
        const selectAuthParam = [userId, replyId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        console.log(selectAuthData);
        if (selectAuthData.rowCount === 0) {
            throw new NotFoundException("해당하는 답글이 없습니다");
        }
        if (!selectAuthData.rows[0].manageState) {
            throw new ForbbidenException("수정 권한이 없습니다");
        }
        // 수정 시작
        const updatePostSql = `UPDATE
                                    notice_reply_tb
                                SET
                                    content = $1
                                WHERE
                                    id = $2`;
        const updatePostParam = [content, replyId];
        const updatePostData = await pool.query(updatePostSql, updatePostParam);
        if (updatePostData.rowCount === 0) {
            throw new BadRequestException("해당하는 답글이 존재하지 않습니다");
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 답글 삭제 (공지 게시물)
// 권한: 동아리 관리자 OR 답글 작성자
router.delete("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { replyId } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(replyId, "replyId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();

        // 권한 체크
        const selectAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2 OR notice_reply_tb.account_id = $1
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageState"
                                FROM
                                    notice_reply_tb
                                JOIN
                                    notice_comment_tb
                                ON
                                    notice_reply_tb.comment_id = notice_comment_tb.id
                                JOIN
                                    notice_tb
                                ON
                                    notice_comment_tb.post_id = notice_tb.id
                                JOIN
                                    club_tb
                                ON
                                    notice_tb.club_id = club_tb.id
                                WHERE
                                    notice_reply_tb.id = $2`;
        const selectAuthParam = [userId, replyId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 답글이 없습니다");
        }
        if (!selectAuthData.rows[0].manageState) {
            throw new BadRequestException("삭제 권한이 없습니다");
        }
        // 삭제 시작
        const deletePostSql = `DELETE FROM
                                        notice_reply_tb
                                    WHERE
                                        id = $1`;
        const deletePostParam = [replyId];
        const deletePostData = await pool.query(deletePostSql, deletePostParam);
        if (deletePostData.rowCount === 0) {
            throw new BadRequestException("해당하는 답글이 존재하지 않습니다");
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
