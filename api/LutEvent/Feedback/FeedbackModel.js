'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ttl = require('mongoose-ttl');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

var feedbackSchema = new Schema({
    userId: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    score: {
        type: Number,
        min: 0.2,
        max: 1.0
    }
});
feedbackSchema.plugin(deepPopulate);
var EventModel = mongoose.model('EventFeedback', feedbackSchema);
module.exports = EventModel;