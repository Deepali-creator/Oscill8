'use strict';

/**
 * Controller that renders the TermsOfUse page.
 *
 * @module controllers/TermsOfUse
 */

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var meta = require('~/cartridge/scripts/meta');

/**
 * Renders the TermsOfUse page.
 */
function show() {
    var rootFolder = require('dw/content/ContentMgr').getSiteLibrary().root;
    var Site = require('dw/system/Site');
    meta.update(rootFolder);
    meta.updatePageMetaTags(Site.current);
    
    app.getView().render('termsofuse');
}


/*
 * Export the publicly available controller methods
 */
/** Renders the TermsOfUse page.
 * @see module:controllers/TermsOfUse~show */
exports.Show = guard.ensure(['get'], show);
