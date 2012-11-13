module.exports = function (socket) {

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
			loginOrCreateUser(username, password, function (err, user) {
				if (err) {
					console.log('err', err);
				} else if (!user) {
					socket.emit('wrong password');
				} else {
					socket.set('authenticated', true, function () {
						socket.emit('authenticated');
					});
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

	}