const router = require("express").Router();
const pool = require("../../../config/database/postgresql");
const loginAuth = require('../../../middleware/loginAuth');
const validate = require('../../../module/validation');
const CONSTRAINT = require("../../../module/constraint");
const { CLUB, POST, MAX_PK_LENGTH } = require('../../../module/global');
const { BadRequestException, NotFoundException, ForbbidenException } = require('../../../module/customError');

// 동아리 내 모든 일반 게시물을 가져오는 api
// 권한: 해당 동아리에 가입되어있어야 함
router.get("/list/club/:clubId", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    };
    const page = Number(req.query.page || 1);

    try {
        validate(clubId, "clubId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(page, "page").isNumber().isPositive();

        // 권한 체크
        const selectAuthSql = `SELECT
                                    (
                                        SELECT
                                            club_member_tb.position < 3
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ) AS "position"
                                FROM
                                    club_tb
                                WHERE
                                    club_tb.id = $2`;
        const selectAuthParam = [userId, clubId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new NotFoundException("존재하지 않는 동아리입니다");
        }
        if (!selectAuthData.rows[0].position) {
            throw new BadRequestException("동아리에 가입하지 않은 사용자입니다");
        }
        const offset = (page - 1) * POST.MAX_POST_COUNT_PER_PAGE;
        const selectAllPostCountSql = `SELECT 
                                            count(*)::int
                                        FROM
                                            club_post_tb
                                        JOIN
                                            club_board_tb
                                        ON
                                            club_board_tb.id = club_post_tb.club_board_id
                                        JOIN
                                            club_tb
                                        ON
                                            club_tb.id = club_board_tb.club_id
                                        WHERE
                                            club_tb.id = $1`;
        const selectAllPostCountParam = [clubId];
        const selectAllPostSql = `SELECT
                                        club_post_tb.id AS "postId",
                                        account_tb.name AS "authorName",
                                        club_post_tb.title AS "title",
                                        (
                                            SELECT
                                                COUNT(*)
                                            FROM
                                                club_comment_tb
                                            WHERE
                                                club_comment_tb.club_post_id = club_post_tb.id
                                        )::int AS "commentCount",
                                        club_post_tb.created_at AS "createdAt"
                                    FROM
                                        club_post_tb
                                    JOIN
                                        account_tb
                                    ON
                                        club_post_tb.account_id = account_tb.id
                                    JOIN
                                        club_board_tb
                                    ON
                                        club_post_tb.club_board_id = club_board_tb.id
                                    WHERE
                                        club_board_tb.club_id = $1
                                    ORDER BY
                                        club_post_tb.created_at
                                    DESC OFFSET
                                            $2
                                        LIMIT
                                            $3`;
        const selectAllPostParam = [clubId, offset, CLUB.MAX_ALL_POST_COUNT_PER_PAGE];
        const selectAllPostCountData = await pool.query(selectAllPostCountSql, selectAllPostCountParam);
        const selectAllPostData = await pool.query(selectAllPostSql, selectAllPostParam);
        result.data = {
            count: selectAllPostCountData.rows[0].count,
            posts: selectAllPostData.rows
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 게시판의 게시물 리스트 조회 api
// 권한: 해당 동아리에 가입되어있어야 함
router.get("/list/board/:boardId", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { boardId } = req.params;
    const result = {
        message: "",
        data: {}
    };
    let page = req.query.page ?? 1;
    if (page < 1) page = 1;

    try {
        validate(boardId, "boardId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        const offset = (page - 1) * POST.MAX_POST_COUNT_PER_PAGE;
        // 권한 체크
        const selectAuthSql = `SELECT
                                    (
                                        SELECT
                                            club_member_tb.position < 3
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ) AS "position"
                                FROM
                                    club_board_tb
                                JOIN
                                    club_tb
                                ON
                                    club_board_tb.club_id = club_tb.id
                                WHERE
                                    club_board_tb.id = $2`;
        const selectAuthParam = [userId, boardId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            return next(new NotFoundException("존재하지 않는 게시판입니다"));
        }
        if (!selectAuthData.rows[0].position) {
            return next(new ForbbidenException("동아리에 가입하지 않은 사용자입니다"));
        }

        const selectPostOfBoardSql = `SELECT 
                                            club_post_tb.id, 
                                            club_post_tb.title, 
                                            account_tb.name AS "authorName", 
                                            club_post_tb.created_at AS "createdAt" 
                                        FROM 
                                            club_post_tb 
                                        JOIN 
                                            account_tb ON club_post_tb.account_id = account_tb.id 
                                        WHERE 
                                            club_board_id = $1 
                                        OFFSET 
                                            $2 
                                        LIMIT 
                                            $3`;
        const selectPostOfBoardParam = [boardId, offset, POST.MAX_POST_COUNT_PER_PAGE];
        const selectPostOfBoardData = await pool.query(selectPostOfBoardSql, selectPostOfBoardParam);
        if (selectPostOfBoardData.rowCount !== 0) {
            result.data = {
                posts: selectPostOfBoardData.rows
            }
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 게시물 조회 api
// 권한: 해당 동아리에 가입되어있어야 함
router.get("/:postId", loginAuth, async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(postId, "postId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();

        // 권한 체크
        const selectAuthSql = `SELECT
                                    (
                                        SELECT
                                            club_member_tb.position < 3
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
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
        const selectAuthParam = [userId, postId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            return next(new NotFoundException("존재하지 않는 게시글입니다"));
        }
        if (!selectAuthData.rows[0].position) {
            return next(new ForbbidenException("동아리에 가입하지 않은 사용자입니다"));
        }

        // 본인이거나 해당 동아리의 관리자일 경우 manageState: true
        const selectPostSql = `SELECT 
                                    club_post_tb.account_id AS "authorId", 
                                    major_tb.name AS "authorMajor", 
                                    account_tb.name AS "authorName", 
                                    account_tb.personal_color AS "authorPcolor", 
                                    account_tb.entry_year AS "authorEntryYear", 
                                    club_post_tb.title AS "postTitle", 
                                    club_post_tb.content AS "postContent", 
                                    TO_CHAR(club_post_tb.created_at, 'yyyy.mm.dd') AS "createdAt",
                                    COALESCE (
                                        (
                                            SELECT
                                                club_member_tb.position < 2
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                        )
                                    , false) AS "manageState",
                                ARRAY (
                                        SELECT
                                            post_img
                                        FROM
                                            post_img_tb
                                        WHERE
                                            post_id = $2
                                    ) AS "postImg"
                                FROM 
                                    club_post_tb 
                                JOIN 
                                    account_tb 
                                ON 
                                    club_post_tb.account_id = account_tb.id 
                                JOIN 
                                    major_tb 
                                ON 
                                    account_tb.major = major_tb.id 
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
        const selectPostParam = [userId, postId];
        const selectPostData = await pool.query(selectPostSql, selectPostParam);
        if (selectPostData.rowCount !== 0) {
            result.data = {
                posts: selectPostData.rows,
            }
            return res.send(result);
        }
        throw new NotFoundException("해당하는 게시글이 존재하지 않습니다");

    } catch (error) {
        next(error);
    }
});

// 게시물 작성 api
// 권한: 해당 동아리에 가입되어있어야 함
router.post("/", loginAuth, async (req, res, next) => {
    const { boardId, title, content, images } = req.body;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    }
    let pgClient = null;

    try {
        validate(boardId, "boardId").checkInput().isNumber().checkLength(1, MAX_PK_LENGTH);
        validate(title, "title").checkInput().checkLength(1, POST.MAX_POST_TITLE_LENGTH);
        validate(content, "content").checkInput().checkLength(1, POST.MAX_POST_CONTENT_LENGTH);

        pgClient = await pool.connect();
        await pgClient.query("BEGIN");
        // 1. 게시글 작성 권한이 있는지 확인
        const selectClubAuthSql = `SELECT 
                                        (
                                            SELECT 
                                                club_member_tb.id 
                                            FROM 
                                                club_member_tb 
                                            WHERE 
                                                club_member_tb.club_id = club_tb.id 
                                            AND 
                                                club_member_tb.account_id = $1
                                        ) AS "accountId" 
                                    FROM 
                                        club_board_tb 
                                    JOIN 
                                        club_tb 
                                    ON 
                                        club_board_tb.club_id = club_tb.id 
                                    WHERE 
                                        club_board_tb.id = $2`;
        const selectClubAuthParam = [userId, boardId];
        const selectClubAuthData = await pgClient.query(selectClubAuthSql, selectClubAuthParam);
        if (selectClubAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 게시판이 존재하지 않습니다");
        }
        if (selectClubAuthData.rows[0].accountId === null) {
            throw new BadRequestException("동아리에 가입하지 않은 사용자입니다");
        }
        // 2. 게시글 테이블에 삽입
        const insertPostSql = `INSERT INTO 
                                        club_post_tb (club_board_id, account_id, title, content) 
                               VALUES 
                                        ($1, $2, $3, $4) 
                               RETURNING 
                                        id`;
        const insertPostParam = [boardId, userId, title, content];
        const insertPostData = await pgClient.query(insertPostSql, insertPostParam);

        // 3. 게시글 이미지 테이블에 이미지 삽입
        const insertPostImageSql = `INSERT INTO 
                                            post_img_tb (post_id, post_img) 
                                    SELECT 
                                            $1, UNNEST($2::VARCHAR[])`;
        const insertPostImageParam = [insertPostData.rows[0].id, images];
        await pgClient.query(insertPostImageSql, insertPostImageParam);

        await pgClient.query("COMMIT");
        result.data = {
            "postId": insertPostData.rows[0].id
        };

    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK");
        }
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_CLUB_POST_TB) {
            return next(new BadRequestException("해당하는 사용자가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_BOARD_TO_CLUB_POST_TB) {
            return next(new BadRequestException("해당하는 게시판이 존재하지 않습니다"));
        }
        return next(error);

    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }

    res.send(result);
});

// 게시글 수정 api
// 권한: 작성자 또는 해당 동아리의 관리자
router.put("/", loginAuth, async (req, res, next) => {
    const { postId, title, content, images } = req.body;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    }
    let pgClient = null;

    try {
        validate(postId, "postId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(title, "title").checkInput().checkLength(1, POST.MAX_POST_TITLE_LENGTH);
        validate(content, "content").checkInput().checkLength(1, POST.MAX_POST_CONTENT_LENGTH);

        pgClient = await pool.connect();
        await pgClient.query("BEGIN");
        // 본인이 쓴 글이거나 position 0 or 1
        const selectAuthSql = `SELECT
                                        club_post_tb.account_id AS "accountId",
                                        COALESCE(
                                            (
                                                SELECT
                                                    club_member_tb.position < 2 OR club_post_tb.account_id = $1
                                                FROM
                                                    club_member_tb
                                                WHERE
                                                    club_member_tb.club_id = club_tb.id
                                                AND
                                                    club_member_tb.account_id = $1
                                            )
                                        , false) AS "manageState"
                                    FROM    
                                        club_post_tb
                                    JOIN
                                        club_board_tb
                                    ON
                                        club_board_tb.id = club_post_tb.club_board_id
                                    JOIN
                                        club_tb
                                    ON
                                        club_board_tb.club_id = club_tb.id
                                    WHERE
                                        club_post_tb.id = $2`;
        const selectAuthParam = [userId, postId];
        const selectAuthData = await pgClient.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            return next(new BadRequestException("게시글이 존재하지 않습니다"));
        }
        if (!selectAuthData.rows[0].manageState) {
            throw new BadRequestException("수정 권한이 없습니다");
        }

        // 1. 게시글 본문 (title, content)수정
        const updatePostSql = `UPDATE 
                                    club_post_tb 
                                SET
                                    title = $1,
                                    content = $2 
                                WHERE 
                                    id = $3`;
        const updatePostParam = [title, content, postId];
        await pgClient.query(updatePostSql, updatePostParam);

        // 2. 기존의 게시글 이미지 삭제
        const deletePostImageSql = `DELETE FROM 
                                            post_img_tb 
                                        WHERE 
                                            post_id = $1`;
        const deletePostImageParam = [postId];
        await pgClient.query(deletePostImageSql, deletePostImageParam);
        // 3. 다시 게시글 이미지 테이블에 이미지 업로드
        const insertPostImageSql = `INSERT INTO 
                                            post_img_tb (post_id, post_img) 
                                        SELECT 
                                            $1, UNNEST($2::VARCHAR[])`;
        const insertPostImageParam = [postId, images];
        await pgClient.query(insertPostImageSql, insertPostImageParam);

        await pgClient.query("COMMIT");
    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK");
        }
        if (error.constraint === CONSTRAINT.FK_POST_TO_POST_IMG_TB) {
            return next(new BadRequestException("해당하는 게시글이 존재하지 않습니다"));
        }
        return next(error);

    } finally {
        if (pgClient) {
            pgClient.release;
        }
    }

    res.send(result);
});

// 게시글 삭제 api
// 권한: 작성자 또는 해당 동아리의 관리자
router.delete("/", loginAuth, async (req, res, next) => {
    const { postId } = req.body;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(postId, "post-id").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        // 본인이 쓴 글이거나 position 0 or 1
        const selectAuthSql = `SELECT 
                                    account_id AS "accountId", 
                                    COALESCE(
                                        (
                                            SELECT 
                                                club_member_tb.position < 2 OR club_post_tb.account_id = $1
                                            FROM 
                                                club_member_tb 
                                            WHERE 
                                                account_id = $1 
                                            AND 
                                                club_id = club_tb.id
                                        )
                                    , false) AS "manageAuth"
                                 FROM
                                    club_post_tb
                                 JOIN
                                    club_board_tb
                                 ON
                                    club_board_tb.id = club_post_tb.club_board_id
                                 JOIN
                                    club_tb
                                 ON
                                    club_tb.id = club_board_tb.club_id
                                 WHERE
                                    club_post_tb.id = $2`;
        const selectAuthParam = [userId, postId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 게시글이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new BadRequestException("삭제 권한이 없습니다");
        }
        // 삭제 시작
        const deletePostSql = `DELETE FROM
                                        club_post_tb
                                    WHERE
                                        id = $1`;
        const deletePostParam = [postId];
        await pool.query(deletePostSql, deletePostParam);

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
