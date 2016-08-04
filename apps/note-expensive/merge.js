var Parse = require('parse/node').Parse;
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

Parse.initialize("ItiAkjw1hzUcs96By8SZLF59V2eesDr80Kahkr09", "kpnievWAuxFJaH5Gnx8sp9MlYeeKCrBdTDPDQ37H");

var mergeObject = (arr)=>{
	var list = [];
	for(var a of arr){
		var item = {objectId: a.id};		
		for(var k of Object.keys(a.attributes)){
			if(k === 'updatedAt' || k === 'createdAt') item[k] = new Date(a.get(k)).getTime();
			else item[k] = a.get(k);
		}
		list.push(item);
	}
	return list;
}

var mergeDoc = (db, name, skip, limit, fcDone, handler, okHandler) => {
	console.log(`${name} ${skip}, ${limit} is requesting`);
	var query = new Parse.Query(Parse.Object.extend(name));
	query.skip(skip*limit);
	query.limit(limit);	
	query.find({
	  success: function(arr) {
	  	if(arr.length === 0) return fcDone(arr);
	  	arr = mergeObject(arr);	
	  	if(handler) arr = handler(arr);
		  db.collection(name).insertMany(arr, (err, vl) => {
		  	if(err) return console.error(err);		  	
				console.log(`${name} ${skip}, ${arr.length} is done`);
				if(okHandler) okHandler(arr);
		  	if(arr.length === limit) return mergeDoc(db, name, skip+1, limit, fcDone);
		  	else fcDone(arr);			  	
		  });			  			
	  }
	});
}

MongoClient.connect("mongodb://localhost:27017/savemoney", function(err, db) {
	console.log('connect to db');
	var walletMap = {};
	var typeSpendingMap = {};
	var limit = 300;
	mergeDoc(db, 'Wallet', 0, limit, (arr) => {		
		mergeDoc(db, 'TypeSpending', 0, limit, (arr) => {					
			mergeDoc(db, 'Spending', 0, limit, (arr) => {						
				db.close();
			}, (arr) => {
				for(var i in arr){
					arr[i]['type_spending_id'] = typeSpendingMap[arr[i]['type_spending_id']] || 'no data';
					arr[i]['wallet_id'] =              walletMap[arr[i]['wallet_id']] || 'no data';
				}
				return arr;
			});
		}, false, (arr) => {
			for(var a of arr) typeSpendingMap[a.ID] = new ObjectID(a._id.toString());			
		});
	}, false, (arr) => {
		for(var a of arr) walletMap[a.ID] = new ObjectID(a._id.toString());			
	});
});