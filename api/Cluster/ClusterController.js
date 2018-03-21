var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Event = mongoose.model('LutEvent'),
    Cluster = mongoose.model('ClusterModel'),
    Const = require('./../../config/LutConstants'),
    code = require('./../../Data/Code.js'),
    msg = require('./../../Data/Message.js'),
    utils = require('./../../Utils/MainUtils.js'),
    Turf = require('@turf/turf'),
    asyncForEach = require('async-foreach').forEach;
;

const clusterDistance = 0.005; //kilometers
const minPoints = 1;
const period = 50000; //300000; //5 mins in milliseconds
const reputationWeight = 0.8;
const scoreWeight = 0.2;

exports.endOfPeriod = function () {
    var hashMap = {};
    //init userList
    User.find(function (err, users) {
        asyncForEach(users, function (item, index, arr) {
            var done = this.async();
            hashMap[item._id] = {scoreCount: 0};
            done();
        });
        Cluster.find()
            .deepPopulate('Events.Point Events.userId')
            .exec(function (err, clusters) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    asyncForEach(clusters, function (item, index, arr) {
                        var doneBig = this.async();
                        asyncForEach(item.Events, function (item, index, arr) {
                            var done = this.async();
                            hashMap[item.userId._id].scoreCount += item.Point.scoreSum;
                            done();
                        });
                        doneBig();
                    });
                    for (var id in hashMap) {
                        User.findOne(
                            {_id: id},
                            function (err, user) {
                                user.reputation = reputationWeight * user.reputation + scoreWeight * hashMap[id].scoreCount;
                                user.save();
                            })
                    }
                }
            )
    });
    Cluster.find()
        .deepPopulate('Events.Point Events.userId')
        .exec(function (err, clusters) {
            if (err) {
                console.log(err);
                return;
            }
            asyncForEach(clusters, function (item, index, arr) {
                var doneBig = this.async();
                asyncForEach(item.Events, function (item, index, arr) {
                    var done = this.async();
                    //update validity
                    // console.log()
                    item.validity = item.userId.reputation * item.Point.scoreSum;
                    item.save(function (err, event) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        done();
                    });
                });
                var sumNow = 0;
                // var sumNext = 0;
                var sumValidity = 0;
                asyncForEach(item.Events, function (item, index, arr) {
                    var done = this.async();
                    console.log(sumNow + "___" + sumValidity);
                    sumNow += item.validity * item.water_level;
                    sumValidity += item.validity;
                    if (index === arr.length - 1) {
                        if (sumValidity != 0) {
                            item.level_now = sumNow / sumValidity;
                        }
                        item.save(function (err, cluster) {
                            if (err) {
                                console.log(err);
                                return;
                            }
                        })
                    }
                    done();
                });
                doneBig();
            });
        });
};

exports.getAllCluster = function (req, res) {
    var userId = req.params.userId;
    if (!userId) {
        return utils.result(res, code.badRequest, msg.noUserId, null);
    }
    Cluster.find()
        .deepPopulate('Events.Point Events.userId')
        .exec(function (err, clusters) {
                if (err) {
                    console.log(err);
                    return utils.result(res, code.serverError, msg.serverError, null);
                }
                if (parseInt(userId) !== -1) {
                    var numberOfClusters = clusters.length;
                    var tempClusterList = clusters.slice();
                    for (var clusterIndex = 0; clusterIndex < numberOfClusters; clusterIndex++) {
                        var numberOfEvents = tempClusterList[clusterIndex].Events.length;
                        var tempEventList = tempClusterList[clusterIndex].Events;
                        for (var eventIndex = 0; eventIndex < numberOfEvents; eventIndex++) {
                            var tempEvent = tempEventList[eventIndex].toJSON();
                            tempEvent.isUpvoted = (tempEventList[eventIndex].Point.VotedUsers.indexOf(userId) > -1);
                            tempEventList[eventIndex] = tempEvent;
                        }
                        tempClusterList[clusterIndex] = tempEventList;
                    }
                    return utils.result(res, code.success, msg.success, tempClusterList);

                }
                else {
                    return utils.result(res, code.success, msg.success, clusters);
                }
            }
        );
};

exports.cluster = function (req, res) {
    var locations = [];
    var hashMap = {};
    Event.find()
        .populate('Point')
        .exec(function (err, results) {
            if (err) {
                console.log(err);
                return utils.result(res, code.serverError, msg.serverError, null);
            }
            results.forEach(function (item, index, arr) {
                hashMap[item._id] = {event: item};
                locations.push(Turf.point([item.latitude, item.longitude], {eventId: item._id.toString()}));
            });
            updateClusters(Turf.clustersDbscan(Turf.featureCollection(locations), clusterDistance, {minPoints: minPoints}), hashMap);
        });
};

function updateClusters(clustersList, hashMap) {
    Cluster.remove({}, function (err) {
            if (err) {
                console.log(err);
                return;
            }
            asyncForEach(clustersList.features, function (item, index, arr) {
                var done = this.async();
                Cluster.findOne(
                    {_id: item.properties.cluster},
                    function (err, result) {
                        console.log("CLUSTERRRRR = " + result);
                        if (!result) {
                            var eventA = hashMap[item.properties.eventId].event;
                            var newCluster = new Cluster({
                                _id: item.properties.cluster,
                                level_now: eventA.water_level,
                                created_at: eventA.created_at,
                                updated_at: eventA.updated_at
                            });
                            newCluster.Events.push(eventA);
                            User.findOne(
                                {_id: eventA.userId},
                                function (err, user) {
                                    newCluster.highestReputation = user.reputation;
                                }
                            );
                            newCluster.save(function (err, cluster) {
                                if (err) {
                                    console.log("new__ ===== " + err);
                                }
                                console.log("new__" + cluster);
                                done();
                            });
                            // setInterval(function () {
                            //     calculateNextEvent()
                            // }, period)
                        }
                        else {
                            var eventB = hashMap[item.properties.eventId].event;
                            result.created_at = Math.min(eventB.created_at, result.created_at);
                            result.Events.push(eventB);
                            User.findOne(
                                {_id: eventB.userId},
                                function (err, user) {
                                    if (user.reputation > result.highestReputation) {
                                        result.level_now = eventB.water_level;
                                        result.highestReputation = user.reputation;
                                    }
                                }
                            );
                            result.save(function (err, cluster) {
                                if (err) {
                                    console.log("old__" + err);
                                }
                                console.log("old__" + cluster);
                                done();
                            });
                        }
                    }
                )
            });
        }
    );

}

