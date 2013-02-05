var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var  RedisProxy = require('../lib/proxy');

var clusters = require('./config/servers').development;

var Client = function() {

};

Client.prototype.start =  function(opts) {
	var opts = {};
	opts.servers = clusters;
	var _console = console;
	_console.debug = console.info;
	opts.logger = _console;
	this.proxy = new RedisProxy(opts);
	this.proxy.on('error',function(err,res){
		console.error(error + data);
	});
	var _instance = this.proxy;
	this.proxy.on('active',function(err,data){
		//app.set(name,_instance.active.client);
	});	
} 

var cxlient = new Client();
cxlient.start();

var on = false;

setInterval(function() {
var _client = cxlient.proxy.active;
//console.log(_client.client);
if (_client==null) return;
var client = _client.client;
if (!on) {
  	client.on("error", function (err) {
     	console.log("error event - " + client.host + ":" + client.port + " - " + err);
  	});
  };
	on = true;
	var key = Date.now();
	console.log(key);
	client.set(key, "string val", function(err,data){
		console.log(err + data);
	});

},3000);

 