var http = require('http');
var url = require('url');

// { user: anonymid, response: responseObject }
var spotifys = [];

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

function getSpotify(user) {
	for (var i in spotifys) {
		if (spotifys[i].user == user) {
			return i;
		}
	}

	return -1;
}

http.createServer(function(request, response) {
	if (request.url == '/') {
		// send index
	} else {
		var urlObj = url.parse(request.url, true);
		var query = urlObj.query;

		switch (urlObj.pathname) {
			case '/addSpotify':
				var user = query.user;
				var spotify = spotifys[addSpotify(user)];
				spotify.response = response;

				// setup response
				response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Transfer-Encoding': 'chunked'} );

				console.log('Added spotify user: [' + user + ']');
				break;

			case '/sendCommand':
				var user = query.user;
				var command = query.command;
				var spotify = spotifys[getSpotify(user)];

				response.writeHead(200, { 'Content-Type': 'text/plain'} );
				spotify.response.write(command);
				response.write("Command sent");
				response.end();

				console.log('Sending command [' + command + '] to user [' + user + ']');

				break;

			default:
				// Handle invaild url
				response.writeHead(200, { 'Content-Type': 'text/plain'} );
				response.write('Wrong url: "' + request.url + '"');	
				response.end();
				break;
		}



	}


}).listen(1337);

console.log('Server started');