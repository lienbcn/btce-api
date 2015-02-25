/**
 * File: btce-api.js
 *
 * Node.js client for the btc-e API
 *
 * v2.1: Request is resent if nonce parameter is invalid.
 * Try and catch statement is only used if it should be used.
 *
 * Author: Nil Sanz
 * Date: May 2014
 */

var https = require('https');
var crypto = require('crypto');
var qs = require('querystring');
//var myconsole = require('./myconsole.js');

var sHostName = 'btc-e.com';
/**
 * [description]
 * @return {[type]} [description]
 */
var fnGetNonce = (function(){
	var nPrevNonce = -1;
	return function(){
		var nNewNonce = Math.floor(new Date().getTime()/100) % 1e10;
		//console.log('New nonce: '+nNewNonce);
		if (nNewNonce <= nPrevNonce) {
			nNewNonce ++;
			console.log('Nounce has been incremented manually');
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
var fnMakeRequest = function fnMakeRequest(params, fnCallback){
	//try{
		//myconsole.log(3, 'New request. params: '+JSON.stringify(params), {bNoOutput: true});
		if (!oPair){
			console.log("Error. Trying to use an authorized method. Use first the 'setKeys' method.");
			return;
		}
		if (typeof oPair.secret !== 'string' || typeof oPair.key !== 'string') {
			console.log("Error. oPair is not correct: "+JSON.stringify(oPair));
			return;
		}
		params.nonce = fnGetNonce();
		var signed = crypto.createHmac('sha512', oPair.secret);
		var encoded_params = qs.stringify(params);
		signed.update(encoded_params);

		var options = {
			hostname: sHostName,
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
				var obj;
				try{ //data may not be valid json string
					obj = JSON.parse(data);
				}catch(err){
					//myconsole.log(2, 'Error while parsing json data from server:' + data);
					return;
				}
				if (typeof obj === 'object' && obj.success === 0 && typeof obj.error === 'string' && obj.error.slice(0,24) === 'invalid nonce parameter;') { //then retry the request
					//myconsole.log('Retrying request '+JSON.stringify(params)+' due to invalid nonce parameter.');
					fnMakeRequest(params, fnCallback);
				}
				else{
					fnCallback(null, obj);
				}
			});
		});
		req.write(encoded_params);
		req.end();

		req.on('error', function(e) {
			//myconsole.log(2, "Error in the request:");
			//console.error(e);
			//console.error(e.stack);
			fnCallback(e);
		});
	/*}
	catch(err){
		console.log(err);
	}*/
};
var fnGetInfo = function (cb) { //return the same as btce server
	//console.log('getting info');
	var params = {'method' : 'getInfo'};
	return fnMakeRequest(params,cb);
};
var fnTrade = function (oConfig, cb) {
	var params = {
		'method' : 'Trade',
		'pair': oConfig.pair,
		'type': oConfig.type,
		'rate': oConfig.rate, //price
		'amount': oConfig.amount
	};
	return fnMakeRequest(params,cb);
};
var fnTradeHistory = function (oConfig, cb) {
	//console.log('getting trade history');
	var params = {'method' : 'TradeHistory'
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
	var params = {'method' : 'OrderList'
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
	var params = {'method' : 'CancelOrder', 'order_id': oConfig.order_id};
	return fnMakeRequest(params,cb);
};

//public api:
var _fnPublicRequest = function(oOptions, fnCallback){
	var _get = function(oOptions, fnCallback){
		//myconsole.log(3, 'New public request: '+JSON.stringify(oOptions), {bNoOutput: true});
		_getJSON(oOptions, function(err, nStatusCode, oInfo){ //call the https request maker function. the callback will receive the parsed json
			if (err){
				return fnCallback(err);
			}
			if (nStatusCode === 200){ //OK
				//save data here
				fnCallback(null, oInfo);
			}
			else{ //500, 404 etc
				//console.log(new Date().toString() + ': Error code when requesting '+oOptions.path+' :'+nStatusCode);
				fnCallback('Error HTTP code when requesting '+oOptions.path+' :'+nStatusCode);
			}
		});
	};
	var _getJSON = function(oOptions, onResult){ //makes an https request to btce and defines the handlers of its response
		//try{
			var req = https.request(oOptions, function(res){
				var sjsonOutput = '';
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					sjsonOutput += chunk;
				});
				res.on('end', function() {
					var oObject;
					try{
						oObject = JSON.parse(sjsonOutput);
					}catch(err){
						//myconsole.log(2, 'Error while parsing json data from server: '+sjsonOutput);
						return;
					}
					onResult(null, res.statusCode, oObject);
				});
			});
			req.on('error', function(e) {
				//myconsole.log(2, "Error in the request:");
				//console.error(e);
				//console.error(e.stack);
				onResult(e);
			});
			req.end();
		/*}
		catch(err){
			console.log(err);
		}*/
	};
	_get(oOptions, fnCallback);
};
var fnGetLastTrades = function(sPair, fnCallback){
	//console.log('getting last trades');
	//get the trades from btc-e.com server eg: https://btc-e.com/api/2/btc_usd/trades
	var oOptions = {
		host: sHostName,
		port: 443,
		path: '/api/2/'+sPair+'/trades',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	_fnPublicRequest(oOptions, fnCallback);
};
var fnGetDepth = function(sPair, fnCallback){
	//console.log('getting depth');
	//get the depth from btc-e.com server: https://btc-e.com/api/2/btc_usd/depth
	var oOptions = {
		host: sHostName,
		port: 443,
		path: '/api/2/'+sPair+'/depth',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	_fnPublicRequest(oOptions, fnCallback);
};
var fnGetTicker = function(sPair, fnCallback){
	var oOptions = {
		host: sHostName,
		port: 443,
		path: '/api/2/'+sPair+'/ticker',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	_fnPublicRequest(oOptions, fnCallback);
};

//create a list FIFO of functions (requests). The (requests) will be executed every 200 ms to avoid invalid nounce numbers:
var afnRequests = [];
var fnExecuteRequests = (function(){
	var bProcessingRequests = false;
	return function(){
		var fnExecuteFirstRequest = function(fnCallBack){
			if (afnRequests[0]) {
				afnRequests[0]();
				afnRequests.splice(0,1); //remove from list
				setTimeout(function(){
					fnCallBack(null);
				}, 200);
			}
			else{
				fnCallBack('No requests in the list');
			}
		};
		var fnExecuteAllRequests = function fnExecuteAllRequests(fnCallback){
			fnExecuteFirstRequest(function(sErr){
				if (sErr) { //if all requests have been executed
					return fnCallback(null);
				}
				fnExecuteAllRequests(fnCallback); //continue executing requests
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
