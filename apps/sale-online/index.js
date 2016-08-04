var express = require('express');
var app = express();

var mongo = require('./../db');
var ObjectId = require('mongodb').ObjectID;
var secure = require('../secure.js');

module.exports = function(){
	secure.crossdomain(app);
	app.use('/static', express.static(__dirname + '/public'));
	app.get('/getImage', function(req, res){
		var http = require('unirest');
		var url = req.query.url;
		if(url.indexOf('http://m.1688.com/offer') != -1){
			url = url.replace('http://m.1688.com/offer', 'https://detail.1688.com/pic');
		}else if(url.indexOf('detail.1688.com') != -1){

		}else{
			res.status(404).send(null);
			return;
		}
		var req = http.get(url).headers({
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
		}).end(function(rs){
			var list = [];
			var imgs = rs.body.match(/<a class="box-img" href="[^"]+" title="[^"]+"[^<]*<img [^>]*>/gm);
			for(var i in imgs){
				var img = imgs[i];
				var regex = /\sdata-lazy-src="([^"]+)"/gm;
				regex = regex.exec(img);
				if(regex && regex.length > 1){
					var url = regex[1].replace('.64x64', '');
					if(list.indexOf(url) == -1)
						list.push(url);
				}else{
					regex = /\ssrc="([^"]+)"/gm;
					regex = regex.exec(img);
					if(regex && regex.length > 1){
						var url = regex[1].replace('.64x64', '');
						if(list.indexOf(url) == -1)
							list.push(url);
					}
				}
			}			
			res.status(200).send(list);
		});
	});

	app.route('/producttype(/:id)?')
	.get(function(req, res){
		mongo.open('saleonline', function(db){
			mongo.find(db, 'producttype', {
				email: req.headers.oauth	
			}, function(db, rs){
				mongo.close(db);
				res.status(200).send(rs);				
			});
		});
	})
	.post(function(req, res){
		mongo.open('saleonline', function(db){
			mongo.insert(db, 'producttype',
			{
				email: req.headers.oauth,
				name: req.body.name,
				createdAt: new Date().getTime(),
				updatedAt: new Date().getTime()
			}, function(db, rs){
				mongo.close(db);
				if(rs.result.n == 1){
					res.status(200).send(rs.ops[0]);
				}else{
					res.status(403).send('Could not create producttype');
				}
			});
		});
	})
	.put(function(req, res){
		mongo.open('saleonline', function(db){									
			mongo.update(db, 'producttype',
			{				
				name: req.body.name,
				updatedAt: new Date().getTime()
			}, {
				'_id': new ObjectId(req.params.id),
				email: req.headers.oauth
			}, function(db, rs){
				mongo.close(db);
				if(rs.result.n == 1){
					res.status(200).send(rs);
				}else{
					res.status(403).send('Could not update producttype');
				}
			});
		});
	})
	.delete(function(req, res){
		if(req.headers.oauth){
			mongo.open('saleonline', function(db){					
				mongo.delete(db, 'producttype',{
					'_id': new ObjectId(req.params.id),
					email: req.headers.oauth
				}, function(db, rs){
					mongo.close(db);
					if(rs.result.n == 1){
						res.status(200).send(rs);
					}else{
						res.status(403).send('Could not delete producttype');
					}
				});
			});
		}
	})
	;

	app.route('/product(/:id)?')
	.get(function(req, res){
		mongo.open('saleonline', function(db){			
			if(req.params.id){
				mongo.find(db, 'product', {
					'_id': new ObjectId(req.params.id),
					email: req.headers.oauth
				}, function(db, rs){
					mongo.close(db);
					if(rs.length > 0)
						res.status(200).send(rs[0]);				
					else
						res.status(404).send(null);				
				});
			}else{
				var filter = {};
				if(req.query.searchType == 0){
					filter.quantity = 0;
				}else if(req.query.searchType == 1){
					filter.quantity = {$gt: 0};
				}
				if(req.query.productType && req.query.productType.length > 0){
					filter.productTypeId = req.query.productType;
				}
				mongo.find(db, 'product', filter, function(db, rs){
					mongo.close(db);
					res.status(200).send(rs);				
				}, {createdDate: -1});
			}			
		});
	})
	.post(function(req, res){
		var fileName=  "pd_" + new Date().getTime();
		var base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
		var fs = require("fs");
		fs.writeFile(__dirname + "/public/" + fileName + "x0.png", base64Data, 'base64', function(err) {
		  if(err) return console.log(err);
		  base64Data = req.body.image50.replace(/^data:image\/\w+;base64,/, "");
			fs.writeFile(__dirname + "/public/" + fileName + "x50.png", base64Data, 'base64', function(err) {
			  if(err) return console.log(err);
				mongo.open('saleonline', function(db){
					mongo.insert(db, 'product',
					{
						code: '',
						name: req.body.name,				
						email: req.headers.oauth,
						des: req.body.des,
						iprice: parseFloat(req.body.iprice),
						oprice: parseFloat(req.body.oprice),
						quantity: parseInt(req.body.quantity),
						image: 'static/' + fileName + "x0.png",
						productTypeId: req.body.productTypeId,
						productSizes: req.body.productSizes,
						createdDate: new Date(req.body.createdDate).getTime(),
						createdAt: new Date().getTime(),
						updatedAt: new Date().getTime()
					}, function(db, rs){
						mongo.close(db);				
						if(rs.result.n == 1){
							res.status(200).send(rs.ops[0]);
						}else{
							res.status(403).send('Could not create producttype');
						}
					});
				});
			});
		});
	})
	.put(function(req, res){
		mongo.open('saleonline', function(db){	
			mongo.find(db, 'product', {
				'_id': new ObjectId(req.params.id),
				email: req.headers.oauth
			}, function(db, rs){				
				if(rs.length > 0){
					var update = function(image){
						mongo.update(db, 'product',
						{				
							name: req.body.name,
							des: req.body.des,
							iprice: parseFloat(req.body.iprice),
							oprice: parseFloat(req.body.oprice),
							quantity: parseInt(req.body.quantity),
							image: image,
							productTypeId: req.body.productTypeId,
							productSizes: req.body.productSizes,
							createdDate: new Date(req.body.createdDate).getTime(),
							updatedAt: new Date().getTime()
						}, {
							'_id': new ObjectId(req.params.id)
						}, function(db, rs){
							mongo.close(db);
							if(rs.result.n == 1){
								res.status(200).send(rs);
							}else{
								res.status(403).send('Could not update product');
							}
						});
					};
					var old = rs[0];
					if(old.image != req.body.image){
						var fileName=  "pd_" + new Date().getTime();
						var base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
						var fs = require("fs");
						if(old.image){
							try{
								fs.unlinkSync(__dirname + "/public/" + old.image.replace('static/', ''));
								fs.unlinkSync(__dirname + "/public/" + old.image.replace('static/', '').replace('x0', 'x50'));
							}catch(e){}
						}
						fs.writeFile(__dirname + "/public/" + fileName + "x0.png", base64Data, 'base64', function(err) {
						  if(err) return console.log(err);
						  base64Data = req.body.image50.replace(/^data:image\/\w+;base64,/, "");
							fs.writeFile(__dirname + "/public/" + fileName + "x50.png", base64Data, 'base64', function(err) {
							  if(err) return console.log(err);
							  update('static/' + fileName + "x0.png");
						  });
						});
					}else{
						update(old.image);
					}
				}else{
					mongo.close(db);
					res.status(404).send(null);				
				}
			});								
		});
	})
	.delete(function(req, res){
		if(req.headers.oauth){
			mongo.open('saleonline', function(db){		
				mongo.find(db, 'product', {
					'_id': new ObjectId(req.params.id),
					email: req.headers.oauth
				}, function(db, rs){				
					if(rs.length > 0){
						var old = rs[0];
						var fs = require("fs");
						if(old.image){
							try{
								fs.unlinkSync(__dirname + "/public/" + old.image.replace('static/', ''));
								fs.unlinkSync(__dirname + "/public/" + old.image.replace('static/', '').replace('x0', 'x50'));		
							}catch(e){}
						}
						mongo.delete(db, 'product',{
							'_id': new ObjectId(req.params.id)
						}, function(db, rs){
							mongo.close(db);
							if(rs.result.n == 1){
								res.status(200).send(rs);
							}else{
								res.status(403).send('Could not delete product');
							}
						});
					}
				});
			});
		}
	})
	;

	app.route('/order(/:id)?')
	.get(function(req, res){
		mongo.open('saleonline', function(db){
			var filter = {
				email: req.headers.oauth
			};
			if(req.query.productId){
				filter["product._id"] = req.query.productId;
			}
			if(req.query.start){
				if(!filter.createdAt) filter.createdAt = {};
				filter.createdAt['$gte'] = new Date(req.query.start).getTime();				
			}
			if(req.query.end){
				if(!filter.createdAt) filter.createdAt = {};
				filter.createdAt['$lte'] = new Date(req.query.end).getTime();
			}
			mongo.find(db, 'orders', filter, function(db, rs){
				mongo.close(db);
				res.status(200).send(rs);				
			}, {createdAt: -1});
		});
	})
	.put(function(req, res){
		mongo.open('saleonline', function(db){									
			mongo.update(db, 'orders',
			{				
				status: req.body.status,
				updatedAt: new Date().getTime()
			}, {
				'_id': new ObjectId(req.params.id),
				email: req.headers.oauth
			}, function(db, rs){								
				if(rs.result.n == 1){
					if(req.body.product){
						mongo.update(db, 'product',
						{
							quantity: parseInt(req.body.product.quantity),
							productSizes: req.body.product.productSizes,
							updatedAt: new Date().getTime()
						}, {
							'_id': new ObjectId(req.body.product._id),
							email: req.headers.oauth
						}, function(db, rs0){
							mongo.close(db);
							if(rs0.result.n == 1){
								res.status(200).send(rs);
							}else{
								res.status(403).send('Could not update product');
							}
						});
					}else{
						mongo.close(db);
						res.status(200).send(rs);
					}					
				}else{
					mongo.close(db);
					res.status(403).send('Could not update orders');
				}
			});
		});
	})
	.post(function(req, res){
		mongo.open('saleonline', function(db){
			mongo.insert(db, 'orders',
			{
				email: req.headers.oauth,
				buyingDate: req.body.buyingDate,
				productSize: req.body.size,
				product: req.body.product,
				buyer: req.body.buyer,
				status: -1,
				money: parseFloat(req.body.money),
				quantity: parseInt(req.body.quantity),
				createdAt: new Date().getTime(),
				updatedAt: new Date().getTime()
			}, function(db, rs){
				if(rs.result.n == 1){					
					mongo.update(db, 'product',
					{				
						quantity: parseInt(req.body.product.quantity),
						productSizes: req.body.product.productSizes
					}, {
						'_id': new ObjectId(req.body.product._id),
						email: req.headers.oauth
					}, function(db, rs0){
						mongo.close(db);
						if(rs0.result.n == 1){
							res.status(200).send(rs[0]);
						}else{
							res.status(403).send('Could not update product');
						}
					});
				}else{
					mongo.close(db);
					res.status(403).send('Could not create order');
				}
			});
		});
	})
	;

	return app;
}