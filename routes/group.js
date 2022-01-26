const router = require('koa-router')()
const bodyParser = require('koa-bodyparser')
const query = require('../module/query')
const getTime = require('../module/getCompleteTime')
const { nanoid } = require('nanoid')

router.use(bodyParser())

// 建群
router.post('/setup', async ctx => {
    const { userId, name, member} = ctx.request.body
    const groupId = nanoid(11)
    await query("INSERT INTO groups (group_id, name, manager_id) VALUES ('"+ groupId +"','"+ name +"', '"+ userId +"')")
    for(let i = 0; i < member.length;i++) {
        await query("INSERT INTO user_groups(user_id, group_id) VALUES ('"+ member[i] +"','"+ groupId +"') ")
    }
    const data = {
        status: 200
    }
    ctx.body = data
})

// 查找本人所在的群
router.get('/getGroup', async ctx => {
    const { userId } = ctx.query
    const doc = await query("SELECT user_groups.group_id AS id, groups.name, groups.manager_id FROM user_groups, groups WHERE user_groups.user_id='"+ userId +"' AND groups.group_id=user_groups.group_id")
    const data = {
        status: 200,
        groups: doc
    }
    ctx.body = data
})

// 查找群消息
router.get('/getGroupMsgs', async ctx => {
    const { groupId, page } = ctx.query
    const completeTime = getTime()
    const doc = await query("SELECT group_messages.*, users.nickname,users.avatar AS userAvatar FROM group_messages, users WHERE group_id='"+ groupId +"' AND users.user_id=group_messages.sender_id ORDER BY time DESC LIMIT " + (page-1)*15 + ",15")
    ctx.body = doc
})

// 发群消息
router.post('/postGroupMsg', async ctx => {
    const { userId, groupId, msg, type } = ctx.request.body
    const completeTime = getTime()
    await query("INSERT INTO group_messages (group_id,sender_id,msg,type,time) VALUES ('"+ groupId +"','"+ userId +"','"+ msg +"','"+ type +"','"+ completeTime +"')")
    const data = {
        status: 200
    }
    
    ctx.body = data
})

// 修改群名
router.post("/editGroupName", async ctx => {
    const { groupId, name } = ctx.request.body
    await query("UPDATE groups SET name='"+ name +"' WHERE group_id='"+groupId+"'")
    const data = {
        status: 200
    }
    
    ctx.body = data
})

// 退群
router.post("/leaveGroup", async ctx => {
    const { userId, groupId } = ctx.request.body
    // await query(`DELETE FROM user_groups WHERE user_id=${userId} AND group_id=${groupId}`)
    await query("CALL leaveGroup('"+userId+"', '"+ groupId +"')")
    const data = {
        status: 200
    }
    
    ctx.body = data
})


// 获取群的最后一条聊天记录
router.get('/getLastGroupMsg', async ctx => {
    const { userId } = ctx.query
    const sql = `CALL get_last_group_msg(${userId})`
    const doc = await query(sql)
    ctx.body = doc[0]
})


module.exports = router