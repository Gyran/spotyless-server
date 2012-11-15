(function () {
	"use strict";

	var socket;
	var APP_registred;
	var APP_logged_in;
	var APP_username;

	function playerUpdated(player) {
		console.log('player updated');

		if (player.playing) {
			$('#ctrlPlayPause').removeClass('play pause').addClass('pause');
		} else {
			$('#ctrlPlayPause').removeClass('play pause').addClass('play');
		}

		$('#playingTitle').html(player.track.data.name);
		$('#playingArtist').html(player.track.data.artists[0].name);
		
		if (player.shuffle) {
			$('#ctrlShuffle').addClass('activated');
		} else {
			$('#ctrlShuffle').removeClass('activated');
		}

		if (player.repeat) {
			$('#ctrlRepeat').addClass('activated');
		} else {
			$('#ctrlRepeat').removeClass('activated');
		}

	}

	function disablePlayer() {
		$('#player').addClass('disabled');
		$('#ctrlRepeat').removeClass('activated');
		$('#ctrlShuffle').removeClass('activated');
		$('#ctrlPlayPause').removeClass('play pause');

		$('#playingTitle').text('');
		$('#playingArtist').html('&nbsp;');
	}

	function logout() {
		$('#btnLogout').attr('disabled', 'disabled');
		$('#btnLogin').removeAttr('disabled');
		socket.emit('logout');

		disablePlayer();
		$('#login').show();
		$('#logout').hide();
		$('#spotifysList').html('').hide();
		APP_registred = false;
		APP_logged_in = false;
	}

	function login() {
		console.log('kör login');
		$('#btnLogin').attr('disabled', 'disabled');
		$('#btnLogout').removeAttr('disabled');

		$('#password').removeClass('wrong');
		var username = $('#username').val();
		var password = $('#password').val();
		$('#password').val('');

		socket.emit('login', username, password);
	}

	// When the connection to the server has been established
	function connectionEstablished() {
		console.log('connectionEstablished');
	}

	// Server responded wrong password
	function wrongPassword() {
		$('#password').val('');
		$('#password').addClass('wrong');
		$('#btnLogin').removeAttr('disabled');
	}

	// Login succeeded
	function authenticated(username) {
		APP_logged_in = true;
		APP_username = username;

		$('#login').hide();
		$('#loggedinAs').text('Logged in as ' + APP_username);
		$('#logout').show();

		socket.emit('getSpotifys');

	}

	function registerSpotify() {
		var hash = this.text;

		socket.emit('register', hash);

	}

	function spotifysReceived (spotifys) {
		$.each(spotifys, function (i, hash) {
			var li = $('<li/>');
			
			$('<a></a>', {
				text: hash,
				href: '#',
				click: registerSpotify
			}).appendTo(li);

			li.appendTo('#spotifysList');
		});

		$('#spotifysList').show();
	}

	// we have registred with a spotify
	function registred() {
		console.log('registred');
		APP_registred = true;
		$('#player').removeClass('disabled');
	}

	function sendCommand(command) {
		if (APP_registred) {
			socket.emit('sendCommand', command);
		}
	}

	function spotifyLoggedOut() {
		logout();
	}

	function init() {
		socket = io.connect('/client');

		socket.on('connect', connectionEstablished);
		socket.on('wrong password', wrongPassword);
		socket.on('authenticated', authenticated);
		socket.on('registred', registred);
		socket.on('sendSpotifys', spotifysReceived);
		socket.on('spotifyLoggedOut', spotifyLoggedOut);

		// Player in spotify updated
		socket.on('playerUpdated', playerUpdated);

		$('#username').val('Gyran');
		console.log('wut');

		$('#btnLogin').click(login);
		$('#btnLogout').click(logout);

		$('#ctrlPlayPause').click(function () {
			var command = {type: 'player', action: 'playpause'};
			sendCommand(command);
		});

		$('#ctrlNext').click(function () {
			var command = {type: 'player', action: 'next'};
			sendCommand(command);
		});

		$('#ctrlPrev').click(function () {
			var command = {type: 'player', action: 'previous'};
			sendCommand(command);
		});

		$('#ctrlShuffle').click(function () {
			var command = {type: 'player', action: 'shuffle'};
			sendCommand(command);
		});

		$('#ctrlRepeat').click(function () {
			var command = {type: 'player', action: 'repeat'};
			sendCommand(command);
		});
	}

	$(document).ready(function () {
		init();
	});
}());
