'use strict';
​
/**
* Module for ordering functionality.
* @module models/OrderModel
*/
​
/* API Includes */
var AbstractModel = require('./AbstractModel');
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var Kount = require('int_kount/cartridge/scripts/kount/libKount');
var Site = require('dw/system/Site');
var app = require('~/cartridge/scripts/app');
​
/**
 * Place an order using OrderMgr. If order is placed successfully,
 * its status will be set as confirmed, and export status set to ready.
 * @param {dw.order.Order} order
 */
/*function placeOrder(order) { Kount Replace
{
    var placeOrderStatus = OrderMgr.placeOrder(order);
    if (placeOrderStatus === Status.ERROR) {
        OrderMgr.failOrder(order);
        throw new Error('Failed to place order.');
    }
    order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
    order.setExportStatus(Order.EXPORT_STATUS_READY);
​
    //Custom attribute initialed as shipping email not sent for this order. 
    order.custom.OrderShippedEmail=0;
    //Sap site details
    order.custom.sapAccountNumber = Site.current.preferences.custom.sapAccountNumber;
    order.custom.sapSite=Site.current.preferences.custom.sapSite;
    order.custom.division=Site.current.preferences.custom.division;
    order.custom.site=Site.current.ID;
    
}*/
function placeOrder(order, kountStatus) {

    if(!empty(kountStatus) && kountStatus.KountOrderStatus == 'RETRY') {
        return;
      }    
      if(!empty(kountStatus) && kountStatus.KountOrderStatus != 'HOLD') {
              var placeOrderStatus = OrderMgr.placeOrder(order);
              if (placeOrderStatus === Status.ERROR) {
                  OrderMgr.failOrder(order);
                  throw new Error('Failed to place order.');
              }
              order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
          }
      
          // Mark order as EXPORT_STATUS_READY.
          Transaction.wrap(function () {
              if(kountStatus && kountStatus.KountOrderStatus == 'APPROVED' && order.getExportStatus().getDisplayValue() != 'EXPORTED' ) {
                  order.setExportStatus(Order.EXPORT_STATUS_READY);
                  order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                  
      
                  // Why DECLINED is here? Because if respond status from Kount is DECLINED we skip checkout and return user on the Billing page
              } else if(kountStatus && (kountStatus.KountOrderStatus == 'DECLINED' || kountStatus.KountOrderStatus == 'HOLD')) {
                  order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
                  order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
              } else {
                  // set the export status to EXPORT_STATUS_READY
                  order.setExportStatus(Order.EXPORT_STATUS_READY);
                  order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                  
              }
          });
          //order.customerLocaleID='en_US';
          order.custom.OrderShippedEmail=0;
          //Sap site details
        order.custom.sapAccountNumber = Site.current.preferences.custom.sapAccountNumber;
        order.custom.sapSite=Site.current.preferences.custom.sapSite;
        order.custom.division=Site.current.preferences.custom.division;
        order.custom.site=Site.current.ID;
}
/**
 * Order helper class providing enhanced order functionality.
 * @class module:models/OrderModel~OrderModel
 * @extends module:models/AbstractModel
 *
 * @param {dw.order.Order} obj The order object to enhance/wrap.
 */
var OrderModel = AbstractModel.extend({
​
});
​
/**
 * Gets a new instance for a given order or order number.
 *
 * @alias module:models/OrderModel~OrderModel/get
 * @param parameter {dw.order.Order | String} The order object to enhance/wrap or the order ID of the order object.
 * @returns {module:models/OrderModel~OrderModel}
 */
OrderModel.get = function (parameter) {
    var obj = null;
    if (typeof parameter === 'string') {
        obj = OrderMgr.getOrder(parameter);
    } else if (typeof parameter === 'object') {
        obj = parameter;
    }
    return new OrderModel(obj);
};
​
/**
 * Submits an order
 * @param order {dw.order.Order} The order object to be submitted.
 * @transactional
 * @return {Object} object If order cannot be placed, object.error is set to true. Ortherwise, object.order_created is true, and object.Order is set to the order.
 */
//OrderModel.submit = function (order) {Kount Replace
    OrderModel.submit = function (order, kountStatus) {
    var Email = require('./EmailModel');
    var GiftCertificate = require('./GiftCertificateModel');
    try {
        Transaction.begin();
        //placeOrder(order); Kount Change
​        placeOrder(order, kountStatus);
        // Creates gift certificates for all gift certificate line items in the order
        // and sends an email to the gift certificate receiver
​
        /*order.getGiftCertificateLineItems().toArray().map(function (lineItem) {
            return GiftCertificate.createGiftCertificateFromLineItem(lineItem, order.getOrderNo());
        }).forEach(GiftCertificate.sendGiftCertificateEmail); Kount replace*/
        dw.system.Logger.warn('hpr2'+kountStatus+kountStatus.KountOrderStatus);
        if(!Kount.isKountEnabled() || kountStatus && kountStatus.KountOrderStatus == 'APPROVED') {
            order.getGiftCertificateLineItems().toArray().map(function (lineItem) {
                return GiftCertificate.createGiftCertificateFromLineItem(lineItem, order.getOrderNo());
            }).forEach(GiftCertificate.sendGiftCertificateEmail);
        }

        
        Transaction.commit();
    } catch (e) {
        Transaction.rollback();
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
        };
    }
​
    
    if(!Kount.isKountEnabled() || kountStatus && kountStatus.KountOrderStatus == 'APPROVED') {
        Email.sendMail({
            template: 'mail/orderconfirmation',
            recipient: order.getCustomerEmail(),
            subject: Resource.msg('order.orderconfirmation-email.001', 'order', null),
            context: {
                Order: order
            }
        });
    }

​
    return {
        Order: order,
        order_created: true
    };
}
​
/** The order class */
module.exports = OrderModel;