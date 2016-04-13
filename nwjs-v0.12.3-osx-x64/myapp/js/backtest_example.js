backtest_param = 1;

if(backtest_param){
	[topicPub, messagePub]=onlineAlgo_realtime(topicName,messageBody,password);

}else{
	[status]=onlineAlgo_backtest([storico1, storico2]);
}