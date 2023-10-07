const router = require("express").Router();

const pool = require('../../config/database/postgresql');
const loginAuth = require('../middleware/auth/loginAuth');
const managerAuth = require('../middleware/auth/managerAuth');
const validate = require('../module/validation');
const { club } = require("../module/global");
const { board } = require("../module/global");
const { BadRequestException } = require('../module/customError');

// 게시판 리스트 조회 api
router.get("/list/club/:clubId", loginAuth, async (req, res, next) => {
    const { clubId } = req.params;
    const result = {
        message: "",
        data: {}
    };

    try {
        validate(clubId, "clubId").checkInput().isNumber();

        const selectBoardListSql = `SELECT id, name FROM club_board_tb WHERE club_id = $1`;
        const selectBoardListParam = [clubId];
        const selectBoardListData = await pool.query(selectBoardListSql, selectBoardListParam);
        if (selectBoardListData.rowCount !== 0) {
            result.data = {
                boards: selectBoardListData.rows
            }
            res.send(result);
        }
    }
    catch (error) {
        next(error);
    }
});

// 게시판 생성 api
router.post("/", loginAuth, managerAuth, async (req, res, next) => {
    const { clubId, name } = req.body;
    const result = {
        message: "",
        data: {}
    }

    try {
        validate(name, "name").checkInput().checkLength(1, board.MAX_BOARD_LENGTH);

        const createBoardSql = `INSERT INTO
                                            club_board_tb (club_id, name)
                                SELECT
                                            $1, $2
                                WHERE 
                                            (SELECT 
                                                    COUNT(*) 
                                             FROM
                                                    club_board_tb 
                                             WHERE 
                                                    club_id = $3) < $4
                                RETURNING id`;
        const createBoardParam = [clubId, name, clubId, club.MAX_BOARD_COUNT];
        const createBoardData = await pool.query(createBoardSql, createBoardParam);
        if (createBoardData.rowCount !== 0) {
            result.message = "게시판 생성 성공";
            result.data = createBoardData.rows[0].id;
            return res.send(result);
        }
        throw new BadRequestException(`게시판의 최대 수는 ${club.MAX_BOARD_COUNT}개입니다`)

    } catch (error) {
        next(error);
    }
});

module.exports = router;
