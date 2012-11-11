(function () {
	"use strict";

	var socket;
	var firstTime = true;

	function connectionEstablished() {
		/* TODO: Double definition */
		
		$('#ctrlPlayPause').click(function () {
			console.log('sending command playpause');
			var command = {type: 'player', action: 'playpause'};
			socket.emit('sendCommand', command);
		});

		$('#ctrlNext').click(function () {
			var command = {type: 'player', action: 'next'};
			socket.emit('sendCommand', command);
		});

		$('#ctrlPrev').click(function () {
			var command = {type: 'player', action: 'previous'};
			socket.emit('sendCommand', command);
		});

		$('#ctrlShuffle').click(function () {
			var command = {type: 'player', action: 'shuffle'};
			socket.emit('sendCommand', command);
		});

		$('#ctrlRepeat').click(function () {
			var command = {type: 'player', action: 'repeat'};
			socket.emit('sendCommand', command);
		});

		$('#login').hide();
		$('#player').removeClass('disabled');
	}

	function playerUpdated(player) {		
		if (player.playing) {
			$('#ctrlPlayPause').removeClass('play pause').addClass('pause');
		} else {
			$('#ctrlPlayPause').removeClass('play pause').addClass('play');
		}

		$('#playingTitle').text(player.track.data.name);
		$('#playingArtist').text(player.track.data.artists[0].name);
		
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

	function gotError(err) {
		alert(err);
	}

	function disconnected() {
		console.log('socket disconnected');
	}

	function spotifyDisconnected() {
		$('#player').addClass('disabled');
		$('#ctrlRepeat').removeClass('activated');
		$('#ctrlShuffle').removeClass('activated');
		$('#ctrlPlayPause').removeClass('play pause');

		$('#playingTitle').text('Spotify not connected..');
		$('#playingArtist').text('&nbsp;');

		$('#login').show();
	}

	function login(user) {
		socket = io.connect('http://gyran.se:9004/client');

		if (firstTime) {
			console.log('doing socket ons');
			// Got ok from server
			socket.on('ready', connectionEstablished);

			// Player in spotify updated
			socket.on('playerUpdated', playerUpdated);

			socket.on('errorMsg', gotError);

			socket.on('disconnect', disconnected);

			socket.on('spotifyDisconnected', spotifyDisconnected);

			firstTime = false;
		}

		// Register userid
		socket.emit('register', { 'user': user });
	}

	function init() {
		$('#userkey').val('7818e395028f89f5a72e18681ea5d6a16e4a3dc4');

		$('#btnLogin').click(function (e) {
			login($('#userkey').val());
		});

		$('#btnLogin').removeAttr("disabled");
	}

	$(document).ready(function () {
		init();
	});
}());
