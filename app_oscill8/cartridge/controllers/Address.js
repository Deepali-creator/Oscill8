'use strict';

/**
 * Controller that provides functions for editing, adding, and removing addresses in a customer addressbook.
 * It also sets the default address in the addressbook.
 * @module controllers/Address
 */

/* API Includes */
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
 * Gets a ContentModel that wraps the myaccount-addresses content asset.
 * Updates the page metadata and renders the addresslist template.
 */
function list() {
    var pageMeta = require('~/cartridge/scripts/meta');
    var content = app.getModel('Content').get('myaccount-addresses');
    if (content) {
    pageMeta.update(content.object);
    }
    var viewParams = {};
    if (session.custom.newAddress) {
    viewParams.newAddress = {"address":session.custom.newAddress.sp};
    viewParams.newAddressSfccId = session.custom.newAddress.sfcc.getID();
    session.custom.newAddress = null;
    }
    if (session.custom.updatedOldAddress && session.custom.updatedNewAddress) {
    viewParams.updatedAddress = {"prev_address": session.custom.updatedOldAddress.sp,
   "address": session.custom.updatedNewAddress.sp};
    session.custom.updatedNewAddress = null;
    session.custom.updatedOldAddress = null;
    }
    if (session.custom.deletedAddress) {
    viewParams.deletedAddress = {"address": session.custom.deletedAddress.sp};
    session.custom.deletedAddress = null;
    }
    app.getView(viewParams).render('account/addressbook/addresslist');
   }
   

/**
 * Clears the profile form and renders the addressdetails template.
 */
function add() {
    app.getForm('profile').clear();

    app.getView({
        Action: 'add',
        ContinueURL: URLUtils.https('Address-Form')
    }).render('account/addressbook/addressdetails');
}

/**
 * Gets an AddressModel object. Gets the customeraddress form.
 * Handles the address form actions:
 *  - cancel and error - if the HTTPParameterMap format value is ajax, returns an error message,
 * otherwise redirects to the Address-List controller function.
 *  - create - if the address is valid, creates the address. If address creation fails, redirects to the Address-Add controller.
 *  - edit - if the address is valid, updates the address. If the address is invalid or the update fails, displays an error message.
 *  - remove - removes the address. If the address removal fails, displays an error message.
 */
function handleForm() {
    var Address;
    var success;
    var message;

    Address = app.getModel('Address');

    var addressForm = app.getForm('customeraddress');
    var addressHelper = require('int_subscribe_pro/cartridge/scripts/subpro/helpers/AddressHelper');

    addressForm.handleAction({
        cancel: function () {
            success = false;
        },
        create: function () {
            var newAddress;
            if (!session.forms.profile.address.valid || !(newAddress = Address.create(session.forms.profile.address))) {
                response.redirect(URLUtils.https('Address-Add'));
                success = false;
            }
            session.custom.newAddress = {
                "sfcc": newAddress,
                "sp": addressHelper.getSubproAddress(newAddress, session.customer.profile,false, true)
            };
            success = true;
        },
        edit: function () {
            if (!session.forms.profile.address.valid) {
            success = false;
            message = 'Form is invalid';
            }
            try {
            // We can't use Address.get() because it doesn't return a CustomerAddress object, and we need to be able to access
            // the 'custom' attributes on the address. Instead, we use the address book
            let addressBook = customer.profile.addressBook;
            var prevAddress = addressBook.getAddress(request.httpParameterMap.addressid.value);
            session.custom.updatedOldAddress = {
            "sfcc": prevAddress,
           "sp": addressHelper.getSubproAddress(prevAddress, session.customer.profile, true, true)
            };
            var updatedAddress = Address.update(request.httpParameterMap.addressid.value,  session.forms.profile.address);
            session.custom.updatedNewAddress = {
            "sfcc": updatedAddress,
           "sp": addressHelper.getSubproAddress(updatedAddress, session.customer.profile, true, true)
            };
            success = true;
            } catch (e) {
            success = false;
            message = e.message;
            }
            },
              
        error: function () {
            success = false;
        },
        remove: function () {
            // We can't use Address.get() because it doesn't return a CustomerAddress object, and we need to be able to access
            // the 'custom' attributes on the address. Instead, we use the address book
            let addressBook = customer.profile.addressBook;
            var deletedAddress = addressBook.getAddress(session.forms.profile.address.addressid.value);
            if (Address.remove(session.forms.profile.address.addressid.value)) {
                deletedAddress = null;
                success = false;
            }
            else {
                session.custom.deletedAddress = {
                    "sfcc": deletedAddress,
                    "sp": addressHelper.getSubproAddress(savedDeletedAddress, session.customer.profile, true, true)
                };
            }
        }
    });

    if (request.httpParameterMap.format.stringValue === 'ajax') {
        let r = require('~/cartridge/scripts/util/Response');

        r.renderJSON({
            success: success,
            message: message
        });
        return;
    }

    response.redirect(URLUtils.https('Address-List'));
}

/**
 * Clears the profile form and gets the addressBook for the current customer.
 * Copies address information from the stored customer profile into the profile form.
 * Renders the addressdetails form and passes the address information to the template.
 */
function edit() {
    var profileForm, addressBook, address;

    profileForm = session.forms.profile;
    app.getForm('profile').clear();

    // Gets address to be edited.
    addressBook = customer.profile.addressBook;
    address = addressBook.getAddress(request.httpParameterMap.AddressID.value);

    app.getForm(profileForm.address).copyFrom(address);
    app.getForm(profileForm.address.states).copyFrom(address);
    session.forms.profile.address.shippingEmail.value = address.custom.email;

    app.getView({
        Action: 'edit',
        ContinueURL: URLUtils.https('Address-Form'),
        Address: address
    }).render('account/addressbook/addressdetails');
}

/**
 * Gets the addressBook for the current customer. Gets an address from the addressBook based on the Address ID in the httpParameterMap.
 * Sets the default address. Redirects to the Address-List controller function.
 */
function setDefault() {
    var addressBook, address;

    addressBook = customer.profile.addressBook;
    address = addressBook.getAddress(request.httpParameterMap.AddressID.value);
    dw.system.Logger.warn("Address set default:"+address);

    Transaction.wrap(function () {
        dw.system.Logger.warn("Set default");
        addressBook.setPreferredAddress(address);
    });

    response.redirect(URLUtils.https('Address-List'));
}

/**
 * Gets the addressBook for the current customer Returns a customer address as a JSON response by rendering the
 * addressjson template. Required to fill address form with selected address from address book.
 */
function getAddressDetails() {
    var addressBook = customer.profile.addressBook;
    var address = addressBook.getAddress(request.httpParameterMap.addressID.value);

    app.getView({
        Address: address
    }).render('account/addressbook/addressjson');
}

/**
 * Removes an address based on the Address ID in the httpParameterMap. If the httpParameterMap format value is set to ajax,
 * redirects to the Address-List controller function. Otherwise, renders an error message.
 */
function Delete() {
    var CustomerStatusCodes = require('dw/customer/CustomerStatusCodes');
    
    var addressHelper = require('int_subscribe_pro/cartridge/scripts/subpro/helpers/AddressHelper');
    // We can't use Address.get() because it doesn't return a CustomerAddress object, and we need to be able to access
    // the 'custom' attributes on the address. Instead, we use the address book
    let addressBook = customer.profile.addressBook;
    var deletedAddress = addressBook.getAddress(request.httpParameterMap.AddressID.value);
    session.custom.deletedAddress = {
        "sfcc": deletedAddress,
        "sp": addressHelper.getSubproAddress(deletedAddress, session.customer.profile, true, true)
    };
    
    var deleteAddressResult = app.getModel('Address').remove(decodeURIComponent(request.httpParameterMap.AddressID.value));

    if (request.httpParameterMap.format.stringValue !== 'ajax') {
        response.redirect(URLUtils.https('Address-List'));
        return;
    }

    let r = require('~/cartridge/scripts/util/Response');

    r.renderJSON({
        status: deleteAddressResult ? 'OK' : CustomerStatusCodes.CUSTOMER_ADDRESS_REFERENCED_BY_PRODUCT_LIST,
        message: deleteAddressResult ? '' : Resource.msg('addressdetails.' + CustomerStatusCodes.CUSTOMER_ADDRESS_REFERENCED_BY_PRODUCT_LIST, 'account', null)
    });
}

function SetSPAddressID() {
    var addressBook = customer.getProfile().getAddressBook();
    var address = addressBook.getAddress(request.httpParameterMap.addressId.value);
    var addressHelper = require('/int_subscribe_pro/cartridge/scripts/subpro/helpers/AddressHelper');
    addressHelper.setSubproAddressID(address, request.httpParameterMap.spAddressId.value);
    let r = require('~/cartridge/scripts/util/Response');
    r.renderJSON({success: true});
}
/*
* Web exposed methods
*/
/** Sets Subscribe Pro Address ID on SFCC Address */
exports.SetSPAddressID = guard.ensure(['get', 'https', 'loggedIn'], SetSPAddressID);
/** Lists addresses in the customer profile.
 * @see {@link module:controllers/Address~list} */
exports.List = guard.ensure(['get', 'https', 'loggedIn'], list);
/** Renders a dialog for adding a new address to the address book.
 * @see {@link module:controllers/Address~add} */
exports.Add = guard.ensure(['get', 'https', 'loggedIn'], add);
/** Renders a dialog for editing an existing address.
 * @see {@link module:controllers/Address~edit} */
exports.Edit = guard.ensure(['get', 'https', 'loggedIn'], edit);
/** The address form handler.
 * @see {@link module:controllers/Address~handleForm} */
exports.Form = guard.ensure(['post', 'https', 'loggedIn', 'csrf'], handleForm);
/** Sets the default address for the customer address book.
 * @see {@link module:controllers/Address~setDefault} */
exports.SetDefault = guard.ensure(['get', 'https', 'loggedIn'], setDefault);
/** Sets the default address.
 * @see {@link module:controllers/Address~getAddressDetails} */
exports.GetAddressDetails = guard.ensure(['get', 'https', 'loggedIn'], getAddressDetails);
/** Deletes an existing address.
 * @see {@link module:controllers/Address~Delete} */
exports.Delete = guard.ensure(['https', 'loggedIn'], Delete);
