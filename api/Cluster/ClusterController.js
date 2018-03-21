var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Event = mongoose.model('LutEvent'),
    Cluster = mongoose.model('ClusterModel'),
    Const = require('./../../config/LutConstants'),
    code = require('./../../Data/Code.js'),
    msg = require('./../../Data/Message.js'),
    utils = require('./../../Utils/MainUtils.js'),
    Turf = require('@turf/turf')
;

const clusterDistance = 0.005;
const minPoints = 1;

exports.calculateNextEvent = function () {

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
        clustersList.features.forEach(function (item, index, arr) {
            Cluster.findOne(
                {_id: item.properties.cluster},
                function (err, cluster) {
                    if (!cluster) {
                        //if no cluster found
                        var newCluster = new Cluster({
                            _id: item.properties.cluster
                        });
                        var eventA = hashMap[item.properties.eventId].event;
                        newCluster.Events.push(eventA);
                        newCluster.level_now = eventA.water_level;
                        User.findOne(
                            {_id: eventA.userId},
                            function (err, user) {
                                newCluster.highestReputation = user.reputation;
                            }
                        );
                        newCluster.save(function (err, cluster) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("new__" + cluster);
                        });
                    }
                    else {
                        var eventB = hashMap[item.properties.eventId].event;
                        cluster.Events.push(eventB);
                        User.findOne(
                            {_id: eventB.userId},
                            function (err, user) {
                                if (user.reputation > cluster.highestReputation) {
                                    cluster.level_now = eventB.water_level;
                                    cluster.highestReputation = user.reputation;
                                }
                            }
                        );
                        cluster.save(function (err, cluster) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("old__" + cluster);
                        });
                    }
                }
            )
        });
    });

}

