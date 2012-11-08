var http = require('http');
var url = require('url');
var fs = require('fs');
var qs = require('querystring');

/* Config */
var SERVER_PORT = 1337;
/**********/

// { user: anonymid, response: responseObject }
var spotifys = [];
var clients = [];

function addSpotify(user) {
	for (var i in spotifys) {
		if (spotifys[i].user == user) {
			return i;
		}
	}

	var spotify = {'response': null, 'user': user};
	spotifys.push(spotify);
	return spotifys.length - 1;
}

function addClient(user) {
	for (var i in clients) {
		if (clients[i].user == user) {
			return i;
		}
	}

	var client = {'response': null, 'user': user};
	clients.push(client);
	return clients.length - 1;
}

function getSpotify(user) {
	for (var i in spotifys) {
		if (spotifys[i].user == user) {
			return i;
		}
	}

	return -1;
}

function getClient(user) {
	for (var i in clients) {
		if (clients[i].user == user) {
			return i;
		}
	}

	return -1;
}

function sendIndex(response) {
	fs.readFile('index.html', function(err, data) {
		response.writeHead(200, {'Content-Type': 'text/html', 'Transfer-Encoding': 'chunked'});
		response.write(data);
		response.end();
	});
	/*
	if (sendIndex.cachedHtml) {
		response.writeHead(200, {'Content-Type': 'text/html', 'Transfer-Encoding': 'chunked'});
		response.write(sendIndex.cachedHtml);
		response.end();
	} else {
		fs.readFile('index.html', function(err, data) {
			sendIndex.cachedHtml = data;
			sendIndex(response);
		});
	}*/
}

function handleRequest(response, pathname, query) {
	console.log("Handeling request", pathname, query);


	if (pathname == '/') {
		sendIndex(response);
	} else {
		switch (pathname) {
			case '/addSpotify': // Spotify is connecting
				var user = query.user;
				var spotify = spotifys[addSpotify(user)];
				spotify.response = response;

				// setup response
				response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Transfer-Encoding': 'chunked'} );

				console.log('Added spotify user: [' + user + ']');
				break;

			case '/sendSpotifyCommand': // Send command to spotify
				var user = query.user;
				var command = query.command;
				var spotify = spotifys[getSpotify(user)];

				response.writeHead(200, { 'Content-Type': 'text/plain'} );
				spotify.response.write(command);
				spotify.response.end();

				response.write("Command sent");
				response.end();

				console.log('Sending command [' + command + '] to user [' + user + ']');
				break;
			case '/login': // Client is logging in
				var user = query.user;
				var client = clients[addClient(user)];
				client.response = response;

				response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Transfer-Encoding': 'chunked'} );

				console.log('Added client for user [' + user + ']');
				break;
			case '/sendClientUpdate': // Send update to client
				var user = query.user;
				var update = query.update;
				var value = query.value;
				var client = clients[getClient(user)];

				console.log('Sending update to user [' + user + '] [' + update + '] = [' + value + ']');

				response.writeHead(200, { 'Content-Type': 'text/plain'} );
				client.response.write('{\'update\': ' + update + ', \'value\':' + value + '}');
				client.response.end();
				response.write("update sent");
				response.end();

				break;

			default:
				// Handle invaild url
				response.writeHead(200, { 'Content-Type': 'text/plain'} );
				response.write('Wrong url: "' + request.url + '"');	
				response.end();
				break;
		}
	}
}

// Create the server
http.createServer(function(request, response) {
	var urlObj = url.parse(request.url, true)

	if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;
            if (body.length > 1e6) {
                // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                request.connection.destroy();
            }
        });
        request.on('end', function () {
            var query = qs.parse(body);
            
            handleRequest(response, urlObj.pathname, query);

        });
    } else {
    	handleRequest(response, urlObj.pathname, urlObj.query);
    }
}).listen(SERVER_PORT);

console.log('Server started, listening on port ' + SERVER_PORT);