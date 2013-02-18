var mongoose = require('mongoose');

var spotifySchema = mongoose.Schema({
	hash: { type: String, required: true },
	name: { type: String, required: true },
	lastActivity: Date,
	online: Boolean
});

spotifySchema.method('connected', function (hash, callback) {
	this.online = true;
	this.lastActivity = new Date();
});

spotifySchema.method('disconnected', function (hash, callback) {
	this.online = false;
});	

module.exports.model = mongoose.model('Spotify', spotifySchema);
module.exports.schema = spotifySchema;
