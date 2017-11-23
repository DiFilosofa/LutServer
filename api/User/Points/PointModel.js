'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pointSchema = new Schema({
    userId:{
        type:Schema.ObjectId,
        ref:'UserModel'
    },
    month:{
        type:Number,
        required:true
    },
    year:{
        type:Number,
        required:true
    },
    point:{
        type:Number,
        default:0
    }
});

var PointModel = mongoose.model('PointByMonth', pointSchema);

module.exports = PointModel;