var codeConstant = require('../Data/Code.js');
exports.result = function (res, code, message, body) {
    var isSuccess = code == codeConstant.success;
    if(!body){
        return res.json({
            success:isSuccess,
            code : code,
            message : message
        })
    }
    return res.json({
        success:isSuccess,
        code : code,
        message : message,
        data: body
    })
};