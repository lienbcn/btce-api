var oBtce = require('./btce.js');

var oPair = {
	key: '',
	secret: ''
};

oBtce.getLastTrades(function(aLastTrades){
	console.dir(aLastTrades.slice(0, 5));
});
oBtce.setKeys(oPair);
oBtce.getInfo(function(oInfo){
	console.dir(oInfo);
});
oBtce.getTicker(function(oTicker){
	console.dir(oTicker);
});
