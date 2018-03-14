// config/database.js
module.exports = {
    'url' : 'mongodb://lut_admin:mrtiken@ds117956.mlab.com:17956/lut_database',
    'secret':'minionAndGru'
};

exports.intervalTime = 300000; //300000ms = 5min
exports.reputationWeight = 0.8;
exports.eventPointWeight = 0.2;
