var express = require('express');
var app = express();

var mongo = require('./../db');
var ObjectId = require('mongodb').ObjectID;
var secure = require('../secure.js');
var uuid = require('uuid');
var async = require('async');

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
	app.get('/share', (req, res) => {
		res.send('ok');
	});
	app.post('/share', (req, res) => {
		let email = req.body.email;
		var oauth = req.headers.oauth;
		mongo.open(DB, function(db){
			mongo.find(db, 'User', {email: oauth}, (db, rs) => {
				console.log(rs);
				if(rs.length > 0){
					var user = rs[0];
					if(!user.shares) user.shares = [];
					user.shares.push(email);
					user.shares.sort((a,b)=>{
						return a > b ? 1 : (a < b ? -1 : 0);
					});
					mongo.update(db, 'User',
					{
						shares: user.shares
					}, {email: oauth}, function(db, rs0){
						mongo.close(db);
						res.send(user.shares);
					});
				}else{
					res.status(404).send(null);
				}
			});
		});
	});

	app.delete('/share/:email', (req, res) => {
		let email = req.params.email;
		var oauth = req.headers.oauth;
		mongo.open(DB, function(db){
			mongo.find(db, 'User', {email: oauth}, (db, rs) => {
				if(rs.length > 0){
					var user = rs[0];
					if(!user.shares) user.shares = [];
					user.shares.splice(user.shares.indexOf(email), 1);
					mongo.update(db, 'User',
					{
						shares: user.shares
					}, {email: oauth}, function(db, rs0){
						mongo.close(db);
						res.send(user.shares);
					});
				}else{
					res.status(404).send(null);
				}
			});
		});
	});

	app.post('/login', (req, res) =>{
		let email = req.body.email;
		mongo.open(DB, function(db){
			mongo.find(db, 'User', {email: email}, (db, rs) => {
				if(rs.length > 0){
					rs[0].updatedAt = new Date().getTime();
					mongo.update(db, 'User',
					{
						updatedAt: rs[0].updatedAt
					}, {email: email}, function(db, rs0){
						mongo.close(db);
						rs[0].isNew = false;
						res.send(rs[0]);
					});
				}else{
					mongo.insert(db, 'User',
					{
						email: email,
						createat: new Date().getTime(),
						updatedAt: new Date().getTime()
					}, function(db, rs){
						mongo.close(db);
						if(rs.result.n == 1){
							rs.ops[0].isNew = true;
							res.send(rs.ops[0]);
						}else{
							res.status(403).send('Could not create user');
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
			mongo.find(db, 'Spending', {email: oauth, removed: 0, updatedAt: { $gt: +req.query.time}}, function(db, rs){
				mongo.close(db);
				res.send(rs);
			}, {updatedAt: -1}, (page-1) * rows, rows);
		});
	})
	.put(function(req, res){
		var datas = req.body.data;
		if(!(datas instanceof Array)){
			datas = [datas];
		}
		mongo.open(DB, function(db){
			var cbs = [];
			for(var item of datas){
				cbs.push(((item, cb) => {
					mongo.update(db, 'Spending',
					{
						type_spending_id: item.type_spending_id,
						des: item.des,
						removed: +item.removed,
						created_date: +item.created_date,
						updatedAt: new Date().getTime()
					}, {
						'_id': new ObjectId(item._id)
					}, function(db, rs){
						if(rs.result.n == 1){
							cb(null, rs);
						}else{
							cb('Could not update spending', rs);
						}
					});
				}).bind(null, item));
				async.series(cbs, (err, rss) => {
					if(err) return res.status(403).send(err);
					res.send(null);
				});
			}
		});
	})
	.post(function(req, res){
		var oauth = req.headers.oauth;
		var data = req.body.data.map(e=>{
			e.createdAt = new Date().getTime();
			e.updatedAt = e.createdAt;
			e.is_sync = 1;
			return e;
		});
		mongo.open(DB, function(db){
			mongo.insert(db, 'Spending', data, function(db, rs){
				mongo.close(db);
				if(rs.result.n > 0){
					res.send(rs.ops);
				}else{
					res.status(403).send('Could not create spending');
				}
			});
		})
	})
	;

	app.route('/typespending(/:id)?')
	.get(function(req, res){
		var oauth = req.headers.oauth;
		var page = +(req.query.page || 1);
		var rows = +(req.query.rows || 50);
		mongo.open(DB, function(db){
			mongo.find(db, 'TypeSpending', {email: oauth, removed: 0, updatedAt: { $gt: +req.query.time}}, function(db, rs){
				mongo.close(db);
				res.send(rs);
			}, {updatedAt: -1}, (page-1) * rows, rows);
		});
	})
	.put(function(req, res){
		var datas = req.body.data;
		if(!(datas instanceof Array)){
			datas = [datas];
		}
		mongo.open(DB, function(db){
			var cbs = [];
			for(var item of datas){
				cbs.push(((item, cb) => {
					mongo.update(db, 'TypeSpending',
					{
						name: item.name,
						oder: +item.oder,
						icon: item.icon,
						sicon: item.sicon,
						removed: +item.removed,
						updatedAt: new Date().getTime()
					}, {
						'_id': new ObjectId(item._id)
					}, function(db, rs){
						if(rs.result.n == 1){
							cb(null, rs);
						}else{
							cb('Could not update type spending', rs);
						}
					});
				}).bind(null, item));
				async.series(cbs, (err, rss) => {
					if(err) return res.status(403).send(err);
					res.send(null);
				});
			}
		});
	})
	.post(function(req, res){
		var oauth = req.headers.oauth;
		var data = req.body.data.map(e=>{
			e.createdAt = new Date().getTime();
			e.updatedAt = e.createdAt;
			e.is_sync = 1;
			return e;
		});
		mongo.open(DB, function(db){
			mongo.insert(db, 'TypeSpending', data, function(db, rs){
				mongo.close(db);
				if(rs.result.n > 0){
					res.send(rs.ops);
				}else{
					res.status(403).send('Could not create type spending');
				}
			});
		})
	})
	;

	app.route('/wallet(/:id)?')
	.get(function(req, res){
		var oauth = req.headers.oauth;
		var page = +(req.query.page || 1);
		var rows = +(req.query.rows || 50);
		mongo.open(DB, function(db){
			mongo.find(db, 'Wallet', {email: oauth, removed: 0, updatedAt: { $gt: +req.query.time}}, function(db, rs){
				mongo.close(db);
				res.send(rs);
			}, {updatedAt: -1}, (page-1) * rows, rows);
		});
	})
	.put(function(req, res){
		var datas = req.body.data;
		if(!(datas instanceof Array)){
			datas = [datas];
		}
		mongo.open(DB, function(db){
			var cbs = [];
			for(var item of datas){
				cbs.push(((item, cb) => {
					mongo.update(db, 'Wallet',
					{
						name: item.name,
						oder: +item.oder,
						money: parseFloat(item.money),
						removed: +item.removed,
						icon: item.icon,
						sicon: item.sicon,
						isInclude: +item.isInclude > 0 ? true : false,
						updatedAt: new Date().getTime()
					}, {
						'_id': new ObjectId(item._id)
					}, function(db, rs){
						if(rs.result.n == 1){
							cb(null, rs);
						}else{
							cb('Could not update wallet', rs);
						}
					});
				}).bind(null, item));
				async.series(cbs, (err, rss) => {
					if(err) return res.status(403).send(err);
					res.send(null);
				});
			}
		});
	})
	.post(function(req, res){
		var oauth = req.headers.oauth;
		var data = req.body.data.map(e=>{
			e.createdAt = new Date().getTime();
			e.updatedAt = e.createdAt;
			e.is_sync = 1;
			return e;
		});
		mongo.open(DB, function(db){
			mongo.insert(db, 'Wallet', data, function(db, rs){
				mongo.close(db);
				if(rs.result.n > 0){
					res.send(rs.ops);
				}else{
					res.status(403).send('Could not create wallet');
				}
			});
		});
	});

	return app;
}
