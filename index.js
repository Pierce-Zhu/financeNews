/* 该文件禁止任何修改 */
var kraken = require('kraken-js'),
	app = require('express')(),
	options = require('./lib/option')(),
	port = process.env.PORT || 3600;

app.use(kraken(options));

app.listen(port, function(err) {
	console.log('[%s] Listening on http://localhost:%d', app.settings.env, port);
});