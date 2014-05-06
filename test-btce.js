var btceApi = require('btce-api');
var oPair = {
	key: '',
	secret: ''
};
btceApi.setKeys(oPair);
btceApi.getInfo(function(oInfo){
	console.dir(oInfo);
});
btceApi.getTicker('ltc_usd', function(oTicker){
	console.dir(oTicker);
});
