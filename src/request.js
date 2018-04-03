var parseURL = require('url').parse
var https = require('https')
var body2Query = require('body-to-query').body2Query

module.exports = function restRequest(method){
	return function(ref, data){
		return new Promise(function(resolve, reject){
			data = data || {}
			var body = null
			var url = parseURL(ref.uri)
			var opt = {
				headers: {},
				host: url.hostname,
				port: url.port,
				path: url.path + '.json',
				method,
			}

			if(ref._token){
				opt.headers.Authorization = 'Bearer ' + ref._token
			}

			if(['POST', 'PUT', 'PATCH'].indexOf(method) !== -1){
				if(ref._auth){
					opt.path += '?auth=' + ref._auth
				}
				body = JSON.stringify(data)
				if(body){
					opt.headers['Content-Length'] = Buffer.byteLength(body, 'utf8')
					opt.headers['Content-Type'] = 'application/json'
				}
			}else{
				if(ref._auth){
					data.auth = ref._auth
				}
				opt.path += body2Query(data)
			}

			var req = https.request(opt, function(res){
				if(res.statusCode >= 400) return reject(new Error('HTTP: ' + res.statusCode))
				var buffer = ''
				res.setEncoding('utf8')
				res.on('data', function(chunk){buffer += chunk})
				res.on('end', function(){
					try{
						resolve(JSON.parse(buffer))
					}catch(e){
						reject(e)
					}
				})
			})
			req.on('error', reject)
			if(body) req.write(body)
			req.end()
		})
	}
}
