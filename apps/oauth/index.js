var express = require('express');
var app = express();

var ObjectId = require('mongodb').ObjectID;
var mongo = require('../db');
var mail = require('../mail');
var secure = require('../secure.js');

// module.exports.findUser = function(where, fcDone){
// 	mongo.open("commondb", function(db){					
// 		mongo.find(db, 'user', where, function(db, rs){
// 			mongo.close(db);
// 			fcDone(rs);
// 		});
// 	});
// };
module.exports = function(){
	secure.crossdomain(app, "App");

	app.put('/', function(req, res){
		if(req.headers.oauth){
			req.body.email = req.body.email.toLowerCase()
			mongo.open("commondb", function(db){					
				mongo.find(db, 'user',
					{
						authkey: req.headers.oauth,
						app: req.headers.app
					}, function(db, rs){
					if(rs.length == 1){
						mongo.close(db);
						rs = rs[0];
						if(rs.status != 1){
							mail.send(mail.templates.active(req.headers.app, rs.email, rs._id));
							res.status(405).send('Account not actived');
						}else{
							res.set('OAuth', rs.authkey);
							res.status(200).send(secure.encryptResponse({ pbkey: rs.pbkey, prkey: rs.prkey }));
						}
					}else{
						mongo.find(db, 'user',
						{
							email: req.body.email,
							app: req.headers.app
						}, function(db, rs){
							mongo.close(db);
							if(rs.length == 1){
								res.status(403).send('Password is miss match');
							}else{
								res.status(404).send('Could not find "' + req.body.email + '"" in our system');
							}
						});
					}
				});
			});
		}else{
			res.status(400).send('');
		}
	});
	app.post('/', function(req, res){		
		req.body.email = req.body.email.toLowerCase();
		var rsaKey = secure.createKeyPair({email: req.body.email});
		mongo.open("commondb", function(db){
			mongo.insert(db, 'user',
				{
					email: req.body.email, 
					password: req.body.password,
					authkey: secure.createAuthKey(req.body.email, req.body.password),
					pbkey: rsaKey.publicDer,
					prkey: rsaKey.privateDer,
					status: 0,
					app: req.headers.app
				}, function(db, rs){
					mongo.close(db);
					if(rs.result.n == 1){
						rs = rs.ops[0];
						mail.send(mail.templates.active(req.headers.app, req.body.email, rs._id));
						res.status(200).send(rs._id);
					}else{
						res.status(403).send('Could not create account with email ' + req.body.email);
					}
				});
		});
	});
	app.get('/active/:id', function(req, res){
		mongo.open("commondb", function(db){			
			mongo.find(db, 'user',
				{
					'_id': new ObjectId(req.params.id)
				}, function(db, rs){
					if(rs.length == 1){
						rs = rs[0];
						mongo.update(db, 'user',
						{														
							status: 1
						}, {'_id': new ObjectId(req.params.id)}, function(db, rs0){
							mongo.close(db);
							if(rs0.result.n == 1){	
								res.status(200).send('<h2>' + rs.app + ' mobile app</h2><br/><b>Actived account "' + rs.email + '" successfully</b><br/>Now you can sign in "NoteSecurity" app to use.<br/><br/>Happy using!<br/>Team Just4developments.<br/>');
							}else{
								res.status(403).send('Could not create user with email ' + rs.email);
							}
						});
					}
				});				
			});
	});

	app.put('/changePassword', function(req, res){
		req.body.email = req.body.email.toLowerCase();
		mongo.open("commondb", function(db){			
			mongo.find(db, 'user',
				{
					authkey: secure.createAuthKey(req.body.email, req.body.password),
					email: req.body.email,
					app: req.headers.app
				}, function(db, rs){
					mongo.close(db);
					if(rs.length == 1){
						rs = rs[0];	
						mail.send(mail.templates.changePassword(req.headers.app, rs.email, secure.encryptResponse({email: req.body.email, password: req.body.password, authkey: createAuthKey(req.body.email, req.body.password), app: req.headers.app})));
						res.status(200).send('');
					}else{
						res.status(404).send('Could not find account "' + rqd.email + '" in system');
					}
				});				
			});
	});

	app.get('/changePassword/:infor', function(req, res){
		var rqd = decryptResponse(req.params.infor);
		rqd.email = rqd.email.toLowerCase();
		mongo.open("commondb", function(db){
			mongo.find(db, 'user',
				{
					'email': rqd.email
				}, function(db, rs){
					if(rs.length == 1){
						rs = rs[0];	
						mongo.update(db, 'user',
						{
							password: rqd.password,
							status: 1,
							app: rqd.app
						}, {'_id': rs._id}, function(db, rs0){
							mongo.close(db);
							if(rs0.result.n == 1){	
								res.status(200).send('<h2>' + rqd.app + ' mobile app</h2><br/><b>Changed password for account "' + rs.email + '" successfully</b><br/>Now you can sign in "' + rqd.app + '" app to use.<br/><br/>Happy using!<br/>Team Just4developments.<br/>');
							}else{
								res.status(403).send('Could not change password for email "' + rqd.email + '"');
							}
						});
					}else{
						res.status(404).send('Could not find account "' + rqd.email + '" in system');
					}
				});				
			});
	});

	return app;
}
