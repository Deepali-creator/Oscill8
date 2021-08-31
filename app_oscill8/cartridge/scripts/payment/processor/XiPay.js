'use strict';

/* API Includes */
var Logger = require("dw/system/Logger");
var Cart = require('~/cartridge/scripts/models/CartModel');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var XiSecure = require('int_paymetric/cartridge/scripts/XiSecureHelper.ds');

/**
 * Verifies a credit card against a valid card number and expiration date and possibly invalidates invalid form fields.
 * If the verification was successful a credit card payment instrument is created.
 */

function Handle(args) {
	Logger.warn('--------------In credit Hndle Method-------------');
	var paymentInstrument;
    var cart = Cart.get(args.Basket);
    var creditCardForm = app.getForm('billing.paymentMethods.creditCard');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var cardNumber = creditCardForm.get('number').value();
    var cardSecurityCode = creditCardForm.get('cvn').value();
    var cardType = creditCardForm.get('type').value();
    var expirationMonth = creditCardForm.get('expiration.month').value();
    var expirationYear = creditCardForm.get('expiration.year').value();
    var paymentCard = PaymentMgr.getPaymentCard(cardType);

    var creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber, cardSecurityCode);

    if (creditCardStatus.error) {

        var invalidatePaymentCardFormElements = require('app_oscill8/cartridge/scripts/checkout/InvalidatePaymentCardFormElements');
        invalidatePaymentCardFormElements.invalidatePaymentCardForm(creditCardStatus, session.forms.billing.paymentMethods.creditCard);

        return {error: true};
    }

    Transaction.wrap(function () {
        cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
        paymentInstrument = cart.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD, cart.getNonGiftCertificateAmount());

        paymentInstrument.creditCardHolder = creditCardForm.get('owner').value();
        paymentInstrument.creditCardNumber = cardNumber;
        paymentInstrument.creditCardType = cardType;
        paymentInstrument.creditCardExpirationMonth = expirationMonth;
        paymentInstrument.creditCardExpirationYear = expirationYear;
    });

    try{
    	getToken(paymentInstrument,cardSecurityCode);
    }catch(ex){
    	Logger.error(ex.message);
		return {error: true, errorMessage: ex.message};
    }

    return {error: false, success: true};
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function Authorize(args) {
    var orderNo = args.OrderNo;
    var paymentInstrument = args.PaymentInstrument;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    var cvn = app.getForm('billing.paymentMethods.creditCard').get('cvn').value();
    var hasToken=!empty(paymentInstrument.creditCardToken);
    try{
	if(empty(paymentInstrument.creditCardToken)){

    		getToken(paymentInstrument,cvn);
		}
		
		var authorizeResult : Result = XiSecure.authorize(args.Order, cvn);
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
}

function getToken(paymentInstrument,cvn){
	var iframeResult : Result = XiSecure.getIframe();
	dw.system.Logger.warn("------iframe--------------"+iframeResult);
	if (!iframeResult.ok){
		Logger.error(iframeResult.errorMessage);
		throw new Error(iframeResult.errorMessage);
	};
	var tokenizeResult : Result = XiSecure.tokenize(iframeResult.object,paymentInstrument,cvn);
	if (!tokenizeResult.ok){
		Logger.error(tokenizeResult.errorMessage);
		throw new Error(tokenizeResult.errorMessage);
	}
    Transaction.wrap(function(){
    	paymentInstrument.creditCardToken=tokenizeResult.object;
    });
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
