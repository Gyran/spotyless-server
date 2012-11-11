// Spotyless
var SERVER_PORT = 9004;
var spotifys = {};
var clients = {};

/** Spotify
*** Object of a spotify
* hash: The spotifys hash
* socket: Socket to the spotify
* online: If the spotify is online
**/
function Spotify() {
	this.hash = '';
	this.socket = null;
	this.online = false;
}

/** Client
*** Object of a connected client
* spotifyHash: hash of the connected spotify
* socket: The socket to the client
**/
function Client() {
	this.spotifyHash = '';
	this.socket = null;
}

/** User
*** Object of a user in the database
* username: Username of the user
* passwordHash: The hashed password for the user
* spotifys: Array of listed spotifys
**/
function User() {
	this.username = '';
	this.passwordHash = '';
	this.spotifys = [];
}
/*********************/

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

// HTTPS
var https = require('https');
var fs = require("fs");
var options = {
  key: fs.readFileSync('privatekey.pem'),
  cert: fs.readFileSync('certificate.pem')
};

// Express
var express = require('express');
var app = express();

app.use(express.logger('dev'));
app.use(express.static(__dirname + '/public'));


var server = https.createServer(options, app).listen(9004);
//var server = app.listen(SERVER_PORT);

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

function createNewUser(username, password) {
	var user = new User();
	user.username = 

	usersCollection.
}

function loginOrCreateUser(username, password) {
	usersCollection.findOne({ 'username': username}, function (err, doc) {
		if (!err) {
			if (doc === null) {
				createNewUser(username, password);
			} else {

			}
		}
	});
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

		socket.on('login', function (username, password) {
			loginOrCreateUser(username, password);
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
