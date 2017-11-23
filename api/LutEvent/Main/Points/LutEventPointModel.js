'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var trafficPointsSchema = new Schema({
    event_id:{
        type:Schema.ObjectId,
        ref:'LutEvent'
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    upvotes:{
        type:Number,
        default:0
    },
    downvotes:{
        type:Number,
        default:0
    },
    UpvoteUsers:[{
        type:Schema.ObjectId
    }],
    DownvoteUsers:[{
        type:Schema.ObjectId
    }]
});
var EventPoint = mongoose.model('LutEventPoint', trafficPointsSchema);
module.exports = EventPoint;