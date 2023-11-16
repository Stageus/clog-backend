require("dotenv").config()

const pool = require("../config/database/postgresql")
const client = require("mongodb").MongoClient
const { BadRequestException } = require("../module/customError")

const { NOTIFICATION_URL } = require("../module/global")

const createNotification = async (url, key) => {
    let type;
    let sql;

    switch (url) { // api url에 따라 알림 type과 sql 설정
        case NOTIFICATION_URL.CLUB_COMMENT:
            type = "club_comment"
            sql = `SELECT
                        account_tb.name AS "author",
                        club_tb.name  AS "club_name",
                        club_post_tb.account_id AS "user_id",
                        club_tb.id AS "club_id"
                    FROM
                        club_comment_tb
                    JOIN
                        account_tb
                    ON
                        club_comment_tb.account_id = account_tb.id
                    JOIN
                        club_post_tb ON club_comment_tb.club_post_id = club_post_tb.id
                    JOIN
                        club_board_tb ON club_post_tb.club_board_id = club_board_tb.id
                    JOIN
                        club_tb ON club_board_tb.club_id = club_tb.id
                    WHERE 
                        club_comment_tb.id = $1`;
            break

        case NOTIFICATION_URL.CLUB_REPLY:
            type = "club_reply"
            sql = `SELECT 
                        account_tb.name AS "author",
                        club_tb.name  AS "club_name",
                        club_comment_tb.account_id AS "user_id",
                        club_comment_tb.id AS "comment_id",
                        club_tb.id AS "club_id"
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
                        club_reply_tb.id = $1`;
            break

        case NOTIFICATION_URL.PR_COMMENT:
            type = "pr_comment"
            sql = `WITH selected_club_post AS (
                        SELECT 
                            promotion_post_tb.club_id,
                            promotion_post_tb.id AS post_id
                        FROM
                            promotion_comment_tb
                        JOIN
                            promotion_post_tb
                        ON
                            promotion_comment_tb.promotion_post_id = promotion_post_tb.id
                        WHERE
                            promotion_comment_tb.id = $1
                    )
                    SELECT 
                        club_member_tb.account_id AS user_id,
                        club_tb.name AS club_name,
                        selected_club_post.club_id,
                        selected_club_post.post_id
                    FROM 
                        selected_club_post
                    JOIN 
                        club_member_tb ON club_member_tb.club_id = selected_club_post.club_id
                    JOIN 
                        club_tb ON club_tb.id = selected_club_post.club_id
                    WHERE 
                        club_member_tb.position < 2`;
            break

        case NOTIFICATION_URL.PR_REPLY:
            type = "pr_reply"
            sql = `SELECT 
                        promotion_comment_tb.account_id AS "user_id",
                        promotion_post_tb.id AS "post_id",
                        promotion_comment_tb.id AS "comment_id"
                    FROM 
                        promotion_reply_tb
                    JOIN
                        promotion_comment_tb
                    ON
                        promotion_reply_tb.promotion_comment_id = promotion_comment_tb.id
                    JOIN 
                        promotion_post_tb
                    ON
                        promotion_comment_tb.promotion_post_id = promotion_post_tb.id
                    WHERE 
                        promotion_reply_tb.id = $1`;
            break

        case NOTIFICATION_URL.NOTI_COMMENT:
            type = "noti_comment"
            sql = `SELECT 
                        account_tb.name AS "author",
                        club_tb.name  AS "club_name",
                        notice_post_tb.account_id AS "user_id",
                        notice_post_tb.id AS "post_id",
                        club_tb.id AS "club_id"
                    FROM
                        notice_comment_tb
                    JOIN
                        account_tb
                    ON
                        notice_comment_tb.account_id = account_tb.id
                    JOIN
                        notice_post_tb
                    ON
                        notice_comment_tb.notice_post_id = notice_post_tb.id
                    JOIN
                        club_tb
                    ON
                        notice_post_tb.club_id = club_tb.id
                    WHERE 
                        notice_comment_tb.id = $1`;
            break

        case NOTIFICATION_URL.NOTI_REPLY:
            type = "noti_reply"
            sql = `SELECT 
                        account_tb.name AS "author",
                        club_tb.name  AS "club_name",
                        notice_comment_tb.account_id AS "user_id",
                        notice_comment_tb.id AS "comment_id",
                        notice_post_tb.id AS "post_id",
                        club_tb.id AS "club_id"
                    FROM
                        notice_reply_tb
                    JOIN
                        account_tb ON notice_reply_tb.account_id = account_tb.id
                    JOIN
                        notice_comment_tb
                    ON
                        notice_comment_tb.notice_post_id = notice_comment_tb.id
                    JOIN
                        notice_post_tb
                    ON
                        notice_comment_tb.notice_post_id = notice_post_tb.id
                    JOIN
                        club_tb
                    ON
                        notice_post_tb.club_id = club_tb.id
                    WHERE 
                        notice_reply_tb.id = $1`;
            break

        case NOTIFICATION_URL.GRADE_UPDATE:
            type = "grade_update"
            sql = `SELECT 
                        club_member_tb.account_id AS "user_id",
                        club_member_tb.position AS "position",
                        club_tb.name AS "club_name",
                        club_tb.id AS "club_id"
                    FROM
                        club_member_tb
                    JOIN
                        club_tb ON club_member_tb.club_id = club_tb.id
                    WHERE 
                        club_member_tb.id = $1`;
            break

        case NOTIFICATION_URL.JOIN_ACCEPT:
            type = "join_accept"
            sql = `SELECT 
                        club_member_tb.account_id AS "user_id",
                        club_tb.name AS "club_name",
                        club_tb.id AS "club_id"
                    FROM
                        club_member_tb
                    JOIN
                        club_tb
                    ON
                        club_member_tb.club_id = club_tb.id
                    WHERE 
                        club_member_tb.id = $1`;
            break
        default:
            break
    }

    const selectedData = await pool.query(sql, [key]);

    if (selectedData.rowCount == 0) throw new BadRequestException("존재하지 않는 알림입니다");

    for (let index = 0; index < selectedData.rowCount; index++) { // 몽고디비에 저장하기 위한 필드 추가
        selectedData.rows[index].type = type
        selectedData.rows[index].is_read = false
    }
    
    const mongoClient = await client.connect(process.env.MONGODB_URL);

    // 몽고디비에 저장
    await mongoClient.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION).insertMany(selectedData.rows, { ignoreUndefined: true });

    // 답글 알림의 경우 댓글 알림으로 바꿔서 한번 더 실행
    if (type == NOTIFICATION_URL.CLUB_REPLY) {
        await createNotification(NOTIFICATION_URL.CLUB_COMMENT, selectedData.rows[0].comment_id);
    }

    if (type == NOTIFICATION_URL.NOTI_REPLY) {
        await createNotification(NOTIFICATION_URL.NOTI_COMMENT, selectedData.rows[0].comment_id);
    }

    if (type == NOTIFICATION_URL.PR_REPLY) {
        await createNotification(NOTIFICATION_URL.PR_COMMENT, selectedData.rows[0].comment_id);
    }

    await mongoClient.close();
}

module.exports = createNotification 
