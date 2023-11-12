
const router = require("express").Router();
const pool = require("../../config/database/postgresql");
const validate = require('../module/validation');
const loginAuth = require("../middleware/auth/loginAuth");
const CONSTRAINT = require("../module/constraint");
const { BadRequestException, ForbbidenException } = require('../module/customError');
const { CLUB, POSITION } = require("../module/global");
const authCheck = require("../middleware/auth/authCheck");

// 동아리 생성 api
router.post("/", loginAuth, async (req, res, next) => {
    const result = {
        message: "",
        data: {}
    }
    const {
        belong, bigCategory, smallCategory, name, cover, isRecruit, themeColor, profileImg, bannerImg
    } = req.body;
    const userId = req.decoded.id;
    let pgClient = null;

    try {
        validate(belong, "belong").checkInput().isNumber().checkLength(1, CLUB.MAX_CLUB_BELONG_LENGTH);
        validate(bigCategory, "bigCategory").checkInput().isNumber().checkLength(1, CLUB.MAX_CLUB_BIG_CATEGORY_LENGTH);
        validate(smallCategory, "smallCategory").checkInput().isNumber().checkLength(1, CLUB.MAX_CLUB_SMALL_CATEGORY_LENGTH);
        validate(name, "name").checkInput().checkClubNameRegex();
        validate(cover, "cover").checkInput().checkLength(1, CLUB.MAX_CLUB_COVER_LENGTH);
        validate(isRecruit, "isRecruit").checkInput().isBoolean();
        validate(themeColor, "themeColor").checkInput().checkThemeColorRegex();

        pgClient = await pool.connect();
        // 트랜잭션 시작
        await pgClient.query("BEGIN");

        const createClubSql = `INSERT INTO 
                                        club_tb (belong, big_category, small_category, name, cover, is_recruit, profile_img, banner_img, theme_color)
                               VALUES
                                        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                               RETURNING
                                        id`;
        const createClubParam = [belong, bigCategory, smallCategory, name, cover, isRecruit, profileImg, bannerImg, themeColor];
        const createdClubData = await pool.query(createClubSql, createClubParam);
        const createdClubId = createdClubData.rows[0].id;

        const insertMemberSql = `INSERT INTO 
                                        club_member_tb (account_id, club_id, position) 
                                 VALUES 
                                        ($1, $2, $3)`;
        const insertMemberParam = [userId, createdClubId, POSITION.PRESIDENT];
        await pool.query(insertMemberSql, insertMemberParam);

        // 트랜잭션 커밋
        await pgClient.query("COMMIT");

        result.message = "동아리 생성 성공";
        result.data = {
            "clubId": createdClubId
        }
        return res.send(result);

    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK");
        }
        if (error.constraint === CONSTRAINT.UNIQUE_CLUB_NAME_TO_CLUB_TB) {
            next(new BadRequestException("이미 존재하는 동아리 이름입니다"));
        }
        if (error.constraint === CONSTRAINT.FK_BELONG_TO_CLUB_TB) {
            next(new BadRequestException("해당하는 소속이 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_BIG_CATEGORY_TO_CLUB_TB) {
            next(new BadRequestException("해당하는 대분류가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_SMALL_CATEGORY_TO_CLUB_TB) {
            next(new BadRequestException("해당하는 소분류가 존재하지 않습니다"));
        }
        return next(error);

    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
});

// 동아리 프로필 조회 api
router.get("/:clubId/profile", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    }
    try {
        validate(clubId, "clubId").checkInput().isNumber();

        const selectedClubSql = `SELECT 
                                    club_tb.name AS "name", 
                                    belong_tb.name AS "belong", 
                                    big_category_tb.name AS "bigCategory", 
                                    small_category_tb.name AS "smallCategory", 
                                    club_tb.profile_img AS "profileImage", 
                                    club_tb.banner_img AS "bannerImage",
                                    club_tb.cover AS "cover", 
                                    club_tb.theme_color AS "themeColor",
                                    (
                                        SELECT
                                            COUNT(*)
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.club_id = club_tb.id
                                    )::int AS "memberCount",
                                    COALESCE((
                                                SELECT
                                                    club_member_tb.id
                                                FROM
                                                    club_member_tb
                                                WHERE
                                                    club_member_tb.account_id = $1
                                                AND
                                                    club_member_tb.club_id = club_tb.id
                                    )::boolean, false) AS "isMember",
                                    COALESCE
                                    (
                                        club_member_tb.position = 0, false
                                    )   AS "manageState",
                                    club_tb.is_recruit AS "isRecruit",
                                    TO_CHAR(club_tb.created_at, 'YYYY.MM.DD') AS "createdAt"
                                FROM 
                                    club_tb
                                LEFT JOIN
                                    club_member_tb
                                ON
                                    club_member_tb.club_id = $2 AND club_member_tb.account_id = $1
                                JOIN 
                                    belong_tb ON club_tb.belong = belong_tb.id
                                JOIN   
                                    big_category_tb ON club_tb.big_category = big_category_tb.id
                                JOIN 
                                    small_category_tb ON club_tb.small_category = small_category_tb.id
                                WHERE 
                                    club_tb.id = $2`;
        const selectedClubParams = [userId, clubId];

        const clubProfiledata = await pool.query(selectedClubSql, selectedClubParams);
        if (clubProfiledata.rowCount === 0) {
            throw new BadRequestException("해당하는 동아리가 존재하지 않습니다");
        }
        result.data = {
            club: clubProfiledata.rows[0]
        }
        return res.send(result);

    } catch (error) {
        return next(error);
    }
});

// 동아리 관리자 페이지 (동아리 프로필)api
// 논의 필요
router.get("/:clubId/manage", loginAuth, authCheck(POSITION.MANAGER), async (req, res, next) => {
});

// 동아리 수정 api
// 해당 동아리의 관리자만
router.put("/", loginAuth, authCheck(POSITION.MANAGER), async (req, res, next) => {
    const {
        name, cover, isAllowJoin, themeColor, bannerImg, profileImg
    } = req.body;
    const { clubId } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(name, "name").checkInput().checkClubNameRegex();
        validate(cover, "cover").checkInput().checkLength(1, CLUB.MAX_CLUB_COVER_LENGTH);
        validate(isAllowJoin, "isAllowJoin").checkInput();
        validate(themeColor, "themeColor").checkInput().checkThemeColorRegex();
        validate(bannerImg, "bannerImg").checkInput().checkLength(1, CLUB.MAX_BANNER_IMAGE_LENGTH);
        validate(profileImg, "profileImg").checkInput().checkLength(1, CLUB.MAX_PROFILE_IMAGE_LENGTH);

        const modifyClubProfileSql = `UPDATE 
                                            club_tb
                                        SET 
                                            name = $1, 
                                            cover = $2, 
                                            is_recruit = $3, 
                                            theme_color = $4, 
                                            banner_img = $5, 
                                            profile_img = $6 
                                        WHERE 
                                            id = $7`;
        const modifyClubProfileParam = [
            name, cover, isAllowJoin, themeColor, bannerImg, profileImg,
            clubId
        ];
        const modifyClubProfileData = await pool.query(modifyClubProfileSql, modifyClubProfileParam);
        if (modifyClubProfileData.rowCount !== 0) {
            return res.send(result);
        }

    } catch (error) {
        return next(error);
    }
});

// 동아리 이름 중복 체크 api
router.get("/duplicate/club-name/:clubName", loginAuth, async (req, res, next) => {
    const result = {
        message: "",
        data: {}
    };
    const { clubName } = req.params;

    // 공백 제거 한 clubName 과 공백 제거 한 club_tb(name)을 비교
    const removeSpaceClubName = clubName.replace(/\s+/g, ''); // 공백 제거
    try {
        validate(removeSpaceClubName, "club-name").checkInput().checkClubNameRegex();

        const selectClubNameSql = `SELECT 
                                        name 
                                   FROM 
                                        club_tb 
                                   WHERE 
                                        REPLACE(name, ' ', '') = $1`;
        const selectClubNameParam = [removeSpaceClubName];
        const selectClubNameData = await pool.query(selectClubNameSql, selectClubNameParam);
        if (selectClubNameData.rowCount !== 0) {
            throw new BadRequestException("해당하는 동아리 이름이 존재합니다");
        }
        result.message = "사용 가능한 이름입니다";

    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 동아리 가입 신청 api
router.post("/join-request", loginAuth, async (req, res, next) => {
    const { clubId } = req.body;
    const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(clubId, "clubId").checkInput().isNumber();

        // club_member_tb 테이블을 뒤져서 해당하는 사용자가 동아리에 이미 존재한다면 400 error를 던져줌
        const selectClubMemberSql = `SELECT 
                                             id 
                                     FROM 
                                             club_member_tb 
                                     WHERE 
                                             account_id = $1 AND club_id = $2`;
        const selectClubMemberParam = [userId, clubId];
        const selectClubMemberData = await pool.query(selectClubMemberSql, selectClubMemberParam);
        if (selectClubMemberData.rowCount !== 0) {
            throw new BadRequestException("이미 가입된 동아리입니다");
        }

        // join_request_tb 테이블을 뒤져서 해당하는 사용자가 이미 가입 요청된 상태이면 400 error를 던져줌
        const selectIsJoinRequestSql = `SELECT 
                                                id 
                                        FROM 
                                                join_request_tb 
                                        WHERE 
                                                account_id = $1 AND club_id = $2`;
        const selectIsJoinRequestParam = [userId, clubId];
        const selectIsJoinRequestData = await pool.query(selectIsJoinRequestSql, selectIsJoinRequestParam);
        if (selectIsJoinRequestData.rowCount !== 0) {
            throw new BadRequestException("이미 가입 신청이 되어있습니다");
        }

        const insertJoinRequestSql = `INSERT INTO 
                                                join_request_tb (account_id, club_id) 
                                      VALUES 
                                                ($1, $2)`;
        const insertJoinRequestParam = [userId, clubId];
        const insertJoinRequestData = await pool.query(insertJoinRequestSql, insertJoinRequestParam);
        if (insertJoinRequestData.rowCount !== 0) {
            result.message = "가입 요청에 성공하였습니다";
            return res.send(result);
        }

    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_JOIN_REQUEST_TB) {
            return next(new BadRequestException("해당하는 사용자가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_CLUB_TO_JOIN_REQUEST_TB) {
            return next(new BadRequestException("해당하는 동아리가 존재하지 않습니다"));
        }
        return next(error);
    }
});

// 동아리 가입 신청 리스트 조회 api
// 권한: 해당 동아리의 관리자인지
router.get("/join-request/:clubId/list", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(clubId, "club-id").checkInput().isNumber();
        // 권한 체크
        const selectAuthSql = `SELECT
                                    club_member_tb.position < 2 AS "manageAuth"
                                FROM
                                    club_member_tb
                                WHERE
                                    club_member_tb.account_id = $1
                                AND
                                    club_member_tb.club_id = $2`;
        const selectAuthParam = [userId, clubId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0 || !selectAuthData.rows[0].manageAuth) {
            throw new ForbbidenException("권한이 없습니다");
        }

        const selectJoinRequestSql = `SELECT 
                                            join_request_tb.id AS "requestId",
                                            join_request_tb.account_id AS "id", 
                                            account_tb.name, 
                                            account_tb.personal_color AS "personalColor", 
                                            account_tb.entry_year AS "entryYear", 
                                            major_tb.name AS "major", 
                                            TO_CHAR(join_request_tb.created_at, 'yyyy.mm.dd') AS "createdAt" 
                                      FROM 
                                            join_request_tb 
                                      JOIN 
                                            account_tb ON join_request_tb.account_id = account_tb.id 
                                      JOIN 
                                            major_tb ON account_tb.major = major_tb.id
                                      WHERE 
                                            club_id = $1`;
        const selectJoinRequestParam = [clubId];
        const selectJoinRequestData = await pool.query(selectJoinRequestSql, selectJoinRequestParam);
        result.data = {
            users: selectJoinRequestData.rows
        };
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 동아리 가입 신청 승인 api
router.post("/member", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { requestId } = req.body;
    const result = {
        message: "",
        data: {}
    }
    let pgClient = null;

    try {
        validate(requestId, "requestId").checkInput().isNumber();

        pgClient = await pool.connect();
        // 트랜잭션 시작
        await pgClient.query("BEGIN");

        // 권한 체크
        // 해당 동아리의 운영진인지?
        const selectAuthSql = `SELECT
                                    (
                                        SELECT
                                            club_member_tb.position
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ) AS "position"
                                FROM
                                    join_request_tb
                                JOIN
                                    club_tb
                                ON
                                    join_request_tb.club_id = club_tb.id
                                WHERE
                                    join_request_tb.id = $2`;
        const selectAuthParam = [userId, requestId];
        const selectAuthData = await pgClient.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 요청이 존재하지 않습니다");
        }
        if (selectAuthData.rows[0]?.position > POSITION.MANAGER) {
            throw new BadRequestException("권한이 없습니다");
        }

        // 가입 신청한 유저인지 확인
        const selectJoinRequestMemberSql = `SELECT 
                                                    account_id AS "accountId", 
                                                    club_id AS "clubId" 
                                            FROM 
                                                    join_request_tb 
                                            WHERE 
                                                    id = $1`;
        const selectJoinRequestMemberParam = [requestId];
        const selectJoinRequestData = await pgClient.query(selectJoinRequestMemberSql, selectJoinRequestMemberParam);
        // 만약 가입 신청 테이블에 해당 요청 인덱스가 존재하지 않는다면 (가입 신청을 하지 않았다는 소리)
        if (selectJoinRequestData.rowCount === 0) {
            throw new BadRequestException("가입 신청 목록에 해당 유저가 존재하지 않습니다");
        }
        // 가입 요청 테이블에서 해당 요청 인덱스에 대한 userId와 clubId를 추출
        const { accountId, clubId } = selectJoinRequestData.rows[0];
        // 추출한 userId와 clubId를 통해 club_member_tb로 유저를 삽입
        const insertMemberSql = `INSERT INTO 
                                            club_member_tb (account_id, club_id, position)
                                   VALUES
                                            ($1, $2, $3)`;
        const insertMemberParams = [accountId, clubId, POSITION.MEMBER];
        await pgClient.query(insertMemberSql, insertMemberParams);
        // 위 두 작업이 완료되면 가입 요청 테이블에 해당 요청 인덱스를 제거
        const deleteJoinRequestMemberSql = `DELETE FROM 
                                                join_request_tb 
                                            WHERE 
                                                id = $1`;
        const deleteJoinRequestMemberParam = [requestId];
        await pgClient.query(deleteJoinRequestMemberSql, deleteJoinRequestMemberParam);

        // 트랜잭션 커밋
        await pgClient.query("COMMIT");
    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK");
        }
        if (error.constrinat === CONSTRAINT.FK_CLUB_TO_CLUB_MEMBER_TB) {
            return next(new BadRequestException("해당하는 동아리가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_ACCOUNT_TO_CLUB_MEMBER_TB) {
            return next(new BadRequestException("해당하는 사용자가 존재하지 않습니다"));
        }
        if (error.constraint === CONSTRAINT.FK_POSITION_TO_CLUB_POSITION_TB) {
            return next(new BadRequestException("해당하는 직급이 존재하지 않습니다"));
        }
        return next(error);
    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
    res.send(result);
});

// 동아리 가입 신청 거부 api
// 권한: 해당 동아리의 관리자
router.delete("/join-request", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { requestId } = req.body;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(requestId, "requestId").checkInput().isNumber();

        // 권한 체크
        const selectAuthSql = `SELECT
                                    (
                                        SELECT
                                            club_member_tb.position
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.account_id = $1
                                        AND
                                            club_member_tb.club_id = club_tb.id
                                    ) AS "position"
                                FROM
                                    join_request_tb
                                JOIN
                                    club_tb
                                ON
                                    join_request_tb.club_id = club_tb.id
                                WHERE
                                    join_request_tb.id = $2`;
        const selectAuthParam = [userId, requestId];
        const selectAuthData = await pool.query(selectAuthSql, selectAuthParam);
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 가입 요청이 존재하지 않습니다");
        }
        if (selectAuthData.rows[0]?.position > POSITION.MANAGER) {
            throw new BadRequestException("권한이 없습니다");
        }
        // 요청 삭제
        const deleteJoinRequestSql = `DELETE FROM join_request_tb WHERE id = $1`;
        const deleteJoinRequestParam = [requestId];
        const deleteJoinRequestData = await pool.query(deleteJoinRequestSql, deleteJoinRequestParam);
        if (deleteJoinRequestData.rowCount === 0) {
            throw new BadRequestException("해당하는 가입 신청 내역이 존재하지 않습니다");
        }

    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 동아리 내부 개인 프로필 api
router.get("/member/:clubId/profile", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(clubId, "club-id").checkInput().isNumber();

        const selectProfileSql = `SELECT
                                        account_tb.name, 
                                        account_tb.personal_color AS "personalColor", 
                                        position_tb.name AS "position", 
                                        account_tb.entry_year AS "entryYear", 
                                        major_tb.name AS "major" 
                                  FROM 
                                        club_member_tb 
                                  JOIN 
                                        account_tb ON club_member_tb.account_id = account_tb.id 
                                  JOIN 
                                        position_tb ON club_member_tb.position = position_tb.id 
                                  JOIN 
                                        major_tb ON account_tb.major = major_tb.id 
                                  WHERE 
                                        account_id = $1 AND club_id = $2;`;
        const selectProfileParam = [userId, clubId];
        const selectProfileData = await pool.query(selectProfileSql, selectProfileParam);
        if (selectProfileData.rowCount === 0) {
            throw new BadRequestException("해당 동아리에 가입되어있지 않습니다");
        }
        result.data = selectProfileData.rows[0];

    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 동아리 내 멤버 리스트 api
router.get("/member/:clubId/list", loginAuth, async (req, res, next) => {
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(clubId, "club-id").checkInput().isNumber();

        const selectMemberListSql = `SELECT 
                                            club_member_tb.id AS "id",
                                            club_member_tb.account_id AS "userId",
                                            position_tb.name AS "position", 
                                            major_tb.name AS "major", 
                                            account_tb.entry_year AS "entryYear", 
                                            account_tb.name, 
                                            account_tb.personal_color AS "personalColor", 
                                            to_char(club_member_tb.created_at, 'yyyy.mm.dd') AS "createdAt" 
                                        FROM 
                                            club_member_tb 
                                        JOIN 
                                            account_tb 
                                        ON 
                                            club_member_tb.account_id = account_tb.id 
                                        JOIN 
                                            major_tb 
                                        ON 
                                            account_tb.major = major_tb.id 
                                        JOIN 
                                            position_tb 
                                        ON 
                                            club_member_tb.position = position_tb.id 
                                        WHERE 
                                            club_id = $1`;
        const selectMemberListParam = [clubId];
        const selectMemberListData = await pool.query(selectMemberListSql, selectMemberListParam);
        if (selectMemberListData.rowCount === 0) {
            throw new BadRequestException("해당하는 동아리가 존재하지 않습니다");
        }
        result.data = {
            users: selectMemberListData.rows
        };

    } catch (error) {
        return next(error);
    }

    res.send(result);
});

// 직급 변경시켜주는 api
// 권한: 해당 동아리의 회장
router.put("/position", loginAuth, async (req, res, next) => {
    const userId = req.decoded.id;
    const { memberId, position } = req.body;
    const result = {
        message: "",
        data: {}
    };
    let pgClient = null;

    try {
        validate(memberId, "memberId").checkInput().isNumber();
        validate(position, "position").checkInput().isNumber();

        pgClient = await pool.connect();
        // 트랜잭션 시작
        await pgClient.query("BEGIN");

        // 0. 본인의 권한을 변경하는건 불가

        // 1. 권한 체크 (해당 동아리의 회장인지?)
        const selectAuthSql = `SELECT
                                    club_member_tb.position = 0 AS "position",
                                    club_member_tb.club_id AS "clubId"
                                FROM
                                    club_member_tb
                                WHERE
                                    club_member_tb.account_id = $1
                                AND
                                    club_member_tb.club_id = (
                                        SELECT
                                            club_member_tb.club_id
                                        FROM
                                            club_member_tb
                                        WHERE
                                            club_member_tb.id = $2
                                    )`;
        const selectAuthParam = [userId, memberId];
        const selectAuthData = await pgClient.query(selectAuthSql, selectAuthParam);
        // 해당 멤버 인덱스가 없는 경우 
        if (selectAuthData.rowCount === 0) {
            throw new BadRequestException("해당하는 멤버가 없습니다");
        }
        // 회장 권한이 아닌 경우
        if (!selectAuthData.rows[0]?.position) {
            throw new BadRequestException("권한이 없습니다");
        }
        const { clubId } = selectAuthData.rows[0];
        // 2. 만약 회장을 넘겨주는 경우 본인의 직급을 운영진으로 변경시켜줌
        if (position == POSITION.PRESIDENT) {
            const downPositionSql = `UPDATE
                                            club_member_tb
                                        SET
                                            position = 1
                                        WHERE
                                            id = (
                                                SELECT
                                                    club_member_tb.id
                                                FROM
                                                    club_member_tb
                                                WHERE
                                                    club_member_tb.club_id = $1
                                                AND
                                                    club_member_tb.account_id = $2
                                            )`;
            const downPositionParam = [clubId, userId];
            await pgClient.query(downPositionSql, downPositionParam);
        }
        // 3. 이후 직급 변경 실행
        const updatePositionSql = `UPDATE
                                        club_member_tb
                                    SET
                                        position = $1
                                    WHERE
                                        id = $2`;
        const updatePositionParam = [position, memberId];
        await pgClient.query(updatePositionSql, updatePositionParam);
        // 위 작업이 완료되면 커밋
        await pgClient.query("COMMIT");

    } catch (error) {
        if (pgClient) {
            await pgClient.query("ROLLBACK");
        }
        if (error.constraint === CONSTRAINT.FK_POSITION_TO_CLUB_MEMBER_TB) {
            return next(new BadRequestException("해당하는 직급이 존재하지 않습니다"));
        }
        return next(error);

    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
    res.send(result);
});

// 배너 불러오는 api
router.get("/:clubId/banner", loginAuth, async (req, res, next) => {
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(clubId, "club-id").checkInput().isNumber();

        const selectClubBannerSql = `SELECT 
                                            banner_img AS "banner"
                                     FROM 
                                            club_tb 
                                     WHERE 
                                            id = $1`;
        const selectClubBannerParam = [clubId];
        const selectClubBannerData = await pool.query(selectClubBannerSql, selectClubBannerParam);
        if (selectClubBannerData.rowCount === 0) {
            throw new BadRequestException("해당하는 동아리가 존재하지 않습니다");
        }
        result.data = {
            banner: selectClubBannerData.rows[0].banner
        }

    } catch (error) {
        return next(error);
    }

    res.send(result);
});

module.exports = router;
