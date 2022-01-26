const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()
const render = require('koa-art-template')
const path = require('path')
const cors = require('koa2-cors')
const logger = require('koa-logger')
const static = require('koa-static')
const session = require('koa-session')
const session_sign_key = ['mywechat']
const sessionConfig = require('./module/config/session_config')
const cookieConfig = require('./module/config/cookie_config')
const server = require('http').createServer(app.callback())
const svgCaptcha = require('svg-captcha')
const { nanoid } = require('nanoid')
const io = require('socket.io')(server, { cors: true })

app.use(cors({
    origin: "http://localhost:3000",
    maxAge: 5, //指定本次预检请求的有效期，单位为秒。
    credentials: true, //是否允许发送Cookie
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], //设置所允许的HTTP请求方法'
    allowHeaders: ['sessionId', 'Content-Type', 'Authorization', 'Accept'], //设置服务器支持的所有头信息字段
    exposeHeaders: ['SESSIONID','WWW-Authenticate', 'Server-Authorization'] //设置获取其他自定义字段
}))
app.use(logger())
app.keys = session_sign_key
app.use(session(sessionConfig, app))

router.get("/code", async (ctx) => {
  var captcha = svgCaptcha.create({
    //这种生成的是随机数验证码
    size: 4, //验证码长度
    fontSize: 50, //字体大小
    width: 100,
    height: 40,
    background: "#ededed",
  })
  const SESSIONID = nanoid(15)
  ctx.session[String(SESSIONID)] = captcha.text.toLowerCase()
//   ctx.session.code = captcha.text.toLowerCase()
//   ctx.cookies.set("sessionId",String(SESSIONID), {
//       maxAge: 1000 * 60 * 60 * 24,
//       path: "/sign",
//       domain: "localhost",
//       httpOnly: false
//   })
  ctx.append('SESSIONID', `${SESSIONID}`)
  ctx.set("Content-Type", "image/svg+xml")
  ctx.body = captcha.data
//   ctx.body = ctx.session
})

io.of('/home').on('connection', socket => {
  socket.on("online", data => {
    socket.id = data
    socket.join(data)
    socket.emit('open',"连接了"+data)
  })

  socket.on('disconnect', () => {
    console.log('disconnect')
  })
})

io.of('/home/chat').on('connection', socket => {
//   socket.emit('open',"连接了")
  socket.on("online", data => {
    socket.join(data)
    socket.emit('open',"连接了"+data)
  })
  socket.on("send-message", (sender, recipient, text) => {
    // recipients.forEach(recipient => {
    //   const newRecipients = recipients.filter(r => r !== recipient)
    //   newRecipients.push(id)
    //   socket.to(recipient).emit('recive-message', text)
    socket.to(recipient+"").emit('receive-message', {
        recipient,
        sender,
        text
    }) 
  })
  
  socket.on("change-addressbook-to-read", userId => {
    socket.join(userId)
    socket.to(userId).emit("cancel-addressbook-unread-badge")
  })
  
  socket.on('send-add', data => {
    socket.join(data.userId)
    // data.fn(data.otherId)
    socket.to(data.otherId).emit('receive-add', data)
  })

  socket.on('disconnect', () => {
    console.log('disconnect')
  })
})

io.of('/moment').on('connection', socket => {
    socket.on("online", () => {
        socket.join("room-of-moment")
    //   socket.emit('open',"连接了"+data)
        socket.on('do-like-moment', momentId => {
          socket.broadcast.to("room-of-moment").emit('renew-thumbup-area', momentId)
        })
        socket.on('do-comment-moment', momentId => {
          socket.broadcast.to("room-of-moment").emit('renew-comment-area', momentId)
        })
        socket.on('do-del-comment', momentId => {
          socket.broadcast.to("room-of-moment").emit('renew-comment-area', momentId)
        })
    })
})

process.env.TZ = 'Asia/Shanghai';

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// 模板引擎
render(app, {
  root: path.join(__dirname, 'views'),
  extname: '.html', // 后缀名，默认是.art
  debug: process.env.NODE_ENV !== 'production' // 是否开启调试
})

app.use(static('static')) // 静态资源目录
app.use(static('public')) // 静态资源目录

const user = require('./routes/user')
const moment = require('./routes/moment')
const comment = require('./routes/comment')
const reply = require('./routes/reply')
const search = require('./routes/search')
const chat = require('./routes/chat')
const group = require('./routes/group')

router.use('/user',user.routes())
router.use('/moment',moment.routes())
router.use('/comment',comment.routes())
router.use('/reply',reply.routes())
router.use('/search',search.routes())
router.use('/chat',chat.routes())
router.use('/group',group.routes())

app
    .use(router.routes())
    .use(router.allowedMethods())

server.listen(6050)