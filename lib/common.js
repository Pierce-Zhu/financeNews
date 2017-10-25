'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger();
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var zlib = require('zlib');
var async = require('async');

var dbcook = require('../models/cookies');

/**
 * [unique description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-22      10:15:59
 * @version     [version]
 * @Description 数组去重
 * @param       {[type]}        arr       [需要去重的数组]
 * @return      {[type]}                  [description]
 */
var unique = function(arr) {
	var result = [],
		hash = {};
	for (var i = 0, elem;
		(elem = arr[i]) != null; i++) {
		if (!hash[elem]) {
			result.push(elem);
			hash[elem] = true;
		}
	}
	return result;
}

/**
 * [mkdirs 创建所需目录]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-02      17:26:21
 * @version     [version]
 * @Description Description
 * @param       {[type]}        dirpath   [需要创建的文件目录，如"merchantset/20160901/test"]
 * @param       {[type]}        mode      [创建的目录权限]
 * @param       {Function}      callback  [回调函数]
 * @return      {[type]}                  [返回创建好的文件夹路径dirpath]
 */
var mkdirs = function(dirpath, mode, callback) {
	fs.exists(dirpath, function(exists) {
		if (exists) {
			//所需目录已存在，直接返回
			callback(dirpath);
		} else {
			console.info('cj-->');
			//尝试创建父目录，然后再创建当前目录
			mkdirs(path.dirname(dirpath), mode, function() {
				fs.mkdir(dirpath, mode, function() {
					callback(dirpath);
				});
			});
		}
	});
};

/**
 * @author com.ppz.fanxing 2016-09-03
 * @desc   从数据库里查询cookie
 * @param  {host： 查询该host的cookie}
 * @param  {callback： 回调函数}
 * @return {cookie: 登录者的cookie信息}
 */
var cookie = function(host, callback) {
	dbcook.findOne({
		'host': host
	}, function(err, it) {
		if (err) {
			logger.error('dberr->', err);
			callback(err)
		} else {
			if (it && it.host === 'saas.gooddrug.cn') {
				var cookie = 'sessionid_=' + it.JSESSIONIDNB;
				callback(cookie);
			} else if (it && it.host === 'fuwu.qunar.com') {
				var cookie = '_q=' + it._q + '; _t=' + it._t + '; _v=' + it._v + '';
				callback(cookie);
			} else {
				callback(null);
			}
		}
	});
}

/**
 * [dealHtmlToArr description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-05      11:05:48
 * @version     [version]
 * @Description 处理html内容，获取table数据，
 * 				返回array类型的数据。如果不用获取分页数据时，推荐使用该方法。
 * @param       obj: 对象
 * @param       obj.data: html内容（必须）
 *              obj.tableClass: 表类名（必须） 
 *              obj.contClass: 内容类名（必须） 
 * @param       {callback: 回调函数}      callback  [description]
 * @return      {返回每页的数据，类型为array}                  [description]
 */
var dealHtmlToArr = function(obj, callback) {
	logger.info('dealHtmlToArr obj-->', JSON.stringify(obj));
	var $ = cheerio.load(obj.data);

	var title = {}; //存放标题
	var tmp = []; //数据
	//获取table数据
	$('table.' + obj.tableClass).find('tr').each(function(el, item) {
		if ($(item).hasClass(obj.contClass)) {
			//内容
			var cont = {}; //每行数据
			$(item).find('td').each(function(index, td) {
				cont[title[index]] = $(td).text();
			})
			tmp.push(cont);
		} else {
			//table标题
			$(item).find('td').each(function(index, td) {
				title[index] = $(td).text();
			})
		}
	});
	callback(tmp);
}

/**
 * [dealHtmlToArrByPage description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-05      11:05:48
 * @version     [version]
 * @Description 处理html内容，获取table数据，
 * 				返回array类型的数据。在获取分页数据时，推荐使用该方法。
 * @param       obj: 对象
 * @param       obj.data: html内容（必须）
 *              obj.tableClass: 表类名（必须） 
 *              obj.contClass: 内容类名（必须） 
 * @param       {callback: 回调函数}      callback  [description]
 * @return      {返回每页的数据，类型为array}                  [description]
 */
var dealHtmlToArrByPage = function(obj, callback) {
	// logger.info('dealHtmlToArrByPage obj-->', JSON.stringify(obj));
	var $ = cheerio.load(obj.data);

	var title = {}; //存放标题
	var tmp = []; //数据
	//获取table数据
	$('table.' + obj.tableClass).find('tr').each(function(el, item) {
		if ($(item).hasClass(obj.contClass)) {
			//内容
			var cont = {}; //每行数据
			$(item).find('td').each(function(index, td) {
				cont[title[index]] = $(td).text();
			})
			tmp.push(cont);
		} else {
			//table标题
			$(item).find('td').each(function(index, td) {
				title[index] = $(td).text();
			})
		}
	});
	callback(tmp);
}

/**
 * [formatArrFetch description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-08      17:26:55
 * @version     [version]
 * @Description 格式化抓取到的array，这是一个对象数组。array处理完，入库后是多条记录。
 * @param       {[type]}        array     [需要处理的数据]
 * @param       {Function}      callback  [description]
 * @return      {[type]}                  [description]
 */
var formatArrFetch = function(array, callback) {
	logger.info('formatArrFetch array-->', array);
	var str = ''; //存储处理完的数据
	for (var i = 0, len = array.length; i < len; i++) {
		var row = '',
			item = array[i]; //每行数据
		for (var j in item) {
			row += item[j] + '##'; //一行的数据格式为：aaa##bbb##ccc##
		}
		var tmpRow = row.substr(0, row.length - 2); //去掉一行数据的最后一个##
		if (i === len - 1) {
			//最后一行，不用换行
			tmpRow = tmpRow;
		} else {
			//不是最后一行，换行
			tmpRow = tmpRow + '\n';
		}
		str += tmpRow;
		logger.info('formatArrFetch tmpRow-->', tmpRow);
	}
	var buf = new Buffer(str);
	callback(buf);
}

/**
 * [formatObjFetch description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-08      17:22:09
 * @version     [version]
 * @Description 格式化抓取到的obj，这是一个{}对象。obj处理完，入库后是一条记录。
 * @param       {[type]}        obj       [需要处理的数据]
 * @param       {Function}      callback  [description]
 * @return      {[type]}                  [description]
 */
var formatObjFetch = function(obj, callback) {
	logger.info('formatObjFetch obj-->', obj);
	var row = '';
	for (var i in obj) {
		row += obj[i] + '##';
	}
	row = row.substr(0, row.length - 2); //去掉一行数据的最后一个##
	logger.info('formatObjFetch row-->', row);
	callback(row);
}

/**
 * [decompression description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-08      17:20:37
 * @version     [version]
 * @Description 解压http请求返回的数据
 * @param       {[type]}        encoding  [响应头content-encoding]
 * @param       {[type]}        chunkAll  [响应数据]
 * @param       {Function}      callback  [description]
 * @return      {[type]}                  [返回解压后的数据]
 */
var decompression = function(encoding, chunkAll, callback) {
	//因为Accept-Encoding为gzip, deflate，所以接收到的数据需要通过zlib解压缩
	if (encoding == 'gzip') {
		zlib.gunzip(chunkAll, function(err, decoded) {
			callback(decoded.toString());
		});
	} else if (encoding == 'deflate') {
		zlib.inflate(chunkAll, function(err, decoded) {
			callback(decoded.toString());
		});
	} else {
		callback(chunkAll.toString());
	}
}

/**
 * [getUnreadFileOrderByTime description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-12      18:57:42
 * @version     [version]
 * @Description 按文件创建时间获取未读文件
 * @param       {[type]}        dirpath   [根目录]
 * @param       {[type]}        prex      [文件前缀]
 * @param       {Function}      callback  [description]
 * @return      {[type]}                  [description]
 */
var getUnreadFileOrderByTime = function(dirpath, prex, callback) {
	fs.readdir(dirpath, function(direrr, files) {
		if (direrr) {
			logger.error('getUnreadFileOrderByTime direrr-->', direrr);
			callback({
				'code': '-1',
				'detail': direrr
			});
			return false;
		}
		logger.info('getUnreadFileOrderByTime files-->', files);

		//获取未读取的文件
		var unreadArr = [];
		async.forEach(files, function(file, cb) {
			if (file.indexOf(prex) != -1 && file.indexOf('readed') == -1) { //未读
				var filePath = path.normalize(dirpath + '/' + file);
				fs.stat(filePath, function(err, stat) {
					unreadArr.push({
						'filePath': filePath,
						'time': stat.birthtime
					});
					cb();
				});
			} else {
				cb();
			}
		}, function(err, result) {
			unreadArr.sort(function(pre, next) {
				var tmp = new Date(pre.time) - new Date(next.time);
				return tmp;
			});
			callback(unreadArr);
		});
	});
}

/**
 * [getNewFileByTime description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-18      
 * @version     [version]
 * @Description 按文件创建时间获取所有文件
 * @param       {[type]}        dirpath   [根目录]
 * @param       {Function}      callback  [description]
 * @return      {[type]}                  [description]
 */
var getNewFileByTime = function(dirpath, callback) {
	fs.readdir(dirpath, function(direrr, files) {
		if (direrr) {
			logger.error('getNewFileByTime direrr-->', direrr);
			callback({
				'code': '-1',
				'detail': direrr
			});
			return false;
		}
		logger.info('getNewFileByTime files-->', files);

		//获取最新的文件
		var newArr = [];
		async.forEach(files, function(file, cb) {
			var filePath = path.normalize(dirpath + '/' + file);
			fs.stat(filePath, function(err, stat) {
				newArr.push({
					'filePath': filePath,
					'time': stat.birthtime
				});
				cb();
			});
		}, function(err, result) {
			newArr.sort(function(pre, next) {
				var tmp = new Date(pre.time) - new Date(next.time);
				return tmp;
			});
			callback(newArr);
		});
	});
}

/**
 * [getNewFileByPrex description]
 * @Author      com.ppz.fanxing
 * @DateTime    2016-09-23      17:13:07
 * @version     [version]
 * @Description 获取前缀为prex的文件,并按创建时间排序
 * @param       {[type]}        dirpath   [description]
 * @param       {[type]}        prex      [description]
 * @param       {Function}      callback  [description]
 * @return      {[type]}                  [description]
 */
var getNewFileByPrex = function(dirpath, prex, callback) {
	fs.readdir(dirpath, function(direrr, files) {
		if (direrr) {
			logger.error('getNewFileByPrex direrr-->', direrr);
			callback({
				'code': '-1',
				'detail': direrr
			});
			return false;
		}
		logger.info('getNewFileByPrex files-->', files);

		//获取前缀为prex的文件
		var arr = [];
		async.forEach(files, function(file, cb) {
			if (file.indexOf(prex) != -1) {
				var filePath = path.normalize(dirpath + '/' + file);
				fs.stat(filePath, function(err, stat) {
					arr.push({
						'filePath': filePath,
						'time': stat.birthtime
					});
					cb();
				});
			} else {
				cb();
			}
		}, function(err, result) {
			arr.sort(function(pre, next) {
				var tmp = new Date(pre.time) - new Date(next.time);
				return tmp;
			});
			callback(arr);
		});
	});
}

//判断一个对象{}是否是空对象，若是，返回true，否则，返回false
var isEmptyObject = function(obj) {
	for (var i in obj)
		return !1;
	return !0
}

module.exports = {
	'mkdirs': mkdirs,
	'cookie': cookie,
	'dealHtmlToArr': dealHtmlToArr,
	'dealHtmlToArrByPage': dealHtmlToArrByPage,
	'formatArrFetch': formatArrFetch,
	'formatObjFetch': formatObjFetch,
	'decompression': decompression,
	'getUnreadFileOrderByTime': getUnreadFileOrderByTime,
	'getNewFileByTime': getNewFileByTime,
	'unique': unique,
	'getNewFileByPrex': getNewFileByPrex,
	'isEmptyObject': isEmptyObject
}