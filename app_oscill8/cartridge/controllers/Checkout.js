'use strict'
/**
 * Controller that adds and removes products and coupons in the cart.
 * Also provides functions for the continue shopping button and minicart.
 *
 * @module controllers/Checkout
 */
​
/* API Includes */
var ArrayList = require('dw/util/ArrayList');
var ISML = require('dw/template/ISML');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var BasketMgr = require('dw/order/BasketMgr');
var encoding = require('dw/crypto/Encoding');
/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
​
//Empty the cart if json parameter is found ! condition missing
function user() {
var id1 = 'NT18'; /*request.httpParameterMap.id.value;*/
var qty1 = Number(request.httpParameterMap.qty.value);

    addProduct(id1,qty1);
    response.redirect(URLUtils.https('Cart-Show'));

}
​
//response.getWriter().print(''+ atob.fromBase64('eyJpZCI6IjEyMyIsInF0eSI6ImFzYXNhcyJ9'));
​

​
function addProduct(id,qty) {
   
    var cart = app.getModel('Cart').goc();
    var params = request.httpParameterMap;
    var Product = app.getModel('Product');
    var productToAdd = Product.get(id);
​

    var productOptionModel = productToAdd.updateOptionSelection(params);
    cart.addProductItem(productToAdd.object,qty, productOptionModel);

}
/** Displays the current items in the cart in the minicart panel.
 * @see {@link module:controllers/Checkout~User} */
exports.User = guard.ensure(['get'], user);