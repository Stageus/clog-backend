const router = require("express").Router();
const pool = require('../config/database/postgresql');
const loginAuth = require('../middleware/loginAuth');
const validate = require('../module/validation');
const { CLUB, BOARD, MAX_PK_LENGTH } = require("../module/global");
const { BadRequestException, NotFoundException, ForbbidenException } = require('../module/customError');
const CONSTRAINT = require("../module/constraint");

// 게시판 리스트 조회 api
router.get("/list/club/:clubId", loginAuth, async (req, res, next) => {
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(clubId, "clubId").checkInput().isNumber();
        const selectClubSql = `SELECT
                                    id
                                FROM
                                    club_tb
                                WHERE
                                    id = $1`;
        const selectClubParam = [clubId];
        const selectClubData = await pool.query(selectClubSql, selectClubParam);
        if (selectClubData.rowCount === 0) {
            throw new NotFoundException("해당하는 동아리가 없습니다");
        }
        const selectBoardListSql = `SELECT
                                        -- 동아리가 없을때 잡아줘야좸 404로, 동아리는 있는데 게시판이 없는경우 400
                                        id,
                                        name
                                    FROM
                                        club_board_tb 
                                    WHERE 
                                        club_id = $1`;
        const selectBoardListParam = [clubId];
        const selectBoardListData = await pool.query(selectBoardListSql, selectBoardListParam);
        result.data = {
            boards: selectBoardListData.rows
        }
    }
    catch (error) {
        return next(error);
    }

    res.send(result);
});

// 게시판 생성 api
// 권한: 해당 동아리의 관리자
router.post("/", loginAuth, async (req, res, next) => {
	const { clubId, name } = req.body;
	const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    }

	try {
		validate(clubId, "club-id").checkInput().checkLength(1, MAX_PK_LENGTH);
        validate(name, "name").checkInput().checkLength(1, BOARD.MAX_BOARD_LENGTH);

		// 권한 체크
		const selectClubAuthSql = `SELECT
										position < 3  AS "manageAuth"
									FROM
										club_member_tb
									WHERE
										account_id = $1
									AND
										club_id = $2`;
		const selectClubAuthParam = [userId, clubId];
		const selectClubAuthData = await pool.query(selectClubAuthSql, selectClubAuthParam);
		if (selectClubAuthData.rowCount === 0) {
			throw new NotFoundException("해당하는 동아리가 존재하지 않습니다");
		}
		if (!selectClubAuthData.rows[0]?.manageAuth) {
			throw new ForbbidenException("관리자 권한이 필요합니다");
		}
		// 게시판 생성
        const createBoardSql = `INSERT INTO
                                            club_board_tb (club_id, name)
                                SELECT
										$1, $2
								WHERE
									(
										SELECT
											COUNT(*)
										FROM
											club_board_tb
										WHERE
											club_id = $3
									) < $4
								RETURNING
										id`;
        const createBoardParam = [clubId, name, clubId, CLUB.MAX_BOARD_COUNT];
        const createBoardData = await pool.query(createBoardSql, createBoardParam);
        if (createBoardData.rowCount === 0) {
            throw new BadRequestException(`게시판의 최대 수는 ${CLUB.MAX_BOARD_COUNT}개입니다`);
        }
        result.data = {
            "boardId": createBoardData.rows[0].id
        };
    } catch (error) {
        if (error.constraint === CONSTRAINT.FK_CLUB_TO_BOARD_TB) {
            return next(new BadRequestException("동아리가 존재하지 않습니다"));
        }
        return next(error);
    }
    res.send(result);
});

// 게시판 수정 api
// 권한: 해당 동아리의 관리자
router.put("/", loginAuth, async (req, res, next) => {
	const { boardId, name } = req.body;
	const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    };

	try {
		validate(boardId, "boardId").checkInput().isNumber().checkLength(1, MAX_PK_LENGTH);
        validate(name, "name").checkInput().checkLength(1, BOARD.MAX_BOARD_LENGTH);

		// 권한 체크
		const selectClubAuthSql = `SELECT
										position < 3  AS "manageAuth"
									FROM
										club_member_tb
									WHERE
										account_id = $1
									AND
										club_id = $2`;
		const selectClubAuthParam = [userId, clubId];
		const selectClubAuthData = await pool.query(selectClubAuthSql, selectClubAuthParam);
		if (selectClubAuthData.rowCount === 0) {
			throw new NotFoundException("해당하는 동아리가 존재하지 않습니다");
		}
		if (!selectClubAuthData.rows[0].manageAuth) {
			throw new ForbbidenException("관리자 권한이 필요합니다");
		}
		const updateBoardSql = `UPDATE 
									club_board_tb
								SET
									name = $1
								WHERE
									id = $2`;
        const updateBoardParams = [name, boardId];
        const updateBoardData = await pool.query(updateBoardSql, updateBoardParams);
        if (updateBoardData.rowCount === 0) {
            throw new BadRequestException("해당하는 게시판이 존재하지 않습니다");
        }
    } catch (error) {
        return next(error);
    }
    res.send(result);
});

// 게시판 삭제 api
// 권한: 해당 동아리의 관리자
router.delete("/", loginAuth, async (req, res, next) => {
	const { boardId } = req.body;
	const userId = req.decoded.id;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(boardId, "boardId").checkInput().isNumber().checkLength(1, MAX_PK_LENGTH);

		// 권한 체크
		const selectClubAuthSql = `SELECT
										position < 3  AS "manageAuth"
									FROM
										club_member_tb
									WHERE
										account_id = $1
									AND
										club_id = $2`;
		const selectClubAuthParam = [userId, clubId];
		const selectClubAuthData = await pool.query(selectClubAuthSql, selectClubAuthParam);
		if (selectClubAuthData.rowCount === 0) {
			throw new NotFoundException("해당하는 동아리가 존재하지 않습니다");
		}
		if (!selectClubAuthData.rows[0].manageAuth) {
			throw new ForbbidenException("관리자 권한이 필요합니다");
		}
		const deleteBoardSql = `DELETE 
								FROM
									club_board_tb
                                WHERE
                                    id = $1`;
        const deleteBoardParam = [boardId];
        const deleteBoardData = await pool.query(deleteBoardSql, deleteBoardParam);
        if (deleteBoardData.rowCount === 0) {
            throw new BadRequestException("해당하는 게시판이 존재하지 않습니다");
        }
    } catch (error) {
        return next(error);
    }

    res.send(result);
});

module.exports = router;
