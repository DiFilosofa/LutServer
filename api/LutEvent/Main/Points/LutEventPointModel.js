'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var eventPointsSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    event_id:{
        type:Schema.ObjectId,
        ref:'LutEvent'
    },
    points:{
        type:Number,
        default:0.01
    },
    scoreSum:{
        type:Number,
        default: 0
    },
    VotedUsers:[{
        type:Schema.ObjectId
    }]
});
var EventPoint = mongoose.model('LutEventPoint', eventPointsSchema);
module.exports = EventPoint;