'use strict';

/**
 * Controller that renders the DoNotSell page.
 *
 * @module controllers/TermsOfUse
 */

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var meta = require('~/cartridge/scripts/meta');

/**
 * Renders the DoNotSell page.
 */
function show() {
    var rootFolder = require('dw/content/ContentMgr').getSiteLibrary().root;
    var Site = require('dw/system/Site');
    meta.update(rootFolder);
    meta.updatePageMetaTags(Site.current);
    
    app.getView().render('donotsell');
}


/*
 * Export the publicly available controller methods
 */
/** Renders the DoNotSell page.
 * @see module:controllers/DoNotSell~show */
exports.Show = guard.ensure(['get'], show);
