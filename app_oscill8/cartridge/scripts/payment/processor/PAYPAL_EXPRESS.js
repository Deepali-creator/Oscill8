'use strict';

/* API Includes */
var Cart = require('~/cartridge/scripts/models/CartModel');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var redirectUrl = 'https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=';
var app = require('~/cartridge/scripts/app');
var XiSecure = require('~/cartridge/scripts/payment/processor/XiSecureHelper.ds');
var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var amount ;
var Token ;

/**
 * This is where additional PayPal integration would go. The current implementation simply creates a PaymentInstrument and
 */

// var totalCost = app.getModel('Cart').calculate();

 function decodeFormParams(params) {
    var pairs = params.split('&'),
        result = {};

    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('='),
            key = decodeURIComponent(pair[0]),
            value = decodeURIComponent(pair[1]),
            isArray = /\[\]$/.test(key),
            dictMatch = key.match(/^(.+)\[([^\]]+)\]$/);

        if (dictMatch) {
            key = dictMatch[1];
            var subkey = dictMatch[2];

            result[key] = result[key] || {};
            result[key][subkey] = value;
        } else if (isArray) {
            key = key.substring(0, key.length - 2);
            result[key] = result[key] || [];
            result[key].push(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}


 function paypal(transactionAmount){
    var callMethod = "SetExpressCheckout";
    dw.system.Logger.warn("--------------transaction Amount---------"+transactionAmount);
    dw.system.Logger.warn('paypal main');
    var createTransaction = LocalServiceRegistry.createService('paypal-nvp', {
        createRequest: function (svc, args) {
            var url = svc.getConfiguration().getCredential().getURL();
            Logger.warn("url----------------"+url);
            svc.setRequestMethod('POST');
            svc.setURL(url);
            svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');
            var payload = "USER=Stam_helpme_api1.conair.com&" +
                "PWD=6ZS7F2NNZZZYW6GJ&SIGNATURE=AQEHES0Eiay.TjBiRotNn.U6SHwMA9G0e3kTHH4ImCMLF7lwe-FcKm.7&" +
                "METHOD="+callMethod+"&VERSION=78&PAYMENTREQUEST_0_PAYMENTACTION=Order&" +
                "PAYMENTREQUEST_0_AMT="+transactionAmount+"&" +
                "PAYMENTREQUEST_0_CURRENCYCODE=USD&" +
                "cancelUrl=https%3A%2F%2Fexample.com%2Fcancel&" +
                "returnUrl=https%3A%2F%2Fdev05-na-conair.demandware.net%2Fon%2Fdemandware.store%2FSites-us-oscill8-Site%2Fdefault%2FCOSummary-Start&";
            dw.system.Logger.warn('paypal request' + payload);
            return payload;
        },
        parseResponse: function (svc, output) {

            dw.system.Logger.warn('paypal response' + output.text);
            dw.system.Logger.warn('paypal error' + svc.isThrowOnError.toString);
            Token = decodeFormParams(output.text.toString()).TOKEN.toString();
            return output;
        }
    });
    createTransaction.call();
    return redirectUrl+Token;

 }


 function getExpressCheckout()
 {
    var callMethod = "GetExpressCheckoutDetails";
    var PayerID = "null";
    var Token = 'EC-3N347366YY4498906';
    var getPayerId = LocalServiceRegistry.createService('paypal-nvp', {
        createRequest: function (svc, args) {
            var url = svc.getConfiguration().getCredential().getURL();
            svc.setRequestMethod('POST');
            svc.setURL(url);
            svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');
            var payload = "USER=Stam_helpme_api1.conair.com&" +
                "PWD=6ZS7F2NNZZZYW6GJ&SIGNATURE=AQEHES0Eiay.TjBiRotNn.U6SHwMA9G0e3kTHH4ImCMLF7lwe-FcKm.7&" +
                "METHOD="+callMethod+"&VERSION=78&TOKEN="+Token;
            dw.system.Logger.warn('paypal request' + payload);
            return payload;
        },
        parseResponse: function (svc, output) {

            dw.system.Logger.warn('paypal response' + output.text);
            dw.system.Logger.warn('paypal error' + svc.isThrowOnError.toString);
            PayerID = decodeFormParams(output.text.toString()).PAYERID.toString();
            dw.system.Logger.warn('----PayerID----' + PayerID);
            return output;
        }
    });
    getPayerId.call();
    return PayerID;
    
 }


 function DoExpressCheckoutPayment(){
   var PayerID =  getExpressCheckout();
   var callMethod = 'DoExpressCheckoutPayment'; 
   var TRANSACTIONID = '';
   var Token = 'EC-3N347366YY4498906';
   var getTransId = LocalServiceRegistry.createService('paypal-nvp', {
   createRequest: function (svc, args) {
       var url = svc.getConfiguration().getCredential().getURL();
       svc.setRequestMethod('POST');
       svc.setURL(url);
       svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');
       var payload = "USER=Stam_helpme_api1.conair.com&" +
           "PWD=6ZS7F2NNZZZYW6GJ&SIGNATURE=AQEHES0Eiay.TjBiRotNn.U6SHwMA9G0e3kTHH4ImCMLF7lwe-FcKm.7&" +
           "METHOD="+callMethod+"&VERSION=78&TOKEN="+Token+"&PayerID="+PayerID+"&PAYMENTACTION=Order&" +
           "PAYMENTREQUEST_0_AMT="+amount+"&" +
           "PAYMENTREQUEST_0_CURRENCYCODE=USD&BUTTONSOURCE=Paymetric_SP";
           dw.system.Logger.warn('paypal request' + payload);
    
       return payload;
   },
   parseResponse: function (svc, output) {
       dw.system.Logger.warn('paypal response' + output.text);
       var output = output.text;
       TRANSACTIONID = decodeFormParams(output.toString()).PAYMENTINFO_0_TRANSACTIONID.toString();
       return output;
   }
 
});

getTransId.call();
return TRANSACTIONID;
}




function Handle(args) {
    dw.system.Logger.warn("##################");
    // dw.system.Logger.warn('TOTAL COST--------'+totalCost);
    var cart = Cart.get(args.Basket);
    var transactionAmount = cart.getNonGiftCertificateAmount();
    amount = transactionAmount;
    var redirectUrl = paypal(transactionAmount);
    var accessTokenString = redirectUrl.split("=");
    var accessToken = accessTokenString[1];
    Token = accessToken; 
    dw.system.Logger.warn('------------url---------'+redirectUrl);
 
    var cart = Cart.get(args.Basket);
    
    var paymentInstrument = cart.createPaymentInstrument('Paypal', cart.getNonGiftCertificateAmount());
     dw.system.Logger.warn('getExistingPaymentInstruments--------'+ cart.createPaymentInstrument('Paypal', cart.getNonGiftCertificateAmount()));
    Transaction.wrap(function () {
     

        // cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_BANK_TRANSFER);
        // cart.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_BANK_TRANSFER, cart.getNonGiftCertificateAmount());
         cart.removeExistingPaymentInstruments('Paypal');
         cart.createPaymentInstrument('Paypal', cart.getNonGiftCertificateAmount());
        // dw.system.Logger.warn('%%%%%%%%%%%%%'+cart.getPaymentInstrument('Paypal'));

        
    });

    try{
    	getToken(paymentInstrument);
    }catch(ex){
    	dw.system.Logger.error("-------getToken Error Msg-------------------"+ex.message);
		return {error: true, errorMessage: ex.message};
    }

      return redirectUrl;
    //  return {success: true};
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the PAYPAL_EXPRESS processor only
 * and setting the order no as the transaction ID. Customizations may use other processors and custom logic to
 * authorize credit card payment.
 */
function Authorize(args) {
   
    // var cart = Cart.get(args.Basket);
    // var transactionAmount = cart.getNonGiftCertificateAmount();

    var transId = DoExpressCheckoutPayment();
    var a =10;
    dw.system.Logger.warn("+++++++++transaction Id++++++++++"+transId);
    var orderObj = args.Order;
    // orderObj.paymentInstruments[0].custom.paypalTransactionID = transId;
    
    var b = orderObj.paymentInstruments[0].custom;
    var paymentInstrument = args.PaymentInstrument;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
  


    try{
        if(empty(paymentInstrument.creditCardToken)){
    
                getToken(paymentInstrument,null);
                var a = 10;
            }
            
            var authorizeResult = XiSecure.authorize(args.Order, null);
            dw.system.Logger.warn("------authorizeResult---------------"+authorizeResult);
    
            if(authorizeResult.ok){
                var resultObject=authorizeResult.object;
                dw.system.Logger.warn("-----------resultObject--------------"+resultObject);
                resultObject.ignoreCVV=!hasToken;
                try{
    
                    XiSecure.checkAuthorizeCodes(resultObject);
                    
                }catch(e){
                    return {authorized: false, error: true, errorMessage: e.message};
                }
                Transaction.wrap(function(){
                    
                    paymentInstrument.paymentTransaction.transactionID=resultObject.TransactionID;
                    paymentInstrument.paymentTransaction.custom.authorizationCode=resultObject.AuthorizationCode;
                    paymentInstrument.paymentTransaction.custom.AVSstreetOK=resultObject.AVSstreetOK;
                    paymentInstrument.paymentTransaction.custom.AVSzipOK=resultObject.AVSzipOK;
                    paymentInstrument.paymentTransaction.custom.CVVOK=resultObject.CVVOK;
                    paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
                });
            }else if("ERROR"===authorizeResult.status || 'SERVICE_UNAVAILABLE'===authorizeResult.status){
    
                return {authorized: false, error: true, errorMessage: authorizeResult.errorMessage};
            }
    
            return {authorized: true};
        }catch(ex){
            return {authorized: false, error: true, errorMessage: ex.message};
        }

    



    // Transaction.wrap(function () {
    //     paymentInstrument.paymentTransaction.transactionID =transId;
    //     paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    // });


}




function getToken(paymentInstrument,cvn){
	var iframeResult : Result = XiSecure.getIframe();
	dw.system.Logger.warn("------iframe--------------"+iframeResult);
	if (!iframeResult.ok){
		Logger.error(iframeResult.errorMessage);
		throw new Error(iframeResult.errorMessage);
	}
	// var tokenizeResult : Result = XiSecure.tokenize(iframeResult.object,paymentInstrument,null);
	// if (!tokenizeResult.ok){
	// 	Logger.error(tokenizeResult.errorMessage);
	// 	throw new Error(tokenizeResult.errorMessage);
	// }
    // Transaction.wrap(function(){
    // 	paymentInstrument.creditCardToken=tokenizeResult.object;
    // });
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
