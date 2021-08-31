'use strict';
const Status = require('dw/system/Status');
var CustomerMgr = require('dw/customer/CustomerMgr');

//will execute Before OCAPPI Order POST Call.(log in profile.jobTitle)
exports.beforePOST = function(basket){

  // ===================================================
  // =====         PROVIDE FREE BRUSH HEAD         =====
  // ===================================================
  provideFreeProduct(basket);

  return new Status(Status.OK);
}


function provideFreeProduct(basket){
    //Customer Profile
    var profile = CustomerMgr.getProfile(basket.customerNo);
    var ProductLineItems = basket.getProductLineItems();

    //PromoCode Applied And free product not Provided
    if(ProductLineItems[0].productID=='NT18RP' && profile.custom.promocode == 'FBH2021' && !profile.custom.freeProductProvided || profile.custom.freeProductProvided == null){

      //discount
      ProductLineItems[0].createPriceAdjustment('FBH2021', new dw.campaign.AmountDiscount(ProductLineItems[0].getBasePrice()+0));
      
      //recalculate basket
      dw.system.HookMgr.callHook( "dw.ocapi.shop.basket.calculate", "calculate", basket );

      //---free Product Provided ---
      profile.custom.freeProductProvided = true;
    }
}
