'use strict'
/**
 * Controller that adds and removes products and coupons in the cart.
 * Also provides functions for the continue shopping button and minicart.
 *
 * @module controllers/CustomProcart
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
//const { doWhilst } = require('async');
​
//Empty the cart if json parameter is found ! condition missing
function user() {
var cart = app.getModel('Cart').goc();
var params = request.httpParameterMap;
var decodedJson = encoding.fromBase64(params.q.value);
​
var basket = BasketMgr.getCurrentOrNewBasket();
var pli = basket.getAllProductLineItems().iterator();
//var size1 =basket.getAllProductLineItems().size();
while (pli.hasNext()) {
    var pl = pli.next();
    Transaction.wrap(function (){
    basket.removeProductLineItem(pl);
    });
}
​
var decodedJsonArray = JSON.parse(decodedJson);
for(var i = 0 ;i < decodedJsonArray.length;i++) {
    var id = decodedJsonArray[i].id;
    var qty = decodedJsonArray[i].qty;
    if(getAvailabilty(id,qty)) {
        addProduct(id,qty);
    }
}
​
//response.getWriter().print(''+ atob.fromBase64('eyJpZCI6IjEyMyIsInF0eSI6ImFzYXNhcyJ9'));
//response.redirect(URLUtils.https('Cart-Show'));
​
}
​
function addProduct() {
   
    var cart = app.getModel('Cart').goc();
    //var params = request.httpParameterMap;
    var Product = app.getModel('Product');
    var productToAdd = Product.get('Test-Product');

                var productOptionModel = productToAdd.updateOptionSelection(params);
                cart.addProductItem(productToAdd.object,1, productOptionModel);
           
}
function getAvailabilty(id,qty) {
   
    var cart = app.getModel('Cart').goc();
    var params = request.httpParameterMap;
    var Product = app.getModel('Product');
    var productToAdd = Product.get(id);

                var productOptionModel = productToAdd.updateOptionSelection(params);
                cart.addProductItem(productToAdd.object,qty, productOptionModel);
}
/** Displays the current items in the cart in the minicart panel.
 * @see {@link module:controllers/CustomProcart~User} */
exports.User = guard.ensure(['get'], user);
/** Displays the current items in the cart in the minicart panel.
 * @see {@link module:controllers/CustomProcart~AddProduct} */
 exports.User = guard.ensure(['get'], addProduct);