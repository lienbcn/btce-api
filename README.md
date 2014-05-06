btce-api
========

Node.js client for the btc-e API

## Installation

You can use npm to install it:

```
npm install btce-api
```

## Methods
Private API methods
```
btceApi.setKeys(oKeys)
btceApi.getInfo(callback)
btceApi.trade(oConfig, callback)
btceApi.tradeHistory(oConfig, callback)
btceApi.orderList(oConfig, callback)
btceApi.cancelOrder(oConfig, callback)
```
Public API methods
```
btceApi.getLastTrades(sPair, callback)
btceApi.getDepth(sPair, callback)
btceApi.getTicker(sPair, callback)
```

## Examples

You can call the public API metohds of btce without using your key pair:

```
var btceApi = require('btce-api');
btceApi.getLastTrades('ltc_usd', function(aLastTrades){
	console.dir(aLastTrades.slice(0, 5));
});
```

If you want to use the private methods, you have to provide with the key pair first:

```
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
```

## Notes

The requests have to have a parameter called nonce that is a number that cannot decrease over time. The module generates it using the current timestamp. The requests are delayed each other few tenths of a second in order to avoid that some requests arrive before the previous one. If a request returns an error it retries to send it.
If you try to send a lot of requests at once, they will be stored in a queue and it may take a while to complete all the requests.
