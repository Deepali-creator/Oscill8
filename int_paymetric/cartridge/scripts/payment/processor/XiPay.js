'use strict';

var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');

/**
 * Verifies a credit card against a valid card number and expiration date and possibly
 * invalidates invalid form fields.
 * If the verification was successful a credit card payment instrument is created.
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID
 * @param {Object} req the request object
 * @return {Object} returns an error object
 */
function Handle(basket, paymentInformation, paymentMethodID, req) {
    var collections = require('*/cartridge/scripts/util/collections');
    var XiPayHelpers = require('*/cartridge/scripts/helpers/XiPayHelpers.js');
    var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var serverErrors = [];
    var cardErrors = {};
    var error = false;

    try {
        var creditCardStatus;
        var currentBasket = basket;
        var cardNumber = paymentInformation.cardNumber.value;
        var cardSecurityCode = paymentInformation.securityCode.value;
        var expirationMonth = paymentInformation.expirationMonth.value;
        var expirationYear = paymentInformation.expirationYear.value;
        var cardType = paymentInformation.cardType.value;

        var paymentCard = PaymentMgr.getPaymentCard(cardType);

        // Validate payment instrument
        if (paymentMethodID === PaymentInstrument.METHOD_CREDIT_CARD) {
            var creditCardPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
            var paymentCardValue = PaymentMgr.getPaymentCard(paymentInformation.cardType.value);

            var applicablePaymentCards = creditCardPaymentMethod.getApplicablePaymentCards(
                req.currentCustomer.raw,
                req.geolocation.countryCode,
                null
            );

            if (!applicablePaymentCards.contains(paymentCardValue)) {
                // Invalid Payment Instrument
                var invalidPaymentMethod = Resource.msg('error.payment.not.valid', 'checkout', null);
                return { fieldErrors: [], serverErrors: [invalidPaymentMethod], error: true };
            }
        }

        if (empty(paymentInformation.creditCardToken)) {
            if (paymentCard) {
                creditCardStatus = paymentCard.verify(
                    expirationMonth,
                    expirationYear,
                    cardNumber,
                    cardSecurityCode
                );
            } else {
                cardErrors[paymentInformation.cardNumber.htmlName] =
                    Resource.msg('error.invalid.card.number', 'creditCard', null);

                return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
            }

            if (creditCardStatus.error) {
                collections.forEach(creditCardStatus.items, function (item) {
                    switch (item.code) {
                        case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                            cardErrors[paymentInformation.cardNumber.htmlName] =
                                Resource.msg('error.invalid.card.number', 'creditCard', null);
                            break;

                        case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                            cardErrors[paymentInformation.expirationMonth.htmlName] =
                                Resource.msg('error.expired.credit.card', 'creditCard', null);
                            cardErrors[paymentInformation.expirationYear.htmlName] =
                                Resource.msg('error.expired.credit.card', 'creditCard', null);
                            break;

                        case PaymentStatusCodes.CREDITCARD_INVALID_SECURITY_CODE:
                            cardErrors[paymentInformation.securityCode.htmlName] =
                                Resource.msg('error.invalid.security.code', 'creditCard', null);
                            break;
                        default:
                            serverErrors.push(
                                Resource.msg('error.card.information.error', 'creditCard', null)
                            );
                    }
                });

                return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
            }
        }

        var paymentInstrument = null;
        Transaction.wrap(function () {
            var paymentInstruments = currentBasket.getPaymentInstruments(
                PaymentInstrument.METHOD_CREDIT_CARD
            );

            collections.forEach(paymentInstruments, function (item) {
                currentBasket.removePaymentInstrument(item);
            });

            paymentInstrument = currentBasket.createPaymentInstrument(
                PaymentInstrument.METHOD_CREDIT_CARD, currentBasket.totalGrossPrice
            );

            paymentInstrument.setCreditCardHolder(currentBasket.billingAddress.fullName);
            paymentInstrument.setCreditCardNumber(cardNumber);
            paymentInstrument.setCreditCardType(cardType);
            paymentInstrument.setCreditCardExpirationMonth(expirationMonth);
            paymentInstrument.setCreditCardExpirationYear(expirationYear);

            if (!empty(paymentInformation.creditCardToken)) {
                paymentInstrument.setCreditCardToken(paymentInformation.creditCardToken);
            }
        });

        if (paymentInstrument && empty(paymentInformation.creditCardToken)) {
            var tokenizeResult = XiPayHelpers.tokenizeCreditCard(paymentInstrument, cardSecurityCode);
            if (tokenizeResult.error) {
                return tokenizeResult;
            }
        }
        session.privacy.cardSecurityCode = cardSecurityCode;
    } catch (e) {
        error = true;
        Logger.error(e);
        serverErrors.push(Resource.msg('error.technical', 'checkout', null));
    }

    return { fieldErrors: cardErrors, serverErrors: serverErrors, error: error };
}

/**
 * Tokenize credit card
 * @param {PaymentInstrument} paymentInstrument for tokenization
 * @param {string} cardSecurityCode cvn for card
 * @return {Object} returns an error object
 */
function createToken(paymentInstrument, cardSecurityCode) {
    var XiPayHelpers = require('*/cartridge/scripts/helpers/XiPayHelpers.js');

    try {
        var tokenizeResult = XiPayHelpers.tokenizeCreditCard(paymentInstrument, cardSecurityCode);
        if (tokenizeResult.error) {
            return tokenizeResult;
        }
    } catch (error) {
        Logger.error(error);
        return { error: true };
    }
    return { error: false };
}

/**
 * Authorizes a payment using a credit card. Customizations may use other processors and custom
 *      logic to authorize credit card payment.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var OrderMgr = require('dw/order/OrderMgr');
    var XiSecure = require('int_paymetric/cartridge/scripts/XiSecureHelper.ds');
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;

    try {
        var cvn = session.privacy.cardSecurityCode;
        session.privacy.cardSecurityCode = '';

        var Order = OrderMgr.getOrder(orderNumber);
        var hasToken = !empty(paymentInstrument.creditCardToken);
        if (empty(Order)) {
            var errorMessage = 'XiPay.js [Authorize] Cannot find order with number: ' + orderNumber;
            Logger.error(errorMessage);
            return { fieldErrors: [], serverErrors: [errorMessage], error: true };
        }

        var authorizeResult = XiSecure.authorize(Order, cvn);
        if (authorizeResult.ok) {
            var resultObject = authorizeResult.object;
            resultObject.ignoreCVV = !hasToken;

            XiSecure.checkAuthorizeCodes(resultObject);

            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.custom.authorizationCode = resultObject.AuthorizationCode;
                paymentInstrument.paymentTransaction.custom.AVSstreetOK = resultObject.AVSstreetOK;
                paymentInstrument.paymentTransaction.custom.AVSzipOK = resultObject.AVSzipOK;
                paymentInstrument.paymentTransaction.custom.CVVOK = resultObject.CVVOK;
                paymentInstrument.paymentTransaction.setTransactionID(resultObject.TransactionID);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            });
        } else if (authorizeResult.status === 'ERROR') {
            return { fieldErrors: [], serverErrors: [authorizeResult.errorMessage], error: true };
        }
    } catch (e) {
        error = true;
        Logger.error(e);
        serverErrors.push(Resource.msg('error.technical', 'checkout', null));
    }

    return { fieldErrors: fieldErrors, serverErrors: serverErrors, error: error };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
exports.createToken = createToken;
