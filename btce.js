//btce api v2.0

var https = require('https');
var crypto = require('crypto');
var qs = require('querystring');

var fnGetNonce = (function(){
	var nPrevNonce = -1;
	return function(){
		var nNewNonce = Math.floor(new Date().getTime()/100) % 1e10;
		//console.log('New nonce: '+nNewNonce);
		if (nNewNonce <= nPrevNonce) {
			nNewNonce ++;
		}
		nPrevNonce = nNewNonce;
		return nNewNonce;
	};
})();

var oPair;
var fnSetKeys = function(oNewPair){
	if (!('key' in oNewPair && 'secret' in oNewPair && typeof oNewPair.key === 'string' && typeof oNewPair.secret==='string')) {
		console.log('Error. Invalid pair of keys.');
		return;
	}
	oPair = oNewPair;
};

//private api:
var fnMakeRequest = function(params,cb){
	try{
		//console.log('params: '+JSON.stringify(params));
		if (!oPair){
			console.log("Error. Trying to use an authorized method. Use first the 'setKeys' method.");
			return;
		}
		var signed = crypto.createHmac('sha512', oPair.secret);
		var encoded_params = qs.stringify(params);
		signed.update(encoded_params);

		var options = {
			hostname: 'btc-e.com',
			port: 443,
			path: '/tapi',
			method: 'POST',
			headers: {
				'Key': oPair.key,
				'Sign': signed.digest('hex'),
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': encoded_params.length
			}
		};

		var req = https.request(options, function(res) {
			var data = '';
			res.on('data', function(d) {
				data += d;
			});
			res.on('end', function(){
				try{
					var obj = JSON.parse(data);
					cb(obj);
				}catch(err){
					console.log(new Date().toString() + ': Error while parsing data from server. data:'+data);
					console.log(err.name+'|'+err.message);
					return false;
				}
			});
		});
		req.write(encoded_params);
		req.end();

		req.on('error', function(e) {
			console.log("Error");
			console.error(e);
		});
	}
	catch(err){
		console.log(err);
	}
};
var fnGetInfo = function (cb) { //return the same as btce server
	//console.log('getting info');
	var nonce = fnGetNonce();
	var params = {'method' : 'getInfo',
				'nonce': nonce};
	return fnMakeRequest(params,cb);
};
var fnTrade = function (oConfig, cb) {
	var nonce = fnGetNonce();
	var params = {'method' : 'Trade',
	'pair': oConfig.pair,
	'type': oConfig.type,
	'rate': oConfig.rate, //price
	'amount': oConfig.amount,
	'nonce': nonce
	};
	return fnMakeRequest(params,cb);
};
var fnTradeHistory = function (oConfig, cb) {
	//console.log('getting trade history');
	var nonce = fnGetNonce();
	var params = {'method' : 'TradeHistory',
	'nonce': nonce
	};
	var sProp;
	for (sProp in oConfig){
		if (oConfig.hasOwnProperty(sProp)) {
			params[sProp]=oConfig[sProp];
		}
	}
	return fnMakeRequest(params,cb);
};
var fnOrderList = function (oConfig, cb) {
	//console.log('getting orders list');
	var nonce = fnGetNonce();
	var params = {'method' : 'OrderList',
	'nonce': nonce
	};
	var sProp;
	for (sProp in oConfig){
		if (oConfig.hasOwnProperty(sProp)) {
			params[sProp]=oConfig[sProp];
		}
	}
	return fnMakeRequest(params,cb);
};
var fnCancelOrder = function (oConfig, cb) {
	//console.log('cancelling order');
	var nonce = fnGetNonce();
	var params = {'method' : 'CancelOrder', 'nonce': nonce, 'order_id': oConfig.order_id};
	return fnMakeRequest(params,cb);
};

//public api:
var _fnPublicRequest = function(oOptions, fnCallback){
	var _get = function(oOptions, fnCallback){
		_getJSON(oOptions, function(nStatusCode, oInfo){ //call the https request maker function. the callback will receive the parsed json
			if (nStatusCode === 200){ //OK
				//save data here
				fnCallback(oInfo);
			}
			else{ //500, 404 etc
				console.log(new Date().toString() + ': Error code when requesting '+oOptions.path+' :'+nStatusCode);
			}
		});
	};
	var _getJSON = function(oOptions, onResult){ //makes an https request to btce and defines the handlers of its response
		try{
			var req = https.request(oOptions, function(res){
				var sjsonOutput = '';
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					sjsonOutput += chunk;
				});
				res.on('end', function() {
					try{
						var obj = JSON.parse(sjsonOutput);
						onResult(res.statusCode, obj);
					}catch(err){
						console.log(new Date().toString() + ': Error while parsing data from server (2). data: '+sjsonOutput);
						console.log(err.name+'|'+err.message);
						return false;
					}
				});
			});
			req.on('error', function(err) {
				//res.send('error: ' + err.message);
				console.log(new Date().toString() + ': Error event: '+JSON.stringify(err));
			});
			req.end();
		}
		catch(err){
			console.log(err);
		}
	};
	_get(oOptions, fnCallback);
};
var fnGetLastTrades = function(fnCallback){
	//console.log('getting last trades');
	//get the trades from btc-e.com server: https://btc-e.com/api/2/btc_usd/trades
	var oOptions = {
		host: 'btc-e.com',
		port: 443,
		path: '/api/2/btc_usd/trades',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	_fnPublicRequest(oOptions, fnCallback);
};
var fnGetDepth = function(fnCallback){
	//console.log('getting depth');
	//get the depth from btc-e.com server: https://btc-e.com/api/2/btc_usd/depth
	var oOptions = {
		host: 'btc-e.com',
		port: 443,
		path: '/api/2/btc_usd/depth',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	_fnPublicRequest(oOptions, fnCallback);
};
var fnGetTicker = function(fnCallback){
	var oOptions = {
		host: 'btc-e.com',
		port: 443,
		path: '/api/2/btc_usd/ticker',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	_fnPublicRequest(oOptions, fnCallback);
};

//create a list FIFO of functions (requests). The (requests) will be executed every 400 ms to avoid invalid nounce numbers:
var afnRequests = [];
var fnExecuteRequests = (function(){
	var bProcessingRequests = false;
	return function(){
		var fnExecuteFirstRequest = function(fnCallBack){
			if (afnRequests[0]) {
				afnRequests[0]();
				afnRequests.splice(0,1); //remove from list
				setTimeout(function(){
					fnCallBack(true);
				}, 400);
			}
			else{
				fnCallBack(false);
			}
		};
		var fnExecuteAllRequests = function fnExecuteAllRequests(fnCallback){
			fnExecuteFirstRequest(function(bExecuted){
				if (bExecuted) {
					fnExecuteAllRequests(fnCallback);
				}
				else{
					fnCallback();
				}
			});
		};
		if (!bProcessingRequests) {
			bProcessingRequests = true;
			fnExecuteAllRequests(function(){
				bProcessingRequests = false;
			});
		}
	};
})();
var fnPushFunction = function(fnRequest, aArguments){
	afnRequests.push(function(){
		fnRequest.apply(null, aArguments);
	});
	fnExecuteRequests();
};

var oApi = {
	setKeys: fnSetKeys,
	getInfo: function(){fnPushFunction(fnGetInfo, arguments);},
	trade: function(){fnPushFunction(fnTrade, arguments);},
	tradeHistory: function(){fnPushFunction(fnTradeHistory, arguments);},
	orderList: function(){fnPushFunction(fnOrderList, arguments);},
	cancelOrder: function(){fnPushFunction(fnCancelOrder, arguments);},
	getLastTrades: function(){fnPushFunction(fnGetLastTrades, arguments);},
	getDepth: function(){fnPushFunction(fnGetDepth, arguments);},
	getTicker: function(){fnPushFunction(fnGetTicker, arguments);}
};

module.exports = oApi; //object with methods


/* //Example:
var oBtce = require('./btce.js');
oBtce.getLastTrades(function(aLastTrades){
	console.dir(aLastTrades);
});
oBtce.setKeys({key: sKey, secret: sSecret});
oBtce.getInfo(function(oInfo){
	console.dir(oInfo);
});
*/