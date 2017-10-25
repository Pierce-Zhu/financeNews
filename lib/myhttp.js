'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger();

var URL = require("url");
var http = require("http");
var https = require("https");
var qs = require('querystring');

//加载公用模块
var common = require('./common');

//从登陆页获取cookie
exports.get_cookie = function(url, cb) {
	var _url = URL.parse(url);
	var httpType = _url.protocol === "https:" ? https : http;
	httpType.get(url, function(res) {
		res.setEncoding("binary");
		var resData = '',
			cookie = '';

		res.on('data', function(chunk) {
			resData += chunk;
		});

		logger.info('_get set-cookie==>', res.headers["set-cookie"]);
		cookie = res.headers['set-cookie'];

		res.on('end', function() {
			var data = {
				'body': resData,
				'cookie': cookie
			}
			cb(data);
		});

		res.on("error", function(err) {
			logger.error('_get_cookie err-->', err);
			cb(err);
			return false;
		});
	});
}

exports._post = function(url, params, cookie, cb) {
	// logger.info('_post cookie-->', cookie);
	var params = qs.stringify(params);
	// logger.info('post params111', params);
	var options = URL.parse(url);

	options.method = 'POST';
	//判断是https还是http请求
	options.port = options.protocol === "https:" ? 443 : 80;
	options.headers = { // 必选信息
		"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", // 可以设置一下编码
		"Content-Length": params.length, // 请求长度, 通过上面计算得到     
		"Accept": "application/json, text/javascript, */*; q=0.01",
		"X-Requested-With": 'XMLHttpRequest',
		"Accept-Encoding": "gzip, deflate",
		"Accept-Language": "zh-CN,zh;q=0.8,en;q=0.6",  //默认语言设置，q表示语言偏好
		"Cache-Control": "max-age=0",
		"Connection": "Keep-Alive",
		"Host": options.host,
		'Origin': options.protocol + options.host,
		"Referer": options.host + options.path,
		"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36",
		"Cookie": cookie
	}
	// logger.info('options.headers', options.headers);
	var _http = options.protocol === "https:" ? https : http;
	var req = _http.request(options, function(res) {
		var arrBuf = []; //arrBuf：接收数据块
		var bufLength = 0;

		res.on('data', function(chunk) {
			arrBuf.push(chunk);
			bufLength += chunk.length;
		});

		res.on('error', function(err) {
			logger.error('_post res error-->', err);
			cb(err);
			return false;
		});

		//在数据发送完毕后触发
		res.on('end', function() {
			// logger.info('_post res header-->', res.headers);

			//非登录post并不会返回'set-cookie']字段
			// if (!res.headers['set-cookie']) {
			// 	cb(null, {
			// 		'body': res.headers['set-cookie'],
			// 		'detail': '登录超时，请重新登录'
			// 	});
			// 	return false;
			// }

			var chunkAll = Buffer.concat(arrBuf, bufLength);
			var encoding = res.headers['content-encoding'];
			// logger.info('_post chunkAll-->', chunkAll);
			// logger.info('_post encoding-->', encoding);

			var datas = {
				body: '',
				cookie: res.headers["set-cookie"] 
			}

			//因为Accept-Encoding为gzip, deflate，所以接收到的数据需要通过zlib解压缩
			common.decompression(encoding, chunkAll, function(data) {
				datas['body'] = data;
				cb(datas);
			});
		});
	});

	req.on('error', function(err) {
		logger.error('_post req err-->', err);
		cb(err);
		return false;
	});

	req.write(params);
	req.end();
}

exports._get = function(url, params, cb) {
	var params = qs.stringify(params);
	var options = URL.parse(url);

	options.method = 'GET';
	options.path = options.path + '?' + params

	// 	//判断是https还是http请求
	var _http = options.protocol === "https:" ? https : http;

	common.cookie(options.host, function(cookie) {
		options.headers = {
			"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", // 可以设置一下编码    
			"Accept": "text/plain, */*; q=0.01",
			"X-Requested-With": 'XMLHttpRequest',
			"Accept-Encoding": "gzip, deflate, sdch",
			"Accept-Language": "zh-CN, zh;q=0.8",
			"Host": options.host,
			"Referer": options.host + options.path,
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36",
			// 最后 有些网站的某些功能是需要附带cookie信息的. 因此在这里还需加一行
			"Cookie": cookie
		}

		//创建http请求
		var req = _http.request(options, function(res) {

			// logger.info('_get options->', options);
			var arrBuf = []; //arrBuf：接收数据块
			var bufLength = 0;

			res.on("data", function(chunk) {
				arrBuf.push(chunk);
				bufLength += chunk.length;
			});

			res.on("error", function(err) {
				logger.error('_get res err-->', err);
				cb(err);
				return false;
			});
			// 在数据发送完毕后触发
			res.on("end", function() {
				// logger.info('_get res header-->', res.headers);
				logger.info('_get res header set-cookie-->', res.headers['set-cookie']);
				// logger.info('_get res arrBuf-->', arrBuf);

				// if (!res.headers['set-cookie']) {
				// 	cb(null, {
				// 		'body': res.headers['set-cookie'],
				// 		'detail': '登录超时，请重新登录'
				// 	});
				// 	return false;
				// }

				var chunkAll = Buffer.concat(arrBuf, bufLength);
				var encoding = res.headers['content-encoding'];
				logger.info('_get chunkAll-->', chunkAll);
				logger.info('_get encoding-->', encoding);

				var datas = {
					body: '',
					cookie: cookie
				}

				//因为Accept-Encoding为gzip, deflate，所以接收到的数据需要通过zlib解压缩
				common.decompression(encoding, chunkAll, function(data) {
					datas['body'] = data;
					// cb(null, datas);
					cb(datas);
				});
			});
		});
		req.on("error", function(err) {
			if (err) {
				logger.error('_get req error-->', err);
				cb(err);
				return false;
			}
		});
		//req.write(s); 
		req.end(); // 这个必须有, 不然就一直等待结束
	});
}