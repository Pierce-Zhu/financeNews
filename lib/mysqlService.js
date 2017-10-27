var mysql = require('mysql');
var MYSQL_POOL ="";
var MYSQL_POOL_other ={};

//20170520   只联一个数据库的情况
var db = function(config){
    if(MYSQL_POOL){
        MYSQL_POOL = MYSQL_POOL;
    }else{
        MYSQL_POOL= mysql.createPool(config);
    }
    return MYSQL_POOL;
}

var query = function(sql, callback){
    MYSQL_POOL.getConnection(function(err, connection){
        if(err) {
            console.log("getConnection err...", err);
        } else {
            connection.query(sql, function (err, row, fields){
                if(err){
                    console.log("err:",err);
                    // connection.release();
                    // callback(err, row, fields);
                }
                connection.release();
                callback(err, row, fields);
            });
        }
        
    })
}

var queryInsert = function(sql, param, callback){
    MYSQL_POOL.getConnection(function(err, connection){
        if(err) {
            console.log("getConnection err...", err);
        } else {
            connection.query(sql, param, function (err, row, fields){
                if(err){
                    console.log("err:",err);
                }
                connection.release();
                callback(err, row, fields);
            });
        }
    })
}

module.exports = {
    'query':query,
    'queryInsert':queryInsert,
    'db':db
};