'use strict';


/**
 * Tokenize credit card
 * @param {PaymentInstrument} paymentInstrument current PaymentInstrument for tokenize
 * @param {string} cvn card security code
 * @return {Object} tokenize result
 */
function tokenizeCreditCard(paymentInstrument, cvn) {
    var XiSecure = require('int_paymetric/cartridge/scripts/XiSecureHelper.ds');
    var Logger = require('dw/system/Logger');
    var Transaction = require('dw/system/Transaction');

    var iframeResult = XiSecure.getIframe();
    if (!iframeResult.ok) {
        Logger.error(iframeResult.errorMessage);
        return { fieldErrors: [], serverErrors: [iframeResult.errorMessage], error: true };
    }

    var tokenizeResult = XiSecure.tokenize(iframeResult.object, paymentInstrument, cvn);
    if (!tokenizeResult.ok) {
        Logger.error(tokenizeResult.errorMessage);
        return { fieldErrors: [], serverErrors: [tokenizeResult.errorMessage], error: true };
    }

    Transaction.wrap(function () {
        paymentInstrument.setCreditCardToken(tokenizeResult.object);
    });

    return { error: false };
}

module.exports = {
    tokenizeCreditCard: tokenizeCreditCard
};
