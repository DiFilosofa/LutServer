'use strict';
var mongoose = require('mongoose'),
    utils = require('../../Utils/MainUtils.js'),
    aws_s3 = require('../../Data/AWSConstants'),
    User = mongoose.model('User'),
    Point = mongoose.model('PointByMonth'),
    passwordHash = require('password-hash'),
    jwt = require('jsonwebtoken'),
    code = require('../../Data/Code.js'),
    msg = require('../../Data/Message.js'),
    util = require("util"),
    formidable = require('formidable'),
    AWS = require('aws-sdk'),
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

exports.getAllUser = function (req, res) {
    User.find(
        {},
        {//Exclude
            password: 0,
            confirmPassword: 0,
            queryTimePoints: 0
        })
        .populate('UserPoints')
        .exec(function (err, users) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null);
            }
            return utils.result(res, code.success, msg.success, users)
        })
};

exports.updateUserAvatarById = function (req, res) {
    var userId = req.params.userId;
    if (!userId) {
        return utils.result(res, code.badRequest, msg.noUserId, null)
    }
    User.findOne(
        {_id: userId},
        {//Exclude
            password: 0,
            confirmPassword: 0,
            queryTimePoints: 0
        },
        function (err, user) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, err);
            }
            if (!user) {
                return utils.result(res, code.notFound, msg.userNotFound, null);
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
                return utils.result(res, code.serverError, msg.serverError, err);
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
                imageName = "LUT_" + userId + "_userAva_" + image.name;

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
                            return utils.result(res, code.serverError, msg.serverError, err);
                        }
                    })
                });
                var url = aws_s3.dataUrlInitial + imageName;
                user.avatar = url;
                user.save();

                return utils.result(res, code.success, msg.success, user);
            });
        });

};

exports.createUser = function (req, res) {
    var body = req.body;
    if (!body.email) {
        return utils.result(res, code.badRequest, msg.noEmail, null)
    }
    if (!body.password) {
        return utils.result(res, code.badRequest, msg.noPassword, null)
    }
    if (!body.confirmPassword) {
        return utils.result(res, code.badRequest, msg.noConfirmPassword, null)
    }
    if (body.password !== body.confirmPassword)
        return utils.result(res, code.badRequest, msg.passwordNotMatch, null)
    var newUser = new User(body);
    User.findOne(
        {
            'email': body.email
        }
        , function (err, emailExist) {
            if (emailExist) { // user exists
                return utils.result(res, code.badRequest, msg.emailExist, null)
            }
            else {
                newUser.password = passwordHash.generate(newUser.password);
                newUser.confirmPassword = passwordHash.generate(newUser.confirmPassword);

                var point = new Point({
                    userId: newUser._id,
                    month: (new Date()).getUTCMonth(),
                    year: (new Date()).getUTCFullYear()
                });
                point.save(function (err) {
                    if (err) {
                        console.log(err);
                        return utils.result(res, code.serverError, msg.serverError, null)
                    }
                });
                newUser.UserPoints.push(point);
                newUser.save(function (err, user) {
                    if (err) {
                        console.log(err);
                        return utils.result(res, code.serverError, msg.serverError, null)
                    }
                    else {
                        return utils.result(res, code.success, msg.accountCreated,
                            {
                                _id: user._id,
                                email: user.email,
                                UserPoints: user.UserPoints,
                                reputation: user.reputation,
                                created_at: user.created_at,
                                level: user.level,
                                phone: user.phone,
                                address: user.address,
                                nickname: user.nickname

                            }
                        )
                    }
                });
            }
        }
    );
};

exports.getUserById = function (req, res) {
    User.findOne(
        {
            _id: req.params.userId
        },
        {//Exclude
            password: 0,
            confirmPassword: 0,
            queryTimePoints: 0
        }
        , function (err, userExist) {
            if (!userExist) {
                return utils.result(res, code.notFound, msg.userNotFound, null);
            }
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null)
            }
        }).populate('UserPoints')
        .exec(function (err, result) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null)
            }
            return utils.result(res, code.success, msg.success, result);
        })
};

exports.updateById = function (req, res) {
    var body = req.body;
    User.findByIdAndUpdate(req.params.userId, body, {new: true}, function (err, user) {
        if (!user)
            return utils.result(res, code.notFound, msg.userNotFound, null);
        if (err)
            return utils.result(res, code.serverError, msg.serverError, null);
        return utils.result(res, code.success, msg.success, ({
            _id: user._id,
            email: user.email,
            nickname: user.nickname,
            address: user.address,
            phone: user.phone,
            created_at: user.created_at
        }));
    });
};

exports.deleteUserById = function (req, res) {
    User.findOne({
        _id: req.params.userId
    }, function (err, userExist) {
        if (err) {
            return utils.result(res, code.serverError, msg.serverError, null)
        }
        if (userExist) {
            User.remove({
                _id: req.params.userId
            }, function (err, deleted) {
                if (!deleted) {
                    return utils.result(res, code.notFound, msg.userNotFound, null);
                }
                if (err) {
                    return utils.result(res, code.serverError, msg.serverError, null)
                }
                if (deleted) {
                    return utils.result(res, code.success, msg.success, ({}));
                }
            });
        }
        else {
            return utils.result(res, code.notFound, msg.userNotFound, null);
        }
    });
};

exports.updatePassword = function (req, res) {
    User.findOne({
        _id: req.params.userId
    }, function (err, userExist) {
        if (!userExist) {
            return utils.result(res, code.notFound, msg.userNotFound, null);
        }
        if (err) {
            console.log(err);
            return utils.result(res, code.serverError, msg.serverError, null)
        }
        var body = req.body;
        if (!body.password)
            return utils.result(res, code.badRequest, msg.noOldPassword, null);
        if (!body.newPassword)
            return utils.result(res, code.badRequest, msg.noNewPassword, null);
        if (!body.confirmPassword)
            return utils.result(res, code.badRequest, msg.noConfirmPassword, null);
        if (!passwordHash.verify(body.password, userExist.password)) {
            return utils.result(res, code.badRequest, msg.incorrectOldPassword, null);
        }
        if (body.newPassword !== body.confirmPassword)
            return utils.result(res, code.badRequest, msg.passwordNotMatch, null);
        userExist.update(
            {
                password: passwordHash.generate(body.newPassword),
                confirmPassword: passwordHash.generate(body.confirmPassword)
            },
            {new: true},
            function (err) {
                if (err)
                    return utils.result(res, code.serverError, msg.serverError, null);
                return utils.result(res, code.success, msg.success, null);
            });
    });

};

exports.login = function (req, res) {
    var body = req.body;
    if (!body.email) {
        return utils.result(res, code.badRequest, msg.noEmail, null);
    }
    if (!body.password) {
        return utils.result(res, code.badRequest, msg.noPassword, null);
    }

    User.findOne(
        {
            email: body.email
        }
        , function (err, accountExist) {
            if (err) {
                return utils.result(res, code.serverError, msg.serverError, null);
            }
            if (accountExist) { // user exists
                if (!passwordHash.verify(body.password, accountExist.password)) //checkPassword
                    return utils.result(res, code.notFound, msg.wrongPassword, null);
                const payload = {
                    _id: accountExist._id,
                    nickname: accountExist.nickname,
                    email: accountExist.email,
                    phone: accountExist.phone,
                    address: accountExist.address
                };
                //generate tokens
                var tokenResponse = jwt.sign(payload, "minionAndGru", {
                    expiresIn: "3d" // expires in 3days
                });
                return utils.result(res, code.success, msg.success, {
                    token: tokenResponse,
                    _id: accountExist._id,
                    nickname: accountExist.nickname,
                    phone: accountExist.phone,
                    address: accountExist.address
                });
            }
            else {
                return utils.result(res, code.notFound, msg.wrongEmail, null);
            }
        }
    );
};

exports.getLeaderboardAllTime = function (req, res) {
    User.find({},
        {//Exclude
            password: 0,
            confirmPassword: 0,
            queryTimePoints: 0
        })
        .sort({reputation: -1})
        .populate('UserPoints')
        .exec(function (err, results) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null)
            }
            return utils.result(res, code.success, msg.success, results)
        })
};

exports.getLeaderboardByMonth = function (req, res) {
    var dateInput = new Date(parseFloat(req.params.time));
    User.find({},
        {//Exclude
            password: 0,
            confirmPassword: 0,
            queryTimePoints: 0
        })
        .populate('UserPoints')
        .exec(function (err, users) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null)
            }
            var numberOfUser = users.length;
            if (numberOfUser === 0) {
                return utils.result(res, code.success, msg.success, users);
            }
            var tempList = [];
            for (var i = 0; i < numberOfUser; i++) {
                var listOfPoint = users[i].UserPoints.slice();
                var numberOfMonth = listOfPoint.length;

                for (var index = 0; index < numberOfMonth; index++) {
                    if (listOfPoint[index].month === dateInput.getMonth() && listOfPoint[index].year === dateInput.getFullYear()) {
                        users[i].queryTimePoints = listOfPoint[index].point;
                        tempList.push(users[i]);
                        break;
                    }
                }
            }
            return utils.result(
                res,
                code.success,
                msg.success,
                tempList.sort(function (left, right) {
                    return right.queryTimePoints - left.queryTimePoints;
                })
            )
        });
};

exports.getLeaderboardByYear = function (req, res) {
    var yearInput = parseInt(req.params.year);
    User.find({},
        {//Exclude
            password: 0,
            confirmPassword: 0,
            queryTimePoints: 0
        })
        .populate('UserPoints')
        .exec(function (err, users) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null)
            }
            var numberOfUser = users.length;
            if (numberOfUser === 0) {
                return utils.result(res, code.success, msg.success, users);
            }
            var tempList = [];
            for (var i = 0; i < numberOfUser; i++) {
                var listOfPoint = users[i].UserPoints.slice();
                var numberOfMonth = listOfPoint.length;
                users[i].queryTimePoints = 0;
                for (var index = 0; index < numberOfMonth; index++) {
                    if (listOfPoint[index].year === yearInput) {
                        users[i].queryTimePoints += listOfPoint[index].point;
                        tempList.push(users[i]);
                        break;
                    }
                }
            }
            return utils.result(
                res,
                code.success,
                msg.success,
                tempList.sort(function (left, right) {
                    return right.queryTimePoints - left.queryTimePoints;
                })
            )
        });
};