'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    confirmPassword: {
        type: String,
        required: true
    },
    nickname:{
        type:String,
        default:""
    },
    address:{
        type: String,
        default:""
    },
    phone:{
        type: String,
        default:""
    },
    level:{
        type: Number,
        default:0,
        min:-2,
        max:5
    },
    created_at:{
        type:Date,
        default: Date.now
    },
    point_sum:{
        type:Number,
        default: 0
    },
    UserPoints:[{
        type:Schema.ObjectId,
        ref:'PointByMonth'
    }],
    queryTimePoints:{
        type:Number,
        default:0
    }

});
var UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;