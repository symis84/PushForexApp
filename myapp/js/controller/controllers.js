movieStubApp.controller("homeCtrl", function ($scope, $location) {
    //$scope.headerSrc = "tmpl/header.html";
    //$scope.movies = movieStubFactory.query();
    $scope.ipServer = "http://127.0.0.1:3000";
    //$scope.ipProdServer = "";
    $scope.ipProdServer = "http://127.0.0.1:3002";
    $scope.userName = 'Alessandro';
    $scope.password = 'p@ssword'
    $scope.uploading_algo = true;
    $scope.errorMsg = "";
    $scope.statusAlert = "";
    $scope.form_save_algo = true;
    $scope.show_conf_app_panel = true;
    $scope.algo_conf_right_conf_algo = true;

    //$domain = "/Applications/4Casters/";
    $scope.domain = "C:/4CastersApp/";


    var fs = require("fs");
    var request = require('request');
    var crypto = require('crypto');
    var mv = require('mv');
    require('nw.gui').Window.get().showDevTools();


    //////////////////////////////Config panel//////////////////
    $scope.openPanel = false;
    $( ".conf_button" ).click(function() {
      $( this ).toggleClass( 'conf_button_active' );
      if ($scope.openPanel == false) {
        $scope.algo_conf_right_conf_algo = false;
        $('.algo_conf_right_conf_app').animate({
          right: '+=200'
          }, 458, 'swing', function() {
            $scope.openPanel = true;
          });
      }else{
        $scope.algo_conf_right_conf_algo = true;
        $('.algo_conf_right_conf_app').animate({
          right: '-=200'
        }, 458, 'swing', function() {
          $scope.openPanel = false;
      });
      }
    });
    

    $scope.status = {
      isopen: false
    };

    $scope.timeFrame = [
      'm1',
      'm5',
      'm15',
      'm30',
      'h1',
      'h5',
      'd1',
      'w1'
    ];
 
    $scope.numberDatas = [
      '1',
      '5',
      '10',
      '20',
      '40',
      '100'
    ];

    

    $scope.cross_list = [
      'AUDNZD',
      'AUDCAD',
      'AUDCHF',
      'AUDJPY',
      'AUDUSD',
      'CADJPY',
      'CADCHF',
      'CHFJPY',
      'EURUSD',
      'EURGBP',
      'EURAUD',
      'EURCHF',
      'EURJPY',
      'EURNZD',
      'EURCAD',
      'GBPUSD',
      'GBPCHF',
      'GBPJPY',
      'GBPAUD',
      'GBPCAD',
      'NZDJPY',
      'NZDUSD',
      'USDCHF',
      'USDCAD',
      'USDJPY',
      'USDCHF'
    ]

    
    $scope.updateDb = function(search,query,callback){  
      storedb('algos').update(search,query,function(err){
        if(err == undefined || err == null || err == ""){
          console.log("success update algo");
          return callback(true);
        }else{
          console.log("error to update algo");
          return callback(false);
        }
      });
    };



    $scope.toggled = function(open) {
      console.log(open);
    };


    $scope.algo_setting = [
      {cross: null,timeframe: 'm1', values: 'v1'},
      {cross: null,timeframe: 'm1', values: 'v1'},
      {cross: null,timeframe: 'm1', values: 'v1'}
    ];
    $scope.selected_0_cross = undefined;
    $scope.selected_1_cross = undefined;
    $scope.selected_2_cross = undefined;



    $scope.permanent_algo_setting = [
      {cross: null,timeframe: 'm1', values: 'v1'},
      {cross: null,timeframe: 'm1', values: 'v1'},
      {cross: null,timeframe: 'm1', values: 'v1'}
    ];
    $scope.permanent_selected_0_cross = undefined;
    $scope.permanent_selected_1_cross = undefined;
    $scope.permanent_selected_2_cross = undefined;  

    $scope.saveAlgoParam = function(){
      //$scope.permanent_algo_setting = $scope.algo_setting;

      storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
        if(err == undefined || err == null || err == ""){ 
          
          var serverName = 'integrationTest';
          result[0][serverName].param = JSON.stringify($scope.algo_setting);
          result[0][serverName].param = JSON.parse(result[0][serverName].param);

          $scope.dataCurrentAlgos.integrationTest.param = result[0][serverName].param;

          var search = {'_id':$scope.dataCurrentAlgos["_id"] };
          var action2 = {};
          action2[serverName] = result[0][serverName];
          var query = {"$set" : action2};
          $scope.updateDb(search,query,function(result){
            if (result == true) {

              $scope.permanent_algo_setting = JSON.stringify($scope.algo_setting);
              $scope.permanent_algo_setting = JSON.parse($scope.permanent_algo_setting);
              $scope.permanent_selected_0_cross = $scope.selected_0_cross;
              $scope.permanent_selected_1_cross = $scope.selected_1_cross;
              $scope.permanent_selected_2_cross = $scope.selected_2_cross;


              //BUILD ALGO....THEN:
                $scope.configurationAlgo("","integration");

            }
          });
        }
      });
    }

    $scope.changeTimeframe = function(timeframe,type){
      $scope.initTimeframe = timeframe;
      $scope.algo_setting[type].timeframe =  timeframe;
    };
    $scope.changeNumberData = function(numberValues,type){
      $scope.initNumberData = numberValues;
      $scope.algo_setting[type].values =  'v'+numberValues;
    };
    $scope.changeCross = function($item, $model, $label, type){
      console.log("type:",type);
      console.log("$item:",$item);
      if (type == 0) {
        $scope.selected_0_cross = $item;
      }else if (type == 1) {
        $scope.selected_1_cross = $item;
      }else if (type == 2) {
        $scope.selected_2_cross = $item;
      };
      
      $scope.algo_setting[type].cross =  $item;
      console.log("$model:",$model);
      console.log("$label:",$label);
    }

    //BUILDING MATLAB ALGORITHM   -->   TESTING REALTIME ALGORITHM   -->   BACKTESTING ALGORITHM
    //BUILDING ALGORITHM: CHECK CROSS FILE IS UGUAL TO $scope.algo_setting. IF DIFFERENT REBUILD ALGORITHM
    //I CROSS SETTING PER STAGING VENGONO PRESI DALI SETTING DELL L ULTIMA BUILD FATTA IN INTEGRATION&BACKTESTING, 
    //SE SI VOGLIONO CAMBIARE BISOGNA STOPPARE L'ALGO IN STAGING E IN AUTOMATICO LA NUOVA BUILD USERA I NUOVI SETTING E 
    //STAGING AVRA I NUOVI SETTING
    //INVECE DELLA T --> INSERIRE LA S (SETTING), VERRA MOSTRATA UN ATABELLA DEI SETTING DEI CROSS, NON EDITABLE


    $scope.onlyReadConf = "";
    $scope.openPanel_confAlgo = false;
    $scope.firstAction = "";
    $scope.configurationAlgo = function(event,action,type) {
      //event.stopPropagation();
      if (action == 'integration' && $scope.firstAction == "") {
        $scope.onlyReadConf = false;
      }else if ( $scope.firstAction == ""){
        $scope.onlyReadConf = true;
      }
      if ($scope.openPanel_confAlgo == false && $scope.show_conf_app_panel == true && $scope.firstAction == "") {
        console.log("$scope.permanent_algo_setting: "+JSON.stringify($scope.permanent_algo_setting) );
        console.log("permanent_selected_0_cross: ",$scope.permanent_selected_0_cross);


        $scope.algo_setting = [];
        $scope.algo_setting = JSON.stringify($scope.permanent_algo_setting);
        $scope.algo_setting = JSON.parse($scope.algo_setting);
        $scope.selected_0_cross = $scope.permanent_selected_0_cross;
        $scope.selected_1_cross = $scope.permanent_selected_1_cross;
        $scope.selected_2_cross = $scope.permanent_selected_2_cross;
        //$scope.algo_setting.reverse(); 

        console.log("$scope.algo_setting: "+JSON.stringify($scope.algo_setting) );
        $scope.show_conf_app_panel = false;

        if (action == 'integration') {
          $("#test_algo_console_label_val_id").toggleClass('algo_conf_button_close');
          $("#test_algo_console_label_id").toggleClass('algo_conf_button_close');
          $("#integration-param").toggleClass( 'algo_conf_button_close_color' );
          $scope.firstAction = 'integration';
        }else if (action == 'betaTest') {
          $("#betaTest_algo_console_label_id").toggleClass('algo_conf_button_close');
          $("#betaTest_algo_console_label_val_id").toggleClass('algo_conf_button_close');
          $("#betaTest-param").toggleClass( 'algo_conf_button_close_color' );
          $scope.firstAction = 'betaTest';
        }else if (action == 'prod') {
          $("#prod_algo_console_label_id").toggleClass('algo_conf_button_close');
          $("#prod_algo_console_label_val_id").toggleClass('algo_conf_button_close');
          $("#prod-param").toggleClass( 'algo_conf_button_close_color' );
          $scope.firstAction = 'prod';
        }

        
        $('.algo_conf_right_conf_algo').animate({
          right: '+=330'
          }, 458, 'swing', function() {
            $scope.openPanel_confAlgo = true;
          });
      }else if ($scope.openPanel_confAlgo == true && $scope.show_conf_app_panel == false && $scope.firstAction == action) {
        console.log("$scope.permanent_algo_setting close: "+JSON.stringify($scope.permanent_algo_setting) );
        console.log("$scope.algo_setting close: "+JSON.stringify($scope.algo_setting) );
        $scope.firstAction = "";
        $scope.show_conf_app_panel = true;
        if (action == 'integration') {
          $("#test_algo_console_label_val_id").toggleClass('algo_conf_button_close');
          $("#test_algo_console_label_id").toggleClass('algo_conf_button_close');
          $("#integration-param").toggleClass( 'algo_conf_button_close_color' );
        }else if (action == 'betaTest') {
          $("#betaTest_algo_console_label_id").toggleClass('algo_conf_button_close');
          $("#betaTest_algo_console_label_val_id").toggleClass('algo_conf_button_close');
          $("#betaTest-param").toggleClass( 'algo_conf_button_close_color' );
        }else if (action == 'prod') {
          $("#prod_algo_console_label_id").toggleClass('algo_conf_button_close');
          $("#prod_algo_console_label_val_id").toggleClass('algo_conf_button_close');
          $("#prod-param").toggleClass( 'algo_conf_button_close_color' );
        }
        $('.algo_conf_right_conf_algo').animate({
          right: '-=330'
        }, 458, 'swing', function() {
          $scope.openPanel_confAlgo = false;
        });
      }
    };



    /////////////////////////Add new algo////////////////////
    $scope.newAlgo = {
      algoImgName : 'Algorithm image',
      algoImgPath : '',
      algoName : '',
      algoType : 'Algorithm type',
      algoFileName : '',
      algo_version: 0,
      integrationTest: {
        statusLabel: "ToDo",  //Error, Running, Done 
        statusValue: "0", // -1->Error , 0->ToDo , 1->Running, 2->Done
        cpu: "--",  
        ram: "--",
        ramInc: "--",
        actionStart: false,  //Running or Error
        actionStop: true,  //Stopped or Error
        actionSkipped: false,
        param: "--" 
      },
      betaTest: {
        statusLabel: "ToDo",  //Error, Deploying, Deployed, Running, Stopped, 
        statusValue: "0",  // -1->Error , 0->ToDo , 1->Deployed , 2->Running , 3->Stopped
        cpu: "--",
        ram: "--",
        actionStart: false,  //Running or Error
        actionStop: false,  //Stopped or Error
        actionDeploy: false,  //Deployed or Error
        actionSkipped: false,
        param: "--" 
      },
      prod: {
        statusLabel: "ToDo",  //Error, Deploying, Deployed, Running, Stopped, 
        statusValue: "0",  // -1->Error , 0->ToDo , 1->Deployed , 2->Running , 3->Stopped
        cpu: "--",
        ram: "--",
        actionStart: false,  //Running or Error
        actionStop: false,  //Stopped or Error
        actionDeploy: false,  //Deployed or Error
        actionSkipped: false,
        param: "--" 
      }
    };

    ////////////////////////////////////////

    $scope.findAll = function(){
      var result_all = storedb('algos').find();
      console.log("result2: ",result_all);
      return result_all;
    };

    //$scope.insert(new_algo0);
    //$scope.insert(new_algo1);
    //$scope.find({algoName:"Ale002"});

    setTimeout(function(){
      $('#table_manage_fav_page').find('.table_fav_tr').on('click', function(){
        var $this = $(this);  
        if(!$this.hasClass('table_fav_tr_active')){
            $this.parent().find('.table_fav_tr_active').removeClass("table_fav_tr_active");
            $this.addClass("table_fav_tr_active");
        }
      });
    },600);
    

    var reader;
  	

  	$scope.copyFile = function(source, target, name, cb) {
     
    	var cbCalled = false;

      	var total=fs.statSync(source).size;
      	console.log("size data 1: "+total);
      	var rd = fs.createReadStream(source);
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
          console.log('close write file 1: ',name);
          done('200',name);
        });
        wr.on("pipe", function(ex) {
          console.log('pipe 1: ',name);
          //done('200',name);
        });
      	rd.pipe(wr);
      	var sent=0;
        $('#new_algo_cont').slideDown("fast");
      	$('#progress_bar').fadeTo(0,1);
      	rd.on('data',function(data){
        	sent += data.length;
          if (sent == total) {
            console.log("finish");
            wr.close(function () {
              console.log('closing write file 1: ',name);
            });
          };
        	$('#progress_bar').find('.percent').width( Math.floor(sent / total * 100)+ '%' );
        	$('#progress_bar').find('.percent').text(Math.floor(sent / total * 100) + '%');
      	});
       

      	function done(status,name) {
          console.log('done write file: ',name);
          console.log('done write file: ',status);
          console.log('close write file: ',cbCalled);
        	if (!cbCalled) {
          		cb(status,name);
          		cbCalled = true;
        	}
      	}
    }

    $scope.deletAllFilesInFolder = function(dirPath){
      try { var files = fs.readdirSync(dirPath); }
      catch(e) { return true; }

      if(files.length > 0){
        for (var i = 0; i < files.length; i++) {
          var filePath = dirPath + '/' + files[i];
            fs.unlinkSync(filePath);
        }
      }
      return true;
    };

    $scope.moveFile = function(sourcePath,destPath){
      source = fs.createReadStream(sourcePath),
      destination = fs.createWriteStream(destPath);

      source.pipe(destination, { end: false });
      destination.close(function () {
        fs.unlinkSync(sourcePath);
        return true;
      });
      source.on("error", function(err) {
        console.log("error0: ",err);
        return false;
      });
      /*source.on("end", function(){
          fs.unlinkSync(sourcePath);
          return true
      });*/
    }

  	$scope.handleFileSelect = function(evt) {
		  evt.stopPropagation();
    	evt.preventDefault();
    	$('#progress_bar').find('.percent').width( '0%' );
      $('#progress_bar').find('.percent').text( '0%');

    	var dt = evt.dataTransfer;
    	var files = dt.files;
    	console.log("files: ",files);

    	for (var i=0; i<files.length; i++) {
      	var file = files[i];
      	console.log("file.path: "+file.path);
        console.log("file.name: "+file.name);
      	if(!fs.existsSync($scope.domain)){
          	fs.mkdir($scope.domain, 0766, function(err){
             		if(err){console.log("ERROR! Can't make the directory: "+err)}
          	});  
      	}
        if(!fs.existsSync($scope.domain+"tempFile")){
          fs.mkdir($scope.domain+"tempFile", 0766, function(err){
            if(err){console.log("ERROR! Can't make the directory: "+err)}
          });  
        }
        var result = $scope.deletAllFilesInFolder($scope.domain+'tempFile');
        if (result) {
          var fileDestPath = $scope.domain+'tempFile/'+file.name;
          console.log("file dest path: "+fileDestPath);
          $scope.copyFile(file.path, fileDestPath, file.name, function(status,name){
            console.log("status: ",status);
            if (status == 200) {
              console.log("finished: ",name);
              $scope.newAlgo.algoName = name;
              $scope.newAlgo.algoFileName = name;
              $scope.newAlgo.algo_version = 0;
              setTimeout( function(){
                $scope.$digest();
              },500);
            }else{
              console.log("error: ",name);
            } 
          });
        }
    	} 
  	}

    $scope.dataServers = [
      {
        betaServer:{
          ram : "1400Mb",
          cpu : "80%"
        },
        prodServer:{
          ram : "1200Mb",
          cpu : "50%"
        }        
      }
    ];

    $scope.syncAllServers = function(){
      $scope.dataAlgos = [];
      var local_algos = [];
      local_algos = $scope.findAll();
      console.log("local_algos: ",local_algos);
      
      var urlBeta = $scope.ipServer+'/getAllAlgos';
      var urlUpdateBetaServerAlgoSetting = $scope.ipServer+'/updateSettingAlgo';

      var urlProd = false;
      var urlUpdateProdServerAlgoSetting = false;
      if ($scope.ipProdServer) {
        urlProd = $scope.ipProdServer+'/getAllAlgos';
        urlUpdateProdServerAlgoSetting = $scope.ipProdServer+'/updateSettingAlgo';
      };

      // SYNC LOCAL ALGOS WITH BETA AND PROD SERVER ALGOS
      console.log("url: ",urlBeta);
      var incServer = 0;

      var updateDb = function(search,query,callback){
       
        storedb('algos').update(search,query,function(err){
          if(err == undefined || err == null || err == ""){
            console.log("success update algo");
            return callback(true);
          }else{
            console.log("error to update algo");
            return callback(false);
          }
        });
      };

      var updateLocalAlgosList = function(url,urlUpdateServerAlgoSetting){

        request(url, function (error, response, body) {
          console.log("response: ",response);
          console.log("body before parse: ",body);
          body = JSON.parse(body);
          console.log("body: ",JSON.stringify(body));
          //TO DO: the server need to send the list of the algos in the response.algos obj!!!!!!!!!!!!

          if (!error && response.statusCode == 200) {

            console.log("status 200 ok");
            // UPDATING ALL THE LOCAL ALGOS DEV CONFIGURATION WITH THE LAST ALGO VERSION ON THE BETA SERVER
            if (body != undefined && body != null && body != "") {
              console.log("body ok 0");
              angular.forEach(local_algos, function(value1, key1) {
                console.log("iter local algos 0");
                angular.forEach(body, function(value2, key2) {
                  console.log("iterate body 0");
                  console.log("value2: ",value2);
                  if( value1['_id'] == value2['_id'] ){
                    console.log("value1 0: ",value1);
                    if(value1.algo_version < value2.algo_version){

                      //SYNC ONLY BETASERVER PRODSERVER AND GENERAL SETTING, DONT SYNC INTEGRATION SETTING
                      local_algos[key1]['betaTest'] = value2['betaTest'];
                      local_algos[key1]['prod'] = value2['prod'];
                      local_algos[key1]['algoImgName'] = value2['algoImgName'];
                      local_algos[key1]['algo_version'] = value2['algo_version'];
                      local_algos[key1]['algoImgPath'] = value2['algoImgPath'];
                      local_algos[key1]['algoName'] = value2['algoName'];
                      local_algos[key1]['algoType'] = value2['algoType'];
                      local_algos[key1]['algoFileName'] = value2['algoFileName'];
                      local_algos[key1]['algo_version'] = value2['algo_version'];
                      
                      ////////// UPDATING ALGO ON LOCAL DB //////////////// 
                      var search = {'_id':value1['_id'] };
                      var action = {};
                      action['betaTest'] = value2.betaTest;
                      var query = {"$set" : action};
                      updateDb(search,query,function(result){
                        if (result == true) {
                          var action2 = {};
                          action2['prod'] = value2.prod;
                          var query2 = {"$set" : action2};
                          updateDb(search,query2,function(result){
                            if (result == true) {
                              var action3 = { 'algoImgName':value2.algoImgName,'algo_version':value2.algo_version, 'algoImgPath':value2.algoImgPath, 'algoName':value2.algoName, 'algoType':value2.algoType, 'algoFileName':value2.algoFileName, 'algo_version':value2.algo_version};
                              var query4 = {"$set" : action3};
                              updateDb(search,query4,function(result){
                                if (result == true) {
                                  console.log('updated algo on local DB');
                                }else{
                                  console.log('sync error to update local DB');
                                }
                              });
                            }else{
                              console.log('sync error to update local DB');
                            }
                          });
                        }else{
                          console.log('sync error to update local DB');
                        }
                      });
                      //////////////////////////////////////////////////////
                    }else if(value1.algo_version > value2.algo_version){

                      // UPDATING ALGO ON SERVER
                      // UPDATING ALL THE LOCAL ALGOS DEV CONFIGURATION WITH THE LAST ALGO VERSION ON THE SERVER
                      console.log("value1 2: ",value1);
                      var options = {
                        method: 'post',
                        qs: value1,
                        url: urlUpdateServerAlgoSetting
                      }
                      console.log("option 1: ",options);
                      request(options, function (err, res, body) {
                        if (err) {
                          console.log("error to update algo on server");
                        }
                        if (body != undefined && body != null && body != "") {
                          if (body.error == 0) {
                            console.log("updated algo on server");
                            console.log(body.msg);
                          }else{
                            console.log('error to sync algo');
                          };
                        }else{
                          console.log('error to sync algo');
                        }
                      });

                    }
                  }
            
                }); 
                console.log("local_algos: ",local_algos); 
              });

              //UPDATING THE LOCAL ALGOS LIST WITH THE NEW ALGOS FROM THE SERVER 
              console.log("body ok 1");
              console.log("body2: "+JSON.stringify(body));
              console.log("body3: ",body);
              var body2 = body;
              angular.forEach(body2, function(valueInit, key1) {
                console.log("value1: ",JSON.stringify(valueInit));
                console.log("iterate body 2");
                var inc = 0;
                angular.forEach(local_algos, function(value2, key2) {
                   console.log("iter local algos 1");
                    console.log("valueInit['_id'] "+valueInit['_id']);
                    console.log("value2['_id'] "+value2['_id']);
                  if(valueInit['_id'] == value2['_id']){ 
                    inc++;
                    console.log("found same algo, don't push to client");
                  }
                });  
                console.log("in sync0");  
                if (inc == 0) {
                  console.log("innnnnn");
                  
                  console.log("local_algos: ",JSON.stringify(local_algos));
                  console.log("valueInit['_id'] ",valueInit['_id']);
                  var replaceHashKey = valueInit['_id'];
                  storedb('algos').insert(valueInit,function(err,result){
                    if(err == undefined || err == null || err == ""){
                      console.log("insert: ",result);
                      console.log("result id: ",result["_id"]);
                      var replacedId = result["_id"];
                      result['_id'] = replaceHashKey;
                      local_algos.push(result);
                      storedb('algos').update({"_id":replacedId},{"$set":{"_id":replaceHashKey}},
                        function(err,result3){
                          if(err == undefined || err == null || err == ""){
                            console.log("replaced old hash key. Done, result3: ",result3);
                            if ( key1 == body2.length-1) {
                              console.log("local_algos final: "+ JSON.stringify(local_algos));
                              console.log("local_algos final: ",local_algos);
                              $scope.dataAlgos = local_algos;
                              $scope.$digest();  
                            };

                          }else{
                            console.log("error to replace old hash key");
                            if ( key1 == body2.length-1) {
                              $scope.dataAlgos = local_algos;
                              $scope.$digest();  
                            };
                          }
                        }
                      );
                    }else{
                      console.log("Error to insert new algo in local db");
                    }
                  });
                  console.log("didn't find algo, pushing algo to client");
                }else{
                  console.log("in sync1");
                }
                $scope.dataAlgos = local_algos;
                console.log("$scope.dataAlgos: ",$scope.dataAlgos);
                $scope.$digest();
              });
              if (incServer == 0 && urlProd != false) {
                console.log("sync prod server 1");
                incServer = 1;
                updateLocalAlgosList(urlProd,urlUpdateProdServerAlgoSetting);
              };

            }else{
              $scope.dataAlgos = local_algos;
              $scope.$digest();
              console.log("sync prod server 0");
              console.log("incServer: ",incServer);
              console.log("urlProd: ",urlProd);
              if (incServer == 0 && urlProd != false) {
                console.log("sync prod server 2");
                incServer = 1;
                updateLocalAlgosList(urlProd,urlUpdateProdServerAlgoSetting);
              };

            }


          }else if (response.statusCode == 200) {
            console.log("Error server betaTest in synchronization");
            $scope.dataAlgos = local_algos;
            $scope.$digest();
            if (incServer == 0 && urlProd != false) {
              console.log("sync prod server 3");
              incServer = 1;
              updateLocalAlgosList(urlProd,urlUpdateProdServerAlgoSetting);
            };
          }

        });

      };
      updateLocalAlgosList(urlBeta,urlUpdateBetaServerAlgoSetting);

      

    }

    $scope.dataCurrentAlgos = {};
    $scope.dataAlgos = [];
    $scope.syncAllServers();
    //$scope.dataAlgos = $scope.findAll();

    $scope.showAlgo = false;

    $scope.selectType = function(type){
      $scope.newAlgo.algoType = type;
    }

    $scope.selectImg = function(imgPath,imgName){
      $scope.newAlgo.algoImgName = imgName;
      $scope.newAlgo.algoImgPath = imgPath;
    };

    $scope.cancel_new_algo = function(){
      //DELETE NEW ALGO UPLOADED
    }


    $scope.displayErrorMsg = function(msg){
      console.log("algo name already exist");
      $scope.form_save_algo = false;
      $scope.statusAlert = msg;
      var result = $scope.deletAllFilesInFolder($scope.domain+'tempFile');
      //var fileAlgoPath = '/Applications/4Casters/tempFile'+$scope.newAlgo.algoFileName;
      //fs.unlink(fileAlgoPath,function(){}); 
      setTimeout(function(){
        $('#new_algo_cont').slideUp(0,function(){
          $('#progress_bar').fadeTo( "slow",0,"linear",function(){});
          $scope.form_save_algo = true;
          $scope.newAlgo = {
            algoImgName : 'Algorithm image',
            algoImgPath : '',
            algoName : '',
            algoType : 'Algorithm type',
            algoFileName : '',
            algo_version: 0,
            integrationTest: {
              statusLabel: "ToDo",  //Error, Running, Done 
              statusValue: "0", // -1->Error , 0->ToDo , 1->Running, 2->Done
              cpu: "--",  
              ram: "--",
              ramInc: "--",
              actionStart: false,  //Running or Error
              actionStop: true,  //Stopped or Error
              actionSkipped: false,
              param: "--"  
            },
            betaTest: {
              statusLabel: "ToDo",  //Error, Deploying, Deployed, Running, Stopped, 
              statusValue: "0",  // -1->Error , 0->ToDo , 1->Deployed , 2->Running , 3->Stopped
              cpu: "--",
              ram: "--",
              actionStart: false,  //Running or Error
              actionStop: false,  //Stopped or Error
              actionDeploy: false,  //Deployed or Error
              actionSkipped: false,
              param: "--" 
            },
            prod: {
              statusLabel: "ToDo",  //Error, Deploying, Deployed, Running, Stopped, 
              statusValue: "0",  // -1->Error , 0->ToDo , 1->Deployed , 2->Running , 3->Stopped
              cpu: "--",
              ram: "--",
              actionStart: false,  //Running or Error
              actionStop: false,  //Stopped or Error
              actionDeploy: false,  //Deployed or Error
              actionSkipped: false,
              param: "--" 
            }
          };
        });
      },7000);
      $scope.$digest();
    }


    $scope.save_new_algo = function(){

      
      // CHECK LOCAL IF ALGO NAME ALREADY EXIST!!!!!!!!!
      console.log("dd: "+$scope.newAlgo.algoName);
      storedb('algos').find({"algoName":$scope.newAlgo.algoName},function(err,result){
        console.log("result lebght: ",result.length);
        if(err != undefined && err != null && err != ""){
          console.log("err: ",err);
          $scope.displayErrorMsg("Error in local database");
        }else if(result.length > 0){
          console.log("file  exist local: ",result);
          $scope.displayErrorMsg("Error! Algorithm name already exist locally. Change name at this algorithm file");
        }else if(result.length == 0){
          storedb('algos').insert($scope.newAlgo,function(err,result){
            if(err == undefined || err == null || err == ""){
              console.log("insert: ",result);
              console.log("result id: ",result["_id"]);
              //var arrLocalStorage = localStorage.getItem("algos");
              console.log("result id: ",result["_id"]);
              var key = result["_id"];
              var string = result["_id"]+$scope.userName+$scope.password;
              console.log("string: "+string);
              var hash = crypto.createHash('md5').update(string).digest('hex');
              console.log("hash: "+hash);

              if(!fs.existsSync($scope.domain+hash)){
                  fs.mkdir($scope.domain+hash, 0766, function(err){
                      if(err){
                        console.log("ERROR! Can't make the directory: "+err);
                        //TODO GESTISCI ERROR SE MKDIR FALLISCE
                      }else{

                        fs.readdir($scope.domain+'tempFile/', function(err, items) {    
                          if(err == undefined || err == null || err == ""){               
                            console.log(items[0]);
                            //$scope.moveFile
                            mv($scope.domain+'tempFile/'+items[0], $scope.domain+hash+"/"+items[0], function(err) {
                              console.log("err: ",err);
                              if(err == undefined || err == null || err == ""){
                                $scope.deletAllFilesInFolder($scope.domain+'tempFile');
                                storedb('algos').update(
                                  {"_id":key },
                                  {"$set":{"_id":hash}},
                                  function(err){
                                  if(err == undefined || err == null || err == ""){
                                    
                                    $scope.showAlgo = false;
                                    $scope.dataAlgos = $scope.findAll(); 
                                    $scope.$digest();
                                    setTimeout(function(){
                                      $('#table_manage_fav_page').find('.table_fav_tr').on('click', function(){
                                        var $this = $(this);  
                                        if(!$this.hasClass('table_fav_tr_active')){
                                            $this.parent().find('.table_fav_tr_active').removeClass("table_fav_tr_active");
                                            $this.addClass("table_fav_tr_active");
                                        }
                                      });
                                    },600);
                                    $('#new_algo_cont').slideUp(0,function(){
                                      $('#progress_bar').fadeTo( "slow",0,"linear",function(){});
                                      $scope.newAlgo = {
                                        algoImgName : 'Algorithm image',
                                        algoImgPath : '',
                                        algoName : '',
                                        algoType : 'Algorithm type',
                                        algoFileName : '',
                                        algo_version: 0,
                                        integrationTest: {
                                          statusLabel: "ToDo",  //Error, Running, Done 
                                          statusValue: "0", // -1->Error , 0->ToDo , 1->Running, 2->Done
                                          cpu: "--",  
                                          ram: "--",
                                          ramInc: "--",
                                          actionStart: false,  //Running or Error
                                          actionStop: true,  //Stopped or Error
                                          actionSkipped: false,
                                          param: "--"  
                                        },
                                        betaTest: {
                                          statusLabel: "ToDo",  //Error, Deploying, Deployed, Running, Stopped, 
                                          statusValue: "0",  // -1->Error , 0->ToDo , 1->Deployed , 2->Running , 3->Stopped
                                          cpu: "--",
                                          ram: "--",
                                          actionStart: false,  //Running or Error
                                          actionStop: false,  //Stopped or Error
                                          actionDeploy: false,  //Deployed or Error
                                          actionSkipped: false,
                                          param: "--" 
                                        },
                                        prod: {
                                          statusLabel: "ToDo",  //Error, Deploying, Deployed, Running, Stopped, 
                                          statusValue: "0",  // -1->Error , 0->ToDo , 1->Deployed , 2->Running , 3->Stopped
                                          cpu: "--",
                                          ram: "--",
                                          actionStart: false,  //Running or Error
                                          actionStop: false,  //Stopped or Error
                                          actionDeploy: false,  //Deployed or Error
                                          actionSkipped: false,
                                          param: "--" 
                                        }
                                      };
                                    });
                                  }else{
                                    console.log("error insert: ",err);
                                  }
                                }); 
                              }else{
                                //TODO - GESTISCI ERROR SE IL MOVE FILE FALLISCE
                              }
                            });
                          }else{
                            // TODO - GESTISCI ERROR SE IL READING ALGO FALLISCE
                          }
                        });
                      }
                  });  
              }

               
            }else if (err != undefined && err != null && err != ""){
              console.log("error insert: ",err);
              //TODO GESTISCI ERROR SE L INSERT NEL DATABSE E' FALLITO
            }
          });
        }
      });
    };




    $scope.selectAlgo = function(index){
      console.log("in select algo");
      console.log("$scope.dataAlgos[index]: ",$scope.dataAlgos[index]);
      $scope.dataCurrentAlgos = $scope.dataAlgos[index];
      $scope.showAlgo = true;
      storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
        if(err == undefined || err == null || err == ""){  
          var serverName = 'integrationTest';
          var param_json = result[0][serverName].param;
          console.log("param_json: ",param_json);
          angular.forEach(param_json, function(value1, key1) {
            console.log("value1: ",value1);
            if (value1.cross != null && value1.cross != 'null' && value1.cross != undefined && value1.cross != 'undefined') {
              $scope.permanent_algo_setting[key1].cross = value1.cross;
              $scope.permanent_algo_setting[key1].timeframe = value1.timeframe;
              $scope.permanent_algo_setting[key1].values = value1.values;
              if (key1 == 0) {
                $scope.permanent_selected_0_cross = value1.cross;
              }else if (key1 == 1) {
                $scope.permanent_selected_1_cross = value1.cross;
              }else if (key1 == 2) {
                $scope.permanent_selected_2_cross = value1.cross;
              };
            };
          });
          console.log("$scope.permanent_algo_setting: ",$scope.permanent_algo_setting);
        } 
      }); 
    };

    $scope.deleteAlgo = function(key){

      if ( $scope.dataAlgos[key].betaTest.actionStart == true || $scope.dataAlgos[key].prod.actionStart == true ) {
        console.log("before to delete the algorithm stop the algorithms from dev and prod server")
      }else{

        var tmpAlgoId = $scope.dataAlgos[key]['_id'];
        console.log("id algo in delete: "+tmpAlgoId);
        var tmpLocalLastAlgoVersion = $scope.dataAlgos[key]['algo_version'];

        var urlBeta = $scope.ipServer+'/deleteAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer=";
        var urlProd = null;
        if ($scope.ipProdServer) {
          var urlBeta = $scope.ipServer+'/deleteAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer="+$scope.ipProdServer;
        };

        console.log("in");

        var updateDb = function(search,callback){
         
          storedb('algos').remove(search,function(err){
            if(err == undefined || err == null || err == ""){
              console.log("success deleted algo");
              return callback(true);
            }else{
              console.log("error to delete algo");
              return callback(false);
            }
          });
        };

        request(urlBeta, function (error, response, body) {
          console.log("error: ",error);
          if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            console.log("body: ",body);
            console.log("response: ",response);
            console.log("body.error: ",body.error);
            console.log("body.error: ",body.error);
            if (body != undefined && body != null && body != "" ) {
              if (body.error == 0 || body.error == 2) {
                console.log("msg, save algo: ",body.msg); 
                console.log("$scope.dataAlgos: ",$scope.dataAlgos);
                
                var search = {'_id':tmpAlgoId };
                updateDb(search,function(result){
                  console.log("result 1 deleting local algo_version: ",result);
                  if (result == true) {
                    console.log("Successful, algo deleted ",result)
                    

                    var deleteFolderRecursive = function(path) {
                      if( fs.existsSync(path) ) {
                        console.log("in0");
                        fs.readdirSync(path).forEach(function(file,index){
                          var curPath = path + "/" + file;
                          console.log("in1");
                          fs.unlinkSync(curPath);
                          console.log("in2");
                        });
                        console.log("in3");
                        fs.rmdirSync(path);
                        console.log("in4");
                        return true;
                      }else{
                        console.log("in5");
                        return true;
                      }
                    };
                    console.log("delete tmpAlgoId"+tmpAlgoId);
                    var path =$scope.domain+tmpAlgoId;
                    var result = deleteFolderRecursive(path);
                    $scope.dataAlgos.splice(key, 1);
                    $scope.dataCurrentAlgos = {};
                    $scope.showAlgo = false;
                    $scope.$digest();

                  }else{
                    console.log("error to delete local algo");
                  }
                });

              }else{
                console.log("error to delete algos on servers");
              }
            }else{
              console.log("error to delete algos on servers");
            }
          }
        });
      }


    }

    ///////////////////////////////////  INTEGRATION TEST  ////////////////////////////

    $scope.startIntegrationTest = function(){
      if (!$scope.dataCurrentAlgos.integrationTest.actionStart && $scope.dataCurrentAlgos.integrationTest.actionStop){
        $scope.dataCurrentAlgos.integrationTest.actionStart = true;
        $scope.dataCurrentAlgos.integrationTest.actionStop = false;
        $scope.dataCurrentAlgos.integrationTest.statusValue = 1;
        $scope.dataCurrentAlgos.integrationTest.statusLabel = 'Running';

        /*$scope.dataCurrentAlgos.integrationTest.statusValue = -1;
        $scope.dataCurrentAlgos.integrationTest.statusLabel = 'Error';*/
        //start exe  
      }
    }

    $scope.stopIntegrationTest = function(){
      if ($scope.dataCurrentAlgos.integrationTest.actionStart && !$scope.dataCurrentAlgos.integrationTest.actionStop){
        $scope.dataCurrentAlgos.integrationTest.actionStart = false;
        $scope.dataCurrentAlgos.integrationTest.actionStop = true;
        $scope.dataCurrentAlgos.integrationTest.statusValue = 2;
        $scope.dataCurrentAlgos.integrationTest.statusLabel = 'Stopped';

        /*$scope.dataCurrentAlgos.integrationTest.statusValue = -1;
        $scope.dataCurrentAlgos.integrationTest.statusLabel = 'Error';*/
        //stop exe  
      }
    }

    $scope.hideBacktestAndIntegrationTest = function(){
      $scope.show_conf_app_panel = true;
      $scope.algo_conf_right_conf_algo = true;
      $(".algo_conf_right_conf_app").css( "top", "0px" );
      $('#container_algo_backtest_detail').animate({'top': '490px'}, 1000, function() {
        $('#container').animate({'margin-top': '0px'});
      });
    }

    $scope.showBacktestAndIntegrationTest = function(){

      $scope.show_conf_app_panel = false;
      $scope.algo_conf_right_conf_algo = false;
      $(".algo_conf_right_conf_app").css( "top", "41px" );


      var indexChartVar = c3.generate({
        bindto: '#backtest_chart',
        padding: {
            top:0
        },
        size: {
          height: 300
        },
        data: {
            columns: [
              ['Comulative', 50, 70, 60, 100, 85, 115, 125, 175, 165, 175, 195, 235, 220, 255, 265, 315, 305, 315, 335, 325, 335, 355],
              ['PL', 50, 20, -10, 40, -15, 35, 10, 50, -10, 10, 20, 50, 20, -10, 40, -15, 35, 10, 50, -10, 10, 20]
            ],
            types: {
              Comulative: 'area-spline'
            },
            axes: {
              PL: 'y2' // ADD
            },
            onclick: function (d, element) { }
            //type: 'spline'
        },
        subchart: {
          show: true,
          size:{
            height: 30
          }
        },
        zoom: {
            enabled: true
        },
        legend: {
           hide: true
        },
        axis: {
          y: {
            label: { // ADD
              show: true,
              text: 'Comulative',
              position: 'outer-middle'
            }
          },
          y2: {
            show: true,
            label: { // ADD
              text: 'P&L',
              position: 'outer-middle'
            }
          }
        },
        color: {
            //pattern: ['#414345','#bdbdbd']
            pattern: ['#4B4E50','#bdbdbd']
        }
      });


      var profitLoss_arr = [];
      profitLoss_arr.push(
          ['Profit',123],
          ['Loss',57]
      );
      var profitLoss_chart = c3.generate({
          bindto: "#profitLoss",
          padding: {
              bottom: 20
          },
          size: {
              height: 150,
              width: 150
          },
          point: {
            r: 5
          },
          tooltip: {
            show: false
          },
          data: {
              selection: {
                  enabled: true
              },
              columns: profitLoss_arr,
              type : 'donut',
              onclick: function (d, i) { 
                  console.log("onclick", d, i); 
                  console.log("value", d.value); 
                  $("#profitLoss").find(".c3-chart-arcs-title")[0].innerHTML = d.value;

                  if (d.name == "Profit") {
                      $("#profitLoss").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});
                  }else if (d.name == "Loss") {
                      $("#profitLoss").find(".c3-chart-arcs-title").css({'fill': '#FF0067'});
                  }

              },
              onmouseover: function (d, i) { console.log("onmouseover", d, i); },
              onmouseout: function (d, i) { console.log("onmouseout", d, i); },
          },
          legend: {
             hide: true
          },
          donut: {
              title: "--",
              width: 15,
              label: {
                  show: false
              },
              labels: {
                  format: function (value, ratio, id) {
                    return value+"%";
                  }
              }
          },
          color: {
              pattern: ['#7FFFFF','#FF0067']
          }
      }); 
      $("#profitLoss").find(".c3-chart-arcs-title")[0].innerHTML = 123;
      $("#profitLoss").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});

      var drawdown_arr = [];
      drawdown_arr.push(
          ['Max',12],
          ['Min',5]
      );
      var profitLoss_chart = c3.generate({
          bindto: "#drawdown",
          padding: {
              bottom: 20
          },
          size: {
              height: 150,
              width: 150
          },
          point: {
            r: 5
          },
          tooltip: {
            show: true
          },
          data: {
              selection: {
                  enabled: true
              },
              columns: drawdown_arr,
              type : 'donut',
              onclick: function (d, i) { 
                  console.log("onclick", d, i); 
                  console.log("value", d.value); 
                  $("#drawdown").find(".c3-chart-arcs-title")[0].innerHTML = d.value;

                  if (d.name == "Min") {
                      $("#drawdown").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});
                  }else if (d.name == "Max") {
                      $("#drawdown").find(".c3-chart-arcs-title").css({'fill': '#FF0067'});
                  }

              },
              onmouseover: function (d, i) { console.log("onmouseover", d, i); },
              onmouseout: function (d, i) { console.log("onmouseout", d, i); },
          },
          legend: {
             hide: true
          },
          donut: {
              title: "--",
              width: 15,
              label: {
                  show: false
              },
              labels: {
                  format: function (value, ratio, id) {
                    return value+"%";
                  }
              }
          },
          color: {
              pattern: ['#FF0067','#7FFFFF']
          }
      }); 
      $("#drawdown").find(".c3-chart-arcs-title")[0].innerHTML = 5;
      $("#drawdown").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});

      var shortLongPositions_arr = [];
      shortLongPositions_arr.push(
          ['Short',7],
          ['Long',15]
      );
      var profitLoss_chart = c3.generate({
          bindto: "#shortLongPositions",
          padding: {
              bottom: 20
          },
          size: {
              height: 150,
              width: 150
          },
          point: {
            r: 5
          },
          tooltip: {
            show: true
          },
          data: {
              selection: {
                  enabled: true
              },
              columns: shortLongPositions_arr,
              type : 'donut',
              onclick: function (d, i) { 
                  console.log("onclick", d, i); 
                  console.log("value", d.value); 
                  $("#shortLongPositions").find(".c3-chart-arcs-title")[0].innerHTML = d.value;

                  if (d.name == "Short") {
                      $("#shortLongPositions").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});
                  }else if (d.name == "Long") {
                      $("#shortLongPositions").find(".c3-chart-arcs-title").css({'fill': '#FF0067'});
                  }

              },
              onmouseover: function (d, i) { console.log("onmouseover", d, i); },
              onmouseout: function (d, i) { console.log("onmouseout", d, i); },
          },
          legend: {
             hide: true
          },
          donut: {
              title: "--",
              width: 15,
              label: {
                  show: false
              },
              labels: {
                  format: function (value, ratio, id) {
                    return value+"%";
                  }
              }
          },
          color: {
              pattern: ['#7FFFFF','#FF0067']
          }
      }); 
      $("#shortLongPositions").find(".c3-chart-arcs-title")[0].innerHTML = 7;
      $("#shortLongPositions").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});


      var profitLossTrades_arr = [];
      profitLossTrades_arr.push(
          ['Profit',17],
          ['Loss',25]
      );
      var profitLoss_chart = c3.generate({
          bindto: "#profitLossTrades",
          padding: {
              bottom: 20
          },
          size: {
              height: 150,
              width: 150
          },
          point: {
            r: 5
          },
          tooltip: {
            show: true
          },
          data: {
              selection: {
                  enabled: true
              },
              columns: profitLossTrades_arr,
              type : 'donut',
              onclick: function (d, i) { 
                  console.log("onclick", d, i); 
                  console.log("value", d.value); 
                  $("#profitLossTrades").find(".c3-chart-arcs-title")[0].innerHTML = d.value;

                  if (d.name == "Profit") {
                      $("#profitLossTrades").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});
                  }else if (d.name == "Loss") {
                      $("#profitLossTrades").find(".c3-chart-arcs-title").css({'fill': '#FF0067'});
                  }

              },
              onmouseover: function (d, i) { console.log("onmouseover", d, i); },
              onmouseout: function (d, i) { console.log("onmouseout", d, i); },
          },
          legend: {
             hide: true
          },
          donut: {
              title: "--",
              width: 15,
              label: {
                  show: false
              },
              labels: {
                  format: function (value, ratio, id) {
                    return value+"%";
                  }
              }
          },
          color: {
              pattern: ['#7FFFFF','#FF0067']
          }
      }); 
      $("#profitLossTrades").find(".c3-chart-arcs-title")[0].innerHTML = 17;
      $("#profitLossTrades").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});


      var consecutiveWinLoss_arr = [];
      consecutiveWinLoss_arr.push(
          ['Win',34],
          ['Loss',5]
      );
      var profitLoss_chart = c3.generate({
          bindto: "#consecutiveWinLoss",
          padding: {
              bottom: 20
          },
          size: {
              height: 150,
              width: 150
          },
          point: {
            r: 5
          },
          tooltip: {
            show: true
          },
          data: {
              selection: {
                  enabled: true
              },
              columns: consecutiveWinLoss_arr,
              type : 'donut',
              onclick: function (d, i) { 
                  console.log("onclick", d, i); 
                  console.log("value", d.value); 
                  $("#consecutiveWinLoss").find(".c3-chart-arcs-title")[0].innerHTML = d.value;

                  if (d.name == "Win") {
                      $("#consecutiveWinLoss").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});
                  }else if (d.name == "Loss") {
                      $("#consecutiveWinLoss").find(".c3-chart-arcs-title").css({'fill': '#FF0067'});
                  }

              },
              onmouseover: function (d, i) { console.log("onmouseover", d, i); },
              onmouseout: function (d, i) { console.log("onmouseout", d, i); },
          },
          legend: {
             hide: true
          },
          donut: {
              title: "--",
              width: 15,
              label: {
                  show: false
              },
              labels: {
                  format: function (value, ratio, id) {
                    return value+"%";
                  }
              }
          },
          color: {
              pattern: ['#7FFFFF','#FF0067']
          }
      }); 
      $("#consecutiveWinLoss").find(".c3-chart-arcs-title")[0].innerHTML = 34;
      $("#consecutiveWinLoss").find(".c3-chart-arcs-title").css({'fill': '#7FFFFF'});

      

      $('#container').animate({'margin-top': '490px'}, 1000, function() {
        $('#container_algo_backtest_detail').animate({'top': '40px'});
        //setTimeout(function(){


          console.log("$('#backtest_chart > svg > g:eq(1) > g:eq(1)'): ",$('#backtest_chart > svg > g:eq(1) > g:eq(1) > rect:eq(1)') );
          $('#backtest_chart > svg > g:eq(1) > g:eq(1) > rect:eq(1)').attr("width", "730");
          $('#backtest_chart > svg > g:eq(1) > g:eq(1) > rect:eq(1)').attr("x", "4");
          $('#backtest_chart > svg > g:eq(1) > g:eq(2)').attr("transform", "translate(0,0)");


          //$scope.showButtonBar = false;
          
          $scope.today = function() {
            $scope.dt = new Date();
          };
          $scope.today();

          $scope.clear = function() {
            $scope.dt = null;
          };

          $scope.inlineOptions = {
            customClass: getDayClass,
            minDate: new Date(),
            showWeeks: false
          };

          $scope.dateOptions = {
            dateDisabled: disabled,
            formatYear: 'yy',
            maxDate: new Date(2020, 5, 22),
            minDate: new Date(),
            startingDay: 1,
            showWeeks: false
          };

          // Disable weekend selection
          function disabled(data) {
            var date = data.date,
              mode = data.mode;
            return mode === 'day' && (date.getDay() === 0 || date.getDay() === 6);
          }

          $scope.toggleMin = function() {
            $scope.inlineOptions.minDate = $scope.inlineOptions.minDate ? null : new Date();
            $scope.dateOptions.minDate = $scope.inlineOptions.minDate;
          };

          $scope.toggleMin();

          $scope.open1 = function() {
            $scope.popup1.opened = true;
          };

          $scope.open2 = function() {
            $scope.popup2.opened = true;
          };

          $scope.setDate = function(year, month, day) {
            $scope.dt = new Date(year, month, day);
          };

          $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
          $scope.format = $scope.formats[0];
          $scope.altInputFormats = ['M!/d!/yyyy'];

          $scope.popup1 = {
            opened: false
          };

          $scope.popup2 = {
            opened: false
          };

          var tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          var afterTomorrow = new Date();
          afterTomorrow.setDate(tomorrow.getDate() + 1);
          $scope.events = [
            {
              date: tomorrow,
              status: 'full'
            },
            {
              date: afterTomorrow,
              status: 'partially'
            }
          ];

          function getDayClass(data) {
            var date = data.date,
              mode = data.mode;
            if (mode === 'day') {
              var dayToCheck = new Date(date).setHours(0,0,0,0);

              for (var i = 0; i < $scope.events.length; i++) {
                var currentDay = new Date($scope.events[i].date).setHours(0,0,0,0);

                if (dayToCheck === currentDay) {
                  return $scope.events[i].status;
                }
              }
            }

            return '';
          }

          $scope.$digest();

        //},2000);
      });
    }

    $scope.skipIntegrationTest = function(){
      console.log("skipIntegrationTest: "+$scope.dataCurrentAlgos.integrationTest.actionSkipped);
      
      $scope.dataCurrentAlgos.integrationTest.actionSkipped = true;
      var query = {"_id":$scope.dataCurrentAlgos["_id"] };
      storedb('algos').update(
        {"_id":$scope.dataCurrentAlgos["_id"] },
        $scope.dataCurrentAlgos,
        function(err,result){
        if(err == undefined || err == null || err == ""){
          console.log("insert: ",result);
        }else{
          $scope.dataCurrentAlgos.integrationTest.actionSkipped = false;
        }
      });   

    }


    $scope.checkAlgoNameOnServer = function(algoName){
      var url = $scope.ipServer+'/checkAlgoName?algoName='+algoName;
      console.log("url chekc algo: "+url);
      // CHECK IF ALGO NAME EXIST ON DEV SERVER
      request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log("Success"); 
          console.log("response: ",response);
          console.log("response body: ",response.body);

          if (response.body == "0") {
            var urlProd = false;
            if ($scope.ipProdServer) {
              var urlProd = $scope.ipProdServer+'/checkAlgoName?algoName='+$scope.newAlgo.algoName;
              console.log("url chekc algo: "+url);
            };
            if (urlProd) {
              // CHECK IF ALGO NAME EXIST ON PROD SERVER
              request(urlProd, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                  console.log("Success"); 
                  console.log("response: ",response);

                  if (response.body == "0") {
                   
                   //////////////////////////////////////////////////////
                   return false;

                  }else if (response.body == "1") {
                    //scope.displayErrorMsg("Error! Algorithm name already exist on Production Server. Change name at this algorithm file");
                    var result = "Error! Algorithm name already exist on Production Server. Change name at this algorithm file";
                    return result;
                  }

                }else{
                  console.log("Error");
                  var result = "Prod Server Error";
                  return result;
                }
              });
            }else{
              return false;
            }

          }else if (response.body == "1") {
            //$scope.displayErrorMsg("Error! Algorithm name already exist on Beta Server. Change name at this algorithm file");
            var result = "Error! Algorithm name already exist on Beta Server. Change name at this algorithm file";
            return result;
          };


        }else{
          console.log("Error");
          var result = "Dev Server Error";
          return result;
        }
      });
    }


    ///////////////////////////////// BETA TEST  //////////////////////////////////

    $scope.deployInBeta = function(){
      if (!$scope.dataCurrentAlgos.betaTest.actionDeploy) {

        //TODO - CHECK NAME ALGO ON SERVER 
        //var result = $scope.checkAlgoNameOnServer($scope.dataCurrentAlgos.algoName);
        //if (!result) {

        storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
          if(err == undefined || err == null || err == ""){ 
            
            var serverName = 'integrationTest';
            result[0]['betaTest'].param = JSON.stringify(result[0][serverName].param);
            result[0]['betaTest'].param = JSON.parse(result[0][serverName].param);

            var search = {'_id':$scope.dataCurrentAlgos["_id"] };
            var action2 = {};
            action2['betaTest'] = result[0]['betaTest'];
            var query = {"$set" : action2};
            $scope.updateDb(search,query,function(result){
              if (result == true) {


                $scope.uploading_algo = false;
                $scope.errorMsg = "";  
                $('#error_alert').css('opacity', '0');
                $('#error_alert').hide();
                $('#msg_alert').show();
                $('#msg_cont_id').slideDown("slow",function(){
                  $('#msg_alert').fadeTo( "slow", 1);
                });
                $scope.infoMsg = "Deploying on server...";  
                /*setTimeout(function(){
                  $('#msg_alert').fadeTo("slow",0);
                  $('#msg_cont_id').slideUp(0,function(){    
                    $scope.uploading_algo = true;
                    $scope.errorMsg = "";  
                    $scope.$digest();
                  });
                },4000);*/
                console.log("$scope.dataCurrentAlgos: ",$scope.dataCurrentAlgos);
                var algoName = $scope.dataCurrentAlgos.algoName;
                var algoPath = $scope.dataCurrentAlgos.algoFileName;
                var algoId = $scope.dataCurrentAlgos['_id'];
                console.log("algo name: ",algoName);

                //INSERT CHECK IF FILE EXIST

                var rd_file = fs.createReadStream($scope.domain+algoId+'/'+algoPath);
                rd_file.on("error", function(err) {
                  console.log("error read file: ",err);



                  storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
                    if(err == undefined || err == null || err == ""){ 
                      result[0]['betaTest'].param = '--';
                      var search = {'_id':$scope.dataCurrentAlgos["_id"] };
                      var action2 = {};
                      action2['betaTest'] = result[0]['betaTest'];
                      var query = {"$set" : action2};
                      $scope.updateDb(search,query,function(result){
                        if (result == true) {}
                      });
                    }
                  });

                  
                  setTimeout(function(){
                    $scope.infoMsg = "";  
                    $('#msg_alert').css('opacity', '0');
                    $('#msg_alert').hide();
                    $('#error_alert').show();
                    $('#error_alert').fadeTo( "slow", 1);
                    $scope.errorMsg = "to reading file";  
                    $scope.$digest();
                  },3000);
                  setTimeout(function(){
                    $('#error_alert').fadeTo("slow",0);
                    $('#msg_cont_id').slideUp(0,function(){    
                      $scope.uploading_algo = true;
                      $scope.errorMsg = "";  
                      $scope.$digest();
                    });
                  },6000);

                });
                rd_file.on('data',function(data){
                  //console.log("reading file: ",data.length);
                });

                var serverName = '';
                var isProdServer = false;
                if ($scope.ipProdServer != "") {
                  serverName = 'prod';
                  isProdServer = true;
                };

                var options = {
                  url: $scope.ipServer+'/uploadOnBeta',
                  headers: {
                    'Name-Algo': $scope.dataCurrentAlgos.algoName,
                    'Name-File': $scope.dataCurrentAlgos.algoFileName,
                    'Algo-Id': $scope.dataCurrentAlgos['_id'],
                    'Algo-Details': JSON.stringify($scope.dataCurrentAlgos),
                    'Server-Name': serverName,
                    'Prod-Server': isProdServer,
                    'Remote-Server-Url': $scope.ipProdServer,
                    'Local-Algo-Version': $scope.dataCurrentAlgos.algo_version
                  }
                };

                rd_file.pipe(
                  request
                    .post(options)
                    .on('error', function(err) {
                      console.log("error to send file: ",err);

                      storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
                        if(err == undefined || err == null || err == ""){ 
                          result[0]['betaTest'].param = '--';
                          var search = {'_id':$scope.dataCurrentAlgos["_id"] };
                          var action2 = {};
                          action2['betaTest'] = result[0]['betaTest'];
                          var query = {"$set" : action2};
                          $scope.updateDb(search,query,function(result){
                            if (result == true) {}
                          });
                        }
                      });

                      setTimeout(function(){
                        $scope.infoMsg = "";  
                        $('#msg_alert').css('opacity', '0');
                        $('#msg_alert').hide();
                        $('#error_alert').show();
                        $('#error_alert').fadeTo( "slow", 1);
                        $scope.errorMsg = "on connection";  
                        $scope.$digest();
                      },3000);
                      setTimeout(function(){
                        $('#error_alert').fadeTo("slow",0);
                        $('#msg_cont_id').slideUp(0,function(){    
                          $scope.uploading_algo = true;
                          $scope.errorMsg = "";  
                          $scope.$digest();
                        });
                      },6000);

                    })
                    .on('response', function(response) {
                      console.log(response.statusCode); // 200
                      console.log(response.headers['content-type']); // 'image/png'
                      if (response.statusCode == 200) {
                        console.log("response: ",response);
                        var msg = JSON.parse(response.headers['response-msg']);
                        console.log("msg: ",msg);
                        if (msg.status == 200) {
                          console.log("Success - file sent to server");
                          setTimeout(function(){
                            $scope.infoMsg = msg.msg; 
                            $scope.$digest(); 
                          },3000);
                          setTimeout(function(){
                            $('#msg_alert').fadeTo("slow",0);
                            $('#msg_cont_id').slideUp(0,function(){    
                              $scope.uploading_algo = true;
                              $scope.errorMsg = ""; 
                              $('#error_alert').css('opacity', '0');

                              $scope.dataCurrentAlgos.betaTest.actionDeploy = true;
                              $scope.dataCurrentAlgos.betaTest.actionStart = false;
                              $scope.dataCurrentAlgos.betaTest.actionStop = true;
                              $scope.dataCurrentAlgos.betaTest.statusValue = 1;

                              var tempAlgoVersion = $scope.dataCurrentAlgos.algo_version + 1;
                              var tempValStatusLabel = $scope.dataCurrentAlgos.betaTest.statusLabel;
                              var tempValActionDeploy = $scope.dataCurrentAlgos.betaTest.actionDeploy;
                              var tempValStatusValue = $scope.dataCurrentAlgos.betaTest.statusValue;

                              $scope.dataCurrentAlgos.algo_version = tempAlgoVersion;
                              $scope.dataCurrentAlgos.betaTest.statusLabel = 'Deployed';
                              $scope.dataCurrentAlgos.betaTest.actionDeploy = true;
                              $scope.dataCurrentAlgos.betaTest.statusValue = 1;

                              //var query = {"_id":$scope.dataCurrentAlgos["_id"] };
                              storedb('algos').update(
                                {"_id":$scope.dataCurrentAlgos["_id"] },
                                $scope.dataCurrentAlgos,
                                function(err,result){
                                if(err == undefined || err == null || err == ""){
                                  console.log("insert: ",result);
                                }else{
                                  $scope.dataCurrentAlgos.algo_version = tempAlgoVersion;
                                  $scope.dataCurrentAlgos.betaTest.statusLabel = tempValStatusLabel;
                                  $scope.dataCurrentAlgos.betaTest.actionDeploy = tempValActionDeploy;
                                  $scope.dataCurrentAlgos.betaTest.statusValue = tempValStatusValue;
                                }
                              });   
                              $scope.$digest();
                            });
                          },6000);
                        }else{
                          
                          storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
                            if(err == undefined || err == null || err == ""){ 
                              result[0]['betaTest'].param = '--';
                              var search = {'_id':$scope.dataCurrentAlgos["_id"] };
                              var action2 = {};
                              action2['betaTest'] = result[0]['betaTest'];
                              var query = {"$set" : action2};
                              $scope.updateDb(search,query,function(result){
                                if (result == true) {}
                              });
                            }
                          });

                          setTimeout(function(){
                            $scope.infoMsg = "";  
                            $('#msg_alert').css('opacity', '0');
                            $('#msg_alert').hide();
                            $('#error_alert').show();
                            $('#error_alert').fadeTo( "slow", 1);
                            $scope.errorMsg = msg.msg;  
                            $scope.$digest();
                          },3000);
                          
                          setTimeout(function(){
                            $('#error_alert').fadeTo("slow",0);
                            $('#msg_cont_id').slideUp(0,function(){    
                              $scope.uploading_algo = true;
                              $scope.errorMsg = "";  
                              $scope.$digest();
                            });
                          },6000);
                        }
                        
                      }else{

                        storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
                          if(err == undefined || err == null || err == ""){ 
                            result[0]['betaTest'].param = '--';
                            var search = {'_id':$scope.dataCurrentAlgos["_id"] };
                            var action2 = {};
                            action2['betaTest'] = result[0]['betaTest'];
                            var query = {"$set" : action2};
                            $scope.updateDb(search,query,function(result){
                              if (result == true) {}
                            });
                          }
                        });

                        setTimeout(function(){
                          console.log("Error to send file to server");
                          $scope.infoMsg = "";  
                          $('#msg_alert').css('opacity', '0');
                          $('#msg_alert').hide();
                          $('#error_alert').show();
                          $('#error_alert').fadeTo( "slow", 1);
                          $scope.errorMsg = "to send file to server";  
                          $scope.$digest();
                        },3000);
                        
                        setTimeout(function(){
                          $('#error_alert').fadeTo("slow",0);
                          $('#msg_cont_id').slideUp(0,function(){    
                            $scope.uploading_algo = true;
                            $scope.errorMsg = "";  
                            $scope.$digest();
                          });
                        },6000);
                      }
                    })
                );
              }
            });
          }
        });

          

        //}else{

          //TO-DO DISPLAY ERROR MESSAGE

        //}
        //$scope.dataCurrentAlgos.betaTest.statusValue = '-1';
        //$scope.dataCurrentAlgos.betaTest.statusLabel = 'Error';
        //deploy exe
      }
    }

    $scope.deployInProd = function(){
      if ( !$scope.dataCurrentAlgos.prod.actionDeploy && $scope.ipProdServer != "" ) {

        //TODO - CHECK NAME ALGO ON SERVER 
        //var result = $scope.checkAlgoNameOnServer($scope.dataCurrentAlgos.algoName);
        //if (!result) {


        storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
          if(err == undefined || err == null || err == ""){ 
            
            var serverName = 'integrationTest';
            result[0]['prod'].param = JSON.stringify(result[0][serverName].param);
            result[0]['prod'].param = JSON.parse(result[0][serverName].param);

            var search = {'_id':$scope.dataCurrentAlgos["_id"] };
            var action2 = {};
            action2['prod'] = result[0]['prod'];
            var query = {"$set" : action2};
            $scope.updateDb(search,query,function(result){
              if (result == true) {


                $scope.uploading_algo = false;
                $scope.errorMsg = "";  
                $('#error_alert').css('opacity', '0');
                $('#error_alert').hide();
                $('#msg_alert').show();
                $('#msg_cont_id').slideDown("slow",function(){
                  $('#msg_alert').fadeTo( "slow", 1);
                });
                $scope.infoMsg = "Deploying on server...";  
                /*setTimeout(function(){
                  $('#msg_alert').fadeTo("slow",0);
                  $('#msg_cont_id').slideUp(0,function(){    
                    $scope.uploading_algo = true;
                    $scope.errorMsg = "";  
                    $scope.$digest();
                  });
                },4000);*/
                console.log("$scope.dataCurrentAlgos: ",$scope.dataCurrentAlgos);
                var algoName = $scope.dataCurrentAlgos.algoName;
                var algoPath = $scope.dataCurrentAlgos.algoFileName;
                var algoId = $scope.dataCurrentAlgos['_id'];
                console.log("algo name: ",algoName);

                //INSERT CHECK IF FILE EXIST

                var rd_file = fs.createReadStream($scope.domain+algoId+'/'+algoPath);
                rd_file.on("error", function(err) {
                  console.log("error read file: ",err);
                  
                  storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
                    if(err == undefined || err == null || err == ""){ 
                      result[0]['prod'].param = '--';
                      var search = {'_id':$scope.dataCurrentAlgos["_id"] };
                      var action2 = {};
                      action2['prod'] = result[0]['prod'];
                      var query = {"$set" : action2};
                      $scope.updateDb(search,query,function(result){
                        if (result == true) {}
                      });
                    }
                  });

                  setTimeout(function(){
                    $scope.infoMsg = "";  
                    $('#msg_alert').css('opacity', '0');
                    $('#msg_alert').hide();
                    $('#error_alert').show();
                    $('#error_alert').fadeTo( "slow", 1);
                    $scope.errorMsg = "to reading file";  
                    $scope.$digest();
                  },3000);
                  setTimeout(function(){
                    $('#error_alert').fadeTo("slow",0);
                    $('#msg_cont_id').slideUp(0,function(){    
                      $scope.uploading_algo = true;
                      $scope.errorMsg = "";  
                      $scope.$digest();
                    });
                  },6000);

                });
                rd_file.on('data',function(data){
                  //console.log("reading file: ",data.length);
                });

                //var serverName = '';
                //var isProdServer = false;
                //if ($scope.ipProdServer != "") {
                //  serverName = 'prod';
                //  isProdServer = true;
                //};

                var options = {
                  url: $scope.ipProdServer+'/uploadOnProd',
                  headers: {
                    'Name-Algo': $scope.dataCurrentAlgos.algoName,
                    'Name-File': $scope.dataCurrentAlgos.algoFileName,
                    'Algo-Id': $scope.dataCurrentAlgos['_id'],
                    'Algo-Details': JSON.stringify($scope.dataCurrentAlgos),
                    'Server-Name': 'prod',
                    'Beta-Server': true,
                    'Remote-Server-Url': $scope.ipServer,
                    'Local-Algo-Version': $scope.dataCurrentAlgos.algo_version
                  }
                };

                console.log("option request: ",options);

                rd_file.pipe(
                  request
                    .post(options)
                    .on('error', function(err) {
                      console.log("error to send file: ",err);

                      setTimeout(function(){
                        $scope.infoMsg = "";  
                        $('#msg_alert').css('opacity', '0');
                        $('#msg_alert').hide();
                        $('#error_alert').show();
                        $('#error_alert').fadeTo( "slow", 1);
                        $scope.errorMsg = "on connection";  
                        $scope.$digest();
                      },3000);
                      setTimeout(function(){
                        $('#error_alert').fadeTo("slow",0);
                        $('#msg_cont_id').slideUp(0,function(){    
                          $scope.uploading_algo = true;
                          $scope.errorMsg = "";  
                          $scope.$digest();
                        });
                      },6000);

                    })
                    .on('response', function(response) {
                      console.log(response.statusCode); // 200
                      console.log(response.headers['content-type']); // 'image/png'
                      if (response.statusCode == 200) {
                        console.log("response: ",response);
                        var msg = JSON.parse(response.headers['response-msg']);
                        console.log("msg: ",msg);
                        if (msg.status == 200) {
                          console.log("Success - file sent to server");
                          setTimeout(function(){
                            $scope.infoMsg = msg.msg; 
                            $scope.$digest(); 
                          },3000);
                          setTimeout(function(){
                            $('#msg_alert').fadeTo("slow",0);
                            $('#msg_cont_id').slideUp(0,function(){    
                              $scope.uploading_algo = true;
                              $scope.errorMsg = ""; 
                              $('#error_alert').css('opacity', '0');

                              $scope.dataCurrentAlgos.prod.actionDeploy = true;
                              $scope.dataCurrentAlgos.prod.actionStart = false;
                              $scope.dataCurrentAlgos.prod.actionStop = true;
                              $scope.dataCurrentAlgos.prod.statusValue = 1;

                              var tempAlgoVersion = $scope.dataCurrentAlgos.algo_version + 1;
                              var tempValStatusLabel = $scope.dataCurrentAlgos.prod.statusLabel;
                              var tempValActionDeploy = $scope.dataCurrentAlgos.prod.actionDeploy;
                              var tempValStatusValue = $scope.dataCurrentAlgos.prod.statusValue;

                              $scope.dataCurrentAlgos.algo_version = tempAlgoVersion;
                              $scope.dataCurrentAlgos.prod.statusLabel = 'Deployed';
                              $scope.dataCurrentAlgos.prod.actionDeploy = true;
                              $scope.dataCurrentAlgos.prod.statusValue = 1;

                              //var query = {"_id":$scope.dataCurrentAlgos["_id"] };
                              storedb('algos').update(
                                {"_id":$scope.dataCurrentAlgos["_id"] },
                                $scope.dataCurrentAlgos,
                                function(err,result){
                                if(err == undefined || err == null || err == ""){
                                  console.log("insert: ",result);
                                }else{
                                  $scope.dataCurrentAlgos.algo_version = tempAlgoVersion;
                                  $scope.dataCurrentAlgos.prod.statusLabel = tempValStatusLabel;
                                  $scope.dataCurrentAlgos.prod.actionDeploy = tempValActionDeploy;
                                  $scope.dataCurrentAlgos.prod.statusValue = tempValStatusValue;
                                }
                              });   
                              $scope.$digest();
                            });
                          },6000);
                        }else{
                          
                          storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
                            if(err == undefined || err == null || err == ""){ 
                              result[0]['prod'].param = '--';
                              var search = {'_id':$scope.dataCurrentAlgos["_id"] };
                              var action2 = {};
                              action2['prod'] = result[0]['prod'];
                              var query = {"$set" : action2};
                              $scope.updateDb(search,query,function(result){
                                if (result == true) {}
                              });
                            }
                          });

                          setTimeout(function(){
                            $scope.infoMsg = "";  
                            $('#msg_alert').css('opacity', '0');
                            $('#msg_alert').hide();
                            $('#error_alert').show();
                            $('#error_alert').fadeTo( "slow", 1);
                            $scope.errorMsg = msg.msg;  
                            $scope.$digest();
                          },3000);
                          
                          setTimeout(function(){
                            $('#error_alert').fadeTo("slow",0);
                            $('#msg_cont_id').slideUp(0,function(){    
                              $scope.uploading_algo = true;
                              $scope.errorMsg = "";  
                              $scope.$digest();
                            });
                          },6000);
                        }
                        
                      }else{

                        storedb('algos').find({"_id":$scope.dataCurrentAlgos["_id"]},function(err,result){
                          if(err == undefined || err == null || err == ""){ 
                            result[0]['prod'].param = '--';
                            var search = {'_id':$scope.dataCurrentAlgos["_id"] };
                            var action2 = {};
                            action2['prod'] = result[0]['prod'];
                            var query = {"$set" : action2};
                            $scope.updateDb(search,query,function(result){
                              if (result == true) {}
                            });
                          }
                        });

                        setTimeout(function(){
                          console.log("Error to send file to server");
                          $scope.infoMsg = "";  
                          $('#msg_alert').css('opacity', '0');
                          $('#msg_alert').hide();
                          $('#error_alert').show();
                          $('#error_alert').fadeTo( "slow", 1);
                          $scope.errorMsg = "to send file to server";  
                          $scope.$digest();
                        },3000);
                        
                        setTimeout(function(){
                          $('#error_alert').fadeTo("slow",0);
                          $('#msg_cont_id').slideUp(0,function(){    
                            $scope.uploading_algo = true;
                            $scope.errorMsg = "";  
                            $scope.$digest();
                          });
                        },6000);
                      }
                    })
                );
              }
            });
          }
        });
        //}else{

          //TO-DO DISPLAY ERROR MESSAGE

        //}
        //$scope.dataCurrentAlgos.betaTest.statusValue = '-1';
        //$scope.dataCurrentAlgos.betaTest.statusLabel = 'Error';
        //deploy exe
      }
    }

    $scope.renameAlgo = function($event){
      console.log("$event.currentTarget: ",$($event.currentTarget).prev() );
      $($event.currentTarget).prev()[0].setAttribute("contenteditable", "");
      $($event.currentTarget).hide();
      $($event.currentTarget).nextAll().show();
    }

    $scope.cancelNewNameAlgo = function($event,index){
      var tmpAlgoId = $scope.dataAlgos[index]['_id'];
      storedb('algos').find({"_id":tmpAlgoId},function(err,result){
        if(err == undefined || err == null || err == ""){ 
          oldAlgoName = result[0].algoName;
        }
      });
      $($event.currentTarget).prev().prev()[0].innerHTML = oldAlgoName;
      $($event.currentTarget).prev().prev()[0].removeAttribute("contenteditable", "");
      $($event.currentTarget).prev().show();
      $($event.currentTarget).next().hide();
      $($event.currentTarget).hide();
    }

    $scope.saveNewNameAlgo = function($event,index){
      console.log("$scope.dataAlgos[index]: ",$scope.dataAlgos[index]['_id']);

      var tmpNewAlgoName = $($event.currentTarget).prev().prev().prev().text();
      var eventElem = $event.currentTarget;
      //var tmpLocalLastBetaServerVersion = $scope.dataAlgos[index].betaTest.server_version;
      //var tmpLocalLastProdServerVersion = $scope.dataAlgos[index].prod.server_version;
      var tmpLocalLastAlgoVersion = $scope.dataAlgos[index].algo_version;
      var tmpAlgoId = $scope.dataAlgos[index]['_id'];
      var oldAlgoName = "";
      storedb('algos').find({"_id":tmpAlgoId},function(err,result){
        if(err == undefined || err == null || err == ""){ 
          oldAlgoName = result[0].algoName;
        }
      });
      //console.log("$($event.currentTarget): ",$($event.currentTarget).prev().prev().prev().text());
      var urlBeta = $scope.ipServer+'/renameAlgo?newAlgoName='+tmpNewAlgoName+"&tmpAlgoId="+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer=";
      var urlProd = null;
      if ($scope.ipProdServer) {
        var urlBeta = $scope.ipServer+'/renameAlgo?newAlgoName='+tmpNewAlgoName+"&tmpAlgoId="+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer="+$scope.ipProdServer;
      };

      console.log("in");

      var updateDb = function(search,query,callback){
       
        storedb('algos').update(search,query,function(err){
          if(err == undefined || err == null || err == ""){
            console.log("success update algo");
            return callback(true);
          }else{
            console.log("error to update algo");
            return callback(false);
          }
        });
      };

      request(urlBeta, function (error, response, body) {
        console.log("error: ",error);
        if (!error && response.statusCode == 200) {
          body = JSON.parse(body);
          console.log("body: ",body);
          console.log("response: ",response);
          console.log("body.error: ",body.error);
          console.log("body.error: ",body.error);
          if (body != undefined && body != null && body != "" && body.error == 0) {
            console.log("msg, save algo: ",body.msg); 

            storedb('algos').find({"_id":tmpAlgoId},function(err,result){
              if(err == undefined || err == null || err == ""){ 
                //console.log("result.betaTest.server_version: ",result);
                //result[0].betaTest.server_version = body.new_server_version;

                //var search = {'_id':tmpAlgoId };
                //var action = {};
                //action['betaTest'] = result[0].betaTest;
                //var query = {"$set" : action};*/

                //updateDb(search,query,function(result){

                //  console.log("result 0 update local server_version: ",result);

                //  if(result == true) {
                    var search = {'_id':tmpAlgoId };
                    var action = { 'algo_version' : body.new_algo_version};
                    var query = {"$set" : action};
                    updateDb(search,query,function(result){

                      console.log("result 1 update local algo_version: ",result);

                      if (result == true) {
                        var search = {'_id':tmpAlgoId };
                        var action = { "algoName" : body.new_name };
                        var query = {"$set" : action};
                        updateDb(search,query,function(result){

                          console.log("result 2 update local algo_name: ",result);

                          if (result == true) {

                            console.log("Success, algo_version,algoName and algo version was updated on local pc, beta server and prod server");
                            $(eventElem).prev().prev().prev()[0].innerHTML = body.new_name;
                            $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
                            $(eventElem).prev().prev().show();
                            $(eventElem).prev().hide();
                            $(eventElem).hide();
                          
                          }else{

                            // TODO - show error and put the previus name of the algo

                            $(eventElem).prev().prev().prev()[0].innerHTML = oldAlgoName;
                            $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
                            $(eventElem).prev().prev().show();
                            $(eventElem).prev().hide();
                            $(eventElem).hide();
                            console.log("error to update algoName on local pc");
                          }


                        });
                        
                      }else{
                        $(eventElem).prev().prev().prev()[0].innerHTML = oldAlgoName;
                        $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
                        $(eventElem).prev().prev().show();
                        $(eventElem).prev().hide();
                        $(eventElem).hide();
                        console.log("error to update algoVersion on local pc");
                      }

                    });
                    
                  //}else{
                  //  $(eventElem).prev().prev().prev()[0].innerHTML = oldAlgoName;
                  //  $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
                  //  $(eventElem).prev().prev().show();
                  //  $(eventElem).prev().hide();
                  //  $(eventElem).hide();
                  //  console.log("error to update serverVersion on local pc");
                  //}
                //});

              }
            });

          }else if (body != undefined && body != null && body != "" && body.error == 2) {
            console.log("error from server to update algoName: ",body.msg); 
            // TODO - show error and put the previus name of the algo
            storedb('algos').find({"_id":tmpAlgoId},function(err,result){
              if(err == undefined || err == null || err == ""){ 
                console.log("body.new_name: ",body.new_name);
                var search = {'_id':tmpAlgoId };
                var action = { "algoName" : body.new_name };
                var query = {"$set" : action};
                updateDb(search,query,function(result){

                  if (result == true) {
                    console.log("Success, algoName was updated only on local pc");
                    $(eventElem).prev().prev().prev()[0].innerHTML = body.new_name;
                    $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
                    $(eventElem).prev().prev().show();
                    $(eventElem).prev().hide();
                    $(eventElem).hide();
                    
                  }else{
                    $(eventElem).prev().prev().prev()[0].innerHTML = oldAlgoName;
                    $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
                    $(eventElem).prev().prev().show();
                    $(eventElem).prev().hide();
                    $(eventElem).hide();
                  }
                });
              }
            });
          }else if (body != undefined && body != null && body != "" && body.error == 1) {
            console.log("error from server to update algoName: ",body.msg); 
            $(eventElem).prev().prev().prev()[0].innerHTML = oldAlgoName;
            $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
            $(eventElem).prev().prev().show();
            $(eventElem).prev().hide();
            $(eventElem).hide();
          }
        }else{

          // TODO - show error and put the previus name of the algo
         
          $(eventElem).prev().prev().prev()[0].innerHTML = oldAlgoName;
          $(eventElem).prev().prev().prev()[0].removeAttribute("contenteditable", "");
          $(eventElem).prev().prev().show();
          $(eventElem).prev().hide();
          $(eventElem).hide();
        }
      });
    };





    $scope.checkAlgoSyncServers = function(algoId,localLastAlgoVersion,callback){

      var urlProd = null;
      if ($scope.ipProdServer) {
        urlProd = $scope.ipProdServer+'/checkAlgoVersion?algoId='+algoId;
      };
      var urlBeta = $scope.ipServer+'/checkAlgoVersion?algoId='+algoId;

      var algoVersion_betaServer = "";
      var algoVersion_prodServer = "";

      request(urlBeta, function (error, response, body) {
        console.log("error: ",error);
        if (!error && response.statusCode == 200) {
          body = JSON.parse(body);
          console.log("body: ",body);
          console.log("response: ",response);
          console.log("body.error: ",body.error);
          if (body != undefined && body != null && body != "" ) {
              

              var algoVersion_betaServer = null;
              var algoDetail_betaServer = null;

              if (body.error == 0 ) {
                algoVersion_betaServer = body.algoVersion;
                algoDetail_betaServer = body.algoDetail;
              }else if (body.error == 1) {
                algoVersion_betaServer = null;
                algoDetail_betaServer = null;
              };

              if (urlProd) {
                request(urlProd, function (error, response, body) {
                  console.log("error: ",error);
                  if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    console.log("body: ",body);
                    console.log("response: ",response);
                    console.log("body.error: ",body.error);
                    if (body != undefined && body != null && body != "" ) {
                      
                        var algoVersion_prodServer = null;
                        var algoDetail_prodServer = null;

                        if (body.error == 0 ) {
                          algoVersion_prodServer = body.algoVersion;
                          algoDetail_prodServer = body.algoDetail;
                        }else if (body.error == 1) {
                          algoVersion_prodServer = null;
                          algoDetail_prodServer = null;
                        };

//DEBUG HERE
console.log("algoVersion_betaServer: ",algoVersion_betaServer);
console.log("algoVersion_prodServer: ",algoVersion_prodServer);
console.log("algoDetail_prodServer: ",algoDetail_prodServer);

                        if (algoVersion_prodServer == null || algoVersion_betaServer == null) {
                          console.log("0 in");
                          callback(true);
                        }else if (algoVersion_prodServer > algoVersion_betaServer) {
                          console.log("1 in");

//DEBUG HERE

                          // UPDATING ALGO ON BETA SERVER
                          var urlUpdateBetaServerAlgoSetting = $scope.ipServer+'/updateSettingAlgo';
                          var options = {
                            method: 'post',
                            body: algoDetail_prodServer,
                            json: true,
                            url: urlUpdateBetaServerAlgoSetting
                          }
                          request(options, function (err, res, body) {

//DEBUG HERE

                            if (err) {
                              console.log("error to update algo on Beta server");
                              callback(false);
                            }
                            if (body != undefined && body != null && body != "") {
                              if (body.error == 0) {
                                console.log("updated algo on Beta server");
                                console.log(body.msg);
                                callback(true);
                              }else{
                                console.log('error to update algo on Beta server');
                                callback(false);
                              };
                            }else{
                              console.log('error to update algo on Beta server');
                              callback(false);
                            }
                          });

                        }else if (algoVersion_prodServer < algoVersion_betaServer) {
                          console.log("2 in");
                          // UPDATING ALGO ON PROD SERVER
                          var urlUpdateProdServerAlgoSetting = $scope.ipServer+'/updateSettingAlgo';
                          var options = {
                            method: 'post',
                            body: algoDetail_betaServer,
                            json: true,
                            url: urlUpdateProdServerAlgoSetting
                          }
                          request(options, function (err, res, body) {
                            if (err) {
                              console.log("error to update algo on Prod server");
                              callback(false);
                            }
                            if (body != undefined && body != null && body != "") {
                              if (body.error == 0) {
                                console.log("updated algo on Prod server");
                                console.log(body.msg);
                                callback(true);
                              }else{
                                console.log('error to update algo on Prod server');
                                callback(false);
                              };
                            }else{
                              console.log('error to update algo on Prod server');
                              callback(false);
                            }
                          });

                        }else if (algoVersion_prodServer == algoVersion_betaServer) {
                          callback(true);
                        }


                      
                    }else{
                      console.log("error o check lgo version on prod server");
                      callback(false);
                    }
                  }else{
                    console.log("error o check algo version on prod server");
                    callback(false);
                  }
                });
              }else{
                callback(true);
              }


            
          }else{
            console.log("error o check lgo version on server");
            callback(false);
          }
        }else{
          console.log("error o check lgo version on server");
          callback(false);
        }
      });
    };


    $scope.startAlgo = function(serverName){

      if ( !$scope.dataCurrentAlgos[serverName].actionStart && $scope.dataCurrentAlgos[serverName].actionDeploy && $scope.dataCurrentAlgos[serverName].actionStop) {

        var tmpAlgoId = $scope.dataCurrentAlgos['_id'];
        var tmpLocalLastAlgoVersion = $scope.dataCurrentAlgos['algo_version'];

        var url = '';
        if (serverName == 'betaTest') {
          url = $scope.ipServer+'/startAlgoOnBeta?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer=false&remoteServerURL=";
          if ($scope.ipProdServer) {
            url = $scope.ipServer+'/startAlgoOnBeta?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer=true&remoteServerURL="+$scope.ipProdServer;
          };
        }else if (serverName == 'prod') {
          url = $scope.ipProdServer+'/startAlgoOnProd?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&betaServer=true&remoteServerURL="+$scope.ipServer;
        };

        $scope.checkAlgoSyncServers(tmpAlgoId,tmpLocalLastAlgoVersion,function(result){

          if (result == true) {

            var updateDb = function(search,query,callback){
              storedb('algos').update(search,query,function(err){
                if(err == undefined || err == null || err == ""){
                  console.log("success update algo");
                  return callback(true);
                }else{
                  console.log("error to update algo");
                  return callback(false);
                }
              });
            };

            console.log("result checkAlgoSyncServers: ",result);

            request(url, function (error, response, body) {
              console.log("error: ",error);
              if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                console.log("body: ",body);
                console.log("response: ",response);
                console.log("body.error: ",body.error);
                console.log("body.error: ",body.error);
                if (body != undefined && body != null && body != "" && body.error == 0) {
                  console.log("msg, save algo: ",body.msg); 

                  storedb('algos').find({"_id":tmpAlgoId},function(err,result2){
                    if(err == undefined || err == null || err == ""){ 
                      var search = {'_id':tmpAlgoId };
                      var action = { 'algo_version' : body.new_algo_version};
                      var query = {"$set" : action};
                      updateDb(search,query,function(resultUpdateDb){

                        console.log("result 1 update local algo_version: ",resultUpdateDb);

                        if (resultUpdateDb == true) {
                          var search = {'_id':tmpAlgoId };

                          result2[0][serverName].statusLabel = "Running";
                          result2[0][serverName].statusValue = "2";
                          result2[0][serverName].actionStart = true;
                          result2[0][serverName].actionStop = false;

                          var action2 = {};
                          action2[serverName] = result2[0][serverName];
                          var query = {"$set" : action2};
                          updateDb(search,query,function(result3){
                            if (result3 == true) {

                              $scope.dataCurrentAlgos.algo_version = body.new_algo_version;
                              $scope.dataCurrentAlgos[serverName].actionStart = true;
                              $scope.dataCurrentAlgos[serverName].actionStop = false;
                              $scope.dataCurrentAlgos[serverName].statusValue = "2";
                              $scope.dataCurrentAlgos[serverName].statusLabel = "Running";
                              $scope.$digest();

                              console.log("Success, algo_version,betaTest obj were updated on local pc, beta server and prod server");
                            }else{
                              console.log("error to update algo_version,betaTest obj on local pc");
                            }
                          });
                          
                        }else{
                          console.log("error to update algo_version,betaTest obj on local pc");
                        }
                      });
                    }
                  });
                }else if (body != undefined && body != null && body != "" && body.error == 1) {
                  console.log("error from server to start algo: ",body.msg); 
                }
              }else{
                // TODO - show error and put the previus name of the algo
                console.log("error from server to start algo: ",body.msg); 
              }
            });

          }else{
            console.log("error to check Algo on on sever");
          }

        });
      
      }else{
        console.log("before to start the algorithm you have to deploy the algo on server");
      }
    };

    $scope.stopAlgo = function(serverName){

      if ( $scope.dataCurrentAlgos[serverName].actionStart && $scope.dataCurrentAlgos[serverName].actionDeploy && !$scope.dataCurrentAlgos[serverName].actionStop) {

        var tmpAlgoId = $scope.dataCurrentAlgos['_id'];
        var tmpLocalLastAlgoVersion = $scope.dataCurrentAlgos['algo_version'];
        console.log('$scope.dataCurrentAlgos: ',$scope.dataCurrentAlgos);
        console.log('tmpLocalLastAlgoVersion: ',tmpLocalLastAlgoVersion);

        var url = '';
        if (serverName == 'betaTest') {
          url = $scope.ipServer+'/stopAlgoOnBeta?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer=false&remoteServerURL=";
          if ($scope.ipProdServer) {
            url = $scope.ipServer+'/stopAlgoOnBeta?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&prodServer=true&remoteServerURL="+$scope.ipProdServer;
          };
        }else if (serverName == 'prod') {
          url = $scope.ipProdServer+'/stopAlgoOnProd?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&betaServer=true&remoteServerURL="+$scope.ipServer;
        };

        $scope.checkAlgoSyncServers(tmpAlgoId,tmpLocalLastAlgoVersion,function(result){

          if (result == true) {

            var updateDb = function(search,query,callback){
              storedb('algos').update(search,query,function(err){
                if(err == undefined || err == null || err == ""){
                  console.log("success update algo");
                  return callback(true);
                }else{
                  console.log("error to update algo");
                  return callback(false);
                }
              });
            };

            request(url, function (error, response, body) {
              console.log("error: ",error);
              if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                console.log("body: ",body);
                console.log("response: ",response);
                console.log("body.error: ",body.error);
                console.log("body.error: ",body.error);
                if (body != undefined && body != null && body != "" && body.error == 0) {
                  console.log("msg, save algo: ",body.msg); 

                  storedb('algos').find({"_id":tmpAlgoId},function(err,result){
                    if(err == undefined || err == null || err == ""){ 
                      var search = {'_id':tmpAlgoId };
                      var action = { 'algo_version' : body.new_algo_version};
                      var query = {"$set" : action};
                      updateDb(search,query,function(resultUpdateDb){

                        console.log("result 1 update local algo_version: ",resultUpdateDb);

                        if (resultUpdateDb == true) {
                          var search = {'_id':tmpAlgoId };

                          result[0][serverName].statusLabel = "Stopped";
                          result[0][serverName].statusValue = "3";
                          result[0][serverName].actionStart = false;
                          result[0][serverName].actionStop = true;

                          var action2 = {};
                          action2[serverName] = result[0].betaTest;
                          var query = {"$set" : action2};
                          updateDb(search,query,function(result){
                            if (result == true) {

                              $scope.dataCurrentAlgos.algo_version = body.new_algo_version;
                              $scope.dataCurrentAlgos[serverName].actionStart = false;
                              $scope.dataCurrentAlgos[serverName].actionStop = true;
                              $scope.dataCurrentAlgos[serverName].statusValue = "3";
                              $scope.dataCurrentAlgos[serverName].statusLabel = "Stopped";
                              $scope.$digest();

                              console.log("Success, algo_version,betaTest obj were updated on local pc, beta server and prod server");
                            }else{
                              console.log("error to update algo_version,betaTest obj on local pc");
                            }
                          });
                          
                        }else{
                          console.log("error to update algo_version,betaTest obj on local pc");
                        }
                      });
                    }
                  });
                }else if (body != undefined && body != null && body != "" && body.error == 1) {
                  console.log("error from server to stop algo: ",body.msg); 
                }
              }else{
                // TODO - show error and put the previus name of the algo
                console.log("error from server to stop algo: ",body.msg); 
              }
            });

          }else{
            console.log("error to check Algo on on sever");
          }

        });
      
      }else{ 
        console.log("before to stop the algorithm you have to deploy the algo on server");
      }
    };

    $scope.removeBetaAlgo = function(){
      if ($scope.dataCurrentAlgos.betaTest.actionDeploy) {

        console.log("$scope.dataCurrentAlgos: ",$scope.dataCurrentAlgos);
        var key = $scope.dataCurrentAlgos['_id'];

        if ( $scope.dataCurrentAlgos.betaTest.actionStart == true ) {
          console.log("before to delete the algorithm stop the algorithms from dev and prod server");
        }else{

          var tmpAlgoId = key;
          console.log("id algo in delete: "+tmpAlgoId);
          var tmpLocalLastAlgoVersion = $scope.dataCurrentAlgos['algo_version'];

          var urlBeta = $scope.ipServer+'/removeUploadAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&onlyUpdateSetting=false&betaServer=true&prodServer=false&remoteServerURL=&onlyLocalServer=false";
          //var urlProd = null;
          if ($scope.ipProdServer) {
            var urlBeta = $scope.ipServer+'/removeUploadAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&onlyUpdateSetting=false&betaServer=true&prodServer=false&remoteServerURL="+$scope.ipProdServer+"&onlyLocalServer=false";
          };

          console.log("in");

          $scope.checkAlgoSyncServers(tmpAlgoId,tmpLocalLastAlgoVersion,function(result){

            console.log("result : ",result);
            if (result == true) {

              var updateDb = function(search,query,callback){
           
                storedb('algos').update(search,query,function(err){
                  if(err == undefined || err == null || err == ""){
                    console.log("success update algo");
                    return callback(true);
                  }else{
                    console.log("error to update algo");
                    return callback(false);
                  }
                });
              };

              request(urlBeta, function (error, response, body) {
                console.log("error: ",error);
                if (!error && response.statusCode == 200) {
                  body = JSON.parse(body);
                  console.log("body: ",body);
                  console.log("response: ",response);
                  console.log("body.error: ",body.error);
                  console.log("body.error: ",body.error);
                  if (body != undefined && body != null && body != "" ) {
                    if (body.error == 0 || body.error == 2) {
                      
                      storedb('algos').find({"_id":tmpAlgoId},function(err,result){
                        if(err == undefined || err == null || err == ""){ 

                          result[0].betaTest.actionDeploy = false;
                          result[0].betaTest.actionStart = false;
                          result[0].betaTest.actionStop = false;
                          result[0].betaTest.statusValue = 0;
                          result[0].betaTest.statusLabel = 'ToDo';

                          var search = {'_id':tmpAlgoId };
                          var action = {};
                          action['betaTest'] = result[0].betaTest;
                          var query = {"$set" : action};

                          updateDb(search,query,function(result){
                            console.log("result 1 removing upload local algo_version: ",result);
                            if (result == true) {
                              console.log("Successful, removed algo upload on server ",result);

                              var action2 = { 'algo_version' : body.algo_new_version};
                              var query2 = {"$set" : action2};
                              updateDb(search,query2,function(result){
                                console.log("result 1 removing upload local algo_version: ",result);
                                if (result == true) {
                                  console.log("Successful, removed algo upload on server ",result);

                                  $scope.dataCurrentAlgos.algo_version = body.algo_new_version;
                                  $scope.dataCurrentAlgos.betaTest.actionDeploy = false;
                                  $scope.dataCurrentAlgos.betaTest.actionStart = false;
                                  $scope.dataCurrentAlgos.betaTest.actionStop = false;
                                  $scope.dataCurrentAlgos.betaTest.statusValue = 0;
                                  $scope.dataCurrentAlgos.betaTest.statusLabel = 'ToDo';
                                  $scope.$digest();

                                }else{
                                  console.log("error to change setitng, removed upload algo");
                                }
                              });

                            }else{
                              console.log("error to change setitng, removed upload algo");
                            }
                          });

                        }else{
                          console.log("error on db to change setting, removing upload algo");
                        }
                      });

                    }else{
                      console.log("error to remove upload algos on servers");
                    }
                  }else{
                    console.log("error to remove upload algos on servers");
                  }
                }
              });

            }else{
              console.log("error to check Algo on on sever");
            }

          });

        }
      }
    }


    $scope.removeProdAlgo = function(){
      if ($scope.dataCurrentAlgos.prod.actionDeploy) {

        console.log("$scope.dataCurrentAlgos: ",$scope.dataCurrentAlgos);
        var key = $scope.dataCurrentAlgos['_id'];

        if ( $scope.dataCurrentAlgos.prod.actionStart == true ) {
          console.log("before to delete the algorithm stop the algorithms from prod server");
        }else{

          var tmpAlgoId = key;
          console.log("id algo in delete: "+tmpAlgoId);
          var tmpLocalLastAlgoVersion = $scope.dataCurrentAlgos['algo_version'];

          var urlProd = $scope.ipServer+'/removeUploadAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&onlyUpdateSetting=false&betaServer=false&prodServer=true&remoteServerURL="+$scope.ipProdServer+"&onlyLocalServer=false";
          //var urlProd = null;
          //if ($scope.ipProdServer) {
          //  var urlBeta = $scope.ipProdServer+'/removeUploadAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&onlyUpdateSetting=false&betaServer=true&prodServer=false&remoteServerURL="+$scope.ipProdServer+"&onlyLocalServer=false";
          //};

          console.log("in");

          $scope.checkAlgoSyncServers(tmpAlgoId,tmpLocalLastAlgoVersion,function(result){

            if (result == true) {

              var updateDb = function(search,query,callback){
           
                storedb('algos').update(search,query,function(err){
                  if(err == undefined || err == null || err == ""){
                    console.log("success update algo");
                    return callback(true);
                  }else{
                    console.log("error to update algo");
                    return callback(false);
                  }
                });
              };

              request(urlProd, function (error, response, body) {
                console.log("error: ",error);
                if (!error && response.statusCode == 200) {
                  body = JSON.parse(body);
                  console.log("body: ",body);
                  console.log("response: ",response);
                  console.log("body.error: ",body.error);
                  if (body != undefined && body != null && body != "" ) {
                    if (body.error == 0 || body.error == 2) {
                      
                      storedb('algos').find({"_id":tmpAlgoId},function(err,result){
                        if(err == undefined || err == null || err == ""){ 

                          result[0].prod.actionDeploy = false;
                          result[0].prod.actionStart = false;
                          result[0].prod.actionStop = false;
                          result[0].prod.statusValue = 0;
                          result[0].prod.statusLabel = 'ToDo';

                          var search = {'_id':tmpAlgoId };
                          var action = {};
                          action['prod'] = result[0].prod;
                          var query = {"$set" : action};

                          updateDb(search,query,function(result){
                            console.log("result 1 removing upload local algo_version: ",result);
                            if (result == true) {
                              console.log("Successful, removed algo upload on server ",result);

                              var action2 = { 'algo_version' : body.algo_new_version};
                              var query2 = {"$set" : action2};
                              updateDb(search,query2,function(result){
                                console.log("result 1 removing upload local algo_version: ",result);
                                if (result == true) {
                                  console.log("Successful, removed algo upload on server ",result);

                                  $scope.dataCurrentAlgos.algo_version = body.algo_new_version;
                                  $scope.dataCurrentAlgos.prod.actionDeploy = false;
                                  $scope.dataCurrentAlgos.prod.actionStart = false;
                                  $scope.dataCurrentAlgos.prod.actionStop = false;
                                  $scope.dataCurrentAlgos.prod.statusValue = 0;
                                  $scope.dataCurrentAlgos.prod.statusLabel = 'ToDo';
                                  $scope.$digest();

                                }else{
                                  console.log("error to change setitng, removed upload algo");
                                }
                              });

                            }else{
                              console.log("error to change setitng, removed upload algo");
                            }
                          });

                        }else{
                          console.log("error on db to change setting, removing upload algo");
                        }
                      });

                    }else{
                      console.log("error to remove upload algos on servers");
                    }
                  }else{
                    console.log("error to remove upload algos on servers");
                  }
                }
              });

            }else{
              console.log("error to check Algo on on sever");
            }

          });

        }
      }
    }

    /*$scope.startBetaTest = function(){
      if ($scope.dataCurrentAlgos.betaTest.actionDeploy && !$scope.dataCurrentAlgos.betaTest.actionStart && $scope.dataCurrentAlgos.betaTest.actionStop){
        $scope.dataCurrentAlgos.betaTest.actionStart = true;
        $scope.dataCurrentAlgos.betaTest.actionStop = false;
        $scope.dataCurrentAlgos.betaTest.statusValue = 2;
        $scope.dataCurrentAlgos.betaTest.statusLabel = 'Running';

        //$scope.dataCurrentAlgos.betaTest.statusValue = '-1';
        //$scope.dataCurrentAlgos.betaTest.statusLabel = 'Error';
        //start exe  
      }
    }*/

    $scope.stopBetaTest = function(){
      if ($scope.dataCurrentAlgos.betaTest.actionDeploy && $scope.dataCurrentAlgos.betaTest.actionStart && !$scope.dataCurrentAlgos.betaTest.actionStop){

        $scope.dataCurrentAlgos.betaTest.actionStart = false;
        $scope.dataCurrentAlgos.betaTest.actionStop = true;
        $scope.dataCurrentAlgos.betaTest.statusValue = 3;
        $scope.dataCurrentAlgos.betaTest.statusLabel = 'Stopped';

        //$scope.dataCurrentAlgos.betaTest.statusValue = '-1';
        //$scope.dataCurrentAlgos.betaTest.statusLabel = 'Error';
        //stop exe  
      }
    }

    //$scope.skipTest = function(testType){
    //  $scope.dataCurrentAlgos.betaTest.actionSkipped = true;
    //}

    $scope.skipTest = function(testType){

      console.log("test tyoe to skypp: ",testType);
      if ( !$scope.dataCurrentAlgos[testType].actionSkipped ) {

        var tmpAlgoId = $scope.dataCurrentAlgos['_id'];
        var tmpLocalLastAlgoVersion = $scope.dataCurrentAlgos['algo_version'];

        
        url = $scope.ipServer+'/setSkipAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&testType="+testType+"&prodServer=false&remoteServerURL=";
        if ($scope.ipProdServer) {
          url = $scope.ipServer+'/setSkipAlgo?tmpAlgoId='+tmpAlgoId+"&localLastAlgoVersion="+tmpLocalLastAlgoVersion+"&testType="+testType+"&prodServer=true&remoteServerURL="+$scope.ipProdServer;
        };

        $scope.checkAlgoSyncServers(tmpAlgoId,tmpLocalLastAlgoVersion,function(result){

          if (result == true) {

            var updateDb = function(search,query,callback){
              storedb('algos').update(search,query,function(err){
                if(err == undefined || err == null || err == ""){
                  console.log("success update algo");
                  return callback(true);
                }else{
                  console.log("error to update algo");
                  return callback(false);
                }
              });
            };

            console.log("result checkAlgoSyncServers: ",result);


            if (testType == 'integrationTest') {

              storedb('algos').find({"_id":tmpAlgoId},function(err,result){
                if(err == undefined || err == null || err == ""){ 
                  var search = {'_id':tmpAlgoId };
                  result[0][testType].actionSkipped = true;
                  var action = {};
                  action[testType] = result[0][testType];
                  var query = {"$set" : action};
                  updateDb(search,query,function(result){
                    if (result == true) {
                      $scope.dataCurrentAlgos[testType].actionSkipped = true;
                      $scope.$digest();
                      console.log("Success, algo_version,betaTest obj were updated on local pc, beta server and prod server");
                    }else{
                      console.log("error to update algo_version,betaTest obj on local pc");
                    }
                  });
                }
              });

            }else if (testType == 'betaTest') {

              console.log("url: ",url);

              request(url, function (error, response, body) {
                console.log("error: ",error);
                if (!error && response.statusCode == 200) {
                  body = JSON.parse(body);
                  console.log("body: ",body);
                  console.log("response: ",response);
                  console.log("body.error: ",body.error);
                  if (body != undefined && body != null && body != "" && body.error == 0) {
                    console.log("msg, save algo: ",body.msg); 

                    storedb('algos').find({"_id":tmpAlgoId},function(err,result){
                      if(err == undefined || err == null || err == ""){ 

                        var search = {'_id':tmpAlgoId };
                        var action = { 'algo_version' : body.new_algo_version};
                        var query = {"$set" : action};
                        updateDb(search,query,function(resultUpdateDb){

                          console.log("result 1 update local algo_version: ",resultUpdateDb);

                          if (resultUpdateDb == true) {

                            var search = {'_id':tmpAlgoId };
                            result[0][testType].actionSkipped = body.actionSkipped;
                            var action2 = {};
                            action2[testType] = result[0].betaTest;
                            var query = {"$set" : action2};
                            updateDb(search,query,function(result){
                              if (result == true) {

                                $scope.dataCurrentAlgos.algo_version = body.new_algo_version;
                                $scope.dataCurrentAlgos[testType].actionSkipped = body.actionSkipped;
                                $scope.$digest();

                                console.log("Success, algo_version,betaTest obj were updated on local pc, beta server and prod server");
                              }else{
                                console.log("error to update algo_version,betaTest obj on local pc");
                              }
                            });
                            
                          }else{
                            console.log("error to update algo_version,betaTest obj on local pc");
                          }
                        });
                      }
                    });
                  }else if (body != undefined && body != null && body != "" && body.error == 2) {
                    storedb('algos').find({"_id":tmpAlgoId},function(err,result){
                      if(err == undefined || err == null || err == ""){ 
                        var search = {'_id':tmpAlgoId };
                        result[0][testType].actionSkipped = true;
                        var action2 = {};
                        action2[testType] = result[0].betaTest;
                        var query = {"$set" : action2};
                        updateDb(search,query,function(result){
                          if (result == true) {

                            $scope.dataCurrentAlgos[testType].actionSkipped = true;
                            $scope.$digest();

                            console.log("Success, algo_version,betaTest obj were updated on local pc, beta server and prod server");
                          }else{
                            console.log("error to update algo_version,betaTest obj on local pc");
                          }
                        });
                      }
                    });

                  }else if (body != undefined && body != null && body != "" && body.error == 1) {
                    console.log("error from server to start algo: ",body.msg); 
                  }
                }else{
                  console.log("error from server to start algo: ",body.msg); 
                }
              });
            }

          }else{
            console.log("error to check Algo on on sever");
          }

        });
      
      }else{
        console.log("actionSkipped is already true");
      }
    };

    ///////////////////////////////////   PROD   //////////////////////////////////////

    
    $scope.deployInProdOld = function(){
      if (!$scope.dataCurrentAlgos.prod.actionDeploy) {
        
        $scope.uploading_algo = false;
        $scope.errorMsg = "";  
        $('#error_alert').css('opacity', '0');
        $('#error_alert').hide();
        $('#msg_alert').show();
        $('#msg_cont_id').slideDown("slow",function(){
          $('#msg_alert').fadeTo( "slow", 1);
        });
        $scope.infoMsg = "Deploying on server...";  
        /*setTimeout(function(){
          $('#msg_alert').fadeTo("slow",0);
          $('#msg_cont_id').slideUp(0,function(){    
            $scope.uploading_algo = true;
            $scope.errorMsg = "";  
            $scope.$digest();
          });
        },4000);*/

        var algoName = $scope.dataCurrentAlgos.algoName;
        var algoPath = $scope.dataCurrentAlgos.algoFileName;
        var algoId = $scope.dataCurrentAlgos['_id'];
        console.log("algo name: ",algoName);

        //INSERT CHECK IF FILE EXIST

        var rd_file = fs.createReadStream($scope.domain+algoId+'/'+algoPath);
        rd_file.on("error", function(err) {
          console.log("error read file: ",err);
          
          setTimeout(function(){
            $scope.infoMsg = "";  
            $('#msg_alert').css('opacity', '0');
            $('#msg_alert').hide();
            $('#error_alert').show();
            $('#error_alert').fadeTo( "slow", 1);
            $scope.errorMsg = "to reading file";  
            $scope.$digest();
          },3000);
          setTimeout(function(){
            $('#error_alert').fadeTo("slow",0);
            $('#msg_cont_id').slideUp(0,function(){    
              $scope.uploading_algo = true;
              $scope.errorMsg = "";  
              $scope.$digest();
            });
          },6000);

        });
        rd_file.on('data',function(data){
          //console.log("reading file: ",data.length);
        });

        var serverName = 'betaTest';
        var isBetaServer = true;
        /*if ($scope.ipProdServer != "") {
           serverName = 'prod';
        };*/

        var options = {
          url: $scope.ipServer+'/uploadOnProd',
          headers: {
            'Name-Algo': $scope.dataCurrentAlgos.algoName,
            'Name-File': $scope.dataCurrentAlgos.algoFileName,
            'Algo-Id': $scope.dataCurrentAlgos['_id'],
            'Algo-Details': JSON.stringify($scope.dataCurrentAlgos),
            'Server-Name': serverName,
            'Beta-Server': isBetaServer,
            'Remote-Server-Url': $scope.ipServer,
            'Local-Algo-Version': $scope.dataCurrentAlgos.algo_version
          }
        };

        rd_file.pipe(
          request
            .post(options)
            .on('error', function(err) {
              console.log("error to send file: ",err);

              setTimeout(function(){
                $scope.infoMsg = "";  
                $('#msg_alert').css('opacity', '0');
                $('#msg_alert').hide();
                $('#error_alert').show();
                $('#error_alert').fadeTo( "slow", 1);
                $scope.errorMsg = "on connection";  
                $scope.$digest();
              },3000);
              setTimeout(function(){
                $('#error_alert').fadeTo("slow",0);
                $('#msg_cont_id').slideUp(0,function(){    
                  $scope.uploading_algo = true;
                  $scope.errorMsg = "";  
                  $scope.$digest();
                });
              },6000);

            })
            .on('response', function(response) {
              console.log(response.statusCode); // 200
              console.log(response.headers['content-type']); // 'image/png'
              if (response.statusCode == 200) {
                console.log("response: ",response);
                var msg = JSON.parse(response.headers['response-msg']);
                console.log("msg: ",msg);
                if (msg.status == 200) {
                  console.log("Success - file sent to server");
                  setTimeout(function(){
                    $scope.infoMsg = msg.msg; 
                    $scope.$digest(); 
                  },3000);
                  setTimeout(function(){
                    $('#msg_alert').fadeTo("slow",0);
                    $('#msg_cont_id').slideUp(0,function(){    
                      $scope.uploading_algo = true;
                      $scope.errorMsg = ""; 
                      $('#error_alert').css('opacity', '0');

                      $scope.dataCurrentAlgos.prod.actionDeploy = true;
                      $scope.dataCurrentAlgos.prod.actionStart = false;
                      $scope.dataCurrentAlgos.prod.actionStop = true;
                      $scope.dataCurrentAlgos.prod.statusValue = 1;

                      var tempAlgoVersion = $scope.dataCurrentAlgos.algo_version + 1;
                      var tempValStatusLabel = $scope.dataCurrentAlgos.prod.statusLabel;
                      var tempValActionDeploy = $scope.dataCurrentAlgos.prod.actionDeploy;
                      var tempValStatusValue = $scope.dataCurrentAlgos.prod.statusValue;

                      $scope.dataCurrentAlgos.algo_version = $scope.dataCurrentAlgos.algo_version + 1;
                      $scope.dataCurrentAlgos.prod.statusLabel = 'Deployed';
                      $scope.dataCurrentAlgos.prod.actionDeploy = true;
                      $scope.dataCurrentAlgos.prod.statusValue = 1;

                      //var query = {"_id":$scope.dataCurrentAlgos["_id"] };
                      storedb('algos').update(
                        {"_id":$scope.dataCurrentAlgos["_id"] },
                        $scope.dataCurrentAlgos,
                        function(err,result){
                        if(err == undefined || err == null || err == ""){
                          console.log("insert: ",result);
                        }else{
                          $scope.dataCurrentAlgos.algo_version = tempAlgoVersion;
                          $scope.dataCurrentAlgos.prod.statusLabel = tempValStatusLabel;
                          $scope.dataCurrentAlgos.prod.actionDeploy = tempValActionDeploy;
                          $scope.dataCurrentAlgos.prod.statusValue = tempValStatusValue;
                        }
                      });   
                      $scope.$digest();
                    });
                  },6000);
                }else{
                  
                  setTimeout(function(){
                    $scope.infoMsg = "";  
                    $('#msg_alert').css('opacity', '0');
                    $('#msg_alert').hide();
                    $('#error_alert').show();
                    $('#error_alert').fadeTo( "slow", 1);
                    $scope.errorMsg = msg.msg;  
                    $scope.$digest();
                  },3000);
                  
                  setTimeout(function(){
                    $('#error_alert').fadeTo("slow",0);
                    $('#msg_cont_id').slideUp(0,function(){    
                      $scope.uploading_algo = true;
                      $scope.errorMsg = "";  
                      $scope.$digest();
                    });
                  },6000);
                }
                
              }else{

                setTimeout(function(){
                  console.log("Error to send file to server");
                  $scope.infoMsg = "";  
                  $('#msg_alert').css('opacity', '0');
                  $('#msg_alert').hide();
                  $('#error_alert').show();
                  $('#error_alert').fadeTo( "slow", 1);
                  $scope.errorMsg = "to send file to server";  
                  $scope.$digest();
                },3000);
                
                setTimeout(function(){
                  $('#error_alert').fadeTo("slow",0);
                  $('#msg_cont_id').slideUp(0,function(){    
                    $scope.uploading_algo = true;
                    $scope.errorMsg = "";  
                    $scope.$digest();
                  });
                },6000);
              }
            })
        );
        





        

        //$scope.dataCurrentAlgos.prod.statusValue = '-1';
        //$scope.dataCurrentAlgos.prod.statusLabel = 'Error';
        //deploy exe
      }
    }



    /*$scope.startProdAlgo = function(){
      if ($scope.dataCurrentAlgos.prod.actionDeploy && !$scope.dataCurrentAlgos.prod.actionStart && $scope.dataCurrentAlgos.prod.actionStop){
        $scope.dataCurrentAlgos.prod.actionStart = true;
        $scope.dataCurrentAlgos.prod.actionStop = false;
        $scope.dataCurrentAlgos.prod.statusValue = 2;
        $scope.dataCurrentAlgos.prod.statusLabel = 'Running';

        //$scope.dataCurrentAlgos.prod.statusValue = '-1';
        //$scope.dataCurrentAlgos.prod.statusLabel = 'Error';
        //start exe  
      }
    }*/

    $scope.stopProdAlgo = function(){
      if ($scope.dataCurrentAlgos.prod.actionDeploy && $scope.dataCurrentAlgos.prod.actionStart && !$scope.dataCurrentAlgos.prod.actionStop){
        $scope.dataCurrentAlgos.prod.actionStart = false;
        $scope.dataCurrentAlgos.prod.actionStop = true;
        $scope.dataCurrentAlgos.prod.statusValue = 3;
        $scope.dataCurrentAlgos.prod.statusLabel = 'Stopped';

        //$scope.dataCurrentAlgos.prod.statusValue = '-1';
        //$scope.dataCurrentAlgos.prod.statusLabel = 'Error';
        //stop exe  
      }
    }

    //////////////////////////////////////////////////////////////////////////////////////
    ////////////////////    BACKTESTING     ////////////////////

    


    
    







});
/*movieStubApp.controller("movieDetailsController", function ($scope, $routeParams) {
    $scope.getMovieById($routeParams.id);
});*/
