const router = require("express").Router()
const pool = require("../../../config/database/postgresql")
const loginAuth = require("../../middleware/auth/loginAuth")
const createNotification = require("../../module/createNotification")
const validate = require("../../module/validation")
const { NOTICE_COMMENT, POSITION, MAX_PK_LENGTH } = require("../../module/global")
const { BadRequestException } = require("../../module/customError")

// 공지 게시물 댓글 작성
router.post("/", loginAuth, async (req, res, next) => {
    const { noticeId, content } = req.body
    const userId = req.decoded.id
    const result = {
        message: "",
        data: {}
    }

    let pgClient = null

    try {
        validate(noticeId, "noticeId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber()
        validate(content, "content").checkInput().checkLength(1,NOTICE_COMMENT.MAX_COMMENT_CONTENT_LENGTH)

        pgClient = await pool.connect()
        await pgClient.query("BEGIN")

        // 작성 권한 체크
        const selectPositionSql = `SELECT position
            FROM club_member_tb
            WHERE account_id = $1
            AND club_id = (
                SELECT notice_post_tb.club_id
                FROM notice_post_tb
                WHERE notice_post_tb.id = $2 
            )`
        const selectPositionParams = [userId, noticeId]
        const selectPositionResult = await pgClient.query(selectPositionSql, selectPositionParams)

        if (selectPositionResult.rowCount == 0) throw new BadRequestException("해당 동아리의 부원이 아닙니다")

        // 공지 댓글 작성
        const insertCommentsql = `INSERT INTO notice_comment_tb (account_id, notice_post_id, content) 
            VALUES ($1, $2, $3)
            RETURNING notice_comment_tb.id`
        const insertCommentparams = [userId, noticeId, content]
        const insertCommentResult = await pgClient.query(insertCommentsql, insertCommentparams)
        const notificationKey = insertCommentResult.rows[0].id

        createNotification(req.originalUrl, notificationKey)

        await pgClient.query("COMMIT")
    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK")
        }
        return next(error)
    } finally {
        if (pgClient) pgClient.release
    }
    res.send(result)
})

// 공지 게시물 댓글 수정
router.put("/", loginAuth, async (req, res, next) => {
    const { commentId, content } = req.body
    const userId = req.decoded.id
    const result = {
        message: "",
        data: {}
    }

    let pgClient = null

    try {
        validate(commentId, "commentId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber()
        validate(content, "content").checkInput().checkLength(1,NOTICE_COMMENT.MAX_COMMENT_CONTENT_LENGTH)

        pgClient = await pool.connect()
        await pgClient.query("BEGIN")

        // 수정 권한 체크
        const selectPositionSql = `SELECT 
                notice_comment_tb.account_id AS "authorId",
                (
                    SELECT club_member_tb.position
                    FROM club_member_tb
                    WHERE club_member_tb.club_id = notice_post_tb.club_id
                    AND club_member_tb.account_id = $1
                ) AS "position"
            FROM notice_comment_tb
            JOIN notice_post_tb 
            ON notice_comment_tb.notice_post_id = notice_post_tb.id
            WHERE notice_comment_tb.id = $2`
        const selectPositionParams = [userId, commentId]
        const selectPositionResult = await pgClient.query(selectPositionSql,selectPositionParams)

        if (selectPositionResult.rowCount == 0) {
            throw new BadRequestException("댓글이 존재하지 않습니다")
        }

        if (selectPositionResult.rows[0].position == null) {
            throw new BadRequestException("해당 동아리의 부원이 아닙니다")
        }
        
        if (selectPositionResult.rows[0].position > POSITION.MANAGER && selectPositionResult.rows[0].authorId != userId){
            throw new BadRequestException("댓글을 수정할 권한이 없습니다")
        }

        // 공지 답글 수정
        const updateCommentSql = `UPDATE notice_comment_tb
            SET content = $1
            WHERE notice_comment_tb.id = $2`
        const updateCommentParams = [content, commentId]
        await pgClient.query(updateCommentSql,updateCommentParams)

        

        await pgClient.query("COMMIT")
    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK")
        }
        return next(error)
    } finally {
        if (pgClient) pgClient.release
    }
    res.send(result)
})

// 공지 게시물 댓글 삭제
router.delete("/", loginAuth, async (req, res, next) => {
    const { commentId } = req.body
    const userId = req.decoded.id
    const result = {
        message: "",
        data: {}
    }

    let pgClient = null

    try {
        validate(commentId, "commentId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber()

        pgClient = await pool.connect()
        await pgClient.query("BEGIN")

            // 작성 권한 체크
        const selectPositionSql = `SELECT 
                notice_comment_tb.account_id AS "authorId",
                    (
                        SELECT club_member_tb.position
                        FROM club_member_tb
                        WHERE club_member_tb.club_id = notice_post_tb.club_id
                        AND club_member_tb.account_id = $1
                    ) AS "position"
            FROM notice_comment_tb
            JOIN notice_post_tb 
            ON notice_comment_tb.notice_post_id = notice_post_tb.id
            WHERE notice_comment_tb.id = $2`
        const selectPositionParams = [userId, commentId]
        const selectPositionResult = await pgClient.query(selectPositionSql,selectPositionParams)

        if (selectPositionResult.rowCount == 0) {
            throw new BadRequestException("댓글이 존재하지 않습니다")
        }

        if (selectPositionResult.rows[0].position == null) {
            throw new BadRequestException("해당 동아리의 부원이 아닙니다")
        }
        
        if (selectPositionResult.rows[0].position > POSITION.MANAGER && selectPositionResult.rows[0].authorId != userId){
            throw new BadRequestException("댓글을 삭제할 권한이 없습니다")
        }

        // 공지 댓글 삭제
        const deleteCommentSql = `DELETE FROM notice_comment_tb
            WHERE notice_comment_tb.id = $1`
        const deleteCommentParams = [commentId]
        const deleteCommentResult = await pgClient.query(deleteCommentSql,deleteCommentParams)

        await pgClient.query("COMMIT")
    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK")
        }
        return next(error)
    } finally {
        if (pgClient) pgClient.release
    }
    res.send(result)
})

// 공지 게시물 댓글 리스트 조회
router.get("/:noticeId/list", loginAuth, async (req, res, next) => {
    const { noticeId } = req.params
    const { page } = req.query
    const userId = req.decoded.id
    const result = {
        message: "",
        data: {}
    }

    let pgClient = null

    try {
        validate(noticeId,"noticeId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber()
        validate(page,"page").checkInput().isNumber()

        pgClient = await pool.connect()
        await pgClient.query("BEGIN")

        // 조회 권한 체크
        const selectPositionSql = `SELECT position
            FROM club_member_tb
            WHERE account_id = $1
            AND club_id = (
                SELECT notice_post_tb.club_id
                FROM notice_post_tb
                WHERE notice_post_tb.id = $2 
            )`
        const selectPositionParams = [ userId, noticeId ]
        const selectPositionResult = await pgClient.query(selectPositionSql, selectPositionParams)
        
        if (selectPositionResult.rowCount == 0) throw new BadRequestException ("해당 동아리의 부원이 아닙니다")

        // 전체 댓글 수 조회

        const selectCommentCountSql = `
            SELECT ( count_list.comment_count + count_list.reply_count )::int AS "count"
            FROM (
                SELECT
                    COUNT (notice_comment_tb.id) AS comment_count,
                    COUNT (notice_reply_tb.id) AS reply_count
                FROM notice_reply_tb
                FULL OUTER JOIN notice_comment_tb
                ON notice_reply_tb.notice_comment_id = notice_comment_tb.id
                WHERE notice_comment_tb.notice_post_id = $1
            ) AS count_list`
        const selectCommentCountParams = [noticeId]
        const selectCommentCountResult = await pgClient.query(selectCommentCountSql, selectCommentCountParams)

        // 댓글 목록 조회
        const selectCommentListSql = `SELECT notice_comment_tb.id AS "id",
                notice_comment_tb.content AS "content",
                TO_CHAR(notice_comment_tb.created_at, 'YYYY-MM-DD') AS "createdAt",
                notice_comment_tb.account_id AS "authorId",
                account_tb.name AS "authorName",
                account_tb.personal_color AS "authorPersonalColor",
                COALESCE(
                    (
                        SELECT club_member_tb.position < 2
                        FROM club_member_tb
                        WHERE club_member_tb.club_id = club_tb.id
                        AND club_member_tb.account_id = $1
                    ), false
                ) AS "manageState",
                (
                    SELECT COUNT (*)
                    FILTER (WHERE notice_reply_tb.notice_comment_id = notice_comment_tb.id)
                    FROM notice_reply_tb
                )::int AS "replyCount"
            FROM notice_comment_tb
            JOIN account_tb ON notice_comment_tb.account_id = account_tb.id
            JOIN notice_post_tb ON notice_comment_tb.notice_post_id = notice_post_tb.id
            JOIN club_tb ON notice_post_tb.club_id = club_tb.id
            WHERE notice_comment_tb.notice_post_id = $2
            ORDER BY "createdAt" DESC
            LIMIT $3
            OFFSET $4`
        const selectCommentListParams = [userId, noticeId, NOTICE_COMMENT.MAX_COMMENT_COUNT_PER_POST, NOTICE_COMMENT.MAX_COMMENT_COUNT_PER_POST * (page - 1)]
        const selectCommentListResult = await pgClient.query(selectCommentListSql,selectCommentListParams)

        console.log(selectCommentListResult.rows)
        result.data = {
            count : selectCommentCountResult.rows[0].count,
            comments : selectCommentListResult.rows
        }

        await pgClient.query("COMMIT")
    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK")
        }
        return next(error)
    } finally {
        if (pgClient) pgClient.release
    }
    res.send(result)
})

module.exports = router