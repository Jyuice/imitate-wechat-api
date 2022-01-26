// 封装mysql的query函数

const mysql = require('mysql')
const mysqlConfig = require('./config/mysql_config')

const pool = mysql.createPool(mysqlConfig)

const query = sql => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if(err) reject(err)
            else {
                connection.query(sql,(err, doc) => {
                    if(err) reject(err)
                    else resolve(doc)
                    pool.releaseConnection(connection)
                })
            }
        })
    })
}

module.exports = query