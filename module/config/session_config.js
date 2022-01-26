const sessionConfig = {
  key: "koa:sess",
  maxAge: 1000 * 60 * 60 * 24,
  overwrite: true,
  httpOnly: false,
  signed: true,
  rolling: false,
  renew: true,
  cookie: {
      sameSite: 'none',
      secure: true
  }
}

module.exports = sessionConfig
