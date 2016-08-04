var mongo = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/';

module.exports = {
	open: function(db, fcDone){		
		mongo.connect(url + db, function(err, db) {
		  if(err) return console.log(err);
		  if(fcDone) fcDone(db);
		});
	},
	close: function(db){
		db.close();
	},
	insert: function(db, doc, data, cb){
		var collection = db.collection(doc);
		if(data instanceof Array){
			collection.insertMany(data, function(err, result) {
		  	if(err) return console.log(err);
		    cb(db, result);
		  });
		}else{
		  collection.insertOne(data, function(err, result) {
		  	if(err) return console.log(err);
		    cb(db, result);
		  });
	 	}
	},
	delete: function(db, doc, where, cb){
		var collection = db.collection(doc);
	  collection.deleteOne(where, function(err, result) {
	    if(err) return console.log(err);
	    cb(db, result);
	  });  
	},
	update: function(db, doc, data, where, cb){
		var collection = db.collection(doc);
	  collection.updateOne(where , { $set: data }, function(err, result) {
	    if(err) return console.log(err);
	    cb(db, result);
	  });  
	},
	count: function(db, doc, filter, cb){
		var collection = db.collection(doc);
		var v = collection.find(filter);
		v.count(function(err, result) {
	    if(err) return console.log(err);
	    cb(db, result);
	  });
	},
	find: function(db, doc, filter, cb, sort, offset, limit){
		var collection = db.collection(doc);
		var v = collection.find(filter);
		if(sort) v = v.sort(sort);
		if(offset) v = v.skip(offset);
		if(limit) v = v.limit(limit);
		v.toArray(function(err, result) {
	    if(err) return console.log(err);
	    cb(db, result);
	  });
	}
};

