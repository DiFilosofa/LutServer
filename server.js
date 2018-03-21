var express = require('express');
var app = express();
var database = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');


//Schemas registration
var Cluster = require('./api/Cluster/ClusterModel.js'),
    UserModel = require('./api/User/UserModel.js'),
    LutEvent = require('./api/LutEvent/Main/LutEventModel.js'),
    GPSData = require('./api/GPSData/GPSDataModel.js'),
    LutEventPoint = require('./api/LutEvent/Main/Points/LutEventPointModel.js'),
    PointByMonth = require('./api/User/Points/PointModel.js'),
    EventController = require('./api/LutEvent/Main/LutEventController.js')
;
var routes = require('./api/Routes.js');

var configDB = require('./config/LutConstants.js');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('bananaMinion', configDB.secret); // secret variable

routes(app);

mongoose.Promise = global.Promise;
mongoose.connect(configDB.url);

// connect to our database// mongoose.connect('mongodb://localhost/bananaserver');

var server = app.listen(process.env.PORT || 3500, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});

// var interval = setInterval(function () {
//     EventController.reevaluate()
// }, 500);