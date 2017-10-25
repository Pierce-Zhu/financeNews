//获取新闻内容
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger();    
var cheerio = require('cheerio'),
    // request = require('request'),
    URL = require("url");

module.exports = function(router) {

    router.get('/zsxn', function(req, res) {
        res.send('fetch data zsxn');
    });
}