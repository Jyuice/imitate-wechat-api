const router = require("koa-router")()
const query = require('../module/query')

router.get('/', async ctx => {
  const { userId,keyword } = ctx.query
  const doc = await query(`SELECT users.user_id AS id,users.nickname AS name,users.avatar,users.wechat_id,users.moment_bg FROM users LEFT JOIN relation ON users.user_id=relation.user_id OR users.user_id=relation.friend_id WHERE users.nickname LIKE '%${keyword}%' AND ((relation.friend_id=${userId} AND relation.user_id=users.user_id) OR (relation.user_id=${userId} AND relation.friend_id=users.user_id))`)
  ctx.body = doc
})

module.exports = router
