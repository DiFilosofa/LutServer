var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Event = mongoose.model('LutEvent'),
    Cluster = mongoose.model('ClusterModel'),
    Const = require('./../../config/LutConstants'),
    code = require('./../../Data/Code.js'),
    msg = require('./../../Data/Message.js'),
    utils = require('./../../Utils/MainUtils.js'),
    Turf = require('@turf/turf'),
    asyncForEach = require('async-foreach').forEach
;

const clusterDistance = 0.01; //kilometers
const minPoints = 1;
const period =  300000; //5 mins in milliseconds60000;
const reputationWeight = 0.8;
const scoreWeight = 0.2;

function endOfPeriod() {
    var hashMap = {};
    //init userList
    //update reputation
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
                    if (item.userId._id in hashMap) {
                        hashMap[item.userId._id].scoreCount += item.Point.points;
                    }
                    else {
                        hashMap[item.userId._id] = {scoreCount: item.Point.points};
                    }
                    done();
                });
                doneBig();
            });
            for (var id in hashMap) {
                User.findOne(
                    {_id: id},
                    function (err, user) {
                        user.reputation = reputationWeight * user.reputation + scoreWeight * hashMap[user._id].scoreCount;
                        console.log("rep ===== " + user.reputation + "--- scores =====" + hashMap[user._id].scoreCount);
                        user.save();
                    }
                )
            }
            asyncForEach(clusters, function (clusterItem, index, arr) {
                    var doneBig = this.async();
                    asyncForEach(clusterItem.Events, function (item, index, arr) {
                        var done = this.async();
                        //update validity
                        // console.log()
                        item.validity = item.userId.reputation * item.Point.points;
                        item.save(function (err, event) {
                            if (err) {
                                console.log(err);
                                return;
                            }
                            done();
                        });
                    });
                    var sumNow = 0;
                    var sumNext = 0;
                    var sumValidity = 0;
                    asyncForEach(clusterItem.Events, function (item, index, arr) {
                        var done = this.async();
                        sumNow += item.validity * item.water_level;
                        sumNext += item.validity * item.estimated_next_level;
                        sumValidity += item.validity;
                        if (index === arr.length - 1) {
                            if (sumValidity != 0) {
                                clusterItem.level_now = sumNow / sumValidity;
                                clusterItem.level_next = sumNext / sumValidity;
                            }
                            clusterItem.save(function (err, cluster) {
                                if (err) {
                                    console.log(err);
                                    return;
                                }
                            })
                        }
                        done();
                    });
                    doneBig();
                }
            );
        })
};

exports.getAllCluster = function (req, res) {
    var userId = req.params.userId;
    if (!userId) {
        return utils.result(res, code.badRequest, msg.noUserId, null);
    }
    Cluster.find()
        .deepPopulate('Events.Point, Events.userId, Events.Point.Voted')
        .exec(function (err, clusters) {
                if (err) {
                    console.log(err);
                    return utils.result(res, code.serverError, msg.serverError, null);
                }
                if (parseInt(userId) !== -1) {
                    clusters.forEach(function (cluster, clusterIndex, arr) {
                        var tempEventList = cluster.Events;
                        tempEventList.forEach(function (tempEvent, eventIndex, arr) {
                            var isVotedArray = tempEvent.Point.Voted.filter( voted =>
                                voted.userId == userId
                            )
                            if(isVotedArray.length == 0){
                                tempEvent.isUpvoted = false;
                                tempEvent.votedScore = null;
                            }
                            else{
                                tempEvent.isUpvoted = true;
                                tempEvent.votedScore = isVotedArray[0].score;
                            }
                            // tempEvent.isUpvoted = (tempEventList[eventIndex].Point.Voted.indexOf(userId) > -1);
                            cluster.Event = tempEventList;
                        });
                    });
                    return utils.result(res, code.success, msg.success, clusters);
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
                        if (!result) {
                            var eventA = hashMap[item.properties.eventId].event;
                            var newCluster = new Cluster({
                                _id: item.properties.cluster,
                                level_now: eventA.water_level,
                                created_at: eventA.created_at,
                                updated_at: eventA.updated_at
                            });
                            newCluster.Events.push(eventA);
                            newCluster.highestValidity = eventA.validity;
                            newCluster.save(function (err, cluster) {
                                if (err) {
                                    console.log("new__ ===== " + err);
                                }
                                console.log("new__" + cluster);
                                setInterval(function () {
                                    endOfPeriod()
                                }, period);
                                done();
                            });
                        }
                        else {
                            var eventB = hashMap[item.properties.eventId].event;
                            result.created_at = Math.min(eventB.created_at, result.created_at);
                            result.Events.push(eventB);

                            if (eventB.validity > result.highestValidity) {
                                result.level_now = eventB.water_level;
                                result.highestValidity = eventB.validity;
                            }
                            result.save(function (err, cluster) {
                                if (err) {
                                    console.log("old__" + err);
                                }
                                console.log("old__" + cluster);
                                setInterval(function () {
                                    endOfPeriod()
                                }, period);
                                done();
                            });
                        }
                    }
                )
            });
        }
    );

}

