'use strict';

/**
 * Controller that renders the PrivacyPolicy page.
 *
 * @module controllers/PrivacyPolicy
 */

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var meta = require('~/cartridge/scripts/meta');

/**
 * Renders the PrivacyPolicy page.
 */
function show() {
    var rootFolder = require('dw/content/ContentMgr').getSiteLibrary().root;
    var Site = require('dw/system/Site');
    meta.update(rootFolder);
    meta.updatePageMetaTags(Site.current);
    
    app.getView().render('privacypolicy');
}


/*
 * Export the publicly available controller methods
 */
/** Renders the PrivacyPolicy page.
 * @see module:controllers/PrivacyPolicy~show */
exports.Show = guard.ensure(['get'], show);
