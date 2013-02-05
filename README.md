#redis-client-proxy
redis-client-proxy module is simple redis client proxy for redis client.
 
##Installation
```
npm install redis-client-proxy
```

##Usage
``` javascript

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

``` 

##API
just like node reis client

##ADD
for more usage detail , reading source and benchmark and test case from
source is recommended;
