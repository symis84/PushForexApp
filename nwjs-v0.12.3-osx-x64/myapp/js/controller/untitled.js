var exec = require('child_process').execFile;
var fun =function(){
   console.log("fun() start");
   exec('HelloJithin.exe', function(error, stdout, stderr) 
   {
       if ( error != null ) {
            console.log(stderr);
            // error handling & exit
       }else{
       		console.log(stdout);
       }
   });
}
fun();



task = require( '../lib/ms-task' );
task.pidOf( 'explorer.exe', function( err, pids ){
	if (err == null) {
		//error
	}else{
	    if (pids.length > 0){
	    	pids.forEach( function( pid ){
	        	console.log(pid);
	        	task.kill( pid ,function(err){
	        		if (err == null) {
	        			//done
	        		}else{
	        			//error
	        		}
	        	});
	    	});
	    }
	}
});

https://github.com/liamks/Delivery.js

Transfer files between two servers
Receive file

var io  = require('socket.io').listen(5001),
    fs  = require('fs'),
    dl  = require('delivery');

io.sockets.on('connection', function(socket){
  
  var delivery = dl.listen(socket);
  delivery.on('receive.success',function(file){
    fs.writeFile(file.name, file.buffer, function(err){
      if(err){
        console.log('File could not be saved: ' + err);
      }else{
        console.log('File ' + file.name + " saved");
      };
    });
  });   
});

Send file

var socket = io.connect('http://0.0.0.0:5001');

socket.on( 'connect', function() {
  log( "Sockets connected" );
		
  delivery = dl.listen( socket );
  delivery.connect();
	
  delivery.on('delivery.connect',function(delivery){
    delivery.send({
      name: 'sample-image.jpg',
      path : './sample-image.jpg'
    });
 
    delivery.on('send.success',function(file){
      console.log('File sent successfully!');
    });
  });
	
});