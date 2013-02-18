// Thanks to http://devsmash.com/blog/password-authentication-with-mongoose-and-bcrypt
// And https://github.com/jasonkostempski/psychic-octo-ninja/blob/master/models/account.js

// bcrypt
var bcrypt = require('bcrypt');
SALT_WORK_FACTOR = 10;

// mongoose
var mongoose = require('mongoose');
var Spotify = require('./spotifyModel');

var UserSchema = mongoose.Schema({
 username: { type: String, required: true, index: { unique: true } },
 passwordHash: { type: String, required: true },
 spotifys: [ Spotify.schema ]
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
		return callback(null, user);
	});
	console.log('slutet på exists');
});

UserSchema.static('addSpotify', function (username, hash, name, callback) {

	var found = false;
	this.exists(username, function (err, user) {
		user.spotifys.forEach(function (spotify) {
			if (spotify.hash == hash) {
				spotify.connected();
				spotify.name = name;
				found = true;
			}
		});

		if (!found) {
			var spotify = new Spotify.model();
			spotify.hash = hash;
			spotify.name = name;
			spotify.connected();

			user.spotifys.push(spotify);
		}

		user.save(function (err) {
			if (err) {
				return callback(err);
			}
			return callback(null);
		});
	});
});

UserSchema.static('getSpotifyHash', function (username, name, callback) {
	var ret = null;
	this.exists(username, function (err, user) {
		user.spotifys.forEach(function (spotify) {
			if (spotify.name == name) {
				ret = spotify.hash;
			}
		});
		callback(null, ret);
	});
});

UserSchema.static('spotifyDisconnected', function (username, hash, callback) {
	this.exists(username, function (err, user) {
		user.spotifys.forEach(function (spotify) {
			if (spotify.hash == hash) {
				spotify.disconnected();
			}
		});

		user.save(function (err) {
			if (err) {
				return callback(err);
			}
			return callback(null);
		});
	});
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
