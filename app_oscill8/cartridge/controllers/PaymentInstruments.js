'use strict';

/**
 * Controller that displays credit card and other payment information and
 * lets the user change it.
 *
 * @module controllers/PaymentInstruments
 */

/* API includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');


/**
 * Displays a list of customer payment instruments.
 *
 * Gets customer payment instrument information. Clears the paymentinstruments form and adds the customer
 * payment information to it. Updates the page metadata.
 * Renders a list of the saved credit card payment instruments of the current
 * customer (account/payment/paymentinstrumentlist template).
 */
function list() {
    var wallet = customer.getProfile().getWallet();
    var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
    var pageMeta = require('~/cartridge/scripts/meta');
    var paymentForm = app.getForm('paymentinstruments');
    paymentForm.clear();
    paymentForm.get('creditcards.storedcards').copyFrom(paymentInstruments);
    pageMeta.update(dw.content.ContentMgr.getContent('myaccount-paymentsettings'));
    var viewParams = {
        PaymentInstruments: paymentInstruments
    };
    if (session.custom.newCard) {
        viewParams.newCard = {"payment_profile": session.custom.newCard.sp};
        viewParams.newCardSfccId = session.custom.newCard.sfcc.getUUID();
        session.custom.newCard = null;
    }
    if (session.custom.updatedCard) {
        viewParams.updatedCard = {"payment_profile": session.custom.updatedCard.sp};
        session.custom.updatedCard = null;
    }
    if (session.custom.deletedCard) {
        viewParams.deletedCard = {"payment_profile": session.custom.deletedCard.sp};
        session.custom.deletedCard = null;
    }
    app.getView(viewParams).render('account/payment/paymentinstrumentlist');
}


/**
 * Adds a new credit card payment instrument to the saved payment instruments of the current customer.
 * Sets the ContinueURL to PaymentInstruments-PaymentForm and renders the payment instrument details page
 * (account/payment/paymentinstrumentdetails template).
 * __Note:__this function is called by the {@link module:controllers/PaymentInstruments~handlePaymentForm|handlePaymentForm} function.
 * @param {boolean} clearForm true or missing clears the form before displaying the page, false skips it
 */
function add(clearForm) {

    if(request.httpParameterMap.PaymentInstrumentID.value) {
        paymentInstrumentForm = session.forms.paymentinstruments;

        var wallet = customer.getProfile().getWallet();
        var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);

        var paymentInstrument;
        for(var i=0; i<paymentInstruments.length; i++) {
            if(paymentInstruments[i].UUID == request.httpParameterMap.PaymentInstrumentID.value) {
                paymentInstrument = paymentInstruments[i];
            }
        }

        app.getForm(paymentInstrumentForm.creditcards.newcreditcard).copyFrom(paymentInstrument);

        var paymentForm = app.getForm('paymentinstruments');
        paymentForm.get('creditcards.newcreditcard.type').setOptions(dw.order.PaymentMgr
            .getPaymentMethod(dw.order.PaymentInstrument.METHOD_CREDIT_CARD).activePaymentCards.iterator());


        var paymentCards = dw.order.PaymentMgr.getPaymentMethod(dw.order.PaymentInstrument.METHOD_CREDIT_CARD).activePaymentCards;
        for(card in paymentCards) {
            if(card.cardType === paymentInstrument.getCreditCardType()) {
                paymentForm.setValue('creditcards.newcreditcard.type', card);
            }
        }

        app.getView({
            ContinueURL: URLUtils.https('PaymentInstruments-PaymentForm', 'PaymentInstrumentID', paymentInstrument.UUID)
        }).render('account/payment/paymentinstrumentdetails');

    }
    else{
    var paymentForm = app.getForm('paymentinstruments');

    if (clearForm !== false) {
        paymentForm.clear();
    }
    paymentForm.get('creditcards.newcreditcard.type').setOptions(dw.order.PaymentMgr
        .getPaymentMethod(dw.order.PaymentInstrument.METHOD_CREDIT_CARD).activePaymentCards.iterator());

    app.getView({
        ContinueURL: URLUtils.https('PaymentInstruments-PaymentForm')
    }).render('account/payment/paymentinstrumentdetails');
}
}

/**
 * Form handler for the paymentinstruments form. Handles the following actions:
 * - __create__ - calls the {@link module:controllers/PaymentInstruments~create|create} function to create a payment instrument
 * and redirects to {@link module:controllers/PaymentInstruments~list|list}. If the
 * creation fails, calls the {@link module:controllers/PaymentInstruments~add|add} function with a clearform value of false.
 * - __error__ - calls the {@link module:controllers/PaymentInstruments~add|add} function with a clearform value of false.
 */
function handlePaymentForm() {
    var paymentForm = app.getForm('paymentinstruments');
    paymentForm.handleAction({
        create: function () {
            if (!create()) {
                add(false);
                return;
            } else {
                //response.redirect(URLUtils.https('PaymentInstruments-List'));
                app.getView().render('account/payment/cardAdded');
            }
        },
        error: function () {
            add(false);
        }
    });
}
/**
 * Saves a  customer credit card payment instrument.
 * @param {Object} params
 * @param {dw.customer.CustomerPaymentInstrument} params.PaymentInstrument - credit card object.
 * @param {dw.web.FormGroup} params.CreditCardFormFields - new credit card form.
 */
function save(params) {
    var saveCustomerCreditCard = require('app_oscill8/cartridge/scripts/checkout/SaveCustomerCreditCard');
    var result = saveCustomerCreditCard.save(params);
    if (result === PIPELET_ERROR) {
        throw new Error('Problem saving credit card');
    }
}

/**
 * Creates a new payment instrument. Verifies the credit card and checks if it is a duplicate of
 * a card already in the current customer's payment instruments. In a transaction, the function
 * attempts to save the credit card to the customer's payment instruments. If a duplicate card was
 * detected, the original card is removed after the new card is created. If the card cannot be created
 * successfully, the transaction is rolled back. Whether successful or not, the paymentinstruments
 * form is cleared.
 *
 * @transaction
 * @return {boolean} true if the credit card can be verified, false otherwise
 */
function create() {
    if (!verifyCreditCard()) {
        return false;
    }

    var paymentForm = app.getForm('paymentinstruments');
    var newCreditCardForm = paymentForm.get('creditcards.newcreditcard');
    var ccNumber = newCreditCardForm.get('number').value();

    var wallet = customer.getProfile().getWallet();
    var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);

    var isDuplicateCard = false;
    var oldCard;

    for (var i = 0; i < paymentInstruments.length; i++) {
        var card = paymentInstruments[i];
        if (card.creditCardNumber === ccNumber) {
            isDuplicateCard = true;
            oldCard = card;
            break;
        }
        else if(request.httpParameterMap.PaymentInstrumentID.value == paymentInstruments[i].UUID) {
            oldCard2 = paymentInstruments[i];
        }
    }

    Transaction.begin();
    var paymentInstrument = wallet.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);

    try {
        save({
            PaymentInstrument: paymentInstrument,
            CreditCardFormFields: newCreditCardForm.object
        });
    } catch (err) {
        Transaction.rollback();
        return false;
    }
    let subproPaymentProfileID = null;
    if (isDuplicateCard) {
        if (oldCard.custom.subproPaymentProfileID) {
            subproPaymentProfileID = oldCard.custom.subproPaymentProfileID;
        }
        wallet.removePaymentInstrument(oldCard);
    }
    else if(request.httpParameterMap.PaymentInstrumentID.value) {
        wallet.removePaymentInstrument(oldCard2);
    }

    Transaction.commit();

    // Save data to session for hosted wallet widget integration
    var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
    var saveCard;
    for (var i = 0; i < paymentInstruments.length; i++) {
        var card = paymentInstruments[i];
        if (card.creditCardNumber === ccNumber) {
            saveCard = card;
            break;
        }
    }
    var paymentsHelper = require('int_subscribe_pro/cartridge/scripts/subpro/helpers/PaymentsHelper');
    if (!isDuplicateCard) {
        session.custom.newCard = {
            "sp": paymentsHelper.getSubscriptionPaymentProfile(session.customer.profile, saveCard, {}, false),
            "sfcc": saveCard
        };
        if (null === session.custom.newCard) {
            Logger.info('New card could not be mapped to a payment profile.');
        }
    }
    else {
        Transaction.begin();
        try {
            saveCard.custom.subproPaymentProfileID = subproPaymentProfileID;
        }
        catch (err) {
            Transaction.rollback();
            return false;
        }
        Transaction.commit();
        session.custom.updatedCard = {
            "sp": paymentsHelper.getSubscriptionPaymentProfile(session.customer.profile, saveCard, {}, true),
            "sfcc": saveCard
        };
        if (null === session.custom.updatedCard) {
            Logger.info('New card could not be mapped to a payment profile.');
        }
    }

    paymentForm.clear();

    return true;
}


/**
 * Form handler for the paymentinstruments form. Handles the following actions:
 * - __remove__ - uses the form and action supplied by the FormModel to remove a customer payment instrument
 * in a transaction.
 * - __error__ - does nothing.
 *
 * In either case, redirects to the {@link module:controllers/PaymentInstruments~list|List} function.
 * @transaction
 * @TODO Should be moved into handlePaymentForm
 * @FIXME Inner method should be lowercase.error action should do something
 */
function Delete() {
    var paymentForm = app.getForm('paymentinstruments');
    paymentForm.handleAction({
        remove: function (formGroup, action) {
            var paymentsHelper = require('int_subscribe_pro/cartridge/scripts/subpro/helpers/PaymentsHelper');
            session.custom.deletedCard = {
                "sp": paymentsHelper.getSubscriptionPaymentProfile(session.customer.profile, action.object, {}, true),
                "sfcc": action.object
            };
               
            Transaction.wrap(function () {
                var wallet = customer.getProfile().getWallet();
                wallet.removePaymentInstrument(action.object);
            });

        },
        error: function () {
            // @TODO When could this happen
        }
    });

    response.redirect(URLUtils.https('PaymentInstruments-List'));
}


/*
 * Private helpers
 */

/**
 * Verifies if the entered credit card details are valid.
 *
 * @returns {boolean} true in case of success, otherwise false.
 */
function verifyCreditCard() {
    var newCreditCardForm = app.getForm('paymentinstruments.creditcards.newcreditcard');

    var expirationMonth = newCreditCardForm.get('expiration.month').value();
    var expirationYear = newCreditCardForm.get('expiration.year').value();
    var cardNumber = newCreditCardForm.get('number').value();
    var paymentCard = PaymentMgr.getPaymentCard(newCreditCardForm.get('type').value());
    var verifyPaymentCardResult = paymentCard.verify(expirationMonth, expirationYear, cardNumber);

    if (verifyPaymentCardResult.error === true) {

        if (!newCreditCardForm.isValid()) {
            return false;
        }

        if (verifyPaymentCardResult.code === Status.OK) {
            return true;
        }

        // Invalidate the payment card form elements.
        for (var i = 0; i < verifyPaymentCardResult.items.length; i++) {
            if (verifyPaymentCardResult.items[i].code === PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER) {
                newCreditCardForm.get('number').invalidate();
            } else if (verifyPaymentCardResult.items[i].code === PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE) {
                newCreditCardForm.get('expiration.month').invalidate();
                newCreditCardForm.get('expiration.year').invalidate();
            }
        }
        return false;
    }

    return true;
}

function SetSPPaymentProfileID() {
    var wallet = customer.getProfile().getWallet();
    var paymentInstruments = wallet.getPaymentInstruments('CREDIT_CARD');
    let paymentInstrumentId = request.httpParameterMap.paymentInstrumentId.value;
    var paymentsHelper = require('/int_subscribe_pro/cartridge/scripts/subpro/helpers/PaymentsHelper');
    let paymentInstrument = null;
    for (let i in paymentInstruments) {
        if (paymentInstrumentId == paymentInstruments[i].getUUID()) {
            paymentInstrument = paymentInstruments[i];
        }
    }
    let success = paymentInstrument != null;
    if (success) {
        paymentsHelper.setSubproPaymentProfileID(paymentInstrument, request.httpParameterMap.spPaymentProfileId.value);
    }
    let r = require('~/cartridge/scripts/util/Response');
    r.renderJSON({success: true});
}

/*
 * Web exposed methods
 */
/** Sets the Subscribe Pro Payment Profile ID on a SFCC Payment Instrument.
* @see module:controllers/PaymentInstruments~SetSPPaymentProfileID */
exports.SetSPPaymentProfileID = guard.ensure(['https', 'get', 'loggedIn'], SetSPPaymentProfileID);
/** Renders a list of the saved credit card payment instruments of the current customer.
 * @see module:controllers/PaymentInstruments~list */
exports.List = guard.ensure(['https', 'get', 'loggedIn'], list);
/** Adds a new credit card payment instrument to the saved payment instruments of the current customer.
 * @see module:controllers/PaymentInstruments~add */
exports.Add = guard.ensure(['https', 'get', 'loggedIn'], add);
/** Handles the submitted form for creating payment instruments.
 * @see module:controllers/PaymentInstruments~handlePaymentForm */
exports.PaymentForm = guard.ensure(['https', 'post', 'loggedIn', 'csrf'], handlePaymentForm);
/** Deletes a saved credit card payment instrument.
 * @see module:controllers/PaymentInstruments~Delete */
exports.Delete = guard.ensure(['https', 'loggedIn'], Delete);
