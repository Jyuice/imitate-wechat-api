function encryption(clear) {
    clear = String(clear)
    const reg = /\+86/
    if(reg.test(clear)) clear = clear.slice(3) // 如果是+86开头则要去掉
    const reg_num = /[0-9]/g
    const reg_letter = /[A-Za-z]/g
    const reg_symbol = /((?=[\x21-\x7e]+)[^A-Za-z0-9])/g
    const num = transform(clear.match(reg_num).join(""))
    const letter = clear.match(reg_letter) ? clear.match(reg_letter).join("") : ""
    const symbol = clear.match(reg_symbol) ? clear.match(reg_symbol).join("") : ""
    return num + letter + symbol
}

function transform(num) {
    return Math.abs(Math.ceil(num*2.5) - 1215)
}

module.exports = encryption