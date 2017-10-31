//中国人民银行
'use strict';   
var cheerio = require('cheerio'),
    request = require('request'),
    superagent = require('superagent'),
    URL = require("url");
var iconv = require('iconv-lite');
var async = require('async');
var eventproxy = require('eventproxy');   //管理并发
var ep = eventproxy();
var moment = require('moment');
var Mysql = require('../../lib/mysqlService');
var Html2md = require('../../lib/html2md');


module.exports = function(router) {

    //中国人名银行   http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html
    router.get('/chinabank', function (req, res, next) {
        var indexUrl = 'http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html';
        var baseUrl = 'http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/11040/';
        var host = 'http://www.pbc.gov.cn';
        // var pageUrls = [indexUrl];
        var pageUrls = [];
        for (var i = 2; i < 3; i++) {
            pageUrls.push(baseUrl + 'index' + i + '.html');
        }
        console.log("pageUrls>>>>>>>>>", pageUrls);
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
                    console.log("err.......", err);
                    return next(err);
                }
                console.log("body>>>>>>>>>>>>>>>>>>", body);
                // 提取咨询链接，去重
                var $ = cheerio.load(body);
                var data = $('.mainw950');
                console.log('chinabank data>>>>>>>>>>>>>>>>>>>>', data.text());

                $('.newslist_style').each(function (i, e) {
                    console.log("foreach eeeeeee>>>>>>>>", e.text());
                    var u = $.find('a', e).attr('href');
                    if (articleUrls.indexOf(u) === -1 && u) {   //非法undefined
                        articleUrls.push(host + u);
                    }
                });
                console.log('get articleUrls successful!\n', articleUrls);
                ep.emit('get_page_data', 'get articleUrls successful');
            });
        });
    });

    //人名网   http://politics.people.com.cn/GB/99014/index.html
    router.get('/people', function (req, res, next) {
        var indexUrl = 'http://politics.people.com.cn/GB/99014/index.html';
        var baseUrl = 'http://politics.people.com.cn/GB/99014/';
        var host = 'http://politics.people.com.cn/';
        var pageUrls = [baseUrl];
        for (var i = 2; i < 3; i++) {
            pageUrls.push(baseUrl + 'index' + i + '.html');
        }
        console.log("pageUrls>>>>>>>>>", pageUrls);
        var articleUrls = [];
        // 命令 ep 重复监听 emit事件(get_topic_html) 3 次再行动
        ep.after('get_page_data', pageUrls.length, function (eps) {
            var concurrencyCount = 0;
            // 利用callback函数将结果返回去，然后在结果中取出整个结果数组。
            var fetchUrl = function (myurl, callback) {
                var fetchStart = new Date().getTime();
                concurrencyCount++;
                console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', myurl);
                request.get(myurl, function (err, rs, result){}).pipe(iconv.decodeStream('gb2312')).collect(function(err,body) {
                        if (err) {
                            callback(err, myurl + ' error happened!');
                        }
                        // rs.setEncoding("GB2312");
                        var time = new Date().getTime() - fetchStart;
                        console.log('抓取 ' + myurl + ' 成功', '，耗时' + time + '毫秒');
                        concurrencyCount--;

                        var $ = cheerio.load(body,  {decodeEntities: false});  //防止转码
                        var arrTemp = [];
                        console.log();
                        if($('.text_title') !== undefined){
                            var result = {
                                title: $('.text_title').find('h1').text(),
                                category_name: 'politics',
                                source_author: $('.text_title').find('.ptime').find('fl').find('a').text(),
                                source_link: myurl,
                                excerpt: '',
                                // content:data.find('.field-item').text(),
                                content:$('.text_con').find('.text_con_left').find('.box_con').html(), //原始html文本
                                // content: Html2md.html2md($('.text_con').find('.text_con_left').find('.box_con').html()),
                                published_at: $('.text_title').find('.ptime').find('fl').text().substring(1,16),  //时间
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
                        } else {
                            callback(null, null);
                        }
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
            request.get({url:page, gzip:true}, function (err, rs, body) {
                if (err) {
                    return next(err);
                }
                // rs.setEncoding("utf8");
                // 提取咨询链接，去重
                var $ = cheerio.load(body);
                $('.ej_list_box').find('li').each(function (i, e) {
                    console.log("foreach eeeeeee>>>>>>>>", $('.ej_list_box').find('li').eq(0).find('a').text());
                    var u = $('a', e).attr('href');
                    if (articleUrls.indexOf(u) === -1 && u) {   //非法undefined
                        articleUrls.push(host + u);
                    }
                });
                console.log('get articleUrls successful!\n', articleUrls);
                ep.emit('get_page_data', 'get authorUrls successful');
            });
        });
    });
}

