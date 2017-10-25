function getIPv4() {
	var os = require('os');
	var IPv4 = '127.0.0.1';
	if (os.networkInterfaces().en0) {
		for (var i = 0; i < os.networkInterfaces().en0.length; i++) {
			if (os.networkInterfaces().en0[i].family == 'IPv4') {
				IPv4 = os.networkInterfaces().en0[i].address;
			}
		}
	}
	return IPv4;
}

var address;

switch (process.env.NODE_ENV) {
	case 'development':
		address = '//' + getIPv4() + ':3601';
		break;
	default:
		address = '//financeNews';
		break;
}

console.info('编译地址:' + address);

fis.config.set('roadmap.domain', address);