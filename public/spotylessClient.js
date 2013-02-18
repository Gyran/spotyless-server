(function () {
	"use strict";

	var socket;
	var APP_registred;
	var APP_logged_in;
	var APP_username;
	var APP_permissions;

	function dateStr(date) {
		function datePad(i) {
			if (i < 10) {
				return '0' + i;
			}
			return i;
		};

		if (date == null) {
			date = new Date();
		}
		var str;
		str = date.getFullYear() + '-' + datePad(date.getMonth() + 1) + '-'
			+ datePad(date.getDate()) + ' ' + datePad(date.getHours()) + ':'
			+ datePad(date.getMinutes()) + ':' + datePad(date.getSeconds());

	return str;
	}

	function playerUpdated(player) {
		console.log('player updated', player);

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

	function playlistChanged(playlist) {
		console.log(playlist);
		$('#playlist').html('');
		$.each(playlist, function(key, track) {
			var row = $('<tr>', { class: 'list' });
			var artistTd = $('<td>', { html: track.artist });
			row.append(artistTd);
			
			var titleTd = $('<td>', { html: track.name });
			row.append(titleTd);

			var playTd = $('<td>');
			$('<button>', {
				text: 'Play',
				click: function () {
					playTrack(track);
				}
			}).appendTo(playTd);
			row.append(playTd);

			var delTd = $('<td>');
			$('<button>', {
				text: 'Delete',
				click: function () {
					delTrack(track);
				}
			}).appendTo(delTd);
			row.append(delTd);

			$('#playlist').append(row);
		});
		
	}

	function disablePlayer() {
		$('#player a').addClass('disabled');
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

		if (APP_registred) {
			socket.emit('register', hash, true);	
		} else {
			socket.emit('register', hash, false);
		}
		
	}

	function spotifysReceived (spotifys) {
		console.log(spotifys);
		$.each(spotifys, function (i, spotify) {
			var row = $('<tr>');
			var name = $('<td>');
			var lastActivity = $('<td>');

			if (spotify.online) {
				$('<a>', {
					text: spotify.name,
					href: '#',
					click: registerSpotify,
					class: 'online'
				}).appendTo(name);
			} else {
				name.text(spotify.name);
			}

			lastActivity.text(dateStr(new Date(spotify.lastActivity)));

			row.click(function () {
				$('#spotifysList tr').removeClass('selected');
				$(this).addClass('selected');
			});

			name.appendTo(row);
			lastActivity.appendTo(row);
			row.appendTo('#spotifysList');
		});



		$('#spotifysList').show();
	}

	function permissionsUpdated(permissions) {
		APP_permissions = permissions;
		console.log(permissions);
	}

	// we have registred with a spotify
	function registred() {
		console.log('registred');
		APP_registred = true;
		$('#player a').removeClass('disabled');
	}

	function sendCommand(command) {
		if (APP_registred) {
			socket.emit('sendCommand', command);
		}
	}

	function spotifyLoggedOut() {
		logout();
	}

	function search() {
		$('#search').html('Searching...');
		if (APP_registred) {
			var needle = $('#searchNeedle').val();
			socket.emit('search', needle);
		}
	}

	function playTrack(track) {
		var command = {
			'type': 'player',
			'action': 'playTrack',
			'uri': track.uri
		}	
		sendCommand(command);
		console.log('playTrack', track);
	}

	function addTrack(track) {
		var command = {
			'type': 'playlist',
			'action': 'addTrack',
			'uri': track.uri
		}
		sendCommand(command);
	}

	function delTrack(track) {
		var command = {
			'type': 'playlist',
			'action': 'delTrack',
			'uri': track.uri
		}

		sendCommand(command);

	}

	function playSpotylessPlaylist () {
		var command = {type: 'player', action: 'playSpotylessPlaylist'};
		sendCommand(command);
	}

	function searchDone(tracks) {
		$('#search').html('');
		$.each(tracks, function(key, track) {
			var row = $('<tr>', { class: 'list' });
			var artistTd = $('<td>', { html: track.artist });
			row.append(artistTd);
			
			var titleTd = $('<td>', { html: track.name });
			row.append(titleTd);

			var playTd = $('<td>');
			$('<button>', {
				text: 'Play',
				click: function () {
					playTrack(track);
				}
			}).appendTo(playTd);
			row.append(playTd);

			var addTd = $('<td>');
			$('<button>', {
				text: 'add',
				click: function () {
					addTrack(track);
				}
			}).appendTo(addTd);
			row.append(addTd);

			$('#search').append(row);
		});
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
		socket.on('playlistChanged', playlistChanged);
		socket.on('searchDone', searchDone);
		socket.on('permissionsUpdated', permissionsUpdated);

		$('#username').val('Gyran');
		console.log('wut');

		$('#btnLogin').click(login);
		$('#btnLogout').click(logout);
		$('#btnSearch').click(search);
		$('#btnSpotylessPlay').click(playSpotylessPlaylist);
		

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
