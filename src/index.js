var parseURL = require('url').parse;
var https = require('https');
var tuid = require('timer-uid').tuid;
var body2Query = require('body-to-query').body2Query;

var rest = {
  get: restRequest('GET'),
  post: restRequest('POST'),
  put: restRequest('PUT'),
  patch: restRequest('PATCH'),
  delete: restRequest('DELETE')
};

function FirebaseOnRest(uri, auth, token) {
  this.uri = uri.replace(/\/$/, '');
  this._query = {};
  this.setAuth(auth);
  this.setToken(token);
}

FirebaseOnRest.prototype.setAuth = function(auth) {
  if(auth) this._auth = auth;
  return this;
}

FirebaseOnRest.prototype.setToken = function(token) {
  if(token) this._token = token;
  return this;
}

FirebaseOnRest.prototype.unauth = function() {
  delete this._auth;
  return this;
}

FirebaseOnRest.prototype.toString = function() {
  return this.uri;
}

FirebaseOnRest.prototype.key = function() {
  return this.uri.split('/').pop();
}

FirebaseOnRest.prototype.root = function() {
  return new FirebaseOnRest('https://' + this.uri.split('/')[2], this._auth, this._token);
}

FirebaseOnRest.prototype.parent = function() {
  var s = this.uri.split('/');
  s.pop();
  return new FirebaseOnRest(s.join('/'), this._auth, this._token);
}

FirebaseOnRest.prototype.orderByChild = function(name) {
  this._query.orderBy = '"' + name + '"';
  return this;
}

FirebaseOnRest.prototype.limitToFirst = function(num) {
  if(!this._query.orderBy) this.orderByKey();
  delete this._query.limitToLast;
  this._query.limitToFirst = num;
  return this;
}

FirebaseOnRest.prototype.limitToLast = function(num) {
  if(!this._query.orderBy) this.orderByKey();
  delete this._query.limitToFirst;
  this._query.limitToLast = num;
  return this;
}

FirebaseOnRest.prototype.orderByKey = function() {
  this._query.orderBy = '"$key"';
  return this;
}

FirebaseOnRest.prototype.orderByValue = function() {
  this._query.orderBy = '"$value"';
  return this;
}

FirebaseOnRest.prototype.orderByPriority = function() {
  this._query.orderBy = '"$priority"';
  return this;
}

FirebaseOnRest.prototype.startAt = function(value) {
  this._query.startAt = value;
  return this;
}

FirebaseOnRest.prototype.endAt = function(value) {
  this._query.endAt = value;
  return this;
}

FirebaseOnRest.prototype.equalTo = function(value) {
  this._query.equalTo = value;
  return this;
}

FirebaseOnRest.prototype.push = function(data) {
  var ref = this.child(tuid());
  if(!data) return ref;

  return ref.set(data);
}

FirebaseOnRest.prototype.child = function(path) {
  return new FirebaseOnRest(this.uri + '/' + path, this._auth, this._token);
}

FirebaseOnRest.prototype.once = function(event) {
  if(event !== 'value') return;
  var self = this;
  var body = self._query;
  self._query = {};
  return rest.get(self, body).then(function(data) {
    return new DataSnapshot(self, data);
  });
}

FirebaseOnRest.prototype.set = function(data) {
  return rest.put(this, data);
}

FirebaseOnRest.prototype.update = function(data) {
  return rest.patch(this, data);
}

FirebaseOnRest.prototype.remove = function() {
  return rest.delete(this);
}

function DataSnapshot(ref, data) {
  this._ref = ref;
  this._data = data;
}

DataSnapshot.prototype.key = function() {
  return this._ref.key();
}

DataSnapshot.prototype.val = function() {
  return this._data;
}

DataSnapshot.prototype.ref = function() {
  return this._ref;
}

DataSnapshot.prototype.numChildren = function() {
  return this._data ? Object.keys(this._data).length : 0;
}

function restRequest(method) {
  return function(ref, data) {
    return new Promise(function(resolve, reject) {
      data = data || {};
      var body = null;
      var url = parseURL(ref.uri);
      var opt = {
        headers: {},
        host: url.hostname,
        port: url.port,
        path: url.path + '.json',
        method: method
      };

      if(ref._token) {
        opt.headers['Authorization'] = 'Bearer ' + ref._token;
      }

      if(['POST', 'PUT', 'PATCH'].indexOf(method) != -1) {
        if(ref._auth) {
          opt.path += '?auth=' + ref._auth;
        }
        opt.headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
        opt.headers['Content-Type'] = 'application/json';
        body = JSON.stringify(data);
      } else {
        if(ref._auth) {
          data.auth = ref._auth;
        }
        opt.path += body2Query(data);
      }

      var req = https.request(opt, function(res) {
        if(res.statusCode >= 400) return reject(new Error('HTTP: ' + res.statusCode));
        var buffer = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {buffer += chunk});
        res.on('end', function() {
          try {
            resolve(JSON.parse(buffer));
          } catch(e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      if(body) req.write(body);
      req.end();
    });
  };
}

module.exports = FirebaseOnRest;
