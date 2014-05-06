var btceApi = require('btce-api.js');

var oPair = {
	key: '',
	secret: ''
};

btceApi.getLastTrades(function(aLastTrades){
	console.dir(aLastTrades.slice(0, 5));
});
btceApi.setKeys(oPair);
btceApi.getInfo(function(oInfo){
	console.dir(oInfo);
});
btceApi.getTicker(function(oTicker){
	console.dir(oTicker);
});
