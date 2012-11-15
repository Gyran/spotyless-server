// Spotyless
var SERVER_PORT = 9004;
var connectedSpotifys = {};

// HTTPS
var https = require('https');
var fs = require("fs");
var options = {
  key: fs.readFileSync('privatekey.pem'),
  cert: fs.readFileSync('certificate.pem')
};

// Database
var mongoose = require('mongoose');
var User = require('./userModel');
mongoose.connect('mongodb://localhost:27017/spotyless', function (err) {
	if (err) {
		console.log('couldn\'t connect to db', err);
	} else {
		console.log('Database connecaated');
	}
});

// Express
var express = require('express');
var app = express();

app.use(express.logger('dev'));
app.use(express.static(__dirname + '/public'));


var server = https.createServer(options, app).listen(9004);

// socket.io
var io = require('socket.io').listen(server);

function addSpotify(hash, socket) {
	connectedSpotifys[hash] = { 'socket': socket, 'clients': [], clientid: 0 }
}

function addClient(hash, socket) {
	var clients = getClients(hash);
	var spotify = getSpotify(hash);

	if (clients && spotify) {
		clientid = spotify.clientid;
		clients[clientid] = socket;
		return spotify.clientid++;
	}
	return -1;
}

function getSpotify(hash) {
	return connectedSpotifys[hash];
}

function getClient(hash, id) {
	var clients = getClients(hash);
	if (clients) {
		return clients[id];
	}
	return null;
}

function getClients(hash) {
	var spotify = getSpotify(hash);
	if (spotify) {
		return spotify.clients;
	}
	return null;
}

function deleteSpotify(hash) {
	delete connectedSpotifys[hash];
}

function deleteClient(hash, id) {
	// Might get many undefined elements?
	var clients = getClients(hash);
	if (clients) {
		delete clients[id];
		console.log(connectedSpotifys);
	}
}

function createNewUser(username, password, callback) {
	var newUser = User();
	newUser.username = username;

	newUser.setHash(password, function (err) {
		if (err) {
			callback(err);
		}

		newUser.save(function (err) {
			if (err) {
				console.log(err);
			}

			callback(null, newUser);
		});
	});

}

function loginOrCreateUser(username, password, callback) {
	console.log('loginOrCreateUser');
	User.exists(username, function (err, exists) {
		console.log('exists cb');
		if (err) {
			return callback(err);
		}

		if (!exists) {
			createNewUser(username, password, function (err, user) {
				if (err) {
					return callback(err);
				}

				console.log('created ned user');
				return callback(null, user);
			});
		} else {
			User.authenticate(username, password, function (err, user) {
				if (err) {
					return callback(err);
				}

				if (!user) {
					return callback(null, false);
				}

				// user authenticated
				return callback(null, user);
			});
		}

	});
}

var spotifyio = io.of('/spotify')
	.on('connection', function (socket) {

		socket.on('login', function (username, password) {
			loginOrCreateUser(username, password, function (err, user) {
				if (err) {
					console.log('err', err);
				} else if (!user) {
					socket.emit('wrong password');
				} else {
					socket.set('username', user.username, function () {
						socket.emit('authenticated', user.username);
					});
				}
			});
		});

		// Register spotify
		socket.on('register', function (hash) {
			// Update the user
			socket.get('username', function (err, username) {
				User.addSpotify(username, hash, function (err) {
					if (err) {
						console.log('error');
					}

					// Set the hash for this socket
					socket.set('hash', hash, function (err) {
						if (err) {
							console.log(err);
						} else {
							addSpotify(hash, socket);
							socket.emit('registred');
						}
					});
				});
			});
		});

		socket.on('playerUpdated', function (player, clientid) {
			console.log('playerUpdated');
			socket.get('hash', function (err, hash) {

				if (clientid != null) {
					getClient(hash, clientid).emit('playerUpdated', player);
				} else {
					getClients(hash).forEach(function (socket, index) {

						socket.emit('playerUpdated', player);
					});
				}
			});
		});

		socket.on('logout', function () {
			socket.get('username', function (err, username) {
				socket.set('username', null, function (err) {
					socket.get('hash', function (err, hash) {
						User.removeSpotify(username, hash, function (err) {
							getClients(hash).forEach(function (socket, index) {
								socket.emit('spotifyLoggedOut');
							});
							deleteSpotify(hash);
						});
					});
				});
			});
		});
	});

var clientio  = io.of('/client')
	.on('connection', function (socket) {
		
		socket.on('getSpotifys', function() {
			socket.get('username', function (err, username) {
				User.getSpotifys(username, function (err, spotifys) {
					if (err) {
						console.log('get spotifyes err', err);
					} else {
						socket.emit('sendSpotifys', spotifys);
					}
				});
			});
		});

		socket.on('login', function(username, password) {
			User.authenticate(username, password, function (err, user) {
				if (err) {
					console.log(err);
				} else if (!user) {
					socket.emit('wrong password');
				} else {
					socket.set('username', user.username, function () {
						socket.emit('authenticated', user.username);
					});
				}
			});
		});

		// Register client
		socket.on('register', function (hash) {
			// Make sure the user is permitted to connect to this spotify

			socket.get('username', function (err, username) {
				if (err) {
					console.log(err);
				} else {
					User.getSpotifys(username, function (err, spotifys) {
						if (spotifys.indexOf(hash) !== -1) {
							var id = addClient(hash, socket);
							socket.set('hash', hash, function () {
								socket.set('id', id, function () {
									console.log('added client id', id);
									getSpotify(hash).socket.emit('clientConnected', id);
									socket.emit('registred');
								});
							});
						}
					});
				}
			});
		});

		socket.on('sendCommand', function (command) {
			socket.get('hash', function (err, hash) {
				// Send the command to spotify
				var spotify = getSpotify(hash);
				if (spotify) {
					spotify.socket.emit('gotCommand', command);
				}
			});
		});

		socket.on('logout', function () {
			socket.get('hash', function (err, hash) {
				console.log('hash', hash);
				if (hash != null) {
					socket.get('id', function (err, id) {
						deleteClient(hash, id);
						socket.set('hash', null, function () {

						});
					});
				}
			});
		});
	});
