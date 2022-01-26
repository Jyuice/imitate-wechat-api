const router = require('koa-router')()
const bodyParser = require('koa-bodyparser')
const query = require('../module/query')
const multer = require('@koa/multer');
const sd = require('silly-datetime')
const mkdir = require('mkdirp')
const fs = require('fs');
const path = require('path');
var images = require("images");
const getTime = require('../module/getCompleteTime')

//配置修改pyq背景的multer
const storage = multer.diskStorage({
    //文件保存路径
    destination: async function (req, file, cb) {
        let day = sd.format(new Date(), "YYYYMMDD");
        let dir = path.join("static/background/upload", day);
        await mkdir(dir);
        cb(null, dir);
    },
    //修改文件名称
    filename: function (req, file, cb) {
        const fileFormat = (file.originalname).split(".");
        cb(null,Date.now() + "." + fileFormat[fileFormat.length - 1]);
    }
})

//配置上传图片发朋友圈的multer
const storage_ = multer.diskStorage({
    //文件保存路径
    destination: async function (req, file, cb) {
        let day = sd.format(new Date(), "YYYYMMDD");
        let dir = path.join("public/upload", day);
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
const upload_ = multer({ storage: storage_ })

router.use(bodyParser())

router.get('/',async ctx => {
    ctx.body = "朋友圈"
})

// 获取自己与好友的朋友圈
router.get('/getMoments',async ctx => {
    const { userId } = ctx.query
    const sql = 
    // "SELECT DISTINCT users.nickname,users.avatar,moments.author_id,moments.moment_id,moments.content,moments.images,moments.type,moments.time FROM moments LEFT JOIN users ON moments.author_id=users.user_id LEFT JOIN relation ON users.user_id=relation.user_id OR users.user_id=relation.friend_id WHERE relation.friend_id='"+ userId +"' OR relation.user_id='"+ userId +"' ORDER BY moments.time DESC"
    `CALL get_moments(${userId})`
    let doc = await query(sql)
    ctx.body = doc[0]
})

// 发朋友圈的图片
// const list = [{name: "image", maxCount: 9}]
router.post('/postImages', upload_.array("image",9), async ctx => {
    const files = ctx.request.files; //返回文件[{}]
    const arr = []
    files.map(i => {
        arr.push(i.path.replace(/\\/g, "/").slice('public'.length))
    })
    const filesStr = arr.join(";")

    const data = {
        message: "上传成功",
        files: filesStr
    }

    ctx.body = data
})

// 获取给朋友圈点赞的人
router.get('/getMomentLikers', async ctx => {
    const { userId, momentId } = ctx.query
    const doc = await query("SELECT DISTINCT users.user_id,users.nickname,users.avatar FROM users LEFT JOIN like_moments ON users.user_id=like_moments.user_id LEFT JOIN relation ON users.user_id=relation.user_id OR users.user_id=relation.friend_id WHERE like_moments.moment_id='"+ momentId +"' AND (relation.friend_id='"+ userId +"' OR relation.user_id='"+ userId +"') ORDER BY like_moments.time")
    ctx.body = doc
})

// 发朋友圈
router.post('/postMoment',async ctx => {
    const { userId, type, content="", images="" } = ctx.request.body
    const completeTime = getTime()
    // console.log(completeTime)
    await query("INSERT INTO moments (author_id,content,images,type,like_num,comment_num,time) VALUES ('"+ userId +"','"+ content +"','"+ images +"','"+ type +"',0,0,'"+ completeTime +"')")
    const data = {
        "message": "发送成功"
    }
    ctx.body = data
})

// 删除朋友圈
router.post('/deleteMoment', async ctx => {
    const { userId, momentId } = ctx.request.body
    await query("DELETE moments,comments FROM moments LEFT JOIN comments ON moments.moment_id=comments.u_id WHERE moments.author_id='"+ userId +"' AND moments.moment_id='"+ momentId +"'")
    const data = {
        status: 200
    }
    ctx.body = data
})

// 点赞、取消点赞朋友圈
router.post('/likeMoment',async ctx => {
    const { userId, momentId, flag } = ctx.request.body
    const isLike = String(flag) === "true"
    const data = {
        message : ""
    }
    if(isLike) {
        await query("INSERT INTO like_moments(user_id,moment_id) SELECT '"+ userId +"','"+ momentId +"' FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM like_moments WHERE user_id='"+ userId +"' AND moment_id='"+ momentId +"')")
        data.message = "点赞成功"
    }else{
        await query("DELETE FROM like_moments WHERE user_id='"+ userId +"' AND moment_id='"+ momentId +"'")
        data.message = "取消点赞成功"
    }
    ctx.body = data
})

// 修改朋友圈背景
router.post('/changeMomentBg', upload.single('background'), async ctx => {
    const { userId } = ctx.request.body
    let dir = sd.format(new Date(), "YYYYMMDD"); // 目录
    const filename = ctx.request.file.filename; //返回文件名
    const data = {
        message: "上传成功"
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
        fs.unlink("./static/background/upload/" + dir + filename, (err) => {
            if (err) throw err;
        })
        data.message = "图片格式非法"
    }else{
        const doc = await query("SELECT moment_bg FROM users WHERE user_id='"+ userId +"'")
        const { moment_bg } = doc[0]
        console.log(moment_bg)
        if(moment_bg !== "/background/default.jpg") {
            // 假如已经不是默认背景，那么就删掉旧背景，如果是默认背景，就不要删掉
            fs.unlink("./static" + moment_bg, err => {
                if (err) throw err;
            })
        }
        const completePath = "/background/upload/"+ dir + "/" + filename
        await query("UPDATE `users` SET moment_bg='" + completePath + "' WHERE user_id = '" + userId + "'")
        
    }
    ctx.body = data
})

module.exports = router