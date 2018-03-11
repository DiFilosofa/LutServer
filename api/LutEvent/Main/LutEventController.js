"use strict";
var mongoose = require('mongoose'),
    code = require('../../../Data/Code.js'),
    msg = require('../../../Data/Message.js'),
    utils = require('../../../Utils/MainUtils.js'),
    aws_s3 = require('../../../Data/AWSConstants'),
    UserPointController = require('../../User/Points/PointController.js'),
    Event = mongoose.model('LutEvent'),
    User = mongoose.model('User'),
    EventPoint = mongoose.model('LutEventPoint'),
    UserPoint = mongoose.model('PointByMonth'),
    ttl = require('mongoose-ttl'),
    util = require("util"),
    formidable = require('formidable'),
    async = require('async'),
    fs = require('fs'),
    path = require('path')
;

var imageData, imageName;
const createItemObject = function (callback) {
    const params = {
        Bucket: aws_s3.bucketName,
        Key: imageName,
        ACL: 'public-read',
        Body: imageData
    };
    aws_s3.s3.putObject(params, function (err, data) {
        if (err) {
            console.log("Error uploading image: ", err);
            callback(err, null)
        } else {
            console.log("Successfully uploaded image on S3", data);
            callback(null, data)
        }
    })
};
exports.createEvent = function (req, res) {
    var body = req.body;
    if (!body.userId) {
        return utils.result(res, code.badRequest, msg.noUserId, null);
    }
    if (!body.latitude) {
        return utils.result(res, code.badRequest, msg.latitudeNotFound, null);
    }
    if (!body.longitude) {
        return utils.result(res, code.badRequest, msg.longitudeNotFound, null);
    }
    if (!body.water_level) {
        return utils.result(res, code.badRequest, msg.waterLevelNotFound, null);
    }
    if (!body.radius) {
        return utils.result(res, code.badRequest, msg.radiusNotFound, null);
    }
    if (body.radius <= 0) {
        return utils.result(res, code.badRequest, msg.invalidRadius, null);
    }
    if (!body.reasons) {
        return utils.result(res, code.badRequest, msg.reasonsEmptyOrNull, null);
    }
    if (body.estimated_duration && body.estimated_duration < 300) {
        return utils.result(res, code.badRequest, msg.invalidDuration, null);
    }
    var newEvent = Event(body);
    // if (body.estimated_duration) {
    //     newEvent.ttl = body.estimated_duration.toString() + 's';
    // }
    // else {
    //     newEvent.ttl = '30m';
    // }
    User.findOne({
        _id: body.userId
    }, function (err, userExist) {
        if (!userExist) {
            return utils.result(res, code.notFound, msg.userNotFound, null);
        }
        if (err) {
            console.log(err);
            return utils.result(res, code.serverError, msg.serverError, null);
        }
        newEvent.validity = userExist.reputation * 0.01; //init validity
        newEvent.save(function (err, event) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null);
            }
            var eventPoint = new EventPoint({
                event_id: event._id,
                userId: event.userId
            });
            eventPoint.save(function (err) {
                if (err) {
                    console.log(err);
                    return utils.result(res, code.serverError, msg.serverError, null);
                }
                Event.findOneAndUpdate(
                    {_id: event._id},
                    {Point: eventPoint._id},
                    {new: true},
                    function (err) {
                        if (err) {
                            console.log(err);
                            return utils.result(res, code.serverError, msg.serverError, null);
                        }
                        return utils.result(res, code.success, msg.success, event);
                    }
                );
            });
        });
    });
};

exports.getAllEvents = function (req, res) {
    var userId = req.params.userId;
    Event.find()
        .populate('Point')
        .exec(function (err, results) {
            if (err) {
                console.log('err');
                return utils.result(res, code.serverError, msg.serverError, null);
            }
            var numberOfEvents = results.length;
            var tempList = results.slice();
            if (parseInt(userId) !== -1) {
                for (var index = 0; index < numberOfEvents; index++) {
                    var temp = results[index].toJSON();
                    temp.isUpvoted = (results[index].Point.VotedUsers.indexOf(userId) > -1);
                    tempList[index] = temp;
                }
            }
            return utils.result(res, code.success, msg.success, tempList);
        })
};

exports.getEventById = function (req, res) {
    Event.find({
        _id: req.params.eventId
    })
        .populate('Point')
        .exec(function (err, result) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null);
            }
            if (!result || result.size === 0) {
                return utils.result(res, code.badRequest, msg.eventNotFound, null);
            }
            return utils.result(res, code.success, msg.success, result);
        })
};
exports.updateEventPhotos = function (req, res) {
    var eventId = req.params.eventId;
    if (!eventId) {
        return utils.result(res, code.badRequest, msg.noEventId, null);
    }
    Event.findOne(
        {
            _id: eventId
        }, function (err, event) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, err.message);
            }
            if (!event) {
                return utils.result(res, code.notFound, msg.eventNotFound, null);
            }
            var form = new formidable.IncomingForm();

            // form.maxFieldsSize = 2 * 1024 * 1024; //set max size

            var image;

            form.parse(req, function (err, fields, files) {

            });

            form.on('file', function (name, value) {
                console.log("onFile : " + util.inspect({name: name, value: value}))
            });

            form.on('error', function (err) {
                console.error("onError : " + err);
                return utils.result(res, code.serverError, msg.serverError, err.message);
            });

            form.on('end', function (fields, files) {
                image = this.openedFiles[0];
                //if no file or not supported type
                if (!path.extname(image.name) || aws_s3.supportedFileExtensions.indexOf(path.extname(image.name)) === -1) {
                    return utils.result(res, code.badRequest, msg.fileNotSupported, null);
                }
                /* Temporary location of our uploaded file */
                var tmp_path = image.path;
                /* The file name of the uploaded file */
                imageName = eventId + "_event_img_" + event.mediaDatas.length + path.extname(image.name);

                fs.readFile(tmp_path, function (err, data) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    imageData = data;
                    async.series([
                        createItemObject
                    ], function (err, result) {
                        if (err) {
                            console.log(err);
                            return utils.result(res, code.serverError, msg.serverError, err.message);
                        }
                    })
                });
                var url = aws_s3.dataUrlInitial + imageName;
                // var expiredTime = event.estimated_duration + 's';
                //
                // event.ttl = expiredTime;
                ///update media datas
                event.mediaDatas.push(url);
                event.save();

                return utils.result(res, code.success, msg.success, event);
            });
        });
};

exports.updateEventById = function (req, res) {
    var body = req.body;
    if (body.radius && body.radius <= 0) {
        return utils.result(res, code.badRequest, msg.invalidRadius, null);
    }
    Event.findByIdAndUpdate(req.params.eventId, body, {new: true}, function (err, event) {
        if (!event)
            return utils.result(res, code.notFound, msg.eventNotFound, null);
        if (err)
            return utils.result(res, code.serverError, msg.serverError, null);
        ///////Must handle update ttl
        return utils.result(res, code.success, msg.success, event);
    });
};

exports.deleteEvent = function (req, res) {
    Event.findOne({
        _id: req.params.eventId
    }, function (err, eventExist) {
        if (err) {
            return utils.result(res, code.serverError, msg.serverError, null);
        }
        if (eventExist) {
            Event.remove({
                _id: req.params.eventId
            }, function (err, deleted) {
                if (err) {
                    return utils.result(res, code.serverError, msg.serverError, null);
                }
                return utils.result(res, code.success, msg.success, null);
            });
        }
        else {
            return utils.result(res, code.notFound, msg.eventNotFound, null);
        }
    });
};
exports.vote = function (req, res) {
    var body = req.body;
    if (!body.userId) {
        return utils.result(res, code.badRequest, msg.noUserId, null);
    }
    if (!body.score) {
        return utils.result(res, code.badRequest, msg.noScore, null);
    }
    Event.findOne(
        {
            _id: req.params.eventId
        }
    ).populate('Point')
        .exec(
            function (err, event) {
                if (err) {
                    console.log(err);
                    return utils.result(res, code.serverError, msg.serverError, null);
                }
                if (!event) {
                    return utils.result(res, code.notFound, msg.eventNotFound, null);
                }
                if (event.userId === body.userId) {
                    return utils.result(res, code.badRequest, msg.sameUserVote, null);
                }
                User.findOne(
                    {
                        _id: body.userId
                    }, function (err, user) {
                        if (!user) {
                            console.log(err);
                            return utils.result(res, code.badRequest, msg.userNotFound, null);
                        }
                        if (err) {
                            console.log(err);
                            return utils.result(res, code.serverError, msg.serverError, null);
                        }
                        EventPoint.findOne(
                            {
                                _id: event.Point
                            },
                            function (err, eventPoint) {
                                //check if the user exist in vote list
                                var voted = eventPoint.VotedUsers.indexOf(body.userId) > -1;
                                if (!voted) {
                                    eventPoint.scoreSum = eventPoint.scoreSum + body.score; //update score sum
                                    eventPoint.VotedUsers.push(body.userId); //push user in upvote list
                                }
                                var numberOfVotes = eventPoint.VotedUsers.length;

                                if (numberOfVotes < 2) {
                                    eventPoint.save(function (err, newEventPoint) {
                                        // var userPointToUpdate = 1;
                                        if (err) {
                                            console.log(err);
                                            return utils.result(res, code.serverError, msg.serverError, null);
                                        }
                                        event.save(function (err, newEvent) {
                                            if (err) {
                                                console.log(err);
                                                return utils.result(res, code.serverError, msg.serverError, null);
                                            }
                                            // if (updateUserPoint(userPointToUpdate, newEventPoint.event_id) === false) {
                                            //     return utils.result(res, code.serverError, msg.serverError, null);
                                            // }
                                            return utils.result(res, code.success, msg.success, newEvent);
                                        });
                                    });
                                }
                                else {
                                    eventPoint.points = eventPoint.scoreSum / numberOfVotes;
                                    eventPoint.save();
                                    event.validity = user.reputation * eventPoint.points;
                                    event.save(function (err, newEvent) {
                                            if (err) {
                                                console.log(err);
                                                return utils.result(res, code.serverError, msg.serverError, null);
                                            }
                                            // if (updateUserPoint(userPointToUpdate, newEventPoint.event_id) === false) {
                                            //     return utils.result(res, code.serverError, msg.serverError, null);
                                            // }
                                            return utils.result(res, code.success, msg.success, newEvent);
                                        }
                                    );
                                }
                            }
                        );
                    }
                );
            }
        );
};

function updateUserPoint(pointUpdate, eventId) {
    Event.findOne(
        {_id: eventId},
        function (err, event) {
            if (err) {
                console.log(err);
                return false;
            }
            return UserPointController.updatePoint(event.userId, pointUpdate)
        }
    );
}