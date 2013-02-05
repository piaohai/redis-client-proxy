var redis = require('redis');
var _ = require('underscore');
var util = require('util');
var Server = require('./server');
var logger = null;
var EventEmitter = require('events').EventEmitter;

// Acts as a proxy for a set of redis servers
// first redis becomes the master and then on failure we move to the next one in the list
// When redis becomes the master it executes a slave of no one, and all other redises will 
// automatically become slave of this master.
// this is also true when the redis dies and another redis takes over.
// This should also monitor coming up of redis servers and slave them as appropriate.

var RedisProxy = module.exports = function(opts){
  var self = this;
  redis.debug_mode = opts.debug || false;
  this._active = null;
  this._activeSlaves = [];
  this.slaveIndex = 0;
  this.options = _.defaults(opts, {softErrorCount: 5});
  if(opts.servers && opts.servers.length === 0) {
    throw new Error('error',"Expected to have at least one redis to proxy");
  }
  logger = opts.logger;
  this.allServers = _.map(opts.servers, function(server){
     var server = new Server(_.defaults(server, {softErrorCount: self.options.softErrorCount}),{logger:logger});
    server.on('up', onUp.bind(null,self,server));
    server.on('down', onDown.bind(null,self,server));
    server.ping();
    return server;
  });
  self.watch();
}

util.inherits(RedisProxy,EventEmitter);

var onDown = function onDown(proxy,self){
    if(_.isEqual(proxy._active.options, self.options)){
      logger.error(" Main server down PANIC");
      logger.info(" finding next active server. ");
      proxy.nextActive();
    } else {
      proxy._activeSlaves = _.without(proxy._activeSlaves, self);
    }
}
  
var onUp =  function onUp(proxy,self) {
    if(_.isNull(proxy._active) && self.client.server_info.role === 'master'){
      proxy._active = self;
      logger.info("setting up the active "+ proxy._active.options.host + ":" + proxy._active.options.port);
      proxy.setMaster(self);
    } else {
      // this is slightly tricky. The active has not been selected yet, in such a case we can slave this redis server.
      // But when the master is selected the remaining redises will be slaved correctly. via the `readyup` method
      if(proxy._active) self.slave(proxy._active);
      if(! _.include(proxy._activeSlaves, self)) proxy._activeSlaves.push(self);
    }
}

RedisProxy.prototype.add = function(serverInfo){
    var self = this;
    var server = new Server(_.defaults(server, {softErrorCount: self.options.softErrorCount}))
    server.on('up', onUp.bind(null,self,server));
    server.on('down', onDown.bind(null,self,server));
    self.allServers.push(server);
    return server;
}

RedisProxy.prototype.setMaster = function(active){
  var self = this;
  self.emit('active',null,self);
  active.setMaster();
  _.each(this.allServers, function(s){
      if(!_.isEqual(s, active) && !_.include(self._activeSlaves, this) && s.isUp()){
        s.slave(active);
        self._activeSlaves.push(s);
      }
  });
}

RedisProxy.prototype.nextActive = function() {
  this._active = _.find(this.allServers, function(server) {
    return server.isUp();
  });
  if(this._active){
    this.setMaster(this.active);
    logger.info("Setting up as active "+ this.active.options.host +" : " + this.active.options.port);
  } else {
    this.eimt('error',"Expected to have atleast one redis to proxy");
  }
}

Object.defineProperty(RedisProxy.prototype, 'active', {
  get: function() { return this._active;}
})

RedisProxy.prototype.nextSlave = function() {
  var slave = this._activeSlaves[this.slaveIndex];
  this.slaveIndex = (this.slaveIndex + 1) % this._activeSlaves.length;
  return slave;
}
 
RedisProxy.prototype.watch = function(){
  var self = this;
  setInterval(function(){
    _.each(self.allServers, function(server){
      server.ping();
    });
  }, this.options.check_period || 10 * 1000);
}

