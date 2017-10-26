//获取新闻内容
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger();    
var cheerio = require('cheerio'),
    request = require('request'),
    URL = require("url");

var async = require('async');
var eventproxy = require('eventproxy');   //管理并发结果
var ep = eventproxy();

var baseUrl = 'http://blog.csdn.net/web/index.html';
var pageUrls = [];
for (var _i = 1; _i < 3; _i++) {
    pageUrls.push(baseUrl + '?&page=' + _i);
}

module.exports = function(router) {

    // router.get('/zsxn', function(req, res) {
    //     res.send('fetch data zsxn');
    // });

    router.get('/zsxn', function (req, res, next) {
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

                        var $ = cheerio.load(body);
                        var result = {
                            userId: URL.parse(myurl).pathname.substring(1),
                            blogTitle: $("#blog_title a").text(),
                            visitCount: parseInt($('#blog_rank>li').eq(0).text().split(/[:：]/)[1]),
                            score: parseInt($('#blog_rank>li').eq(1).text().split(/[:：]/)[1]),
                            oriCount: parseInt($('#blog_statistics>li').eq(0).text().split(/[:：]/)[1]),
                            copyCount: parseInt($('#blog_statistics>li').eq(1).text().split(/[:：]/)[1]),
                            trsCount: parseInt($('#blog_statistics>li').eq(2).text().split(/[:：]/)[1]),
                            cmtCount: parseInt($('#blog_statistics>li').eq(3).text().split(/[:：]/)[1])
                        };
                        callback(null, result);
                    });

            };
            // 控制最大并发数为5，在结果中取出callback返回来的整个结果数组。
            async.mapLimit(articleUrls, 5, function (myurl, callback) {
                fetchUrl(myurl, callback);
            }, function (err, result) {
                console.log('=========== result: ===========\n', result.length);
                res.send(result);
            });
        });

        // 获取每页的链接数组，这里不要用emit返回了，因为我们获得的已经是一个数组了。
        pageUrls.forEach(function (page) {
            request.get(page, function (err, rs, body) {
                // 常规的错误处理urlObj
                if (err) {
                    return next(err);
                }
                // 提取作者博客链接，注意去重
                var $ = cheerio.load(body);
                $('.blog_list').each(function (i, e) {
                    // console.log("foreach eeeeeee>>>>>>>>", e.text);
                    var u = $('.csdn-tracking-statistics', e).find('a').attr('href');
                    if (articleUrls.indexOf(u) === -1) {
                        articleUrls.push(u);
                    }
                });
                console.log('get authorUrls successful!\n', articleUrls);
                ep.emit('get_page_data', 'get authorUrls successful');
            });
        });
    });
}

