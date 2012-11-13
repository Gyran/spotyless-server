var SpotifySchema = mongoose.Schema({
 hash: { type: String, required: true },
 online: Boolean
});

module.exports = mongoose.model('Spotify', SpotifySchema);