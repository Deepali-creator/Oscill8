'use strict';

/**
 * Controller that creates an order from the current basket. It's a pure processing controller and does
 * no page rendering. The controller is used by checkout and is called upon the triggered place order action.
 * It contains the actual logic to authorize the payment and create the order. The controller communicates the result
 * of the order creation process and uses a status object PlaceOrderError to set proper error states.
 * The calling controller is must handle the results of the order creation and evaluate any errors returned by it.
 *
 * @module controllers/COPlaceOrder
 */

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Kount = require('int_kount/cartridge/scripts/kount/libKount');
var Cart = app.getModel('Cart');
var Order = app.getModel('Order');
var PaymentProcessor = app.getModel('PaymentProcessor');

/**
 * Responsible for payment handling. This function uses PaymentProcessorModel methods to
 * handle payment processing specific to each payment instrument. It returns an
 * error if any of the authorizations failed or a payment
 * instrument is of an unknown payment method. If a payment method has no
 * payment processor assigned, the payment is accepted as authorized.
 *
 * @transactional
 * @param {dw.order.Order} order - the order to handle payments for.
 * @return {Object} JSON object containing information about missing payments, errors, or an empty object if the function is successful.
 */
function handlePayments(order) {
   dw.system.Logger.warn("========in CoPlaceOrder handlePayments=========");
    try{
        if (order.getTotalNetPrice().value !== 0.00) {

            var paymentInstruments = order.getPaymentInstruments();

            if (paymentInstruments.length === 0) {
                return {
                    missingPaymentInfo: true
                };
            }
            /**
             * Sets the transaction ID for the payment instrument.
             */
            var handlePaymentTransaction = function () {
                paymentInstrument.getPaymentTransaction().setTransactionID(order.getOrderNo());
            };

            for (var i = 0; i < paymentInstruments.length; i++) {
                var paymentInstrument = paymentInstruments[i];

                if (PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor() === null) {

                    Transaction.wrap(handlePaymentTransaction);

                } else {

                    var authorizationResult = PaymentProcessor.authorize(order, paymentInstrument);

                    if (authorizationResult.not_supported || authorizationResult.error) {
                        return {
                            error: true
                        }
                    }else if (authorizationResult.redirected) {
						return {
							redirected: true
						};
                }
            }
        }
    }
        return {};
    }catch(ex){
        return {error: true};
    }
}

/**
 * The entry point for order creation. This function is not exported, as this controller must only
 * be called by another controller.
 *
 * @transactional
 * @return {Object} JSON object that is empty, contains error information, or PlaceOrderError status information.
 */
function start() {
    var cart = Cart.get();

    if (!cart) {
        app.getController('Cart').Show();
        return {};
    }

    var COShipping = app.getController('COShipping');

    // Clean shipments.
    COShipping.PrepareShipments(cart);

    // Make sure there is a valid shipping address, accounting for gift certificates that do not have one.
    if (cart.getProductLineItems().size() > 0 && cart.getDefaultShipment().getShippingAddress() === null) {
        COShipping.Start();
        return {};
    }

    // Make sure the billing step is fulfilled, otherwise restart checkout.
    if (!session.forms.billing.fulfilled.value) {
        app.getController('COCustomer').Start();
        return {};
    }

    var OrderNo = OrderMgr.createOrderNo();

    Transaction.wrap(function () {
        cart.calculate();
    });

    var basket = dw.order.BasketMgr.currentBasket;

    var COBilling = app.getController('COBilling');

    Transaction.wrap(function () {
        if (!COBilling.ValidatePayment(cart)) {
            dw.system.Logger("========payment is not validated======");
            dw.system.Logger(!COBilling.ValidatePayment(cart));
          
            COBilling.Start();
            return {};
        }
    });

    // Recalculate the payments. If there is only gift certificates, make sure it covers the order total, if not
    // back to billing page.
    Transaction.wrap(function () {
        if (!cart.calculatePaymentTransactionTotal()) {
            COBilling.Start();
            return {};
        }
    });

    // Handle used addresses and credit cards.
    var saveCCResult = COBilling.SaveCreditCard();

    if (!saveCCResult) {
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
        };
    }

    // Creates a new order. This will internally ReserveInventoryForOrder and will create a new Order with status
    // 'Created'.
    //var order = cart.createOrder();
    var order = cart.createOrder(OrderNo);

    if (!order) {
        // TODO - need to pass BasketStatus to Cart-Show ?
        app.getController('Cart').Show();

        return {};
    }
     var handlePaymentsResult = handlePayments(order); //Kount replace
    
    var RISresult = Kount.preRiskCall(order, null, false);
    
    if (RISresult && RISresult.KountOrderStatus === 'DECLINED') {

        Transaction.wrap(function () {
            OrderMgr.failOrder(order);
        });
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
        };
    }


   // var handlePaymentsResult = Kount.postRiskCall(handlePayments, order);

    if (handlePaymentsResult.error) {
        return Transaction.wrap(function () {
            OrderMgr.failOrder(order);
            return {
                error: true,
                PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
            };
        });

    } else if (handlePaymentsResult.missingPaymentInfo) {
        return Transaction.wrap(function () {
            OrderMgr.failOrder(order);
            return {
                error: true,
                PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
            };
        });
    } else if (handlePaymentsResult.redirected) {
        return Transaction.wrap(function () {
            return {
                error: false,
            };
        });
    }
    return submitImpl(order, handlePaymentsResult);
}

/**
 * Submits an order.
 *
 * @transactional
 * @param {dw.order.Order} order - the order to submit.
 * @return {Boolean | Object} false if order cannot be placed. true if the order confirmation status is CONFIRMED.
 * JSON object containing error information, or the order and/or order creation information.
 */
function submitImpl(order, handlePaymentsResult) {
   dw.system.Logger.warn("========in CoPlaceOrder submitImpl=========");
    var orderPlacementStatus = Transaction.wrap(function () {
        //if (OrderMgr.placeOrder(order) === Status.ERROR) {
        var enumval =Order.submit(order, handlePaymentsResult);
        if(enumval === Status.ERROR){
            OrderMgr.failOrder(order);
            dw.system.Logger.warn('here');
            return false;
        }
        
        dw.system.Logger.warn('here11'+order.getStatus());
        Transaction.wrap(function () {
            order.setConfirmationStatus(order.CONFIRMATION_STATUS_CONFIRMED);
            });

        dw.system.Logger.warn('here12');
        return true;
    });

    if (orderPlacementStatus === Status.ERROR) {
        return {error: true};
    }

    // Creates purchased gift certificates with this order.
    /* if (!createGiftCertificates(order)) {
        OrderMgr.failOrder(order);
        return {error: true};
    } */
/*
    // Send order confirmation and clear used forms within the checkout process. =====> get N°order :  order.getOrderNo()).toString()
    Email.get('mail/orderconfirmation', order.getCustomerEmail())
    	.setFrom(Resource.msg('resource.from', 'email', null))
        .setSubject(Resource.msg('orderconfirmation.subject', 'email', null))
        .send({
            Order: order
        });
        

    // Mark order as EXPORT_STATUS_READY.
    Transaction.wrap(function () {
		if(dw.order.Order.EXPORT_STATUS_EXPORTED != order.getExportStatus()){
			order.setExportStatus(dw.order.Order.EXPORT_STATUS_READY);
		}
        order.setConfirmationStatus(dw.order.Order.CONFIRMATION_STATUS_CONFIRMED);
    });
*/
    // Clears all forms used in the checkout process.
    clearForms();

    return {
        Order: order,
        order_created: true
    };
}

function clearForms() {
    // Clears all forms used in the checkout process.
    session.forms.singleshipping.clearFormElement();
    session.forms.multishipping.clearFormElement();
    session.forms.billing.clearFormElement();
}

/**
 * Asynchronous Callbacks for OCAPI. These functions result in a JSON response.
 * Sets the payment instrument information in the form from values in the httpParameterMap.
 * Checks that the payment instrument selected is valid and authorizes the payment. Renders error
 * message information if the payment is not authorized.
 */
function submitPaymentJSON() {
    dw.system.Logger.warn("========in CoPlaceOrder submitPaymentJSON=========");
    var order = Order.get(request.httpParameterMap.order_id.stringValue);
    if (!order.object || request.httpParameterMap.order_token.stringValue !== order.getOrderToken()) {
        app.getView().render('checkout/components/faults');
        return;
    }
    session.forms.billing.paymentMethods.clearFormElement();

    var requestObject = JSON.parse(request.httpParameterMap.requestBodyAsString);
    var form = session.forms.billing.paymentMethods;

    for (var requestObjectItem in requestObject) {
        var asyncPaymentMethodResponse = requestObject[requestObjectItem];

        var terms = requestObjectItem.split('_');
        if (terms[0] === 'creditCard') {
            var value = (terms[1] === 'month' || terms[1] === 'year') ?
                Number(asyncPaymentMethodResponse) : asyncPaymentMethodResponse;
            form.creditCard[terms[1]].setValue(value);
        } else if (terms[0] === 'selectedPaymentMethodID') {
            form.selectedPaymentMethodID.setValue(asyncPaymentMethodResponse);
        }
    }

    if (app.getController('COBilling').HandlePaymentSelection('cart').error || handlePayments().error) {
        app.getView().render('checkout/components/faults');
        return;
    }
    app.getView().render('checkout/components/payment_methods_success');
}

/*
 * Asynchronous Callbacks for SiteGenesis.
 * Identifies if an order exists, submits the order, and shows a confirmation message.
 */
function submit() {
    dw.system.Logger.warn("========in CoPlaceOrder submit=========");
    var order = Order.get(request.httpParameterMap.order_id.stringValue);
    var orderPlacementStatus;
    if (order.object && request.httpParameterMap.order_token.stringValue === order.getOrderToken()) {
        orderPlacementStatus = submitImpl(order);
        if (!orderPlacementStatus.error) {
            // avalara code starts
            var avaconfig = JSON.parse(require('dw/system/Site').getCurrent().getCustomPreferenceValue('ATSettings'));
            if (avaconfig.taxCalculation) {
            session.privacy.NoCall = false;
            session.privacy.finalCall = true;
            session.privacy.OrderNo = OrderNo;
            
            require('int_avatax/cartridge/scripts/app').getController('Avatax').CalculateTaxes(basket);
            session.privacy.OrderNo = null;
            }
            // avalara code end
            clearForms();
            return app.getController('COSummary').ShowConfirmation(order.object);
        }
    }
    app.getController('COSummary').Start();
}

/*
 * Module exports
 */

/*
 * Web exposed methods
 */
/** @see module:controllers/COPlaceOrder~submitPaymentJSON */
exports.SubmitPaymentJSON = guard.ensure(['https'], submitPaymentJSON);
/** @see module:controllers/COPlaceOrder~submitPaymentJSON */
exports.Submit = guard.ensure(['https'], submit);

/*
 * Local methods
 */
exports.Start = start;
