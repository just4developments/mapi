// var Parse = require('parse/node').Parse;
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var path = __dirname + '/';
var fs = require('fs');

var Wallet = 's;n;s;s;n;n;s;n;s;s;s;n;n;n;s'.split(';'); // ID;avail;email;icon;is_sync;money;name;removed;server_id;symb;sicon;oder;createdAt;updatedAt;objectId
var Spending = 's;n;n;n;s;s;s;n;n;s;s;s;n;n;n;n;n;n;s'.split(';'); // ID;created_day;created_month;created_year;server_id;des;email;type;money;type_spending_id;udes;wallet_id;is_report;is_sync;removed;created_date;createdAt;updatedAt;objectId
var TypeSpending = 's;s;s;n;s;n;s;n;s;n;s;n;n;s'.split(';'); // ID;email;icon;is_sync;name;oder;parent_id;removed;server_id;type;sicon;createdAt;updatedAt;objectId

var copyDataFromFile = (db, name, fcDone) => {
	var row = 0;
	var keys = [];
	var types = [];
	var data = [];

	var lineReader = require('readline').createInterface({
		  input: require('fs').createReadStream(path + name + ".txt", {
	    flags: 'r',
	    encoding: 'utf16le'
	  })
	});

	var parseValue = (vl, type) => {
		return type === 'n' ? parseInt(vl) : vl;
	}

	lineReader.on('line', function (line) {				
		if(row++ === 0){			
	  	line = line.split('\u0000').join('').substr(1, line.length -1);
	  	keys = line.split(';');
	  	types = eval(name);	  	
	  }else{
	  	line = line.split('\u0000').join('').substr(1, line.length -1);
	  	if(line.length === 0) return;
	  	var vl = line.split(';');
	  	var item = {};
	  	for(var i =0; i<keys.length; i++){	  		
	  		item[keys[i]] = parseValue(vl[i], types[i]);	  		
	  	}
	  	data.push(item);
	  }
	});

	lineReader.on('close', () => {
  // 	db.collection(name).insertMany(data, (err, vl) => {
  // 		if(err) return console.error(err);
  // 		console.log(`Inserted ${vl.insertedIds.length} from ${name}`);
		// 	fcDone();
		// });
	})
}
MongoClient.connect("mongodb://localhost:27017/savemoney", function(err, db) {
	copyDataFromFile(db, 'Wallet', () => {
		copyDataFromFile(db, 'TypeSpending', () => {
			copyDataFromFile(db, 'Spending', () => {
				db.close();
				console.log('done');
			});	
		});	
	});
});


// Parse.initialize("ItiAkjw1hzUcs96By8SZLF59V2eesDr80Kahkr09", "kpnievWAuxFJaH5Gnx8sp9MlYeeKCrBdTDPDQ37H");

// var mergeObject = (arr)=>{
// 	var list = [];
// 	for(var a of arr){
// 		var item = {objectId: a.id};		
// 		for(var k of Object.keys(a.attributes)){
// 			if(k === 'updatedAt' || k === 'createdAt') item[k] = new Date(a.get(k)).getTime();
// 			else item[k] = a.get(k);
// 		}
// 		list.push(item);
// 	}
// 	return list;
// }

// var mergeDoc = (db, name, skip, limit, fcDone, handler, okHandler) => {
// 	console.log(`${name} ${skip}, ${limit} is requesting`);
// 	var query = new Parse.Query(Parse.Object.extend(name));
// 	query.skip(skip*limit);
// 	query.limit(limit);	
// 	query.find({
// 	  success: function(arr) {
// 	  	if(arr.length === 0) return fcDone(arr);
// 	  	arr = mergeObject(arr);	
// 	  	if(handler) arr = handler(arr);
// 		  db.collection(name).insertMany(arr, (err, vl) => {
// 		  	if(err) return console.error(err);		  	
// 				console.log(`${name} ${skip}, ${arr.length} is done`);
// 				if(okHandler) okHandler(arr);
// 		  	if(arr.length === limit) return mergeDoc(db, name, skip+1, limit, fcDone);
// 		  	else fcDone(arr);			  	
// 		  });			  			
// 	  }
// 	});
// }

// MongoClient.connect("mongodb://localhost:27017/savemoney", function(err, db) {
// 	console.log('connect to db');
// 	var walletMap = {};
// 	var typeSpendingMap = {};
// 	var limit = 300;
// 	mergeDoc(db, 'Wallet', 0, limit, (arr) => {		
// 		mergeDoc(db, 'TypeSpending', 0, limit, (arr) => {					
// 			mergeDoc(db, 'Spending', 0, limit, (arr) => {						
// 				db.close();
// 			}, (arr) => {
// 				for(var i in arr){
// 					arr[i]['type_spending_id'] = typeSpendingMap[arr[i]['type_spending_id']] || 'no data';
// 					arr[i]['wallet_id'] =              walletMap[arr[i]['wallet_id']] || 'no data';
// 				}
// 				return arr;
// 			});
// 		}, false, (arr) => {
// 			for(var a of arr) typeSpendingMap[a.ID] = new ObjectID(a._id.toString());			
// 		});
// 	}, false, (arr) => {
// 		for(var a of arr) walletMap[a.ID] = new ObjectID(a._id.toString());			
// 	});
// });