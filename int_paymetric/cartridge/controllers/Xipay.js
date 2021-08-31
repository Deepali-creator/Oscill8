'use strict';
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
let ISML = require('dw/template/ISML');
var callMetod='SetExpressCheckout';
var url = 'https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=';
//var response = require('dw/system/Response');

function showTemplate()
{
    ISML.renderTemplate('paypalbtn'); 
  
}



 function paypal(){
    var Token = "null";
    dw.system.Logger.warn('paypal main');
    var createTransaction = LocalServiceRegistry.createService('paypal-nvp', {
        createRequest: function (svc, args) {
            var url = svc.getConfiguration().getCredential().getURL();
            svc.setRequestMethod('POST');
            svc.setURL(url);
            svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');
            var payload = "USER=Stam_helpme_api1.conair.com&" +
                "PWD=6ZS7F2NNZZZYW6GJ&SIGNATURE=AQEHES0Eiay.TjBiRotNn.U6SHwMA9G0e3kTHH4ImCMLF7lwe-FcKm.7&" +
                "METHOD="+callMetod+"&VERSION=78&PAYMENTREQUEST_0_PAYMENTACTION=Authorize&" +
                "PAYMENTREQUEST_0_AMT=70&" +
                "PAYMENTREQUEST_0_CURRENCYCODE=USD&" +
                "cancelUrl=https%3A%2F%2Fexample.com%2Fcancel&" +
                "returnUrl=https%3A%2F%2Fdev02-na-conair.demandware.net%2Fon%2Fdemandware.store%2FSites-us-leandrolimited-Site%2Fdefault%2FXipay-returnBack%3F";
            dw.system.Logger.warn('paypal request' + payload);
            return payload;
        },
        parseResponse: function (svc, output) {

            dw.system.Logger.warn('paypal response' + output.text);
            Token = decodeFormParams(output.text.toString()).TOKEN.toString();
            url=url+Token;
            return output;
        }
    });
    createTransaction.call();
   
 


    response.setContentType('text');
    response.getWriter().println(url);
 
    



    //redirectToPaypal(Token);
     
 

   

 }


//function to convert xml to json object
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


function returnBack(){
     callMetod = 'DoExpressCheckoutPayment';
     var requestParams = request.getHttpParameters();
      var Token = '';
      var PayerID = '';

    for (let key in requestParams) {
        if (Object.hasOwnProperty.call(requestParams, key)) {
            if(key == 'token')
            {
                 Token = requestParams[key];


            }

            else if(key == 'PayerID')
            {
                 PayerID = requestParams[key];


            }

        }

    }

   
    var TRANSACTIONID = '';
    var getTransId = LocalServiceRegistry.createService('paypal-nvp', {
    createRequest: function (svc, args) {
        var url = svc.getConfiguration().getCredential().getURL();
        svc.setRequestMethod('POST');
        svc.setURL(url);
        svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');
        var payload = "USER=Stam_helpme_api1.conair.com&" +
            "PWD=6ZS7F2NNZZZYW6GJ&SIGNATURE=AQEHES0Eiay.TjBiRotNn.U6SHwMA9G0e3kTHH4ImCMLF7lwe-FcKm.7&" +
            "METHOD="+callMetod+"&VERSION=78&TOKEN="+Token[0]+"&PayerID="+PayerID[0]+"&PAYMENTACTION=Authorize&" +
            "PAYMENTREQUEST_0_AMT=70&" +
            "PAYMENTREQUEST_0_CURRENCYCODE=USD&BUTTONSOURCE=Paymetric_SP";
            dw.system.Logger.warn('paypal request' + payload);
     
        return payload;
    },
    parseResponse: function (svc, output) {
        dw.system.Logger.warn('paypal response' + output.text);
        var output = output.text;
         TRANSACTIONID = decodeFormParams(output.toString()).PAYMENTINFO_0_TRANSACTIONID.toString();
         var b = 20;
        return output;
    }
  
});

getTransId.call();
arthorizePayment(TRANSACTIONID);
}



// function arthorizePayment(transactionId)
// {
//          callMetod = DoAuthorization;
//         var authorizePayment = LocalServiceRegistry.createService('paypal-nvp', {
//         createRequest: function (svc, args) {
//             var url = svc.getConfiguration().getCredential().getURL();
//             svc.setRequestMethod('POST');
//             svc.setURL(url);
//             svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');
//             var payload = "USER=Stam_helpme_api1.conair.com&" +
//                 "PWD=6ZS7F2NNZZZYW6GJ&SIGNATURE=AQEHES0Eiay.TjBiRotNn.U6SHwMA9G0e3kTHH4ImCMLF7lwe-FcKm.7&" +
//                 "METHOD="+callMetod+"&VERSION=78&TRANSACTIONID="+transactionId+
//                 "PAYMENTREQUEST_0_AMT=70&"+
//                 "PAYMENTREQUEST_0_CURRENCYCODE=USD";
//                 dw.system.Logger.warn('paypal request' + payload);
         
//             return payload;
//         },
//         parseResponse: function (svc, output) {
//             dw.system.Logger.warn('paypal response' + output.text);
//             var output = output.text;
//             // TRANSACTIONID = decodeFormParams(output.toString()).PAYMENTINFO_0_TRANSACTIONID.toString();
//              var b = 20;
//             return output;
//         }
      
//     });

//     authorizePayment.call();

// }

paypal.public = true;
showTemplate.public = true;
returnBack.public = true;
 module.exports.Paypal = paypal;
 module.exports.showTemplate= showTemplate;
 module.exports.returnBack= returnBack;

 

 