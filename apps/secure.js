
module.exports = {
	encryptResponse: function(obj){
		return new Buffer(JSON.stringify(obj)).toString('base64').replace(/=/g, '\0').split("").reverse().join("");
	},
	decryptResponse: function(str){
		return JSON.parse(new Buffer(str.replace(/\0/g, '=').split("").reverse().join(""), 'base64').toString());
	},
	createAuthKey: function(email, password){
		var crypto = require('crypto');
		return crypto.createHash('md5').update('notesecurity:' + email + '-' + password).digest("hex");
	},
	crossdomain: function(app, allowHeaders){
		app.use(function(req, res, next) {
		  res.header('Access-Control-Allow-Origin', '*');
		  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
		  res.header('Access-Control-Allow-Headers', 'Content-Type, OAuth' + (allowHeaders ? (',' + allowHeaders) : ""));
		  res.header('Access-Control-Expose-Headers', 'OAuth'+ (allowHeaders ? (',' + allowHeaders) : ""));
		  next();
		});
	},
	createKeyPair: function(key){
		var NodeRSA = require('node-rsa');
		var key = new NodeRSA(key);
		key = key.generateKeyPair();
		return {
			publicDer: key.exportKey('public').toString(),
			privateDer: key.exportKey('private').toString()
		};
	}
}
