// Spotyless
var SERVER_PORT = 9004;
var spotifys = {};
var clients = {};

// mongoDB
var mongo = require('mongodb');
var mongoServerObj = mongo.Server;
var mongoDbObj = mongo.Db;

var mongoServer = new mongoServerObj('localhost', 27017, {auto_reconnect: true});
var mongoDb = new mongoDbObj('spotyless', mongoServer);
var usersCollection;

mongoDb.open(function (err, db) {
	if (!err) {
		db.collection('users', function (err, collection) {
			usersCollection = collection;
			console.log('Database connected and collection retrived');
		});
	}
});

// Express
var express = require('express');
var app = express();

app.use(express.logger('dev'));
app.use(express.static(__dirname + '/public'));

var server = app.listen(SERVER_PORT);

// socket.io
var io = require('socket.io').listen(server);

function addSpotify(user, spotify) {
	spotifys[user] = spotify;
}

function addClient(user, client) {
	console.log("addClient", user);
	clients[user] = client;
}

function getSpotify(user) {
	return spotifys[user];
}

function getClient(user) {
	return clients[user];
}

function deleteSpotify(user) {
	delete spotifys[user];
}

function deleteClient(user) {
	delete clients[user];
}

var spotifyio = io.of('/spotify')
	.on('connection', function (socket) {

		socket.on('disconnect', function () {
			socket.get('user', function (err, user) {
				deleteSpotify(user);
				var client = getClient(user);
				if (client) {
					client.socket.emit('spotifyDisconnected');
				}
			});
		});

		// Register spotify
		socket.on('register', function (data) {
			console.log('register spotify', data.user);

			// Save the spotify socket
			addSpotify(data.user, { 'socket': socket });
			
			// Set the user for this socket
			socket.set('user', data.user, function () {
				socket.emit('ready');
			});
		});

		socket.on('playerUpdated', function (player) {
			socket.get('user', function (err, user) {

				// Send the player to the client
				var client = getClient(user);
				if (client) {
					client.socket.emit('playerUpdated', player);
				}
			});

		});

	});

var clientio  = io.of('/client')
	.on('connection', function (socket) {

		socket.on('disconnect', function () {
			socket.get('user', function (err, user) {
				deleteClient(user);
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
