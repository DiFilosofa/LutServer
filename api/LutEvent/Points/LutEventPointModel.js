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
    Voted:[{
        type:Schema.ObjectId,
        ref: 'EventFeedback'
    }]
});
var EventPoint = mongoose.model('LutEventPoint', eventPointsSchema);
module.exports = EventPoint;