var express = require('express');
var app = express();

var mongo = require('./../db');
var ObjectId = require('mongodb').ObjectID;
var secure = require('../secure.js');

module.exports = function(){
	secure.crossdomain(app);
	app.route('/record(/:id)?')
	.get(function(req, res){
		if(req.headers.oauth){
			var where = {
				authkey: req.headers.oauth
			};
			if(req.query.updatedAt){
				where.updatedAt = {
					$gt: req.query.updatedAt
				}
			}
			mongo.open('notesecurity', function(db){					
				mongo.find(db, 'record', where, function(db, rs){
					mongo.close(db);
					res.status(200).send(rs);				
				});
			});		
		}else{
			res.status(403).send('Not auth');
		}
	})
	.delete(function(req, res){
		if(req.headers.oauth){
			mongo.open('notesecurity', function(db){					
				mongo.find(db, 'user',
					{
						authkey: req.headers.oauth
					}, function(db, rs){
					rs = rs[0];
					mongo.delete(db, 'record',{'_id': new ObjectId(req.params.id)}, function(db, rs){
						mongo.close(db);
						if(rs.result.n == 1){
							res.status(200).send(rs);
						}else{
							res.status(403).send('Could not delete record');
						}
					});
				});
			});
		}
	})
	.put(function(req, res){
		if(req.headers.oauth){
			mongo.open('notesecurity', function(db){									
				mongo.update(db, 'record',
				{
					title: req.body.title,
					content: req.body.content,
					updatedAt: new Date().getTime()
				}, {
					'_id': new ObjectId(req.body._id),
					authkey: req.headers.oauth
				}, function(db, rs){
					mongo.close(db);
					if(rs.result.n == 1){
						res.status(200).send(rs);
					}else{
						res.status(403).send('Could not update record');
					}
				});
			});
		}else{
			res.status(403).send('Not auth');
		}
	})
	.post(function(req, res){
		if(req.headers.oauth){
			mongo.open('notesecurity', function(db){									
				mongo.insert(db, 'record',
				{
					title: req.body.title,
					content: req.body.content,
					authkey: req.headers.oauth,
					updatedAt: new Date().getTime()
				}, function(db, rs){
					mongo.close(db);
					if(rs.result.n == 1){
						res.status(200).send(rs.ops);
					}else{
						res.status(403).send('Could not create record');
					}
				});
			});
		}else{
			res.status(403).send('Not auth');
		}
	});

	return app;
}