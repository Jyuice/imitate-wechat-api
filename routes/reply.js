const router = require('koa-router')()
const bodyParser = require('koa-bodyparser')
const query = require('../module/query')
const getTime = require('../module/getCompleteTime')

router.use(bodyParser())

// 获取朋友圈的评论（仅共友）
// router.get('/getReplies', async ctx => {
//     const { userId, commentId } = ctx.query
//     const sql = 
//     `SELECT DISTINCT 
//     replies.reply_id,replies.replyer_id,users.nickname,users.avatar,replies.reply,replies.commentor,replies.time 
//     FROM replies 
//     LEFT JOIN users 
//     ON replies.replyer_id=users.user_id
//     LEFT JOIN relation 
//     ON users.user_id=relation.user_id 
//     OR users.user_id=relation.friend_id 
//     WHERE replies.comment_id=${commentId} 
//     AND (relation.friend_id=${userId} 
//         OR relation.user_id=${userId}) 
//     ORDER BY replies.time DESC
//     `
//     const doc = await query(sql)
//     const data = {
//         list: doc
//     }
//     ctx.body = data
// })

// 提交回复
router.post('/postReply', async ctx => {
    const { userId, commentId, momentId, reply } = ctx.request.body
    const completeTime = getTime()
    const doc = await query(`SELECT users.user_id AS commentorId, users.nickname FROM users LEFT JOIN responses ON users.user_id=responses.responser_id WHERE responses.response_id=${commentId}`)
    const { commentorId, nickname } = doc[0] // 这个就是评论者的id和姓名 comments.uor_id,comments.uor
    await query("INSERT INTO responses (responser_id,moment_id,content,comment_id, commentor_id, commentor, type,time) VALUES ('"+ userId +"','"+ momentId +"','"+ reply +"','"+ commentId +"','"+ commentorId +"','"+ nickname +"',1,'"+ completeTime +"')")
    const data = {
        status: 200
    }
    ctx.body = data
})

// // 删除评论
// router.post("/deleteReply", async ctx => {
//     const { userId, replyId } = ctx.request.body
//     await query("DELETE FROM replies WHERE replyer_id='"+ userId +"' AND reply_id='"+ replyId +"'")
//     const data = {
//         message: "删除成功"
//     }
//     ctx.body = data
// })


module.exports = router