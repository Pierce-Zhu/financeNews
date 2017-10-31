'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger(); 
var cheerio = require('cheerio');


var html2md = function(context){
    var $ = cheerio.load(context,  {decodeEntities: false}); 
    logger.info("修改前的HTML========》》》》》",$.html());
    $('strong').each(function(index, el) {
         el = $(el);
         var reg = '\p{P}';
        if(el.text().length==1 && el.html().search('\p{P}')){
            el.replaceWith('*'+el.html()+"*");
        }else{
            el.replaceWith('**'+el.html()+"**");
        }
    });
    $('img').each(function(index,el){
        el = $(el);
        el.replaceWith('<div align=center>!['+el.attr('alt')+']('+el.attr('src')+')</div>');
    });
    $('a').each(function(index, el) {
        el = $(el);
        el.replaceWith(el.html());
    });

    $('p').each(function(index, el) {
       el = $(el);
       var reg = new RegExp('/*/*相关推荐')
       if(reg.exec(el.text())){
            var length = $('p').length;
            for (var i = length - 1 ; i >= 0; i--) {
                $('p').eq(i).remove();
            };
            return false;
       }
       el.replaceWith('&#8195; &#8195;'+el.html()+'<br><br>'); 
    });
     logger.info("修改后的md=======》》》》》》》",$.html());
     return $.html();
} 

module.exports = {
    'html2md':html2md
};