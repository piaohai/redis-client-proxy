var _ = require('underscore');
var redis = require('redis');

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var logger = null;


var Server = module.exports = function(serverInfo,options){
  var self = this;
  this.status = 'down';
  this.errorCount = 0;
  logger = options.logger;
  this.options = _.defaults(serverInfo);
};

// Following events are fired as appropriate
// up: when the server comes up.
// down: when an existing server goes down.
// slave: when the server becomes a slave of another server( Needs to be fleshed)
// master: When a server becomes master.

util.inherits(Server, EventEmitter);

Server.prototype._attachHandlers = function(client){
  var self = this;
  client.on('ready', function(data){
    self.up();
  });
  client.on('error', function(data){
    logger.error("error happened " + data);
    self._incrErrorCount();
  });
  client.on('close',function(data){
    self.down();
  });
  return client;
};

Server.prototype.up = function(){
  if( this.status !== 'up'){
    this.status = 'up';
    this.errorCount = 0;
    this.emit('up');
  }
  return this;
};

Server.prototype.setMaster = function(){
  this._master();
};

Server.prototype._setupControlClient = function(serverInfo){
  try{
    this.client =   (redis.createClient(serverInfo.port, serverInfo.host));
    this._attachHandlers(this.client);
  } catch(err) {
    this.down();
  }
};

Server.prototype.slave = function(server){
  var self = this;
  logger.info('Marking '+ this.host  + ':' + this.port + ' as slave of  '+ server.host+': '+ server.port);
  this.client.slaveof(server.client.host, server.client.port, function(err, message){
    if(err){
      return logger.error(err);
    }
    self.emit('slave');
    logger.info(message);
  });
};

Server.prototype._master = function (){
  var self = this;
  logger.info(this.options.host+":"+this.options.port+ " is slave of no one");
  this.client.slaveof('no', 'one', function(err, message){
    if(err){
      return logger.error(err);
    }
    return self.emit('master');
  });
};

Server.prototype._incrErrorCount = function(){
  this.errorCount++;
  if(this.errorCount > this.options.softErrorCount){
    return this.down();
  }
};

Server.prototype.ping = function(){
  var self = this;  
  if(!this.client){
    this._setupControlClient(this.options);
  } else {
    this.client.ping(function(err, data){
      if(err){
        logger.error(err);
        return self.down();
      }
      self.up();
    });
  }
};

Server.prototype.isUp = function(){
  return this.status === 'up';
};

Server.prototype.down = function(){
  if( this.status !== 'down'){
    this.status = 'down';
    this.emit('down');
  }
  return this;
};

Object.defineProperty(Server.prototype, 'host', {
  get: function() {
    return this.options.host;
  }
});

Object.defineProperty(Server.prototype, 'port', {
  get: function() {
    return this.options.port;
  }
});
