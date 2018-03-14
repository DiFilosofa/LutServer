'use strict';
var mongoose = require('mongoose'),
    UserPoint = mongoose.model('PointByMonth'),
    User = mongoose.model('User'),
    lutConst = require('../../../Config/LutConstants')
;

exports.updateUserReputation = function (userId, pointUpdate) {
    User.findOne(
        {_id: userId},
        function (err, user) {
            if (err) {
                console.log(err);
                return false;
            }
            var oldReputation = user.reputation;
            user.update(
                {reputation: lutConst.reputationWeight * oldReputation + lutConst.eventPointWeight * pointUpdate},
                {new: true},
                function (err, updatedUser) {
                    if (err) {
                        console.log(err);
                        return false;
                    }
                    return true;
                }
            );
        }
    )
};
// exports.updatePoint = function (userId, pointUpdate) {
//     ///Find by userID
//     //Check if reputation for that month exist,
//     //If exist -> add / subtract
//     //else create new schema and add/subtract
//     User.findOne(
//         {_id: userId},
//         function (err, user) {
//             if (err) {
//                 console.log(err);
//                 return false;
//             }
//             UserPoint.findOneAndUpdate(
//                 {
//                     userId: user._id,
//                     month: (new Date()).getMonth(),
//                     year: (new Date()).getFullYear()
//                 },
//                 {$inc: {reputation: pointUpdate}},
//                 {new: true},
//                 function (err, userPoint) {
//                     if (err) {
//                         console.log(err);
//                         return false;
//                     }
//                     if (userPoint === null || userPoint.length == 0) {
//                         createUserPoint(user._id, pointUpdate);
//                     }
//                     return updateUserSumPoint(user, pointUpdate);
//                 }
//             )
//         }
//     )
// };
//
// function updateUserSumPoint(user, point) {
//     var oldReputation = user.reputation;
//     user.update(
//         {reputation: lutConst.reputationWeight * oldReputation + lutConst.eventPointWeight * point},
//         function (err) {
//             if (err) {
//                 console.log(err);
//                 return false;
//             }
//             return true;
//         }
//     );
// }

// function createUserPoint(userId, point) {
//     var newUserPoint = new UserPoint({
//         userId: userId,
//         month: (new Date()).getMonth(),
//         year: (new Date()).getFullYear(),
//         reputation: point
//     });
//     newUserPoint.save(function (err, result) {
//         if (err) {
//             console.log(err);
//             return false;
//         }
//         console.log(result);
//         return true;
//     });
// }