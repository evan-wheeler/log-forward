var io = require('socket.io');
var express = require( 'express' );
var http = require('http');
var net = require( 'net' );
var _ = require('underscore');

var argv = require( 'optimist' )
		.usage( 'Usage: $0 -p [num]' )
		.demand( 'p' )
		.alias( 'p', 'port' )
		.alias( 'w', 'web_port' )
		.default( 'w', 443 )
		.argv;
		
var app = express()
  , server = http.createServer(app)
  , io = io.listen(server);

io.set('log level', 1);                    // reduce logging

app.pending_events = [];
app.websocket = false;

server.listen( argv.w );

function onReceiveLogEvent( port, data ) { 
	var eventData,  dataStr = data.toString();
	
	try {
		// parse the incoming log message.
		eventData = JSON.parse( dataStr );
		
		// add the server info
		eventData.port = port;
		
		// send it out to everyone.
		io.sockets.in( 'everyone' ).emit( 'logevent', eventData );
	}
	catch(err) { 
		var fragment = ( dataStr.length > 40 ) ? dataStr.substr(0,40) : dataStr;
		console.error( "Error parsing '%s'...: %s", fragment, err.toString() );
	}
}

_.each( argv.port, function(p) {
	net.createServer( function(receiver) { 
		receiver.on( 'data', _.partial( onReceiveLogEvent, p ) );
	} ).listen( p, function() { 
		console.log( "Waiting for connection on port:", p );
	} );
} );

io.sockets.on('connection', function (socket) {  
	socket.join( 'everyone' );
});