'use strict';
var mongoose = require('mongoose'),
    UserPoint = mongoose.model('PointByMonth'),
    User = mongoose.model('User')
;

exports.updatePoint = function(userId,pointUpdate){
    ///Find by userID
    //Check if point for that month exist,
    //If exist -> add / subtract
    //else create new schema and add/subtract
    User.findOne(
        {_id:userId},
        function (err,user) {
            if(err) {
                console.log(err);
                return false;
            }
            UserPoint.findOneAndUpdate(
                {
                    userId:user._id,
                    month:(new Date()).getMonth(),
                    year:(new Date()).getFullYear()
                },
                {$inc:{point:pointUpdate}},
                {new:true},
                function (err,userPoint) {
                    if(err) {
                        console.log(err);
                        return false;
                    }
                    if(userPoint === null|| userPoint.length == 0){
                        createUserPoint(user._id,pointUpdate);
                    }
                    return updateUserSumPoint(user,pointUpdate);
                }
            )
        }
    )
};

function updateUserSumPoint(user,point) {
    user.update(
        {$inc:{point_sum:point}},
        function (err) {
            if(err){
                console.log(err);
                return false;
            }
            return true;
        }
    );
}

function createUserPoint(userId,point){
    var newUserPoint = new UserPoint({
        userId:userId,
        month:(new Date()).getMonth(),
        year:(new Date()).getFullYear(),
        point:point
    });
    newUserPoint.save(function (err,result) {
        if(err) {
            console.log(err);
            return false;
        }
        console.log(result);
        return true;
    });
}