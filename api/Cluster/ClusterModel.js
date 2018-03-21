'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);

var clusterSchema = new Schema({
    _id: false,
    id: {
        type: Number
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    level_now: {
        type: Number,
        default: 0
    },
    level_next: {
        type: Number,
        default: 0
    },
    Events: [{
        type: Schema.ObjectId,
        ref: 'LutEvent'
    }],
    highestReputation: {
        type: Number,
        default: 0.01
    }
});
clusterSchema.plugin(deepPopulate);
var ClusterModel = mongoose.model("ClusterModel", clusterSchema);
module.exports = ClusterModel;