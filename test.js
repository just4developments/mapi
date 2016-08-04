var unirest = require('unirest');
var mongo = require('./apps/db');

var typeSpending;
var wallet;
unirest.get('http://api.clipvnet.com/api/savemoney/getNewDataByTable?email=have.ice@gmail.com&limit=1000000&offset=0&removed=-1&startTime=1451581200000&table=TypeSpending&updatedAt=-1').send().end(function(res){
	mongo.open('savemoney', function(db){					
		mongo.insert(db, 'typespending', res.body, function(db, rs){
			typeSpending = res.body;
			unirest.get('http://api.clipvnet.com/api/savemoney/getNewDataByTable?email=have.ice@gmail.com&limit=50&offset=0&removed=-1&startTime=1451581200000&table=Wallet&updatedAt=-1').send().end(function(res){
				mongo.insert(db, 'wallet', res.body, function(db, rs){
					wallet = res.body;
					unirest.get('http://api.clipvnet.com/api/savemoney/getNewDataByTable?email=have.ice@gmail.com&limit=1000000&offset=0&removed=-1&startTime=1451581200000&table=Spending&updatedAt=-1').send().end(function(res){
						for(var k in res.body){	
							var k0 = res.body[k];
							for(var i in typeSpending){
								var item = typeSpending[i];
								if(item.ID === k0.type_spending_id){
									res.body[k].type_spending = {
										icon: item.icon,
										name: item.name,
										sicon: item.sicon
									};
								}
							}
							for(var i in wallet){
								var item = wallet[i];
								if(item.ID === k0.wallet_id){
									res.body[k].wallet = {
										icon: item.icon,
										name: item.name,
										sicon: item.sicon
									};
								}
							}
						}
						mongo.insert(db, 'spending', res.body, function(db, rs){
							mongo.close(db);
						});
					});
				});
			});
		});
	});
});

mongo.open('savemoney', function(db){					
	mongo.find(db, 'spending', {}, function(db, rs){
		mongo.close(db);
		console.log(rs);
	});
});
