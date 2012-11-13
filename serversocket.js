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
		console.log('Database connected');
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
	connectedSpotifys[hash] = { 'socket': socket, 'clients': [] }
}

function addClient(hash, socket) {
	connectedSpotifys[hash].clients.push(socket);
}

function getSpotify(hash) {
	return connectedSpotifys[hash];
}

function getClients(hash) {
	return getSpotify(hash).clients;
}

function deleteSpotify(hash) {
	delete connectedSpotifys[hash];
}

function deleteClient(user) {
	//delete clients[user];
}

function generatePasswordHash(password) {

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
					socket.set('hash', hash, function () {
						addSpotify(hash, socket);
						socket.emit('registred');
					});
				});
			});
		});

		socket.on('playerUpdated', function (player) {
			console.log('playerUpdated');
			socket.get('hash', function (err, hash) {
				getClients(hash).forEach(function (index, socket) {
					socket.emit('playerUpdated', player);
				});
			});
		});
	});

var clientio  = io.of('/client')
	.on('connection', function (socket) {
		
		socket.on('getSpotifys', function() {
			socket.get('username', function (err, username) {
				console.log(username);
				User.getSpotifys(username, function (err, spotifys) {
					if (err) {
						console.log('get spotifyes err', err);
					} else {
						socket.emit('sendSpotifys', spotifys);
					}
				});
			});
		});

		// Register client
		socket.on('register', function (data) {
			console.log('register client', data);
			
			// Save the clients socket
			addClient(data.user, { 'socket': socket });
			
			// Set the user for this socket
			socket.set('user', data.user, function () {

				// Notify spotify that a client has connected
				var spotify = getSpotify(data.user);
				if (spotify) {
					spotify.socket.emit('clientConnected');	
					
					// Emitting ready to client			
					socket.emit('ready');
				} else {
					socket.emit('errorMsg', 'No spotify connected');
				}
				
			});
		});

		socket.on('sendCommand', function (command) {
			socket.get('user', function (err, user) {

				// Send the command to spotify
				var spotify = getSpotify(user);
				if (spotify) {
					spotify.socket.emit('gotCommand', command);
				} else {
					socket.emit('errorMsg', 'Can\'t send command to spotify');
				}
			});
		});
	});
