const router = require('koa-router')()
const bodyParser = require('koa-bodyparser')
const query = require('../module/query')
const getTime = require('../module/getCompleteTime')
// const io = require('../app.js')

router.use(bodyParser())

// 发消息
router.post('/postMsg', async ctx => {
    const { userId, receiverId, msg, type } = ctx.request.body
    const completeTime = getTime()
    await query("INSERT INTO messages (sender_id,receiver_id,msg,type,time) VALUES ('"+ userId +"','"+ receiverId +"','"+ msg +"','"+ type +"','"+ completeTime +"')")
    const data = {
        status: 200
    }
    
    ctx.body = data
})

// 获取消息
router.get('/getMsgs', async ctx => {
    const { senderId, receiverId, page } = ctx.query
    const doc = await query("SELECT * FROM messages WHERE (sender_id='"+ senderId +"' AND receiver_id='"+ receiverId +"') OR (sender_id='"+ receiverId +"' AND receiver_id='"+ senderId +"') ORDER BY time DESC LIMIT " + (page-1)*15 + ",15")
    ctx.body = doc
})

// 获取与朋友的最后一条聊天记录
router.get('/getLastMsg', async ctx => {
    const { userId } = ctx.query
    const sql = `CALL get_last_msg(${userId})`
    const doc = await query(sql)
    ctx.body = doc[0]
})

module.exports = router