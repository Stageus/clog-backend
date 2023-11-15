const router = require("express").Router();
const pool = require("../../../config/database/postgresql");
const loginAuth = require('../../middleware/auth/loginAuth');
const validate = require('../../module/validation');
const { PROMOTION, IMAGE, SEARCH, MAX_PK_LENGTH } = require("../../module/global");
const { BadRequestException, NotFoundException, ForbbidenException } = require("../../module/customError");
const CONSTRAINT = require("../../module/constraint");

// 홍보물 검색 api
// filter: title OR club-name 택 1
// 권한: 로그인한 사용자
router.get("/list", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const filter = req.query.filter || "title"; // 널 코얼레싱 쓰는게 적합?
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const result = {
        message: "",
        data: {},
    };

    try {
        // filter가 title 인지 club-name 둘중 하나 인지 검사
        if (filter !== "title" && filter !== "club-name") {
            throw new BadRequestException("해당하는 검색 필터가 존재하지 않습니다");
        }

        validate(page, "page").isNumber().isPositive();
        const offset = (page - 1) * SEARCH.MAX_PROMOTION_PER_PAGE;
        let selectClubSql = `SELECT
                                    promotion_tb.id,
                                    promotion_tb.title,
                                    (
                                        SELECT
                                            promotion_img_tb.post_img
                                        FROM
                                            promotion_img_tb
                                        WHERE
                                            promotion_img_tb.post_id = promotion_tb.id
                                        LIMIT 1
                                    ) AS "thumbnail",
                                    club_tb.profile_img AS "clubImage",
                                    club_tb.id AS "clubId",
                                    club_tb.name AS "clubName",
                                    (
                                        SELECT
                                            COUNT(*)
                                        FROM
                                            promotion_comment_tb
                                        WHERE
                                            promotion_comment_tb.post_id = promotion_tb.id
                                    )::int AS "commentCount",
                                    TO_CHAR(promotion_tb.created_at, 'yyyy.mm.dd') AS "createdAt",
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $3
                                            AND
                                                club_member_tb.club_id = club_tb.id
                                    ), false) AS "manageState"
                                FROM
                                    promotion_tb
                                JOIN
                                    club_tb
                                ON
                                    promotion_tb.club_id = club_tb.id
                                `;
        const selectClubParam = [offset, SEARCH.MAX_PROMOTION_PER_PAGE, userId];
        // filter가 title인 경우와 author인 경우 분리
        if (filter === "title") {
            selectClubSql += `WHERE 
                                    promotion_tb.title 
                                LIKE
                                    $4
                            `;
        } else if (filter === "club-name") {
            selectClubSql += `WHERE
                                    club_tb.name
                                LIKE
                                    $4 `;
        }
        selectClubSql += `ORDER BY
                                promotion_tb.created_at DESC
                            OFFSET
                                $1
                            LIMIT
                                $2
                                `;
        selectClubParam.push(`%${search}%`);

        const selectClubData = await pool.query(selectClubSql, selectClubParam);
        result.data = {
            posts: selectClubData.rows
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 동아리 내 홍보 게시물 조회
// 권한: 로그인한 사용자라면 다 가능
router.get("/:promotionId", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { promotionId } = req.params;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(promotionId, "promotion-id").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();

        const selectPromotionSql = `SELECT 
                                        club_tb.name AS "clubName", 
                                        club_tb.profile_img AS "profileImage", 
                                        promotion_tb.title, 
                                        promotion_tb.content,
                                        ARRAY (
                                            SELECT
                                                promotion_img_tb.post_img
                                            FROM
                                                promotion_img_tb
                                            WHERE
                                                promotion_img_tb.post_id = $1
                                        ) AS "promotionImage",
                                        TO_CHAR(
                                            promotion_tb.created_at, 'YYYY.mm.dd'
                                        ) AS "createdAt",
                                        COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.club_id = club_tb.id
                                            AND
                                                club_member_tb.account_id = $2
                                        ), false) AS "adminState"
                                    FROM
                                        promotion_tb
                                    JOIN
                                        club_tb
                                    ON
                                        promotion_tb.club_id = club_tb.id
                                    WHERE
                                        promotion_tb.id = $3`;
        const selectPromotionParam = [promotionId, userId, promotionId];
        const selectPromotionData = await pool.query(selectPromotionSql, selectPromotionParam);
        if (selectPromotionData.rowCount === 0) {
            throw new NotFoundException("해당하는 홍보물이 존재하지 않습니다");
        }
        result.data = {
            promotion: selectPromotionData.rows[0]
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 홍보 게시물 작성
// 권한: 동아리 관리자
router.post("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { clubId, title, content, images } = req.body;
    const result = {
        message: "",
        data: {}
    };
    let pgClient = null;

    try {
        validate(clubId, "clubId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(title, "title").checkInput().checkLength(1, PROMOTION.MAX_PROMOTION_TITLE_LENGTH);
        validate(content, "content").checkInput().checkLength(1, PROMOTION.MAX_PROMOTION_CONTENT_LENGTH);
        validate(images, "images").checkInput().checkLength(0, IMAGE.MAX_PROMOTION_COUNT);

        // 권한 체크
        const selectAuthSql = `SELECT
                                    COALESCE(
                                        (
                                            SELECT
                                                club_member_tb.position < 2
                                            FROM
                                                club_member_tb
                                            WHERE
                                                club_member_tb.account_id = $1
                                            AND
                                                club_member_tb.club_id = $2
                                        )
                                    , false) AS "manageAuth"`
        const selectAuthParam = [userId, clubId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("동아리에 가입하지 않은 사용자입니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new ForbbidenException("홍보글 작성 권한이 없습니다");
        }

        // 트랜잭션 시작
        pgClient = await pool.connect();
        await pgClient.query("BEGIN");
        // 홍보글 삽입
        const insertPromotionSql = `INSERT INTO
                                            promotion_tb (club_id, title, content)
                                        VALUES
                                            ($1, $2, $3)
                                        RETURNING
                                            id`;
        const insertPromotionParam = [clubId, title, content];
        const insertPromotionData = await pgClient.query(insertPromotionSql, insertPromotionParam);
        // 홍보글 이미지 삽입
        const insertPromotionImageSql = `INSERT INTO
                                                promotion_img_tb (post_id, post_img)
                                            VALUES
                                                ($1, UNNEST($2::VARCHAR[]))`;
        const insertPromotionImageParam = [insertPromotionData.rows[0].id, images];
        await pgClient.query(insertPromotionImageSql, insertPromotionImageParam);
        await pgClient.query("COMMIT");
        result.data = {
            promotionId: insertPromotionData.rows[0].id
        }

    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK");
        }
        if (error.constraint === CONSTRAINT.FK_CLUB_TO_PROMOTION_POST_TB) {
            return next(new BadRequestException("해당하는 동아리가 존재하지 않습니다"));
        }
        return next(error);
    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
    res.send(result);
});

// 홍보물 수정 api
// 권한: 동아리의 관리자
router.put("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { promotionId, title, content, images } = req.body;
    const result = {
        message: "",
        data: {}
    };
    let pgClient = null;

    try {
        validate(promotionId, "promotionId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();
        validate(title, "title").checkInput().checkLength(1, PROMOTION.MAX_PROMOTION_TITLE_LENGTH);
        validate(content, "content").checkInput().checkLength(1, PROMOTION.MAX_PROMOTION_CONTENT_LENGTH);
        validate(images, "images").checkInput().checkLength(1, IMAGE.MAX_PROMOTION_COUNT);
        pgClient = await pool.connect();
        pgClient.query("BEGIN");
        // 권한 체크
        const selectAuthSql = `SELECT
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
                                        )
                                    , false) AS "manageAuth"
                                FROM
                                    promotion_tb
                                JOIN
                                    club_tb
                                ON
                                    promotion_tb.club_id = club_tb.id
                                WHERE
                                    promotion_tb.id = $2`;
        const selectAuthParam = [userId, promotionId];
        const selectAuthData = await pgClient.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 홍보물이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new BadRequestException("수정 권한이 없습니다");
        }
        // 수정 시작
        // 1. 홍보글 수정
        const updatePromotionSql = `UPDATE
                                        promotion_tb
                                    SET
                                        title = $1, content = $2
                                    WHERE
                                        id = $3`;
        const updatePromotionParam = [title, content, promotionId];
        await pgClient.query(updatePromotionSql, updatePromotionParam);
        // 2. 기존 이미지 삭제
        const deletePromotionImgSql = `DELETE FROM
                                            promotion_img_tb
                                        WHERE
                                            post_id = $1`;
        const deletePromotionImgParam = [promotionId];
        await pgClient.query(deletePromotionImgSql, deletePromotionImgParam);
        // 3. 수정된 이미지 삽입
        const insertPromotionImgSql = `INSERT INTO
                                                promotion_img_tb (post_id, post_img)
                                            SELECT
                                                $1, UNNEST($2::VARCHAR[])`;
        const insertPromotionImgParam = [promotionId, images];
        await pgClient.query(insertPromotionImgSql, insertPromotionImgParam);
        await pgClient.query("COMMIT");
        // 수정 종료

    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK");
        }
        return next(error);
    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
    res.send(result);
});

// 홍보글 삭제 api
// 권한: 동아리의 관리자
router.delete("/", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { promotionId } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(promotionId, "promotionId").checkInput().checkLength(1, MAX_PK_LENGTH).isNumber();

        // 권한 체크
        const selectAuthSql = `SELECT
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
                                        )
                                    , false) AS "manageAuth"
                                FROM
                                    promotion_tb
                                JOIN
                                    club_tb
                                ON
                                    promotion_tb.club_id = club_tb.id
                                WHERE
                                    promotion_tb.id = $2`;
        const selectAuthParam = [userId, promotionId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 홍보물이 존재하지 않습니다");
        }
        if (!selectAuthData.rows[0].manageAuth) {
            throw new BadRequestException("삭제 권한이 없습니다");
        }
        // 삭제 시작
        const deletePromotionSql = `DELETE FROM
                                            promotion_tb
                                        WHERE
                                            id = $1`;
        const deletePromotionParam = [promotionId];
        await pool.query(deletePromotionSql, deletePromotionParam);
        // 삭제 종료
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
