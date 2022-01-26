const router = require("koa-router")()
const svgCaptcha = require('svg-captcha')

router.get("/", async (ctx) => {
  var captcha = svgCaptcha.create({
    //这种生成的是随机数验证码
    size: 4, //验证码长度
    fontSize: 50, //字体大小
    width: 100,
    height: 40,
    background: "#ededed",
  })
  ctx.session.code = captcha.text.toLowerCase()
  ctx.set("Content-Type", "image/svg+xml")
  ctx.body = captcha.data
})

module.exports = router
