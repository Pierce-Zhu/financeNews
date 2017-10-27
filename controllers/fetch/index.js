//获取新闻内容
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger();    
var cheerio = require('cheerio'),
    request = require('request'),
    URL = require("url");

var async = require('async');
var eventproxy = require('eventproxy');   //管理并发
var ep = eventproxy();
var moment = require('moment');
var Mysql = require('../../lib/mysqlService');


module.exports = function(router) {

    // router.get('/zsxn', function(req, res) {
    //     res.send('fetch data zsxn');
    // });

    //招商信诺文章   http://www.cignacmb.com/baoxianzhishi/
    router.get('/zsxn', function (req, res, next) {
        var baseUrl = 'http://www.cignacmb.com/baoxianzhishi/';
        var host = 'http://www.cignacmb.com';
        var pageUrls = [baseUrl];
        // for (var i = 1; i < 10; i++) {
        //     pageUrls.push(baseUrl + 'page-' + i + '.html');
        // }
        console.log("articleUrls>>>>>>>>>", pageUrls);
        var articleUrls = [];
        // 命令 ep 重复监听 emit事件(get_topic_html) 3 次再行动
        ep.after('get_page_data', pageUrls.length, function (eps) {
            var concurrencyCount = 0;
            // 利用callback函数将结果返回去，然后在结果中取出整个结果数组。
            var fetchUrl = function (myurl, callback) {
                var fetchStart = new Date().getTime();
                concurrencyCount++;
                console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', myurl);
                request.get(myurl, function (err, rs, body) {
                        if (err) {
                            callback(err, myurl + ' error happened!');
                        }

                        var time = new Date().getTime() - fetchStart;
                        console.log('抓取 ' + myurl + ' 成功', '，耗时' + time + '毫秒');
                        concurrencyCount--;

                        var $ = cheerio.load(body,  {decodeEntities: false});  //防止转码
                        var data  = $('.zixun-detail-content');
                        var arrTemp = [];
                        var result = {
                            title: data.find('h1').text(),
                            category_name: 'insurance',
                            source_author: data.find('.time-source').find('span').eq(1).text().split('：')[1],
                            source_link: myurl,
                            excerpt: data.find('.abstract').find('p').text(),
                            // content:data.find('.field-item').text(),
                            content:data.find('.field-item').html(),
                            published_at: data.find('.time-source').find('span').eq(0).text().split('：')[1],
                            created_at: moment().format('YYYY-MM-DD HH:mm:ss')
                        };
                        arrTemp.push(result.title);
                        arrTemp.push(result.category_name);
                        arrTemp.push(result.source_author);
                        arrTemp.push(result.source_link);
                        arrTemp.push(result.excerpt);
                        arrTemp.push(result.content);
                        arrTemp.push(result.published_at);
                        arrTemp.push(result.created_at);

                        // callback(null, result);
                        console.log("result,,,,,,,,,,,,,,,,,,,", result);
                        var sql = 'insert into zsxn(title, category_name, source_author, source_link,excerpt,content,published_at,created_at) values(?,?,?,?,?,?,?,?)';
                        Mysql.queryInsert(sql, arrTemp, function(errInsert, row, field) {
                            callback(errInsert, result);
                        })
                    });

            };
            // 控制最大并发数为5，在结果中取出callback返回来的整个结果数组。
            async.mapLimit(articleUrls, 3, function (myurl, callback) {
                fetchUrl(myurl, callback);
            }, function (err, result) {
                console.log('=========== result: ===========\n', result.length);
                res.send(result);
            });
        });

        // 获取每页的链接数组，这里不要用emit返回了，因为我们获得的已经是一个数组了。
        pageUrls.forEach(function (page) {
            request.get(page, function (err, rs, body) {
                if (err) {
                    return next(err);
                }
                // 提取咨询链接，去重
                var $ = cheerio.load(body);
                $('.clearfix').each(function (i, e) {
                    // console.log("foreach eeeeeee>>>>>>>>", e.text());
                    var u = $('h3', e).find('a').attr('href');
                    if (articleUrls.indexOf(u) === -1 && u) {   //非法undefined
                        articleUrls.push(host + u);
                    }
                });
                // console.log('get authorUrls successful!\n', articleUrls);
                ep.emit('get_page_data', 'get authorUrls successful');
            });
        });
    });
}

