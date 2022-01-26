const router = require('koa-router')()
const bodyParser = require('koa-bodyparser')
const { nanoid } = require('nanoid')
const query = require('../module/query')
const multer = require('@koa/multer');
const sd = require('silly-datetime')
const mkdir = require('mkdirp')
const fs = require('fs');
const path = require('path');
const encryption = require('../module/encryption')
const crypto = require('crypto')
const session = require('koa-session')

//配置
const storage = multer.diskStorage({
    //文件保存路径
    destination: async (req, file, cb) =>   {
        let day = sd.format(new Date(), "YYYYMMDD");
        let dir = path.join("static/avatar/upload", day);
        await mkdir(dir);
        cb(null, dir);
    },
    //修改文件名称
    filename: function (req, file, cb) {
        const fileFormat = (file.originalname).split(".");
        cb(null,Date.now() + "." + fileFormat[fileFormat.length - 1]);
    }
})

//加载配置
const upload = multer({ storage: storage })

router.use(bodyParser())

// 注册
router.post('/signUp',async ctx => {
    const { account, password, checkcode } = ctx.request.body
    const { sessionid } = ctx.request.header

    const sameAccount = await query("SELECT account FROM users WHERE account = '"+ encryption(account) +"'")
    const code = ctx.session[sessionid]
    let data = {
        status: 400,
        message: "注册成功",
        code: code
    }
    const se = ctx.session
    if(sameAccount.length) {
        data.message = "该账号已存在"
    }else if(account.length !== 11) {
        data.message = "账号不合法"
    }else if(password.length < 6) {
        data.message = "密码不合法"
    }else if(checkcode != code) {
        data.message = "验证码错误"
    }else {
        data.status = 200
        const wxId = "wx_" + nanoid(10)
        // const cipher_account = encryption(account)
        // const cipher_password = encryption(password)
        const cipher_account = crypto
        .createHash('md5')
        .update(account)
        .digest('hex')
        const cipher_password = crypto
        .createHash('md5')
        .update(password)
        .digest('hex')
        await query("INSERT INTO users (account,password,login_state,nickname,avatar,wechat_id, moment_bg) VALUE ('"+ cipher_account +"','"+ cipher_password +"',0,'"+ wxId +"','/avatar/default.jpg','"+ wxId +"','/background/default.jpg')")
    }
    ctx.body = data
})

// 登录
router.post('/login',async ctx => {
    const { account, password } = ctx.request.body
    let data = {
        status: 200,
        userId: "",
        message: "登录成功"
    }
    // const cipher_account = encryption(account)
    // const cipher_password = encryption(password)
    const cipher_account = crypto
    .createHash('md5')
    .update(account)
    .digest('hex')
    const cipher_password = crypto
    .createHash('md5')
    .update(password)
    .digest('hex')
    const doc = await query("SELECT user_id FROM users WHERE account='"+ cipher_account +"' AND password='"+ cipher_password +"'")
    if(!doc.length) {
        data.status = 400,
        data.message = "登录失败"
    }else{
        const userId = doc[0].user_id
        data.userId = userId
        await query("UPDATE users SET login_state=1 WHERE account='"+ cipher_account +"'")
    }
    ctx.body = data
})

// 退出登录
router.post("/logout",async ctx => {
    const { userId } = ctx.request.body
    let data = {
        status: 200,
        message: "退出登录成功"
    }
    await query("UPDATE users SET login_state=0 WHERE user_id='"+ userId +"'")
    ctx.body = data
})

// 判断登录状态
router.get("/isLogin",async ctx => {
    const { userId } = ctx.query
    const doc = await query("SELECT login_state FROM users WHERE user_id='"+ userId +"'")
    const { login_state } = doc[0]
    let data = {
        message: login_state == 1 ? '已登录' : "未登录"
    }
    ctx.body = data
})

// 获取用户信息
router.get("/getUserInfo",async ctx => {
    const { userId } = ctx.query
    const doc = await query("SELECT nickname,avatar,wechat_Id,moment_bg FROM users WHERE user_id='"+ userId +"'")
    const { nickname, avatar, wechat_Id, moment_bg } = doc[0]
    let data = {
        nickname: nickname,
        avatar: avatar,
        wechat_Id: wechat_Id,
        moment_bg: moment_bg
    }
    ctx.body = data
})

// 修改用户信息
router.post('/changeUserInfo',async ctx => {
    const { userId, nickname="", wechatId="" } = ctx.request.body
    if(nickname !== '') {
        // 此处用触发器，使responses表的commentor改名
        await query("UPDATE users SET nickname='"+ nickname +"' WHERE user_id='"+ userId +"'")
        // await query("UPDATE responses SET commentor='"+ nickname +"' WHERE commentor_id='"+ userId +"' AND type=1")
    }
    if(wechatId !== '') await query("UPDATE users SET wechat_Id='"+ wechatId +"' WHERE user_id='"+ userId +"'")
    const data = {
        message: "修改成功"
    }
    ctx.body = data
})

// 修改用户头像
router.post('/changeUserAvatar', upload.single('avatar'), async ctx => {
    const { userId } = ctx.request.body
    let dir = sd.format(new Date(), "YYYYMMDD"); // 目录
    const filename = ctx.request.file.filename; //返回文件名
    const data = {
        message: "上传成功",
        url: ""
    }
    let extname = path.extname(filename); //获取文件后缀名
    let extnameList = {
        ".jpg": "",
        ".png": "",
        ".jpeg": "",
        ".jfif": ""
    }
    if (!(extname in extnameList)) {
        // 删掉上传的文件
        fs.unlink("./static/avatar/upload/" + dir + filename, (err) => {
            if (err) throw err;
        })
        data.message = "图片格式非法"
    }else{
        const doc = await query("SELECT avatar FROM users WHERE user_id='"+ userId +"'")
        const { avatar } = doc[0]
        console.log(avatar)
        if(avatar !== "/avatar/default.jpg") {
            // 假如已经不是默认头像，那么就删掉旧头像，如果是默认头像，就不要删掉
            fs.unlink("./static" + avatar, err => {
                if (err) throw err;
            })
        }
        const completePath = "/avatar/upload/"+ dir + "/" + filename
        data.url = completePath
        await query("UPDATE `users` SET avatar='" + completePath + "' WHERE user_id = '" + userId + "'")
        
    }
    ctx.body = data
})

// 获取用户好友列表
router.get('/getUserFriends', async ctx => {
    const { userId } = ctx.query
    const doc = await query("SELECT DISTINCT users.user_id AS id,users.nickname AS name,users.avatar FROM users LEFT JOIN relation ON users.user_id=relation.user_id OR users.user_id=relation.friend_id WHERE relation.friend_id='"+ userId +"' OR relation.user_id='"+ userId +"' ORDER BY users.nickname")
    const data = {
        friendsList: doc
    }
    ctx.body = data
})

// 找好友
router.get('/searchFriend',async ctx => {
    const { userId, friendAccount } = ctx.query
    const cipher_friendAccount = crypto
    .createHash('md5')
    .update(friendAccount)
    .digest('hex')
    const doc = await query("SELECT user_id FROM users WHERE account='"+ cipher_friendAccount +"'")
    ctx.body = doc
})

// 申请加好友
router.post('/sendApplication',async ctx => {
    const { userId, otherId } = ctx.request.body
    // await query("INSERT INTO applies(sender_id,receiver_id,state) VALUES('"+ userId +"','"+ otherId +"',0) WHERE NOT EXIST (SELECT * FROM applies WHERE sender_id='"+ userId +"' AND receiver_id='"+ otherId +"' AND state!=2")
    await query(
        `INSERT INTO applies(sender_id,receiver_id,state) 
        SELECT ${userId}, ${otherId}, 0 
        FROM dual 
        WHERE NOT EXISTS(
            SELECT * 
            FROM applies
            WHERE sender_id=${userId}
            AND receiver_id=${otherId}
            AND state!=2
        )`)
    const data = {
        status: 200
    }
    ctx.body = data
})

// 同意加好友
router.post('/addFriend',async ctx => {
    const { userId, friendId } = ctx.request.body
    //await query("INSERT INTO relation(user_id,friend_id) VALUES('"+ userId +"','"+ friendId +"')")
    await query("UPDATE applies SET state=1 WHERE sender_id='"+ friendId +"' AND receiver_id='"+ userId +"'")
    
    const data = {
        status: 200
    }
    ctx.body = data
})

// 好友申请列表
router.get('/getApplication',async ctx => {
    const { userId } = ctx.query
    const doc = await query("SELECT users.user_id,users.nickname,users.avatar,applies.state FROM users LEFT JOIN applies ON applies.sender_id=users.user_id  WHERE applies.receiver_id='"+ userId +"'")
    ctx.body = doc
})


// 删好友
router.post('/deleteFriend',async ctx => {
    const { userId, friendId } = ctx.request.body
    await query("DELETE FROM relation WHERE (user_id='"+ userId +"' AND friend_id='"+ friendId +"') OR (user_id='"+ friendId +"' AND friend_id='"+ userId +"')")
    const data = {
        status: 200
    }
    ctx.body = data
})

// 获取用户的朋友圈
router.get('/getUserMoments', async ctx => {
    const { userId } = ctx.query
    const bg = await query("SELECT moment_bg FROM users WHERE user_id='"+ userId +"'")
    const { moment_bg } = bg[0]
    const doc = await query("SELECT moment_id,content,images,type,like_num,comment_num,time FROM moments WHERE author_id='"+ userId +"' ORDER BY time DESC")
    const data = {
        background: moment_bg,
        lists: doc
    }
    ctx.body = data
})

//判断是否是好友
router.get("/isFriend", async ctx => {
    const { userId, otherId } = ctx.query
    const doc = await query("SELECT * FROM relation WHERE (user_id='"+ userId +"' AND friend_id='"+ otherId +"') OR (user_id='"+ otherId +"' AND friend_id='"+ userId +"')")
    if(doc.length) {
        ctx.body=true
    }else ctx.body=false
})

module.exports = router