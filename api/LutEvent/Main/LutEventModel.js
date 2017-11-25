'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ttl = require('mongoose-ttl');

var lutEventSchema = new Schema({
    userId:{
        type: String,
        required:true
    },
    created_at:{
        type:Date,
        default: Date.now
    },
    updated_at:{
        type:Date,
        default: Date.now
    },
    latitude:{
        type:Number,
        required:true
    },
    longitude: {
        type: Number,
        required: true
    },
    water_level:{
        type:Number,
        min:0,
        max:4,
        required:true
    },
    radius:{
        type: Number,
        default: 0
    },
    reasons:[{
        type:Number,
        required:true
    }],
    estimated_duration:{ ///Seconds
        type: Number,
        default: 600
    },
    media_link:[{
        type:String
    }],
    note: {
        type: String
    },
    Point:{
        type:Schema.ObjectId,
        ref:'LutEventPoint'
    },
    isUpvoted:{
        type:Boolean
    },
    isDownvoted:{
        type:Boolean
    }
});
 lutEventSchema.plugin(ttl);
var EventModel = mongoose.model('LutEvent',lutEventSchema);
module.exports = EventModel;