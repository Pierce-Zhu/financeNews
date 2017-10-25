var filter = require('util-format');
var log4js = require('log4js');
var ejs = require('ejs');

for (var k in filter) {
	ejs.filters[k] = filter[k];
}

// 如果需要mongo，把下面的注释去掉即可
// var mongo = require('./mongo');

module.exports = function spec() {

	return {
		onconfig: function(config, next) {
			log4js.configure(config.get('log4jsConfig'), {});
			// mongo.config(config.get('mongoConfig'));
			next(null, config);
		}
	};
};