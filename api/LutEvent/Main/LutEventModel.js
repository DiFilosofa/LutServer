'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ttl = require('mongoose-ttl');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

var lutEventSchema = new Schema({
    userId: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    name: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    validity: {
        type: Number,
        default: 0
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    water_level: {
        type: Number,
        required: true
    },
    radius: {
        type: Number,
        default: 0
    },
    reasons: {
        type: Number,
        required: true
    },
    estimated_next_level: { ///Seconds
        type: Number,
        default: 600
    },
    note: {
        type: String
    },
    district: {
        type: Number,
        min: 0,
        max: 24,
        default: 0
    },
    Point: {
        type: Schema.ObjectId,
        ref: 'LutEventPoint'
    },
    isUpvoted: {
        type: Boolean
    },
    votedScore:{
        type:Number,
        default: null
    },
    mediaDatas: [{
        type: String
    }]
});
// lutEventSchema.plugin(ttl);
lutEventSchema.plugin(deepPopulate);
var EventModel = mongoose.model('LutEvent', lutEventSchema);
module.exports = EventModel;