'use strict';
var mongoose = require('mongoose'),
    EventPoint = mongoose.model('LutEventPoint');

exports.createEventPoint = function (res,eventId) {
    var newEventPoint = new EventPoint(eventId);
    newEventPoint.save(function (err,eventPoint) {
        if(err){
            console.log(err);
            return false;
        }
        return true;
    })
};
