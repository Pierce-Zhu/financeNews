var filter = require('util-format');
// var mongoose = require('mongoose');
// var mongo = require('./mongo');
var ejs = require('ejs');
var log4js = require('log4js');
var mysqlCom = require('./mysqlService');

for (var k in filter) {
    ejs.filters[k] = filter[k];
}

module.exports = function spec() {

    return {
        onconfig: function(config, next) {
            // log.config(config.get('tracerConfig'));
            // mongo.config(config.get('mongoConfig'));
            log4js.configure(config.get('log4jsConfig'), {});
            mysqlCom.db(config.get('mysqlConfig'));
            next(null, config);
        }
    };
};