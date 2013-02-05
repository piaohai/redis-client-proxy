
var Logger = function(){
}

Logger.getLog = function(app) {
	if (!!app.logger) {
		return app.logger;
	} else {
		var _console = console;
		_console.debug = console.info;
		return _console;
	}
}

module.exports = Logger;
