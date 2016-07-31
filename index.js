/**
 * Created by arolave on 26/07/2016.
 */
var MongoClient = require('mongodb');

module.exports = MongoStore;

function MongoStore(options) {
    this.mongoUrl = options.mongoUrl || process.env.MONGO_URL || 'mongodb://localhost:27017/admin';
    this.collectionName = options.mongoCollection || 'migrations';
}

MongoStore.cliHandler = {
    usageOptions: [
          '     --mongo-url <format>  Mongo url to use'
        , '     --mongo-collection <string>  collection to save migration executions in mongo'
    ],
    parseArg    : function (arg) {
        switch (arg) {
            case '--mongo-url':
                return 'mongoUrl';
            case '--mongo-collection':
                return 'mongoCollection';
        }
    }
};

MongoStore.prototype.getCollection = function (callback) {
    if (this.db) {
        return callback(null, this.db.collection(this.collectionName));
    }
    var self = this;
    MongoClient.connect(self.mongoUrl, {}, function (err, db) {
        if (err)
            return callback(err);

        self.db = db;
        callback(null, db.collection(self.collectionName));
    });
};

MongoStore.prototype.load = function (callback) {
    return this.getCollection(function (err, c) {
        if (err)
            callback(err);

        c.find().sort({timestamp: 1}).toArray(callback);
    });
};

MongoStore.prototype.save = function (migration, callback) {
    return this.getCollection(function (err, c) {
        if (err)
            callback(err);

        c.insert(migration, {forceServerObjectId: true}, callback);
    });
};

MongoStore.prototype.reset = function (callback) {
    return this.getCollection(function (err, c) {
        if (err)
            callback(err);

        c.drop(callback);
    });
};