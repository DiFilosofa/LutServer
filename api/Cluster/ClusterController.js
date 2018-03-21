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

function calculateNextEvent() {
    // console.log("ec");
    Cluster.find()
        .deepPopulate('Events.Point')
        .exec(function (err, clusters) {
                if (err) {
                    console.log(err);
                    return;
                }
                clusters.forEach(function (item, index, arr) {

                });
            }
        )
};

exports.getAllCluster = function (req, res) {
    Cluster.find()
        .deepPopulate('Events.Point')
        .exec(function (err, clusters) {
                if (err) {
                    console.log(err);
                    return utils.result(res, code.serverError, msg.serverError, null);
                }
                return utils.result(res, code.success, msg.success, clusters);
            }
        )
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

