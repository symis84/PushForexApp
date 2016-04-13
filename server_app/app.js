var express = require('express');
var app = express();
var fs = require("fs");
var Datastore = require('nedb');
var db = "";
var serverName = "betaTest";
var mv = require('mv');
var request = require('request');

console.log("start");

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

if(!fs.existsSync("/Applications/4Casters/server/db")){
  console.log("creating database00");
  fs.mkdir("/Applications/4Casters/server/db", 0766, function(err){
      console.log("creating database01");
      if(err){
        console.log("ERROR! Can't make the directory: "+err);
        console.log("Error to create 'db' directory");
      }else{
        console.log("creating database");
        db = new Datastore({ filename: '/Applications/4Casters/server/db/store.json', autoload: true });
      }
  });   
}else{
  copyFile('/Applications/4Casters/server/db/store.json','/Applications/4Casters/server/db/store_temp.json',function(err){
    if (err == null || err == undefined || err == '') {
      db = new Datastore({ filename: '/Applications/4Casters/server/db/store.json', autoload: true });
      setTimeout(function () {
        fs.unlink('/Applications/4Casters/server/db/store.json', function(err){
          console.log("err: "+err);
          if (!err){
            fs.rename('/Applications/4Casters/server/db/store_temp.json', '/Applications/4Casters/server/db/store.json', function(err) {
              if(err){
                console.log('error to rename file');
              }else{

              }
            });
          }else{
            console.log("error to delete file");
          }
        });
      },2000);
    }
  });
}

if(!fs.existsSync("/Applications/4Casters/server/tempFile")){
  fs.mkdir("/Applications/4Casters/server/tempFile/", 0766, function(err){
    if(err){
      console.log("error1");
      console.log("ERROR! Can't make the directory: "+err);
    }
  });
};

app.get('/', function (req, res) {
  res.send('Hello World!');
});



app.post('/updateSettingAlgo', function(req, res) {
  //console.log("req.body: ",req.body);
  console.log("req: ",req.query);
  var body = req.query; 
  var algoObj = req.body;
  var algoId = req.body['_id'];
  var localAlgoVersion = algoObj['algo_version'];
  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");
        callback(true);
      });
    });
  } 
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {
      //UPDATING ALGO SETTING ON SERVER
      if (docs[0].algo_version > localAlgoVersion || docs[0].algo_version == localAlgoVersion) {
        console.log("the algo server version is == or > than the request algo_version. No needs to update the server algo");
        res.status(200).send({error:0,msg:"A new algo version is available on Server, sync your app before to delete algo"});
      }else if (docs[0].algo_version < localAlgoVersion){
        console.log("algo server version needs to be updated, going to update the algo server version");
        docs[0].algo_version = localAlgoVersion;
        docs[0]['betaTest'] = algoObj['betaTest'];
        updateSetting(docs[0]['_id'],docs[0]['betaTest'],localAlgoVersion,'betaTest',function(){
          
          docs[0].algo_version = localAlgoVersion;
          docs[0]['prod'] = algoObj['prod'];
          updateSetting(docs[0]['_id'],docs[0]['prod'],localAlgoVersion,'prod',function(){

            var action = { 'algoImgName':algoObj.algoImgName,'algo_version':algoObj.algo_version, 'algoImgPath':algoObj.algoImgPath, 'algoName':algoObj.algoName, 'algoType':algoObj.algoType, 'algoFileName':algoObj.algoFileName, 'algo_version':algoObj.algo_version};
            db.update({ _id: docs[0]['_id'] }, { $set: action }, function () {
              db.persistence.compactDatafile();
              console.log("updated setting algo on server");
              res.status(200).send({error:0,msg:"updated algo setting during upload algo"}); 
            });
          });
        });
      }
    }else{
      res.status(200).send({error:1,msg:"algo doesn't exist on Server. Its not possible to update the algo setting"}); 
    }
  });
});    

	
app.get('/checkAlgoName',function(req, res) {
  console.log("req.query.algoName: "+req.query.algoName);
  db.find({ algoName: req.query.algoName }, function (err, docs) {
    console.log("result: "+docs);
    console.log("result: "+JSON.stringify(docs) );

    if (err) {
      res.status(500);
    };

    if (docs.length > 0) {
      console.log("algo name already exist");
      res.status(200).send('1');
    }else{
      console.log("new algo name");
      res.status(200).send('0');
    }
  });
});


app.get('/checkAlgoVersion',function(req, res) {
  console.log("req.query.algoId: "+req.query.algoId);
  db.find({ _id: req.query.algoId }, function (err, docs) {
    console.log("result: "+docs);
    console.log("result: "+JSON.stringify(docs) );

    if (err) {
      res.status(500);
    };

    if (docs.length > 0) {
      console.log("algo exist");
      console.log("algo version: ",docs[0].algo_version);
      res.status(200).send({error:0,msg:'algo id  exist',algoVersion:docs[0].algo_version,algoDetail:docs[0]});
    }else{
      console.log("algo doesnt exist");
      res.status(200).send({error:1,msg:'algo id doesnt exist'});
    }
  });
});


app.get('/removeUploadAlgo', function(req, res) {
  console.log("req.query: ",req.query);
  console.log("req.query.localLastAlgoVersion: ",req.query.localLastAlgoVersion);
  console.log("req.query.tmpAlgoId: ",req.query.tmpAlgoId);

  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        
        
      });

    });


  } 

  var updateLocalServer = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        var deleteFolderRecursive = function(path) {
          if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
              var curPath = path + "/" + file;
              fs.unlinkSync(curPath);
            });
            fs.rmdirSync(path);
            return true;
          }else{
            return true;
          }
        };

        var path ="/Applications/4Casters/server/"+algoId;
        console.log("delete, url: ",path);
        var result = deleteFolderRecursive(path);
        var path2 ="/Applications/4Casters/server/tempFile/"+algoId;
        var result = deleteFolderRecursive(path2);


        if (result == true) {
          callback(true);
          //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        }else{
          callback(false);
          //res.status(400).send({error:1,msg:"Error to delete Algo on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        }
        
      });

    });
  };


  db.find({ _id: req.query.tmpAlgoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("result: "+docs);
      console.log("result: "+JSON.stringify(docs) );
      //console.log("docs[0][serverName].server_version: ",docs[0][serverName].server_version);

      console.log("algo id exist");
      console.log("docs[0]: ",docs[0]);
      if (docs[0].algo_version > req.query.localLastAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:req.query.tmpAlgoId});
      }else if  (docs[0].algo_version == req.query.localLastAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if( req.query.onlyUpdateSetting == 'true' ){

          // 3A - PROD UPDATE SETTING (BETA TEST OBJ) AND THAN RESPONSE TO BETA SERVER
          console.log("3A - PROD - PROD UPDATE SETTING (BETATEST OBJ) AND THAN RESPONSE TO BETA SERVER");
          docs[0][req.query.serverName].actionDeploy = false;
          docs[0][req.query.serverName].statusValue = 0;
          docs[0][req.query.serverName].statusLabel = "ToDo";
          updateSetting(docs[0]['_id'],docs[0]['betaTest'],docs[0].algo_version,'betaTest',function(result){
            if (result == true) {
              res.status(200).send({error:0,msg:"Updated setting on prod",algo_id:req.query.tmpAlgoId,algo_new_version:docs[0].algo_version}); 
            }else if (result == false) {
              res.status(200).send({error:0,msg:"Error to upload setting on prod",algo_id:req.query.tmpAlgoId,algo_new_version:docs[0].algo_version}); 
            }
          });
        }       

        if (  req.query.prodServer == 'true' && req.query.remoteServerURL != "" ) {

          // 1B - BETA - BETA SERVER PROXY REQUEST TO PROD SERVER TO REMOVE ALGO
          console.log("1B - BETA - BETA SERVER PROXY REQUEST TO PROD SERVER TO REMOVE ALGO");
          var url = req.query.remoteServerURL+'/removeUploadAlgo?tmpAlgoId='+req.query.tmpAlgoId+"&localLastAlgoVersion="+req.query.localLastAlgoVersion+"&onlyUpdateSetting=false&betaServer=true&prodServer=false&remoteServerURL=&onlyLocalServer=true&serverName=prod";
          request(url, function (error, response, body) {
            console.log("error: ",error);
            if (!error && response.statusCode == 200) {
              body = JSON.parse(body);
              console.log("body: ",body);
              //console.log("response: ",response);
              console.log("body.error: ",body.error);
              console.log("body.error: ",body.error);
              if (body != undefined && body != null && body != "") {
                if ( body.error == 0 || body.error == 2) {
                  console.log("removed algo on prod server, updating setting on local server");

                  // 3B - BETA - AFTER PROD REMOVED ALGO, BETA SERVER UPDATE SETTING
                  console.log("3B - BETA - AFTER PROD REMOVED ALGO, BETA SERVER UPDATE SETTING");
                  docs[0]['prod'].actionDeploy = false;
                  docs[0]['prod'].statusValue = 0;
                  docs[0]['prod'].statusLabel = "ToDo";
                  updateSetting(docs[0]['_id'],docs[0]['prod'],docs[0].algo_version,'prod',function(result){
                    if (result == true) {
                      res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:req.query.tmpAlgoId,algo_new_version:docs[0].algo_version}); 
                    }else if (result == false){
                      res.status(200).send({error:0,msg:"Algo removed on prod but error to update setting on beta",algo_id:req.query.tmpAlgoId,algo_new_version:docs[0].algo_version}); 
                    }
                  });
                  

                }else{
                  res.status(200).send({error:1,msg:"Error to remove upload algo on prod server",algoId:req.query.tmpAlgoId}); 
                }
              }else{
                res.status(200).send({error:1,msg:"Error to remove upload algo on prod server",algoId:req.query.tmpAlgoId}); 
              }
            }else{
              res.status(200).send({error:1,msg:"connection error, error to remove upload algo on prod, try again",algoId:req.query.tmpAlgoId}); 
            }
          });
        }else{

          console.log("req.query.remoteServerURL : "+req.query.remoteServerURL );
          console.log("req.query.prodServer : "+req.query.prodServer );
          
          if( req.query.onlyLocalServer != undefined && req.query.onlyLocalServer != null && req.query.onlyLocalServer == 'true' ) {
            // 2B - PROD - AFTER BETA SERVER PROXY TO PROD SERVER, PROD SERVER REMOVE ALGO AND SEND RESPONSE TO BETA SERVER
            console.log("2B - PROD - AFTER BETA SERVER PROXY TO PROD SERVER, PROD SERVER REMOVE ALGO AND SEND RESPONSE TO BETA SERVER");
            docs[0][req.query.serverName].actionDeploy = false;
            docs[0][req.query.serverName].statusValue = 0;
            docs[0][req.query.serverName].statusLabel = "ToDo";
            updateLocalServer(docs[0]['_id'],docs[0]['prod'],docs[0].algo_version,'prod',function(result){
              if (result == true) {
                res.status(200).send({error:0,msg:"Algo removed on beta server",algo_id:req.query.tmpAlgoId}); 
              }else if (result == false) {
                res.status(200).send({error:1,msg:"Error to remove algo on prod server",algoId:req.query.tmpAlgoId}); 
              };
            });

          }else if(req.query.prodServer == 'false' && req.query.remoteServerURL != "") {
           

            // 1A - BETA - BETA SERVER REMOVE ALGO
            console.log("1A - BETA - BETA SERVER REMOVE ALGO");
            docs[0]['betaTest'].actionDeploy = false;
            docs[0]['betaTest'].statusValue = 0;
            docs[0]['betaTest'].statusLabel = "ToDo";
            updateLocalServer(docs[0]['_id'],docs[0]['betaTest'],docs[0].algo_version,'betaTest',function(result){

              if (result == true) {
                // 2A - BETA - BETA SERVER SEND THE REQUEST TO UPDATE SETTING (BETATEST OBJ) TO PROD
                console.log("2A - BETA - BETA SERVER SEND THE REQUEST TO UPDATE SETTING (BETATEST OBJ) TO PROD");
                var url = req.query.remoteServerURL+'/removeUploadAlgo?tmpAlgoId='+req.query.tmpAlgoId+"&localLastAlgoVersion="+req.query.localLastAlgoVersion+"&onlyUpdateSetting=true&betaServer=true&prodServer=false&remoteServerURL=&serverName=betaTest";
                request(url, function (error, response, body) {
                  console.log("error: ",error);
                  if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    console.log("body: ",body);
                    console.log("response: ",response);
                    console.log("body.error: ",body.error);
                    console.log("body.error: ",body.error);
                    if (body != undefined && body != null && body != "") {
                      if ( body.error == 0 || body.error == 2) {
                        console.log("removed algo on beta server and updated prod server setting");
                        res.status(200).send({error:0,msg:"Algo removed on beta and server setting chnaged on prod",algo_new_version:docs[0].algo_version,algo_id:body.algo_id}); 
                      }else{
                        res.status(200).send({error:0,msg:"Algo removed on beta but Error to change setting on prod",algo_new_version:docs[0].algo_version,algoId:req.query.tmpAlgoId}); 
                      }
                    }else{
                      res.status(200).send({error:0,msg:"Algo removed on beta but Error to change setting on prod",algo_new_version:docs[0].algo_version,algoId:req.query.tmpAlgoId}); 
                    }
                  }else{
                    res.status(200).send({error:0,msg:"Algo removed on beta but Error to change setting on prod, connectio error",algo_new_version:docs[0].algo_version,algoId:req.query.tmpAlgoId}); 
                  }
                });
              }else if (result == false) {
                res.status(200).send({error:1,msg:"Error to remove upload algo on beta server"}); 
              };

            });

          }else if(req.query.prodServer == 'false' && req.query.remoteServerURL != ""){
            console.log("req.query.remoteServerURL 1: "+req.query.remoteServerURL );
            console.log("req.query.prodServer 1: "+req.query.prodServer );
            if (req.query.remoteServerURL == "" || req.query.remoteServerURL == undefined || req.query.remoteServerURL == null) {
              // 1C - BETA - BETA SERVER REMOVE ALGO AND UPDATE SETTING (PROD SERVER IS NOT DEFINED). THAN AND ANSWEAR TO CLIENT 
              console.log("1C - BETA - BETA SERVER REMOVE ALGO AND UPDATE SETTING (PROD SERVER IS NOT DEFINED). THAN AND ANSWEAR TO CLIENT");
              docs[0]['betaTest'].actionDeploy = false;
              docs[0]['betaTest'].statusValue = 0;
              docs[0]['betaTest'].statusLabel = "ToDo";
              updateLocalServer(docs[0]['_id'],docs[0]['betaTest'],docs[0].algo_version,'betaTest',function(result){
                if (result == true) {
                  console.log('Algo removed on beta server');
                  res.status(200).send({error:0,msg:"Algo removed on beta server",algo_new_version:docs[0].algo_version}); 
                }else if (result == false) {
                  console.log('Error to remove algo on beta server');
                  res.status(200).send({error:1,msg:"Error to remove algo on beta server"}); 
                };
              });
            };
          };

        };
      }
    }else{
      console.log("Algo doesn't exist on server");
      res.status(200).send({error:1,msg:"Algo doesn't exist on beta server",algoId:req.query.tmpAlgoId}); 
    }
  });
});



app.get('/deleteAlgo', function(req, res) {
  console.log("req.query: ",req.query);
  console.log("req.query.localLastAlgoVersion: ",req.query.localLastAlgoVersion);
  console.log("req.query.tmpAlgoId: ",req.query.tmpAlgoId);


  var updateLocalServer = function(algoId,newAlgoName,newAlgoVersion){
    
    db.remove({ _id: algoId }, {}, function (err, numRemoved) {
      if (err) {
        db.persistence.compactDatafile();
        res.status(500);
      }else{
        db.persistence.compactDatafile();

        //TO DO delete folder algo id
        var deleteFolderRecursive = function(path) {
          if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
              var curPath = path + "/" + file;
              fs.unlinkSync(curPath);
            });
            fs.rmdirSync(path);
            return true;
          }else{
            return true;
          }
        };

        var path ="/Applications/4Casters/server/"+algoId;
        var result = deleteFolderRecursive(path);

        res.status(200).send({error:0,msg:"Algo id deleted on Beta server and Prod server: ",algo_id:algoId}); 
      }
    });

  };


  db.find({ _id: req.query.tmpAlgoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("result: "+docs);
      console.log("result: "+JSON.stringify(docs) );
      //console.log("docs[0][serverName].server_version: ",docs[0][serverName].server_version);

      console.log("algo id exist");
      console.log("docs[0]: ",docs[0]);
      if (docs[0].algo_version > req.query.localLastAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to delete the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:req.query.tmpAlgoId});
      }else if  (docs[0].algo_version == req.query.localLastAlgoVersion){
        console.log("algo exist on server and they have the same local version");

        var url = "";
        if (  req.query.prodServer != undefined && req.query.prodServer != null && req.query.prodServer != "") {
          url = req.query.prodServer+'/deleteAlgo?&tmpAlgoId='+req.query.tmpAlgoId+"&localLastAlgoVersion="+req.query.localLastAlgoVersion+"&prodServer=";
          request(url, function (error, response, body) {
            console.log("error: ",error);
            if (!error && response.statusCode == 200) {
              body = JSON.parse(body);
              console.log("body: ",body);
              console.log("response: ",response);
              console.log("body.error: ",body.error);
              console.log("body.error: ",body.error);
              if (body != undefined && body != null && body != "") {
                if ( body.error == 0 || body.error == 2) {
                  console.log("Deleted algo on prod server, going to delete algo on Beta server");
                  updateLocalServer(docs[0]['_id']);
                }else{
                  res.status(200).send({error:1,msg:"Error to delete algo on prod server",algoId:req.query.tmpAlgoId}); 
                }
              }else{
                res.status(200).send({error:1,msg:"Error to delete algo on prod server",algoId:req.query.tmpAlgoId}); 
              }
            }else{
              res.status(200).send({error:1,msg:"connection error, error to delete algo on prod, try again",algoId:req.query.tmpAlgoId}); 
            }
          });
        }else{
          console.log("going to rename algo on: "+serverName);
          updateLocalServer(docs[0]['_id']);
        }
      }
    }else{
      console.log("Algo doesn't exist on server");
      res.status(200).send({error:2,msg:"Algo doesn't exist on beta server",algoId:req.query.tmpAlgoId}); 
    }
  });
});





app.get('/renameAlgo', function(req, res) {
  console.log("req.query: ",req.query);
  console.log("req.query.newAlgoName: ",req.query.newAlgoName);
  //console.log("req.query.localLastServerVersion: ",req.query.localLastServerVersion);
  console.log("req.query.localLastAlgoVersion: ",req.query.localLastAlgoVersion);
  console.log("req.query.tmpAlgoId: ",req.query.tmpAlgoId);


  var updateLocalServer = function(algoId,newAlgoName,newAlgoVersion){
    //console.log("docs[0][serverName]: ",docs[0][serverName] );
    /*var action = {};
    action[serverName] = docs[0][serverName];
    db.update({ _id: req.query.tmpAlgoId }, { $set: action }, function () {
      db.persistence.compactDatafile();*/
    db.update({ _id: algoId }, { $set: { algoName: newAlgoName } }, function () {
      db.persistence.compactDatafile();
      console.log("updated name algo");
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");
        res.status(200).send({error:0,msg:"Algo name updated on Beta server and Prod server",new_algo_version:newAlgoVersion,new_name:newAlgoName}); 
      });
    });
  }


  db.find({ _id: req.query.tmpAlgoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("result: "+docs);
      console.log("result: "+JSON.stringify(docs) );
      //console.log("docs[0][serverName].server_version: ",docs[0][serverName].server_version);

      var new_algo_version = docs[0].algo_version + 1;

      console.log("algo id exist");
      console.log("docs[0]: ",docs[0]);
      if (docs[0].algo_version > req.query.localLastAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to rename the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to rename algo"});
      /*}else if (docs[0][serverName].server_version > req.query.server_version) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to rename the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to rename algo"});*/
      }else if  (docs[0].algo_version == req.query.localLastAlgoVersion){
        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;
        docs[0].algoName = req.query.newAlgoName;


        var url = "";
        if (  req.query.prodServer != undefined && req.query.prodServer != null && req.query.prodServer != "") {
          url = req.query.prodServer+'/renameAlgo?newAlgoName='+req.query.newAlgoName+"&tmpAlgoId="+req.query.tmpAlgoId+"&localLastAlgoVersion="+req.query.localLastAlgoVersion+"&prodServer=";
          request(url, function (error, response, body) {
            console.log("error: ",error);
            if (!error && response.statusCode == 200) {
              body = JSON.parse(body);
              console.log("body: ",body);
              console.log("response: ",response);
              console.log("body.error: ",body.error);
              console.log("body.error: ",body.error);
              if (body != undefined && body != null && body != "") {
                if ( body.error == 0 || body.error == 2) {
                  console.log("Renamed algo on prod server, going to rename algo on Beta server");
                  updateLocalServer(docs[0]['_id'],docs[0].algoName,docs[0].algo_version);
                }else{
                  res.status(200).send({error:1,msg:"Error updating prod server",new_algo_version:null,new_name:null}); 
                }
              }else{
                res.status(200).send({error:1,msg:"Error updating prod server",new_algo_version:null,new_name:null}); 
              }
            }else{
              res.status(200).send({error:1,msg:"Error updating prod server",new_algo_version:null,new_name:null}); 
            }
          });
        }else{
          console.log("going to rename algo on: "+serverName);
          updateLocalServer(docs[0]['_id'],docs[0].algoName,docs[0].algo_version);
        }
      }
    }else{
      console.log("Algo doesn't exist on server");
      res.status(200).send({error:2,msg:"Algo doesn't exist on beta server. Server not updated",new_algo_version:null,new_name:req.query.newAlgoName}); 
    }
  });
});


app.get('/getAllAlgos', function(req, res) {
  db.find({}, function (err, docs) {
    console.log("result: "+docs);
    console.log("result: "+JSON.stringify(docs) );
    if (err) {
      res.status(500);
    }else{
      res.status(200);
      res.send(docs);
    }
  });
});



/*var deletAllFilesInFolder = function(dirPath){
  try { var files = fs.readdirSync(dirPath); }
  catch(e) { return true; }

  if(files.length > 0){
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
        fs.unlinkSync(filePath);
    }
  }
  return true;
};*/


app.get('/updateSettingNewAlgo', function(req, res) {
  // WRITE LOGIC FOR UPDATE SETTING DURING UPLOADING ALGO ON SERVER
  var serverName = req.query.serverName;
  var statusLabel = req.query.statusLabel;
  var actionDeploy = req.query.actionDeploy;
  var actionStop = req.query.actionStop
  var statusValue = req.query.statusValue;
  var localAlgoVersion = req.query.localLastAlgoVersion;
  var algoDetails = req.headers['algo-details'];
  var algoId = req.query.tmpAlgoId;

  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"updated algo setting for prod during upload lgo",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });

  } 

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      //UPDATING(UPLOADING) THE NEW ALGO ON THE SERVER
      console.log("in 0 updateSettingNewAlgo");
      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to upload the algorithm again");
        res.status(200).send({error:0,msg:"A new algo version is available on Server, sync your app before to delete algo"});
      }else if (docs[0].algo_version == localAlgoVersion || docs[0].algo_version < localAlgoVersion){
        console.log("in 1 updateSettingNewAlgo");
        console.log("algo exist on server and they have the same local version");
        docs[0].algo_version = localAlgoVersion;
        docs[0][serverName].actionDeploy = true;
        docs[0][serverName].actionStop = true;
        docs[0][serverName].statusValue = 1;
        docs[0][serverName].statusLabel = "Deployed";
        console.log("in 2 updateSettingNewAlgo: ",docs[0][serverName]);
        updateSetting(docs[0]['_id'],docs[0][serverName],localAlgoVersion,serverName,function(){
          res.status(200).send({error:0,msg:"updated algo setting during upload algo"}); 
        });
      }

    }else{
      console.log("Error, Algorithm doesn't exist on server, creating a new algo obj on DB");
      var tempJson2 = JSON.parse(algoDetails);
      tempJson2.algo_version = localAlgoVersion;
      db.insert(tempJson2, function (err, newDoc) {   
        console.log("err: "+err);
        console.log("newDoc: "+newDoc);

        newDoc[serverName].statusLabel = 'Deployed'; 
        newDoc[serverName].statusValue = '1'; 
        newDoc[serverName].actionDeploy = true;
        newDoc.algo_version = localAlgoVersion;
        updateSetting(newDoc['_id'],newDoc[serverName],newDoc.algo_version,serverName,function(){
          res.status(200).send({error:0,msg:"updated algo setting during upload algo"}); 
        });
      });
    }

  });
  
});    


app.post('/uploadOnBeta', function(req, res) {

	console.log("req: "+req.headers);
  console.log("req: "+JSON.stringify(req.headers));
	console.log("req name file: "+req.headers['name-file']);
	var nameFile = req.headers['name-file'];
  var algoId = req.headers['algo-id'];
	var algoDetails = req.headers['algo-details'];
  var prodServer = req.headers['prod-server'];
  var serverName = req.headers['server-name'];
  var remoteServerURL = req.headers['remote-server-url'];
  var localAlgoVersion = req.headers['local-algo-version'];

  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });
  } 

  var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        fs.unlinkSync(curPath);
      });
      fs.rmdirSync(path);
      return true;
    }else{
      return true;
    }
  };

	if(!fs.existsSync("/Applications/4Casters/server")){
     	console.log("ERROR! 'Server' directory doesn't exist");
 			var hed = {"status":"400","msg":"on server"};
 			res.set('response-msg', JSON.stringify(hed));
 			res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
	}

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("localAlgoVersion: ",localAlgoVersion);
      console.log("docs[0].algo_version: ",docs[0].algo_version);


      //UPDATING(UPLOADING) THE NEW ALGO ON THE SERVER
      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:algoId});
      }else if (docs[0].algo_version == localAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if(fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to upload Algorithm. This Algorithm already exist on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
          //send response : delete algo before to upload again



        }else{
          if(!fs.existsSync("/Applications/4Casters/server/tempFile")){
            fs.mkdir("/Applications/4Casters/server/tempFile", 0766, function(err){
              if(err){console.log("ERROR! Can't make the directory: "+err)}
            });  
          }
          if(fs.existsSync("/Applications/4Casters/server/tempFile"+algoId)){
            deleteFolderRecursive('/Applications/4Casters/server/tempFile/'+algoId);
          }
          fs.mkdir("/Applications/4Casters/server/tempFile/"+algoId, 0766, function(err){
            if(err){
              console.log("error1");
              console.log("ERROR! Can't make the directory: "+err);
            }else{
              var target = '/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile;
              var wr = fs.createWriteStream(target);
              wr.on("error", function(err) {
                console.log("error1: "+JSON.stringify(err));
                var hed = {"status":"400","msg":"to write file no server"};
                res.set('response-msg', JSON.stringify(hed));
                res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                //done(err,name);
              });
              wr.on("close", function(ex) {

                var tempJson = JSON.parse(algoDetails);
                delete tempJson['$$hashKey'];

                //UPDATED SETTING ON BETA SERVER - GOING TO MOVE ALGO FORM TEMP FOLDER TO SERVER FOLDER, AND GOING TO UPDATE JSON DB WITH NEW ALGO SETTING
                fs.mkdir("/Applications/4Casters/server/"+algoId, 0766, function(err){
                  if(err){
                    console.log("error1");
                    console.log("ERROR! Can't make the directory: "+err);
                  }else{
                    console.log("err 0: ");
                    mv('/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile, '/Applications/4Casters/server/'+algoId+'/'+nameFile, function(err) {
                      console.log("err 1: ",err);
                      if(err == undefined || err == null || err == ""){
                        //deletAllFilesInFolder('/Applications/4Casters/tempFile/'+algoId);
                        console.log("in");
                        deleteFolderRecursive('/Applications/4Casters/server/tempFile/'+algoId);
                        var hed = {"status":"200","msg":"Algorithm uploaded on Server"};
                        res.set('response-msg', JSON.stringify(hed));
                        console.log("closed file");
                        console.log("Algo details:",algoDetails);
                        
                        var tempJson2 = JSON.parse(algoDetails);
                        delete tempJson2['$$hashKey'];
                        
                        docs[0]['betaTest'].statusLabel = 'Deployed'; 
                        docs[0]['betaTest'].statusValue = '1'; 
                        docs[0]['betaTest'].actionDeploy = true;
                        docs[0]['betaTest'].actionStop = true;
                        updateSetting(docs[0]['_id'],docs[0]['betaTest'],docs[0].algo_version,'betaTest',function(result){

                          if (result == true) {
                            if(prodServer == 'true' && remoteServerURL != "") {
                              // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER
                              var options = {
                                url : remoteServerURL+'/updateSettingNewAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+docs[0].algo_version+"&serverName=betaTest&statusLabel=Deployed&actionDeploy=true&statusValue=1&actionStop=true",
                                headers: {
                                  'Algo-Id': algoId,
                                  'Algo-Details': JSON.stringify(tempJson2)
                                }
                              };
                              request(options, function (error, response, body) {
                                console.log("error: ",error);
                                var body = JSON.parse(body);
                                if (!error && response.statusCode == 200 && body.error == '0') {
                                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                                  var hed = {"status":"200","msg":"Algo uploaded on beta server. Setting updated on Prod server"};
                                  res.set('response-msg', JSON.stringify(hed));
                                  res.status(200).send({error:0,msg:"Algo uploaded on beta server and updated setting on prod",algoId:algoId}); 
                                }else{
                                  var hed = {"status":"200","msg":"Algorithm uploaded on Server, Error to update prod server."};
                                  res.set('response-msg', JSON.stringify(hed));
                                  res.status(200).send({error:0,msg:"Error to update setting on remote server. Try to Sync locally.  ",algoId:algoId}); 
                                }
                              });
                            }else{
                              var hed = {"status":"200","msg":"Algorithm uploaded on Server"};
                              res.set('response-msg', JSON.stringify(hed));
                              res.status(200).send({error:0,msg:"Algo uploaded on beta server: ",algoId:algoId}); 
                            }
                          }else{
                            deleteFolderRecursive('/Applications/4Casters/server/tempFile/'+algoId);
                            deleteFolderRecursive('/Applications/4Casters/server/'+algoId);
                            res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                          }
                        }); 
                       
                      }else{
                        var hed = {"status":"400","msg":"Error to upload algo on Beta server"};
                        res.set('response-msg', JSON.stringify(hed));
                        res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                      }
                    });    
                   } 

                });

              });
              var data = "";
              req.on('data', function (chunk) {
                  //console.log(chunk);
                  data += chunk;
                  //console.log("data.length: ",data.length);
              });
              req.pipe(wr);
              req.on('error', function(e) {
                console.log('problem with request: '+ JSON.stringify(e.message));
                var hed = {"status":"400","msg":" on request to upload algo"};
                res.set('response-msg', JSON.stringify(hed));
                res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
              });
              req.on('end', function(){
                console.log("req finished");
                  //callback(data);
              });
            };
          });
        }

      }



    }else{

      //CREATING (UPLOADING) THE NEW ALGO ON THE BETA SERVER
      console.log("result: "+docs);
      console.log("result: "+JSON.stringify(docs) );

      if(fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to upload Algorithm. This Algorithm already exist on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
      }else{
        if(!fs.existsSync("/Applications/4Casters/server/tempFile")){
          fs.mkdir("/Applications/4Casters/server/tempFile", 0766, function(err){
            if(err){console.log("ERROR! Can't make the directory: "+err)}
          });  
        }
        fs.mkdir("/Applications/4Casters/server/tempFile/"+algoId, 0766, function(err){
          if(err){
            console.log("ERROR! Can't make the directory: "+err);
          }else{
            var target = '/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile;
            var wr = fs.createWriteStream(target);
            wr.on("error", function(err) {
              console.log("error1: "+JSON.stringify(err));
              var hed = {"status":"400","msg":"to write file no server"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
              //done(err,name);
            });
            wr.on("close", function(ex) {

              var tempJson = JSON.parse(algoDetails);
              delete tempJson['$$hashKey'];

              //UPDATED SETTING ON PROD SEREVR - GOING TO MOVE ALGO FORM TEMP FOLDER TO SERVER FOLDER, AND GOING TO UPDATE JSON DB WITH NEW ALGO SETTING

              fs.mkdir("/Applications/4Casters/server/"+algoId, 0766, function(err){
                if(err){
                  console.log("error1");
                  console.log("ERROR! Can't make the directory: "+err);
                }else{

                  mv('/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile, '/Applications/4Casters/server/'+algoId+'/'+nameFile, function(err) {
                    console.log("err plus: ",err);
                    if(err == undefined || err == null || err == ""){
                      //deletAllFilesInFolder('/Applications/4Casters/tempFile');
                      deleteFolderRecursive('/Applications/4Casters/server/tempFile/'+algoId);
                      
                      console.log("closed file");
                      console.log("Algo details:",algoDetails);
                      var tempJson2 = JSON.parse(algoDetails);
                      delete tempJson2['$$hashKey'];
                      db.insert(tempJson2, function (err, newDoc) {   
                        console.log("err: "+err);
                        console.log("newDoc: ",newDoc);

                        newDoc['betaTest'].statusLabel = 'Deployed'; 
                        newDoc['betaTest'].statusValue = '1'; 
                        newDoc['betaTest'].actionDeploy = true;
                        newDoc['betaTest'].actionStop = true;
                        newDoc.algo_version = newDoc.algo_version + 1;
                        updateSetting(newDoc['_id'],newDoc['betaTest'],newDoc.algo_version,'betaTest',function(result){

                          if (result == true) {
                            if(prodServer == 'true' && remoteServerURL != "") {
                              // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER
                              var options = {
                                url : remoteServerURL+'/updateSettingNewAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+newDoc.algo_version+"&serverName=betaTest&statusLabel=Deployed&actionDeploy=true&statusValue=1&actionStop=true",
                                headers: {
                                  'Algo-Id': algoId,
                                  'Algo-Details': JSON.stringify(tempJson2)
                                }
                              };
                              request(options, function (error, response, body) {
                                console.log("error: ",error);
                                var body = JSON.parse(body);
                                if (!error && response.statusCode == 200 && body.error == '0') {
                                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                                  var hed = {"status":"200","msg":"Algo uploaded on beta server. Setting updated on Prod server"};
                                  res.set('response-msg', JSON.stringify(hed));
                                  res.status(200).send({error:0,msg:"Algo uploaded on beta server and updated setting on prod",algoId:algoId}); 
                                }else{
                                  var hed = {"status":"200","msg":"Algorithm uploaded on Server, Error to update prod server."};
                                  res.set('response-msg', JSON.stringify(hed));
                                  res.status(200).send({error:0,msg:"Error to update setting on remote server. Try to Sync locally.  ",algoId:algoId}); 
                                }
                              });
                            }else{
                              var hed = {"status":"200","msg":"Algorithm uploaded on beta Server"};
                              res.set('response-msg', JSON.stringify(hed));
                              res.status(200).send({error:0,msg:"Algo uploaded on beta server: ",algoId:algoId}); 
                            }
                          }else{
                            deleteFolderRecursive('/Applications/4Casters/server/tempFile/'+algoId);
                            deleteFolderRecursive('/Applications/4Casters/server/'+algoId);
                            res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                          }
                        });

                        
                      });
                    }else{
                      var hed = {"status":"400","msg":"Error to upload algo on Beta server"};
                      res.set('response-msg', JSON.stringify(hed));
                      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                    }
                  });    
                }
              });

            });
            var data = "";
            req.on('data', function (chunk) {
                //console.log(chunk);
                data += chunk;
                //console.log("data.length: ",data.length);
            });
            req.pipe(wr);
            req.on('error', function(e) {
              console.log('problem with request: '+ JSON.stringify(e.message));
              var hed = {"status":"400","msg":" on request to upload algo"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
            });
            req.on('end', function(){
              console.log("req finished");
                //callback(data);
            });
          };
        });
      }

    }

  });


});




app.post('/uploadOnProd', function(req, res) {

  console.log("req: "+req.headers);
  console.log("req name file: "+req.headers['name-file']);
  var nameFile = req.headers['name-file'];
  var algoId = req.headers['algo-id'];
  var algoDetails = req.headers['algo-details'];
  var betaServer = req.headers['beta-server'];
  var serverName = req.headers['server_name'];
  var remoteServerURL = req.headers['remote-server-url'];
  var localAlgoVersion = req.headers['local_algo_version'];

  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });
  } 

  var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        fs.unlinkSync(curPath);
      });
      fs.rmdirSync(path);
      return true;
    }else{
      return true;
    }
  };

  if(!fs.existsSync("/Applications/4Casters/server")){
      console.log("ERROR! 'Server' directory doesn't exist");
      var hed = {"status":"400","msg":"on server"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
  }

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      //UPDATING(UPLOADING) THE NEW ALGO ON THE SERVER
      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:algoId});
      }else if (docs[0].algo_version == localAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if(fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to upload Algorithm. This Algorithm already exist on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
          //send response : delete algo before to upload again



        }else{
          if(!fs.existsSync("/Applications/4Casters/server/tempFile")){
            fs.mkdir("/Applications/4Casters/server/tempFile", 0766, function(err){
              if(err){console.log("ERROR! Can't make the directory: "+err)}
            });  
          }
          if(fs.existsSync("/Applications/4Casters/server/tempFile"+algoId)){
            deleteFolderRecursive('/Applications/4Casters/tempFile/server/'+algoId);
          }
          fs.mkdir("/Applications/4Casters/server/tempFile/"+algoId, 0766, function(err){
            if(err){
              console.log("error1");
              console.log("ERROR! Can't make the directory: "+err);
            }else{
              var target = '/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile;
              var wr = fs.createWriteStream(target);
              wr.on("error", function(err) {
                console.log("error1: "+JSON.stringify(err));
                var hed = {"status":"400","msg":"to write file no server"};
                res.set('response-msg', JSON.stringify(hed));
                res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                //done(err,name);
              });
              wr.on("close", function(ex) {

                var tempJson = JSON.parse(algoDetails);
                delete tempJson['$$hashKey'];

                //UPDATED SETTING ON Beta SEREVR - GOING TO MOVE ALGO FORM TEMP FOLDER TO SERVER FOLDER, AND GOING TO UPDATE JSON DB WITH NEW ALGO SETTING
                fs.mkdir("/Applications/4Casters/server/"+algoId, 0766, function(err){
                  if(err){
                    console.log("error1");
                    console.log("ERROR! Can't make the directory: "+err);
                  }else{
                    console.log("err 0: ");
                    mv('/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile, '/Applications/4Casters/server/'+algoId+'/'+nameFile, function(err) {
                      console.log("err 1: ",err);
                      if(err == undefined || err == null || err == ""){
                        //deletAllFilesInFolder('/Applications/4Casters/tempFile/'+algoId);
                        console.log("in");
                        deleteFolderRecursive('/Applications/4Casters/server/tempFile/'+algoId);
                        var hed = {"status":"200","msg":"Algorithm uploaded on Server"};
                        res.set('response-msg', JSON.stringify(hed));
                        console.log("closed file");
                        console.log("Algo details:",algoDetails);
                        
                        var tempJson2 = JSON.parse(algoDetails);
                        delete tempJson2['$$hashKey'];
                        
                        docs[0]['prod'].statusLabel = 'Deployed'; 
                        docs[0]['prod'].statusValue = '1'; 
                        docs[0]['prod'].actionDeploy = true;
                        docs[0]['prod'].actionStop = true;
                        updateSetting(docs[0]['_id'],docs[0]['prod'],docs[0].algo_version,'prod',function(result){

                          if (result == true) {
                            if(betaServer == 'true' && remoteServerURL != "") {
                              // BETA SERVER IS DEFINED - GOING TO UPDATE SETTING ON BETA SERVER
                              var options = {
                                url : remoteServerURL+'/updateSettingNewAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+docs[0].algo_version+"&serverName=prod&statusLabel=Deployed&actionDeploy=true&statusValue=1&actionStop=true",
                                headers: {
                                  'Algo-Id': algoId,
                                  'Algo-Details': JSON.stringify(tempJson2)
                                }
                              };
                              request(options, function (error, response, body) {
                                console.log("error: ",error);
                                var body = JSON.parse(body);
                                if (!error && response.statusCode == 200 && body.error == '0') {
                                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                                  var hed = {"status":"200","msg":"Algo uploaded on prod server. Setting updated on Beta server"};
                                  res.set('response-msg', JSON.stringify(hed));
                                  res.status(200).send({error:0,msg:"Algo uploaded on prod server and updated setting on beta server",algoId:algoId}); 
                                }else{
                                  var hed = {"status":"200","msg":"Algorithm uploaded on prod Server, Error to update beta server."};
                                  res.set('response-msg', JSON.stringify(hed));
                                  res.status(200).send({error:0,msg:"Error to update setting on remote server. Try to Sync locally.  ",algoId:algoId}); 
                                }
                              });
                            }else{
                              var hed = {"status":"200","msg":"Algorithm uploaded on prod Server"};
                              res.set('response-msg', JSON.stringify(hed));
                              res.status(200).send({error:0,msg:"Algo uploaded on prod server: ",algoId:algoId}); 
                            }
                          }else{
                            deleteFolderRecursive('/Applications/4Casters/server/tempFile/'+algoId);
                            deleteFolderRecursive('/Applications/4Casters/server/'+algoId);
                            res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                          }

                          
                        }); 
                       
                      }else{
                        var hed = {"status":"400","msg":"Error to upload algo on Prod server"};
                        res.set('response-msg', JSON.stringify(hed));
                        res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                      }
                    });    
                   } 

                });

              });
              var data = "";
              req.on('data', function (chunk) {
                  //console.log(chunk);
                  data += chunk;
                  //console.log("data.length: ",data.length);
              });
              req.pipe(wr);
              req.on('error', function(e) {
                console.log('problem with request: '+ JSON.stringify(e.message));
                var hed = {"status":"400","msg":" on request to upload algo"};
                res.set('response-msg', JSON.stringify(hed));
                res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
              });
              req.on('end', function(){
                console.log("req finished");
                  //callback(data);
              });
            };
          });
        }

      }



    }else{

      //CREATING (UPLOADING) THE NEW ALGO ON THE BETA SERVER
      console.log("result: "+docs);
      console.log("result: "+JSON.stringify(docs) );

      if(fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to upload Algorithm. This Algorithm already exist on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
      }else{
        if(!fs.existsSync("/Applications/4Casters/server/tempFile")){
          fs.mkdir("/Applications/4Casters/server/tempFile", 0766, function(err){
            if(err){console.log("ERROR! Can't make the directory: "+err)}
          });  
        }
        fs.mkdir("/Applications/4Casters/server/tempFile/"+algoId, 0766, function(err){
          if(err){
            console.log("ERROR! Can't make the directory: "+err);
          }else{
            var target = '/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile;
            var wr = fs.createWriteStream(target);
            wr.on("error", function(err) {
              console.log("error1: "+JSON.stringify(err));
              var hed = {"status":"400","msg":"to write file no server"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
              //done(err,name);
            });
            wr.on("close", function(ex) {

              var tempJson = JSON.parse(algoDetails);
              delete tempJson['$$hashKey'];

              //UPDATED SETTING ON PROD SEREVR - GOING TO MOVE ALGO FORM TEMP FOLDER TO SERVER FOLDER, AND GOING TO UPDATE JSON DB WITH NEW ALGO SETTING

              fs.mkdir("/Applications/4Casters/server/"+algoId, 0766, function(err){
                if(err){
                  console.log("error1");
                  console.log("ERROR! Can't make the directory: "+err);
                }else{

                  mv('/Applications/4Casters/server/tempFile/'+algoId+'/'+nameFile, '/Applications/4Casters/server/'+algoId+'/'+nameFile, function(err) {
                    console.log("err plus: ",err);
                    if(err == undefined || err == null || err == ""){
                      //deletAllFilesInFolder('/Applications/4Casters/tempFile');
                      deleteFolderRecursive('/Applications/4Casters/tempFile/'+algoId);
                      
                      console.log("closed file");
                      console.log("Algo details:",algoDetails);
                      var tempJson2 = JSON.parse(algoDetails);
                      delete tempJson2['$$hashKey'];
                      db.insert(tempJson2, function (err, newDoc) {   
                        console.log("err: "+err);
                        console.log("newDoc: ",newDoc);

                        newDoc['prod'].statusLabel = 'Deployed'; 
                        newDoc['prod'].statusValue = '1'; 
                        newDoc['prod'].actionDeploy = true;
                        newDoc['prod'].actionStop = true;
                        newDoc.algo_version = newDoc.algo_version + 1;
                        updateSetting(newDoc['_id'],newDoc['prod'],newDoc.algo_version,'prod',function(){

                          if(betaServer == 'true' && remoteServerURL != "") {
                            // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER
                            var options = {
                              url : remoteServerURL+'/updateSettingNewAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+newDoc.algo_version+"&serverName=prod&statusLabel=Deployed&actionDeploy=true&statusValue=1&actionStop=true",
                              headers: {
                                'Algo-Id': algoId,
                                'Algo-Details': JSON.stringify(tempJson2)
                              }
                            };
                            request(options, function (error, response, body) {
                              console.log("error: ",error);
                              var body = JSON.parse(body);
                              if (!error && response.statusCode == 200 && body.error == '0') {
                                //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                                var hed = {"status":"200","msg":"Algo uploaded on prod server. Setting updated on Beta server"};
                                res.set('response-msg', JSON.stringify(hed));
                                res.status(200).send({error:0,msg:"Algo uploaded on prod server and updated setting on beta",algoId:algoId}); 
                              }else{
                                var hed = {"status":"200","msg":"Algorithm uploaded on prod Server, Error to update beta server."};
                                res.set('response-msg', JSON.stringify(hed));
                                res.status(200).send({error:0,msg:"Error to update setting on remote server. Try to Sync locally.  ",algoId:algoId}); 
                              }
                            });
                          }else{
                            var hed = {"status":"200","msg":"Algorithm uploaded on prod Server"};
                            res.set('response-msg', JSON.stringify(hed));
                            res.status(200).send({error:0,msg:"Algo uploaded on prod server: ",algoId:algoId}); 
                          }
                        });

                        
                      });
                    }else{
                      var hed = {"status":"400","msg":"Error to upload algo on Prod server"};
                      res.set('response-msg', JSON.stringify(hed));
                      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
                    }
                  });    
                }
              });

            });
            var data = "";
            req.on('data', function (chunk) {
                //console.log(chunk);
                data += chunk;
                //console.log("data.length: ",data.length);
            });
            req.pipe(wr);
            req.on('error', function(e) {
              console.log('problem with request: '+ JSON.stringify(e.message));
              var hed = {"status":"400","msg":" on request to upload algo"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
            });
            req.on('end', function(){
              console.log("req finished");
                //callback(data);
            });
          };
        });
      }

    }

  });
});


app.get('/updateSettingStartStopAlgo', function(req, res) {
  
  var algoId = req.query.tmpAlgoId;
  var serverName = req.query.serverName;
  var statusLabel = req.query.statusLabel;
  var actionStart = req.query.actionStart;
  var actionStop = req.query.actionStop;
  var statusValue = req.query.statusValue;
  var localAlgoVersion = req.query.localLastAlgoVersion;

  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"updated algo setting for prod during upload lgo",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });

  } 

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to start the algorithm again");
        res.status(200).send({error:0,msg:"A new algo version is available on Server, sync your app before to start algo"});
      }else if (docs[0].algo_version == localAlgoVersion || docs[0].algo_version < localAlgoVersion){

        console.log("algo exist on server and they have the same local version");

        docs[0][serverName].statusLabel = statusLabel;
        docs[0][serverName].actionStart = actionStart;
        docs[0][serverName].actionStop = actionStop;
        docs[0][serverName].statusValue = statusValue;
        docs[0].algo_version = localAlgoVersion;

        updateSetting(docs[0]['_id'],docs[0][serverName],localAlgoVersion,serverName,function(){
          res.status(200).send({error:0,msg:"updated algo setting in start/stop algo"}); 
        });
      }

    }else{
      console.log("Error, Algorithm doesn't exist on server, creating a new algo obj on DB");
      res.status(200).send({error:1,msg:"algo doesn't exist"}); 
    }

  });
  
});


app.get('/startAlgoOnBeta', function(req, res) {

  console.log("req: "+JSON.stringify(req.query));
  
  var algoId = req.query.tmpAlgoId;
  var localAlgoVersion = req.query.localLastAlgoVersion;
  var prodServer = req.query.prodServer;
  var remoteServerURL = req.query.remoteServerURL;
  var serverName = req.query.serverName;


  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });
  } 

  if(!fs.existsSync("/Applications/4Casters/server")){
      console.log("ERROR! 'Server' directory doesn't exist");
      var hed = {"status":"400","msg":"on server"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
  }

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("localAlgoVersion: ",localAlgoVersion);
      console.log("docs[0].algo_version: ",docs[0].algo_version);

      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:algoId});
      }else if (docs[0].algo_version == localAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if(!fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to start Algo. This Algorithm is not on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to start Algo",algoId:algoId}); 
        }else{
          docs[0]['betaTest'].statusLabel = "Running";
          docs[0]['betaTest'].statusValue = "2";
          docs[0]['betaTest'].actionStart = true;
          docs[0]['betaTest'].actionStop = false;

          updateSetting(docs[0]['_id'],docs[0]['betaTest'],docs[0].algo_version,'betaTest',function(){
            if(prodServer == 'true' && remoteServerURL != "") {
              // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER

              var options = {
                url : remoteServerURL+'/updateSettingStartStopAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+docs[0].algo_version+"&serverName=betaTest&statusLabel=Running&statusValue=2&actionStart=true&actionStop=false",
              };
              request(options, function (error, response, body) {
                console.log("error: ",error);
                var body = JSON.parse(body);
                if (!error && response.statusCode == 200 && body.error == '0') {
                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                  var hed = {"status":"200","msg":"Algo started on beta server. Setting updated on Prod server"};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algo started on beta server and updated setting on prod",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }else{
                  var hed = {"status":"200","msg":"Algorithm started on Beta Server, Error to update prod server setting."};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algorithm started on Beta Server, Error to update prod server setting.  ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }
              });
            }else{
              var hed = {"status":"200","msg":"Algorithm started on Beta Server"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:0,msg:"Algo started on beta server: ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
            }
          }); 
        }              
      }else{
        var hed = {"status":"400","msg":" to start algo"};
        res.set('response-msg', JSON.stringify(hed));
        res.status(200).send({error:1,msg:"Error to start Algo. Sync local before to start algo"}); 
      }   
    }else{
      var hed = {"status":"400","msg":" to start algo"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to start Algo. Algo is not deployed on Server"}); 
    }

  });
});



app.get('/startAlgoOnProd', function(req, res) {

  console.log("req: "+JSON.stringify(req.query));
  
  var algoId = req.query.tmpAlgoId;
  var localAlgoVersion = req.query.localLastAlgoVersion;
  var betaServer = req.query.betaServer;
  var remoteServerURL = req.query.remoteServerURL;
  var serverName = req.query.serverName;


  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });
  } 

  if(!fs.existsSync("/Applications/4Casters/server")){
      console.log("ERROR! 'Server' directory doesn't exist");
      var hed = {"status":"400","msg":"on server"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
  }

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("localAlgoVersion: ",localAlgoVersion);
      console.log("docs[0].algo_version: ",docs[0].algo_version);

      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:algoId});
      }else if (docs[0].algo_version == localAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if(!fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to start Algo. This Algorithm is not on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to start Algo",algoId:algoId}); 
        }else{
          docs[0]['prod'].statusLabel = "Running";
          docs[0]['prod'].statusValue = "2";
          docs[0]['prod'].actionStart = true;
          docs[0]['prod'].actionStop = false;

          updateSetting(docs[0]['_id'],docs[0]['prod'],docs[0].algo_version,'prod',function(){
            if(betaServer == 'true' && remoteServerURL != "") {
              // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER
              var options = {
                url : remoteServerURL+'/updateSettingStartStopAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+docs[0].algo_version+"&serverName=prod&statusLabel=Running&statusValue=2&actionStart=true&actionStop=false",
              };
              request(options, function (error, response, body) {
                console.log("error: ",error);
                var body = JSON.parse(body);
                if (!error && response.statusCode == 200 && body.error == '0') {
                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                  var hed = {"status":"200","msg":"Algo started on prod server. Setting updated on Beta server"};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algo started on prod server and updated setting on beta",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }else{
                  var hed = {"status":"200","msg":"Algorithm started on prod Server, Error to update beta server setting."};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algorithm started on Beta Server, Error to update prod server setting.  ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }
              });
            }else{
              var hed = {"status":"200","msg":"Algorithm started on prod Server"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:0,msg:"Algo started on prod server: ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
            }
          }); 
        }              
      }else{
        var hed = {"status":"400","msg":" to start algo"};
        res.set('response-msg', JSON.stringify(hed));
        res.status(200).send({error:1,msg:"Error to start Algo. Sync local before to start algo"}); 
      }   
    }else{
      var hed = {"status":"400","msg":" to start algo"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to start Algo. Algo is not deployed on Server"}); 
    }

  });


});


app.get('/stopAlgoOnBeta', function(req, res) {

  console.log("req: "+JSON.stringify(req.query));
  
  var algoId = req.query.tmpAlgoId;
  var localAlgoVersion = req.query.localLastAlgoVersion;
  var prodServer = req.query.prodServer;
  var remoteServerURL = req.query.remoteServerURL;
  var serverName = req.query.serverName;


  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });
  } 

  if(!fs.existsSync("/Applications/4Casters/server")){
      console.log("ERROR! 'Server' directory doesn't exist");
      var hed = {"status":"400","msg":"on server"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
  }

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("localAlgoVersion: ",localAlgoVersion);
      console.log("docs[0].algo_version: ",docs[0].algo_version);

      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:algoId});
      }else if (docs[0].algo_version == localAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if(!fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to start Algo. This Algorithm is not on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to stop Algo",algoId:algoId}); 
        }else{

          docs[0]['betaTest'].statusLabel = "Stopped";
          docs[0]['betaTest'].statusValue = "3";
          docs[0]['betaTest'].actionStart = false;
          docs[0]['betaTest'].actionStop = true;

          updateSetting(docs[0]['_id'],docs[0]['betaTest'],docs[0].algo_version,'betaTest',function(){
            if(prodServer == 'true' && remoteServerURL != "") {
              // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER
              var options = {
                url : remoteServerURL+'/updateSettingStartStopAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+docs[0].algo_version+"&serverName=betaTest&statusLabel=Stopped&statusValue=3&actionStart=false&actionStop=true",
              };
              request(options, function (error, response, body) {
                console.log("error: ",error);
                var body = JSON.parse(body);
                if (!error && response.statusCode == 200 && body.error == '0') {
                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                  var hed = {"status":"200","msg":"Algo stopped on beta server. Setting updated on Prod server"};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algo stopped on beta server and updated setting on prod",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }else{
                  var hed = {"status":"200","msg":"Algorithm stopped on Beta Server, Error to update prod server setting."};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algorithm stopped on Beta Server, Error to update prod server setting.  ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }
              });
            }else{
              var hed = {"status":"200","msg":"Algorithm stopped on Beta Server"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:0,msg:"Algo stopped on beta server: ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
            }
          }); 
        }              
      }else{
        var hed = {"status":"400","msg":" to stop algo"};
        res.set('response-msg', JSON.stringify(hed));
        res.status(200).send({error:1,msg:"Error to stop Algo. Sync local before to stop algo"}); 
      }   
    }else{
      var hed = {"status":"400","msg":" to stop algo"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to stop Algo. Algo is not deployed on Server"}); 
    }

  });


});


app.get('/stopAlgoOnProd', function(req, res) {

  console.log("req: "+JSON.stringify(req.query));
  
  var algoId = req.query.tmpAlgoId;
  var localAlgoVersion = req.query.localLastAlgoVersion;
  var betaServer = req.query.betaServer;
  var remoteServerURL = req.query.remoteServerURL;
  var serverName = req.query.serverName;


  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });
  } 

  if(!fs.existsSync("/Applications/4Casters/server")){
      console.log("ERROR! 'Server' directory doesn't exist");
      var hed = {"status":"400","msg":"on server"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
  }

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("localAlgoVersion: ",localAlgoVersion);
      console.log("docs[0].algo_version: ",docs[0].algo_version);

      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:algoId});
      }else if (docs[0].algo_version == localAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if(!fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to start Algo. This Algorithm is not on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to stop Algo",algoId:algoId}); 
        }else{

          docs[0]['prod'].statusLabel = "Stopped";
          docs[0]['prod'].statusValue = "3";
          docs[0]['prod'].actionStart = false;
          docs[0]['prod'].actionStop = true;

          updateSetting(docs[0]['_id'],docs[0]['prod'],docs[0].algo_version,'prod',function(){
            if(betaServer == 'true' && remoteServerURL != "") {
              // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER
              var options = {
                url : remoteServerURL+'/updateSettingStartStopAlgo?tmpAlgoId='+algoId+"&localLastAlgoVersion="+docs[0].algo_version+"&serverName=prod&statusLabel=Stopped&statusValue=3&actionStart=false&actionStop=true",
              };
              request(options, function (error, response, body) {
                console.log("error: ",error);
                var body = JSON.parse(body);
                if (!error && response.statusCode == 200 && body.error == '0') {
                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                  var hed = {"status":"200","msg":"Algo stopped on prod server. Setting updated on beta server"};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algo stopped on prod server and updated setting on beta",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }else{
                  var hed = {"status":"200","msg":"Algorithm stopped on prod Server, Error to update beta server setting."};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Algorithm stopped on prod Server, Error to update beta server setting.  ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
                }
              });
            }else{
              var hed = {"status":"200","msg":"Algorithm stopped on prod Server"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:0,msg:"Algo stopped on prod server: ",algoId:algoId,new_algo_version:docs[0].algo_version}); 
            }
          }); 
        }              
      }else{
        var hed = {"status":"400","msg":" to stop algo"};
        res.set('response-msg', JSON.stringify(hed));
        res.status(200).send({error:1,msg:"Error to stop Algo. Sync local before to stop algo"}); 
      }   
    }else{
      var hed = {"status":"400","msg":" to stop algo"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to stop Algo. Algo is not deployed on Server"}); 
    }

  });


});

app.get('/updateSettingSkipTest', function(req, res) {
  
  var algoId = req.query.tmpAlgoId;
  var serverName = req.query.serverName;
  var actionSkipped = req.query.actionSkipped;
  var localAlgoVersion = req.query.localLastAlgoVersion;

  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to remove upload algo");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true);
        //res.status(200).send({error:0,msg:"updated algo setting for prod during upload lgo",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });

  } 

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to start the algorithm again");
        res.status(200).send({error:0,msg:"A new algo version is available on Server, sync your app before to start algo"});
      }else if (docs[0].algo_version == localAlgoVersion || docs[0].algo_version < localAlgoVersion){

        console.log("algo exist on server and they have the same local version");

        docs[0][serverName].actionSkipped = actionSkipped;
        docs[0].algo_version = localAlgoVersion;

        updateSetting(docs[0]['_id'],docs[0][serverName],localAlgoVersion,serverName,function(){
          res.status(200).send({error:0,msg:"updated algo setting in skip test"}); 
        });
      }

    }else{
      console.log("Error, Algorithm doesn't exist on server, creating a new algo obj on DB");
      res.status(200).send({error:1,msg:"algo doesn't exist"}); 
    }

  });
  
});


app.get('/setSkipAlgo', function(req, res) {

  console.log("req: "+JSON.stringify(req.query));
  
  var algoId = req.query.tmpAlgoId;
  var localAlgoVersion = req.query.localLastAlgoVersion;
  var prodServer = req.query.prodServer;
  var remoteServerURL = req.query.remoteServerURL;
  var serverName = req.query.testType;


  var updateSetting = function(algoId,newServerObj,newAlgoVersion,serverName,callback){
    var action = {};
    action[serverName] = newServerObj;
    db.update({ _id: algoId }, { $set: action }, function () {
      db.persistence.compactDatafile();
      console.log("updated server obj to skip test");
      
      db.update({ _id: algoId }, { $set: {algo_version: newAlgoVersion } }, function () {
        db.persistence.compactDatafile();
        console.log("updated algo version");

        callback(true,serverName);
        //res.status(200).send({error:0,msg:"Algo removed upoad on server",algo_id:algoId,new_algo_version:newAlgoVersion}); 
        
      });
    });
  } 

  if(!fs.existsSync("/Applications/4Casters/server")){
      console.log("ERROR! 'Server' directory doesn't exist");
      var hed = {"status":"400","msg":"on server"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:1,msg:"Error to create Algo",algoId:algoId}); 
  }

  // TODO - double check on database before to check folder
  db.find({ _id: algoId }, function (err, docs) {

    if (err) {
      res.status(500);
    };
    if (docs.length > 0) {

      console.log("localAlgoVersion: ",localAlgoVersion);
      console.log("docs[0].algo_version: ",docs[0].algo_version);

      if (docs[0].algo_version > localAlgoVersion) {
        console.log("a new version of the Algorithm is on the Servers. Sync locally the new version of the algorithm and try to remove the algorithm again");
        res.status(200).send({error:1,msg:"A new algo version is available on Server, sync your app before to delete algo",algo_id:algoId});
      }else if (docs[0].algo_version == localAlgoVersion){

        console.log("algo exist on server and they have the same local version");
        
        docs[0].algo_version = parseInt(docs[0].algo_version) + 1;

        if(!fs.existsSync("/Applications/4Casters/server/"+algoId)){
          var hed = {"status":"400","msg":"to start Algo. This Algorithm is not on server"};
          res.set('response-msg', JSON.stringify(hed));
          res.status(200).send({error:1,msg:"Error to start Algo",algoId:algoId}); 
        }else{
          docs[0][serverName].actionSkipped = true;

          updateSetting(docs[0]['_id'],docs[0][serverName],docs[0].algo_version,serverName,function(result,serverName){
            if(prodServer == 'true' && remoteServerURL != "") {

              console.log("serverName: ",serverName);
              // PROD SERVER IS DEFINED - GOING TO UPDATE SETTING ON PROD SERVER
              var options = {
                url : remoteServerURL+'/updateSettingSkipTest?tmpAlgoId='+algoId+"&localLastAlgoVersion="+docs[0].algo_version+"&serverName="+serverName+"&actionSkipped=true",
              };
              request(options, function (error, response, body) {
                console.log("error: ",error);
                var body = JSON.parse(body);
                if (!error && response.statusCode == 200 && body.error == '0') {
                  //NEW ALGO UPLOADED - GOING TO ANSWEAR TO CLIENT 200 OK
                  var hed = {"status":"200","msg":"Test skipped on beta server. Setting updated on Prod server"};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Test skipped on beta server and updated setting on prod",algoId:algoId,new_algo_version:docs[0].algo_version,actionSkipped:true}); 
                }else{
                  var hed = {"status":"200","msg":"Test skipped on Beta Server, Error to update prod server setting."};
                  res.set('response-msg', JSON.stringify(hed));
                  res.status(200).send({error:0,msg:"Test skipped on Beta Server, Error to update prod server setting.  ",algoId:algoId,new_algo_version:docs[0].algo_version,actionSkipped:true}); 
                }
              });
            }else{
              var hed = {"status":"200","msg":"Test skipped on Beta Server"};
              res.set('response-msg', JSON.stringify(hed));
              res.status(200).send({error:0,msg:"Test skipped on beta server: ",algoId:algoId,new_algo_version:docs[0].algo_version,actionSkipped:true}); 
            }
          }); 
        }              
      }else{
        var hed = {"status":"400","msg":" to start algo"};
        res.set('response-msg', JSON.stringify(hed));
        res.status(200).send({error:1,msg:"Error to skip test. Sync local before to start algo"}); 
      }   
    }else{
      var hed = {"status":"400","msg":" to start algo"};
      res.set('response-msg', JSON.stringify(hed));
      res.status(200).send({error:2,msg:"Error to skip test. Algo is not deployed on Server"}); 
    }

  });
});

/*var rd = fs.createReadStream(source);
        rd.on("error", function(err) {
          console.log("error0: ",err);
          done(err,name);
        });
        var wr = fs.createWriteStream(target);
        wr.on("error", function(err) {
          console.log("error1: "+err);
          done(err,name);
        });
        wr.on("close", function(ex) {
          done('200',name);
        });
        rd.pipe(wr);
        var sent=0;
        $('#new_algo_cont').slideDown("fast");
        $('#progress_bar').fadeTo( 0, 1);
        rd.on('data',function(data){
          sent += data.length;
          $('#progress_bar').find('.percent').width( Math.floor(sent / total * 100)+ '%' );
          $('#progress_bar').find('.percent').text(Math.floor(sent / total * 100) + '%');
        });*/



var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});