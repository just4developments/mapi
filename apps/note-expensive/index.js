var express = require('express');
var app = express();

var mongo = require('./../db');
var ObjectId = require('mongodb').ObjectID;
var secure = require('../secure.js');

const DB = 'savemoney';

module.exports = function(){
	secure.crossdomain(app);

	app.get('/checkCountAvailableByTable', (req, res) => {
		let email=req.query.email;
		let table = req.query.table;
		let updatedAt = +req.query.updatedAt;
		mongo.open(DB, function(db){					
			mongo.count(db, table, {email: email, updatedAt: { $gt: updatedAt}}, function(db, rs){
				mongo.close(db);
				res.type('text/plain').send(rs ? rs.toString(): null);
			});
		});
	});

	app.get('/getNewDataByTable', (req, res) => {
		let email=req.query.email;
		let limit = +req.query.limit;
		let offset = +req.query.offset;
		let removed = +req.query.removed;
		let startTime = +req.query.startTime;
		let table = req.query.table;
		let updatedAt = +req.query.updatedAt;
		let where = {email: email, updatedAt: { $gt: updatedAt}};
		if(removed >= 0) where.removed = removed;
		if(startTime > 0 && table === 'Spending') where.createdAt = { $gt: startTime};
		mongo.open(DB, function(db){					
			mongo.find(db, table, where, function(db, rs){
				mongo.close(db);
				res.send(rs.map((e)=>{e.id = e._id; delete e._id; delete e.creditor_name; delete e.repayment_date; delete e.className; return e;}));
			}, {updatedAt: 1}, offset, limit);
		});
	});

	app.post('/saveDataByTable', (req, res) => {
		var data = JSON.parse(req.body.data);
		var table = req.body.table;
		var listAdd = [];
		var listUpdate = [];
		for(var i in data){
			var r = data[i];
			delete r.className;
			if(r.uid !== 'undefined' && r.uid !== null) {
				r.objectId = r.uid;
				r.updatedAt = new Date().getTime();
				delete r.uid;				
				listUpdate.push(r);
			}else {
				delete r.uid;
				r.createdAt = new Date().getTime();
				r.updatedAt = r.createdAt;
				listAdd.push(r);
			}
		}
		var adds = (db, fcDone) => {
			mongo.insert(db, table, listAdd, function(db, rs){
				listAdd = rs.ops.map();
				fcDone();
			});
		};
		var updates = (db, fcDone) => {
			var update = (idx, fcDone) => {
				if(idx >= listUpdate.length) return fcDone();
				listUpdate[idx].updatedAt = new Date().getTime();
				mongo.update(db, table, listUpdate[idx], {objectId: listUpdate[idx].objectId}, function(db, rs){
					update(idx+1, fcDone);
				});				
			};
			update(0, fcDone);
		}
		mongo.open(DB, function(db){
			if(listAdd.length > 0){
				if(listUpdate.length > 0){
					adds(db, () => {
						updates(db, () => {
							mongo.close(db);
							res.send(listAdd.concat(listUpdate).map((e)=>{ return {ID: e.ID, uid: e.objectId}}));
						});
					});
				}else{
					adds(db, () => {
						res.send(listAdd.map((e)=>{ return {ID: e.ID, uid: e.objectId}}));
						mongo.close(db);
					});	
				}				
			}else if(listUpdate.length > 0){
				updates(db, () => {
					mongo.close(db);
					res.send(listUpdate.map((e)=>{ return {ID: e.ID, uid: e.objectId}}));
				});
			}else {
				res.send(null);
			}
		});
	});

	app.get('/sync', (req, res) => {
		res.send('Completed');
	});

	// app.route('/spending(/:id)?')
	// .get(function(req, res){
	// 	mongo.open(DB, function(db){					
	// 		mongo.find(db, 'spending', {}, function(db, rs){
	// 			mongo.close(db);
	// 			res.send(rs);				
	// 		}, {created_date: -1});
	// 	});
	// })
	// ;

	// app.route('/typespending(/:id)?')
	// .get(function(req, res){
	// 	mongo.open(DB, function(db){					
	// 		mongo.find(db, 'typespending', {}, function(db, rs){
	// 			mongo.close(db);
	// 			res.send(rs);				
	// 		}, {oder: 1});
	// 	});
	// })
	// ;

	// app.route('/wallet(/:id)?')
	// .get(function(req, res){
	// 	mongo.open(DB, function(db){					
	// 		mongo.find(db, 'wallet', {}, function(db, rs){
	// 			mongo.close(db);
	// 			res.send(rs);				
	// 		});
	// 	});
	// })
	// .put(function(req, res){
	// 	mongo.open(DB, function(db){									
	// 		mongo.update(db, 'wallet',
	// 		{
	// 			name: req.body.name,					
	// 			oder: parseInt(req.body.oder),
	// 			money: parseFloat(req.body.money),
	// 			isInclude: parseInt(req.body.isInclude) > 0 ? true : false,					
	// 			updateat: new Date().getTime()
	// 		}, {
	// 			'_id': new ObjectId(req.body._id)
	// 		}, function(db, rs){
	// 			mongo.close(db);
	// 			if(rs.result.n == 1){
	// 				res.send(rs);
	// 			}else{
	// 				res.sendStatus(403).send('Could not update wallet');
	// 			}
	// 		});
	// 	});
	// })
	// .post(function(req, res){
	// 	mongo.open(DB, function(db){									
	// 		mongo.insert(db, 'wallet',
	// 		{
	// 			email: req.body.email,
	// 			createat: new Date().getTime(),
	// 			name: req.body.name,					
	// 			oder: parseInt(req.body.oder),
	// 			money: parseFloat(req.body.money),
	// 			isInclude: parseInt(req.body.isInclude) > 0 ? true : false,					
	// 			updateat: new Date().getTime()
	// 		}, function(db, rs){
	// 			mongo.close(db);
	// 			if(rs.result.n == 1){
	// 				res.send(rs.ops);
	// 			}else{
	// 				res.sendStatus(403).send('Could not create wallet');
	// 			}
	// 		});
	// 	});
	// });

	return app;
}