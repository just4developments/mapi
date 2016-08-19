var express = require('express');
var app = express();

var mongo = require('./../db');
var ObjectId = require('mongodb').ObjectID;
var secure = require('../secure.js');
var uuid = require('uuid');

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
		if(startTime > 0 && table === 'Spending') where.created_date = { $gt: startTime};
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
				r.objectId = uuid.v4();
				r.createdAt = new Date().getTime();
				r.updatedAt = r.createdAt;
				listAdd.push(r);
			}
		}
		var adds = (db, fcDone) => {
			mongo.insert(db, table, listAdd, function(db, rs){
				listAdd = rs.ops;
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

	////////////////////////////////////////////////////////////////////////////////////////

	app.post('/login', (req, res) =>{
		let email = req.body.email;
		mongo.open(DB, function(db){
			mongo.find(db, 'User', {email: email}, (db, rs) => {
				if(rs.length > 0){
					rs[0].updateat = new Date().getTime();
					mongo.update(db, 'User',
					{
						updateat: rs[0].updateat
					}, {email: email}, function(db, rs0){
						mongo.close(db);
						res.send(rs[0]);
					});
				}else{
					mongo.insert(db, 'User',
					{
						email: email,
						createat: new Date().getTime(),
						updateat: new Date().getTime()
					}, function(db, rs){
						mongo.close(db);
						if(rs.result.n == 1){							
							res.send(rs.ops[0]);
						}else{
							res.sendStatus(403).send('Could not create user');
						}
					});
				}
			});			
		});
	});

	app.route('/spending(/:id)?')
	.get(function(req, res){
		var oauth = req.headers.oauth;
		var page = +(req.query.page || 1);
		var rows = +(req.query.rows || 50);
		mongo.open(DB, function(db){					
			mongo.find(db, 'Spending', {email: oauth, removed: 0, updateat: { $gt: +req.query.time}}, function(db, rs){
				mongo.close(db);
				res.send(rs);				
			}, {updatedAt: -1}, (page-1) * rows, rows);
		});
	})
	;

	app.route('/typespending(/:id)?')
	.get(function(req, res){
		var oauth = req.headers.oauth;
		var page = +(req.query.page || 1);
		var rows = +(req.query.rows || 50);
		mongo.open(DB, function(db){					
			mongo.find(db, 'TypeSpending', {email: oauth, removed: 0, updateat: { $gt: +req.query.time}}, function(db, rs){
				mongo.close(db);
				res.send(rs);				
			}, {parent_id: 1,oder: 1}, (page-1) * rows, rows);
		});
	})
	;

	app.route('/wallet(/:id)?')
	.get(function(req, res){
		var oauth = req.headers.oauth;
		var page = +(req.query.page || 1);
		var rows = +(req.query.rows || 50);
		mongo.open(DB, function(db){					
			mongo.find(db, 'Wallet', {email: oauth, removed: 0, updateat: { $gt: +req.query.time}}, function(db, rs){
				mongo.close(db);
				res.send(rs);				
			}, {parent_id: 1,oder: 1}, (page-1) * rows, rows);
		});
	})
	.put(function(req, res){
		mongo.open(DB, function(db){									
			mongo.update(db, 'Wallet',
			{
				name: req.body.name,					
				oder: parseInt(req.body.oder),
				money: parseFloat(req.body.money),
				isInclude: parseInt(req.body.isInclude) > 0 ? true : false,					
				updateat: new Date().getTime()
			}, {
				'_id': new ObjectId(req.body._id)
			}, function(db, rs){
				mongo.close(db);
				if(rs.result.n == 1){
					res.send(rs);
				}else{
					res.sendStatus(403).send('Could not update wallet');
				}
			});
		});
	})
	.post(function(req, res){
		mongo.open(DB, function(db){									
			mongo.insert(db, 'Wallet',
			{
				email: req.body.email,
				createat: new Date().getTime(),
				name: req.body.name,					
				oder: parseInt(req.body.oder),
				money: parseFloat(req.body.money),
				isInclude: parseInt(req.body.isInclude) > 0 ? true : false,					
				updateat: new Date().getTime()
			}, function(db, rs){
				mongo.close(db);
				if(rs.result.n == 1){
					res.send(rs.ops);
				}else{
					res.sendStatus(403).send('Could not create wallet');
				}
			});
		});
	});

	return app;
}