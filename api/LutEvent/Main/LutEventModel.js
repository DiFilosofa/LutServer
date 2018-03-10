'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ttl = require('mongoose-ttl');

var lutEventSchema = new Schema({
    userId: {
        type: String,
        required: true
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
    estimated_duration: { ///Seconds
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
    mediaDatas: [{
        type: String
    }]
});
lutEventSchema.plugin(ttl);
var EventModel = mongoose.model('LutEvent', lutEventSchema);
module.exports = EventModel;