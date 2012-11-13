// Thanks to http://devsmash.com/blog/password-authentication-with-mongoose-and-bcrypt
// And https://github.com/jasonkostempski/psychic-octo-ninja/blob/master/models/account.js

// bcrypt
var bcrypt = require('bcrypt');
SALT_WORK_FACTOR = 10;

// mongoose
var mongoose = require('mongoose');

var UserSchema = mongoose.Schema({
 username: { type: String, required: true, index: { unique: true } },
 passwordHash: { type: String, required: true },
 spotifys: [ String ]
});

UserSchema.method('comparePassword', function (candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.passwordHash, callback);
});

UserSchema.method('setHash', function (password, callback) {
  var self = this;
  
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if(err) {
      return callback(err);
    }

    bcrypt.hash(password, salt, function (err, hash) {
      if(err) {
        return callback(err);
      }

      self.passwordHash = hash;

      callback();
    });
  });
});

UserSchema.static('exists', function (username, callback) {
	console.log('exists', username);
	this.findOne({ 'username': username }, function (err, user) {
		console.log('find one');
		if (err) {
			console.log('exists err', err);
			return callback(err);
		}

		// no user found
		if (!user) {
			console.log('exists !user');
			return callback(null, false);
		}

		console.log('exists user finns');
		return callback(null, true);
	});
	console.log('slutet på exists');
});

UserSchema.static('addSpotify', function (username, hash, callback) {
	this.update(
		{ 'username': username },
		{ '$addToSet': { 'spotifys': hash } },
		function (err) {
			if (err) {
				return callback(err);
			}
			return callback(null);
		}
	);
});

UserSchema.static('removeSpotify', function (username, hash, callback) {
	this.update(
		{ 'username': username },
		{ '$pull': { 'spotifys': hash } },
		function (err) {
			if (err) {
				return callback(err);
			}
			return callback(null);
		}
	);
});

UserSchema.static('getSpotifys', function (username, callback) {
	this.findOne({ 'username': username }, 'spotifys',function (err, spotifys) {
		if (err) {
			return callback(err);
		}

		return callback(null, spotifys.spotifys);
	});
});

UserSchema.static('authenticate', function (username, password, callback) {
	console.log('authenticate');
	this.findOne({ 'username': username }, function (err, user) {
		if (err) {
			return callback(err);
		}

		if (!user) {
			return callback(err, false);
		}

		user.comparePassword(password, function (err, correct) {
			if (err) {
				return callback(err);
			}

			if (!correct) {
				return callback(null, false);
			}

			return callback(null, user);
		});
	});
});

module.exports = mongoose.model('User', UserSchema);