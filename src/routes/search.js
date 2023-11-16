const router = require("express").Router();
const pool = require('../config/database/postgresql');
const loginAuth = require('../middleware/loginAuth');
const validate = require('../module/validation');
const { SEARCH } = require("../module/global");
const { BadRequestException } = require('../module/customError');

// 동아리 검색 api (대분류, 소분류 기준)
router.get("/category/list", loginAuth, async (req, res, next) => {
    const { "big-category": bigCategory, "small-category": smallCategory } = req.query;
    const userId = req.decoded.id;
    const page = req.query.page || 1;
    const offset = (page - 1) * SEARCH.MAX_CLUB_PER_PAGE;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(page, "page").isNumber().isPositive();

        let selectClubSql = `SELECT
                                    club_tb.id,
                                    club_tb.profile_img AS "profileImg",
                                    club_tb.name,
                                    club_tb.cover,
                                    COALESCE(
                                        (
                                        SELECT
                                            club_member_tb.account_id = $1
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ), FALSE) AS "isMember",
                                    club_tb.is_recruit AS "isRecruit"
                                FROM 
                                    club_tb
                                `;
        const selectClubParam = [offset, SEARCH.MAX_CLUB_PER_PAGE];
        if (bigCategory && smallCategory) {
            // 1. 대분류와 소분류 둘 다 있는 경우
            selectClubSql += `WHERE big_category = $3 AND small_category = $4`;
            selectClubParam.push(bigCategory, smallCategory);
        } else if (bigCategory && !smallCategory) {
            // 2. 대분류만 있고 소분류가 없는 경우
            selectClubSql += `WHERE big_category = $3`;
            selectClubParam.push(bigCategory);
        } else if (!bigCategory && smallCategory) {
            // 3. 대분류는 없고 소분류만 있는 경우
            selectClubSql += `WHERE small_category = $3`;
            selectClubParam.push(smallCategory);
        }
        selectClubSql += `
                            ORDER BY 
                                club_tb.created_at DESC 
                            OFFSET 
                                $1 
                            LIMIT 
                                $2`;
        console.log(selectClubSql);
        console.log(selectClubParam);
        const selectClubData = await pool.query(selectClubSql, selectClubParam);
        result.data = {
            club: selectClubData.rows
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 동아리 검색 api (동아리 이름 기준)
router.get("/club-name/list", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const clubName = req.query['club-name'] || "";
    const page = req.query.page || 1;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(page, "page").isNumber().isPositive();

        const offset = (page - 1) * SEARCH.MAX_CLUB_PER_PAGE_FOR_CLUBNAME;
        let selectClubSql = `SELECT
                                    club_tb.id,
                                    club_tb.profile_img AS "profileImg",
                                    club_tb.name AS "name",
                                    club_tb.cover AS "cover",
                                    COALESCE(
                                        (
                                        SELECT
                                            club_member_tb.account_id = $3
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $3
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ), FALSE) AS "isMember",
                                    club_tb.is_recruit AS "isRecruit"
                                FROM
                                    club_tb
                                `;
        const selectClubParam = [offset, SEARCH.MAX_CLUB_PER_PAGE_FOR_CLUBNAME, userId];
        if (clubName !== "") {
            selectClubSql += ` WHERE
                                    club_tb.name
                                LIKE
                                    $4`;
            selectClubParam.push(`%${clubName}%`);
        }
        selectClubSql += `ORDER BY
                                club_tb.created_at DESC
                            OFFSET
                                $1
                            LIMIT
                                $2`;
        const selectClubData = await pool.query(selectClubSql, selectClubParam);
        result.data = {
            club: selectClubData.rows
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 동아리 내 게시글 검색 api
// filter: title OR author 택 1
// 권한: 동아리 부원만 검색 가능
router.get("/club/:clubId/post/list", loginAuth, async (req, res, next) => {
    // filter를 보내지 않았을 시 기본값은 title
    const userId = req.decoded.id;
    const { clubId } = req.params;
    const filter = req.query.filter || "title";
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(page, "page").isNumber().isPositive();
        const offset = (page - 1) * SEARCH.MAX_CLUB_PER_PAGE;
        // filter가 title 인지 author 둘중 하나 인지 검사
        if (filter !== "author" && filter !== "title") {
            throw new BadRequestException("해당하는 검색 필터가 존재하지 않습니다");
        }
        // 권한 체크
        const selectAuthSql = `SELECT
                                    club_member_tb.position
                                FROM
                                    club_member_tb
                                WHERE
                                    club_member_tb.account_id = $1
                                AND
                                    club_member_tb.club_id = $2`;
        const selectAuthParam = [userId, clubId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("동아리에 가입하지 않은 사용자입니다");
        }
        let selectPostSql = `SELECT
                                    club_post_tb.id,
                                    account_tb.name AS "authorName",
                                    club_post_tb.title,
                                    club_post_tb.content
                                FROM
                                    club_post_tb
                                JOIN
                                    account_tb
                                ON
                                    club_post_tb.account_id = account_tb.id
                                `;
        const selectPostParam = [offset, SEARCH.MAX_CLUB_PER_PAGE_FOR_CLUBNAME];
        // filter가 title인 경우와 author인 경우 분리
        if (filter === "title") {
            selectPostSql += `WHERE 
                                    club_post_tb.title 
                                LIKE
                                    $3
                            `;
        } else if (filter === "author") {
            selectPostSql += `WHERE
                                    account_tb.name
                                LIKE
                                    $3 `;
        }
        selectPostSql += `ORDER BY
                                club_post_tb.created_at DESC
                            OFFSET
                                $1
                            LIMIT
                                $2
                                `;
        selectPostParam.push(`%${search}%`);
        const selectPostData = await pool.query(selectPostSql, selectPostParam);
        result.data = {
            posts: selectPostData.rows
        }

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

module.exports = router;
