/**
 * Created by arolave on 26/07/2016.
 */
var MongoClient = require('mongodb');

module.exports = MongoStore;

function MongoStore(options) {
  this.mongoUrl = options.mongoUrl || process.env.MONGO_URL || 'mongodb://localhost:27017/admin';
  this.collectionName = options.mongoCollection || 'migrations';

  this.getLockCollection(function (err, c) {
    if (err)
      return;

    c.createIndex({lockName: 1}, {unique: true});
  });
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

MongoStore.prototype.getLockCollection = function (callback) {
  this._getCollection(this.collectionName + '-lock', callback);
};

MongoStore.prototype.getCollection = function (callback) {
  this._getCollection(this.collectionName, callback);
};

MongoStore.prototype._getCollection = function (collectionName, callback) {
    if (this.db) {
        return callback(null, this.db.collection(collectionName));
    }
    var self = this;
    MongoClient.connect(self.mongoUrl, {}, function (err, db) {
        if (err)
            return callback(err);

        self.db = db;
        callback(null, db.collection(collectionName));
    });
};

MongoStore.prototype.load = function (callback) {
    var self = this;
    this.lock(function (err) {
        if (err)
            return callback(err);

        return self.getCollection(function (err, c) {
            if (err)
                callback(err);

            c.find({title: {$exists: true}}).sort({timestamp: 1}).toArray(callback);
        });
    });
};

MongoStore.prototype.save = function (migration, callback) {
    return this.getCollection(function (err, c) {
        if (err)
            return callback(err);

        c.insert(migration, {forceServerObjectId: true}, callback);
    });
};

MongoStore.prototype.lock = function (callback) {
    this.getLockCollection(function (err, c) {
      c.findAndModify(
        {lockName: '_node_migrate_lock_', lock: {$ne: true}},
        [],
        {$set: {timestamp: new Date(), lock: true}},
        {upsert: true, new: true},
        function (err, retVal) {
            if (err) {
              callback(new Error('Blocked: Migration Table Already Locked'));
            } else {
              // console.log('locked');
              callback(null, retVal);
            }
        });
    });
};

MongoStore.prototype.unlock = function (callback) {
  this.getLockCollection(function (err, c) {
    c.findAndModify(
      {lockName: '_node_migrate_lock_'},
      [],
      {$set: {lock: false}},
      {},
      function (err, retVal) {
        // console.log('unlocked');
        callback(err, retVal);
      });
  });
};

MongoStore.prototype.reset = function (callback) {
  var self = this
  self.getLockCollection(function (err, c) {
    c.drop();

    return self.getCollection(function (err, c) {
      if (err)
        callback(err);

      c.drop(callback);
    });
  });
};