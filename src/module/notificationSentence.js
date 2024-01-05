const elapsedTime = require("./elapsedTime")

const notificationSentence = (data) => {
    console.log(data)
    const notificationList = data.map((elem) => {
        let sentence
        const time = elapsedTime(elem._id.toString())
        
        switch (elem.type) {
            case "club_comment" :
                sentence  = `${time} ${elem.club_name}의 내 게시글에 ${elem.author}님이 댓글을 작성했습니다`
                break
            case "club_reply" :
                sentence  = `${time} ${elem.club_name}의 내 댓글에 ${elem.author}님이 답글을 작성했습니다`
                break
            case "noti_comment" :
                sentence  = `${time} ${elem.club_name}의 내 게시글에 ${elem.author}님이 댓글을 작성했습니다`
                break
            case "noti_reply" :
                sentence  = `${time} ${elem.club_name}의 내 댓글에 ${elem.author}님이 답글을 작성했습니다`
                break
            case "pr_comment" :
                sentence  = `${time} ${elem.club_name}의 홍보게시글에 새 댓글이 달렸습니다`
                break
            case "pr_reply" :
                sentence  = `${time} 내 댓글에 새 딥글이 달렸습니다`
                break
            case "grade_update" :
                sentence  = `${time} ${elem.club_name}에서의 직급이 ${elem.position}이로 변경되었습니다`
                break
            case "join_accept" :
                sentence  = `${time} ${elem.club_name}에 신청한 가입요청이 승인되었습니다`
                break
            default :
                break
        }
        return {
            "id" : elem._id,
            "type" : elem.type,
            "sentence" : sentence,
            "isRead" : elem.is_read,
            "clubId" : elem.club_id,
            "postId" : elem.post_id,
        }
    })

    return notificationList
}

module.exports =  notificationSentence