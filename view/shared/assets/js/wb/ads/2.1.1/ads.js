/**
 * @requires window.jQuery
 *
 * @fileOverview
 * Telepix banner ad manager. Inserts Google DFP premium ad tags into the calling page.
 *
 * Auto-discovery mode by default, set selector containing ad containers, attach data- attributes, and let
 * buildSlots() find all the ad containers.  Once slots are set up, a call to showAds() will tell google to queue the ads
 * in all discovered containers.  subsequent showAds() calls will queue ads from new containers, as well as any
 * which contain the data-refresh="true" attribute
 *
 * Programmatic mode (can be combined with auto-discovery mode) allows programmatic insertion of slots as well as
 * custom global targeting and targeting for existing/new slots.  subsequent calls to showAds() are still required
 * to update any created/modified slots
 *
 * @see <a href="https://support.google.com/dfp_premium/answer/1650154?hl=en">google's official documentation</a>
 *
 * @usage wbads.init( '4321', 'Mysite', 'Myzone', { debug_enabled: true }, { collapse_empty_divs: true, global_targeting: { category: "kids" } });
 *          ...discovery method...
 *     <insert empty divs in body where ads go, using class="[insert selector here]">
 *          ...and/or programmatic method...
 *          wbads.addSlot()
 *          wbads.addSlotTargeting()
 *          ...after all ads defined...
 *     wbads.buildSlots();
 *     wbads.showAds();
 */
/*** BEGIN REQUIRED GOOGLE DFP PREMIUM AD CODE ***/
if( typeof googletag === "undefined" ){
    var googletag = googletag || {};
    googletag.cmd = googletag.cmd || [];
    (function() {
        var gads = document.createElement('script');
        gads.async = true;
        gads.type = 'text/javascript';
        var useSSL = 'https:' == document.location.protocol;
        gads.src = (useSSL ? 'https:' : 'http:') + '//www.googletagservices.com/tag/js/gpt.js';
        var node = document.getElementsByTagName('script')[0];
        node.parentNode.insertBefore(gads, node);
    })();
}
/*** END REQUIRED GOOGLE DFP PREMIUM AD CODE ***/

/** used when quantcast enabled */
var _qevents = _qevents || [];

var wbads = (function($, window, document, undefined) {
    'use strict';

    var _this = Object.create({});
    var settings;
    var dfp_settings;

    /** @type {string} unit_name - calculated from <tt>required_params</tt> */
    var unit_name       = "",
        required_params = {
            site_id:       "",
            site_domain:   "",
            ad_zone:       "article"
        };

    var module_defaults  = {
        /** @type {boolean} enabled - if false, ads won't render */
        enabled:            true,
        debug_enabled:      false,
        device_view:        "main",
        selector:           "wbads",
        data_store:         "wbadsdata",
        evt_callbacks:      {
            "pre.init":             {},
            "post.init":            {},
            "pre.enable.services":  {},
            "post.enable.services": {},
            "pre.slot.discovery":   {},
            "post.slot.discovery":  {},
            "pre.slot.define":      {},
            "post.slot.define":     {},
            "pre.display.ads":      {},
            "post.display.ads":     {}
        },
        quantcast:          {
            enabled:                true,
            qacct:                  "p-21jBY4_vbHNJQ",
            segs:                   ""
        }
    };

    /** @type {object} dfp_options - page-wide options to pass to the google ad service */
    var dfp_defaults     = {
            collapse_empty_divs:        false,
            disable_initial_load:       false,  // If webpage has an auto-play video player, set this to true
            enable_single_request:      false,
            enable_async_rendering:     true,
            enable_video_ads:           false,
            no_fetch:                   false,
            disable_publisher_console:  false,
            category_exclusion:         [],     // array of categories
            /**
             * qcs : The format should be ['####', '####', '####', 'etc']
             * category : channel from cf
             * tag : hashtags from cf
             * url : the URL of the page after .com. eg ellentv.com/photos the url value should be ['/photos']
             * adtest : if "?adtest=keyword" appended to URL then pass ['keyword'] as value
             */
            global_targeting:           {
                qcs:                    {},
                category:               "",
                channel:                "", /** duplicate of category for consistency */
                tag:                    [],
                url:                    "",
                adtest:                 ""
            } /** todo: consider removing these explicit defs but they don't hurt */
    };

    /** @type {Array} tpixadslots - array of created local slot objects */
    var tpixadslots     = [],
        slot_count      = 0;

    /** @type {object}
     * todo: find out if adops even has device-specific size mappings
     */
    var ad_sizes_list = {
        main: {
            leaderboard: [[728,90]],
            leaderboard_flex: [[970,250],[970,66],[1010,150],[1010,250],[728,90]],
            medium_rectangle: [[300,250]],
            medium_rectangle_flex: [[300,250],[300,600]],
            skin: [[1,1]]
        },
        /**
         * todo: make responsive via google's sizeMapping()/defineSizeMapping()/addSize() methods
         */
        smartphone: {
            leaderboard: [[320,50]],
            leaderboard_flex: [[300,250],[320,50]],
            leaderboard_all: [[1,1],[300,250],[320,50],[320,360],[320, 480]],
            medium_rectangle: [[300,250]],
            medium_rectangle_flex: [[300,250],[300,600]],
            skin: [[1,1]]
        }
    };

    /**
     * @constructor
     * locally stored slot object instance
     */
    function Slot(id,gptslot) {
        this.div_id             = id;
        this.gpt_slot_object    = gptslot;   /** the googletag slot object */
        this.slot_data = {
            tile:               "",
            size_list:          "",
            size_nickname:      "",
            interstitial:       false,
            refresh:            false,
            /**
             * eg. { "interests": ["sports", "music", "movies"], "pos": ["atf"], "age": "20-30"] }
             * then eg. slot1.setTargeting( "pos", ["atf"] ).setTargeting( "age", "20-30" );
             */
            slot_targeting:     [],
            /**
             * eg.  addSize( [browser-size], [[ad-size1],..,[ad-sizeN]] )...
             *   var mapping = googletag.sizeMapping().
             *   addSize([1024, 768], [970, 250]).  // desktop
             *   addSize([980, 690], [728, 90]).    // ipad
             *   addSize([640, 480], [120, 60]).    // mobile
             *   addSize([0, 0], [88, 31]).         // Fits browsers of any size smaller than 640 x 480
             *   build();
             *   adSlot.defineSizeMapping(mapping);
             */
            responsive_size_map: {

            },
            /**
             * values for AdSense parameters on a particular ad slot.
             * These will override any values set at the service level for this key.
             * All values must be set before any display call.
             * eg. slot.set("adsense_background_color", "#FFFFFF");
             * @see {@link https://support.google.com/dfp_premium/answer/1650154?expand=pubservice_details#set} for full list
             */
            adsense_params:     {

            }
        };
    }

    /**
     * Stores values for targeting keys and slot parameters on a particular ad slot.
     * these will be applied when the slot is processed and added to google pubads service
     * @param key
     * @param value
     */
    Slot.prototype.setTargetingParam = function(key, value) {
//        debug("setTargetingParam :: setting param[" + key + "] = " + value + "...");

        /** todo: validate key/value before continuing */

        /** todo: change to key as index */
        /** without checking existence this.slot_data.slot_targeting[key] = value ("set" means overwrite if exists) */

        this.slot_data.slot_targeting[key] = value;
        debug("setTargetingParam :: ...slot_targeting[" + key + "] set to " + this.slot_data.slot_targeting[key]);

        return this;
    };

    /**
     * define and attach the responsive size map
     * @param browserSize
     * @param adSizeList
     */
    Slot.prototype.addSlotSizeMapping = function(browserSize, adSizeList) {

        /** todo: set responsive size mapping  */

    };

    /**
     *  todo consider supporting any helpful SLOT-specific methods such as...
     *  addService(service)
     *  Adds the ad slot to the specified Google tag service.
     *
     *  clearTargeting()
     *  Clears all slot-level targeting for a particular ad slot.
     *
     *  set(key, value)
     *  Sets values for AdSense parameters on a particular ad slot.
     *
     *  setClickUrl(url)
     *  Sets the redirect URL for a click on an ad in a particular slot. The DoubleClick servers still record a click even if the click URL is replaced, but any landing page URL associated with the creative that is served is overridden.
     *
     *  setCollapseEmptyDiv(collapse, collapseBeforeAdFetch [optional])
     *  Specifies a slot-specific override to the page-wide div collapse behavior that was specified through pubService.collapseEmptyDivs().
     *
     *  setTargeting(key, value)
     *  Sets values for targeting keys on a particular ad slot.
     */


    /*
     * sets up the config object. (to be called explicitly from the page ie wbads.init('8310','Ellen','Homepage') )
     * @param {string} site_id a code provided by AdOps representing the site / partner
     * @param {string} site_domain a code provided by AdOps representing the specific site subdomain
     * @param {string} ad_zone a code representing the current page section NOTE: 1st 3 required_params will be combined to form a unit_name
     * @param {object} options module-specific settings, default-overrides
     * @param {object} dfp_options googledfp-specific settings, default-overrides
     * eg like... init("55123377", "ellen", "home", { debug_enabled: true }, {} )
     *
     */
    function init(site_id, site_domain, ad_zone, options, dfp_options) {
        settings = $.extend({}, module_defaults, options);
        dfp_settings = $.extend({}, dfp_defaults, dfp_options);

        /** if req'd params invalid or missing, or if !settings.enabled, nothing can happen */
        /** these parameters combined form the networkId */
        /** todo: optimize combine 3 calls with && */
        settings.enabled = setRequiredParam("site_id", site_id);
        settings.enabled = setRequiredParam("site_domain", site_domain);
        settings.enabled = setRequiredParam("ad_zone", ad_zone);
        unit_name = "/" + getRequiredParam("site_id") + "/" + getRequiredParam("site_domain") + "/" + getRequiredParam("ad_zone");

        if(!settings.enabled) {
            debug("init :: ads disabled. no ad slots will be created or displayed");
            return;
        }

        /** bind any passed-in/default callbacks before any events can fire */
        $.each(settings.evt_callbacks, function(name, func) {
            if( !$.isFunction(func) ) {
                debug("init :: no predefined callback for " + name);
                return;
            }
            debug("init :: binding predefined callback for " + name + "...");
            defineCallback(name, func);
        });

        trigger("pre.init");
        /** note: set quantcast (qcs) prior to processing globalTargetingParams */
        if( settings.quantcast.enabled ) {
            //embedQuantCastDeliveryTag();
            embedQuantCastMeasurementTag();
        }
        getGlobalTargetingParams(); /** todo: move this to callback for onBeforeInit */

        /** todo: move this to function set global options (including targting options) */
        /** pass global options to google object */
        googletag.cmd.push( function() {
            /** todo: consider moving all but enableServices to the onBeforeInit callback */
            if( dfp_settings.collapse_empty_divs ) googletag.pubads().collapseEmptyDivs();
            if( dfp_settings.disable_initial_load ) googletag.pubads().disableInitialLoad();
            if( dfp_settings.enable_single_request ) googletag.pubads().enableSingleRequest();
            /** async is the default, but it doesn't hurt to set explicitly here */
            if( dfp_settings.enable_async_rendering ) googletag.pubads().enableAsyncRendering();
            if( dfp_settings.enable_video_ads ) googletag.pubads().enableVideoAds();
            /** noFetch processes the JavaScript but does not make any HTTP calls for ad slot contents. */
            if( dfp_settings.no_fetch ) googletag.pubads().noFetch();
            /** Disables the Google Publisher Console */
            if( dfp_settings.disable_publisher_console ) googletag.pubads().disablePublisherConsole();

            /** pass valid global targeting options thru */
            $.each(dfp_settings.global_targeting, function( key, value ) {
                if( value && value != '' ) {
                    googletag.pubads().setTargeting(key, value);
                    debug("init :: setting global param[" + key + "]=" + value);
                }
            });

            /** todo: add support for category exclusion */

            trigger("pre.enable.services");
            googletag.enableServices();
            trigger("post.enable.services");
        });
        trigger("post.init");
    }

    /**
     * programmatically add callback binding
     * @param {string} eventRef - must be a predefined EVENT or CALLBACK nickname {eg pre.init or onBeforeInit}
     * @param {string} eventBinding - must be a valid function
     */
    function defineCallback( eventRef, eventBinding ) {
        var eventName = eventRef;

        if($.isFunction(eventBinding)) {
            bind(eventName, eventBinding);
        } else {
            debug("defineCallback :: " + eventBinding + " must be a valid function...ABORTING");
        }
    }

    /**
     * Sets values for DFP options that apply globally
     * IMPORTANT NOTE: these must be set prior to enableServices
     * @param {string} option - the option to turn on or off
     * @param {boolean} enabled - true or false
     * */
    function setGlobalOption( option, enabled ) {
        if (typeof dfp_settings === "undefined") {
            defineCallback("pre.init", function(){ setGlobalOption( option, enabled ); });
            return;
        }

        /** only allow from preset list at this time */
        if( typeof dfp_settings[option] !== 'undefined' ) {
            dfp_settings[option] = enabled;
            debug("setGlobalOption :: " + option + " set to: " + dfp_settings[option]);
        } else {
            debug("setGlobalOption :: No such option: " + option + " ...ABORTING! ");
        }
    }

    /**
     * Sets values for targeting keys that apply to all pubService ad slots.
     * IMPORTANT NOTE: these must be set prior to wbads.init()
     */
    function setGlobalTargetingParam( param, value ) {
        if (typeof dfp_settings === "undefined") {
            defineCallback("pre.init", function(){ setGlobalTargetingParam( param, value ); });
            return;
        }
        dfp_settings.global_targeting[param] = value;
        debug("setGlobalTargetingParam :: param " + param + " set to: " + dfp_settings.global_targeting[param]);
    }

    /**
     * use local methods to determine each optional global param
     */
    function getGlobalTargetingParams() {
        debug("getGlobalTargetingParams :: begin...");

        dfp_settings.global_targeting["url"] = getUriPaths();
        dfp_settings.global_targeting["qcs"] = getQCSegs();
        /** info: this is because adops uses a different terminology than we do, storing both doesn't hurt */
        dfp_settings.global_targeting["category"] = dfp_settings.global_targeting["channel"] = getChannel();
        getHashtags();
        dfp_settings.global_targeting["adtest"] = getParamFromUri("adtest");

        debug("getGlobalTargetingParams :: ...done");
    }

    /**
     * auto-discover all potential slots via the selector, and call defineNewAdSlot on each candidate
     * NOTE: this is not called by init, must be kicked off explicitly by calling page
     */
    function buildSlots() {
        trigger("pre.slot.discovery");

        if(!settings.enabled) {
            debug("buildSlots :: ads disabled. no ad slots will be created or displayed");
            return;
        }

        debug("buildSlots :: ad container discovery...");
        /** find all wbads ad containers on the page */
        var dfpContainersCount =  0;
        $("."+settings.selector).each( function(ac) {
            dfpContainersCount++;
            var adDiv = $(this);
            defineNewAdSlot(adDiv, null, null, false, false);
        });
        debug("buildSlots :: ...WBADS ad container discovery found and created " + dfpContainersCount + " ads");
        trigger("post.slot.discovery");
    }

    /**
     * create a new slot sometime after (or in lieu of) buildSlots()
     * supports js programmatic slot building and populating
     * @param {string} divId div ID of existing ad container to convert to ad slot
     * @param {string} sizeType [optional] - nickname for preset size
     * @param {string} sizeList [optional] - explicit comma-separated WxH pairs eg. "300x250,320x50"
     * @param {boolean} interstitial [optional] - true if this is out-of-page slot
     * @param {boolean} refresh [optional] - true if this slot repopulates with each call to showAds()
     * @returns {boolean} successful add
     */
    function addSlot(divId, sizeType, sizeList, interstitial, refresh) {
        if(!settings.enabled) {
            debug("addSlot :: ads disabled. no ad slots will be created or displayed");
            return false;
        }

        /** find ad container on the page and extract data */
        var adDiv = $('#'+divId);
        if( null === adDiv ) {
            debug("addSlot :: no adDiv exists! ABORTING.");
            return false;
        }
        defineNewAdSlot(adDiv, sizeType, sizeList, interstitial, refresh);

        debug("addSlot :: googletag slot[" + divId + "] added");
        return true;
    }

    /**
     * Sets values for targeting keys that apply to a SPECIFIC ad slot.
     * NOTE: must be called prior to any display commands
     * @param {string} slotDivId - the DOM id of the slot to update (eg. "dfp-wbad-1")
     * @param {string} param - the param to set
     * @param {string} value - the value to set for the given param
     * @returns {boolean} success/fail of finding slot and setting param
     */
    function setSlotTargetingParam( slotDivId, param, value ) {
        debug("setSlotTargetingParam :: setting slot[" + slotDivId + "] param " + param + " to: " + value);
        /** @type {Object} */
        var localSlot = getSlotById(slotDivId);

        if( !localSlot ) {
            debug("setSlotTargetingParam :: slot[" + slotDivId + "] does not exist...ABORTING");
            return false;
        }

        localSlot.setTargetingParam(param, value);
        debug("setSlotTargetingParam :: SUCCESS - slot[" + slotDivId + "]." + param + "=" + localSlot.slot_data.slot_targeting[param]);
        return true;
    }

    /**
     * @param {string} adDiv div ID of container
     * @param {string} sizeType [optional] - nickname for preset size
     * @param {string} sizeList [optional] - explicit comma-separated WxH pairs eg. "300x250,320x50"
     * @param {boolean} interstitial [optional] - true if this is an out-of-page slot
     * @param {boolean} refresh
     * @returns {boolean} successful create
     */
    function defineNewAdSlot(adDiv, sizeType, sizeList, interstitial, refresh) {
        if( null === adDiv ) {
            debug("defineNewAdSlot :: no adDiv exists! ABORTING.");
            return false;
        }

        /** actual slot definition is queued.
         * _required_ data is stored now {id, sizing, interstitial}
         */
        trigger("pre.slot.define");
        googletag.cmd.push(function() {
            var newAdSlot;
            var existingAdData = adDiv.data(settings.data_store);
            var divId = generateId(adDiv);
            var slotUnit = unit_name;
            if( existingAdData ) {
                debug("defineNewAdSlot :: updating existing slot with id:" + divId);
                newAdSlot = existingAdData;
            } else {
//                debug("defineNewAdSlot :: creating new slot with id:" + divId);

                /**
                 * get an index into the adsizes map
                 * but allow for adHoc override via size arg
                 */
                var adSizeType = sizeType || adDiv.data('adsize');
                var adSizeList = sizeList || adDiv.data('adsize-list');
                var isInterstitial = (interstitial ? true : adDiv.data('interstitial')) || false;
                if( adSizeType == 'skin' ) {
                    slotUnit += '/skin';
                }
                var refreshable = (refresh ? true : adDiv.data('refresh')) || false;
                debug("defineNewAdSlot :: type:" + adSizeType + ", list:" + adSizeList + ", interstitial:" + isInterstitial + ", refreshable:" + refreshable );

                /**
                 * out-of-page slots have no size
                 */
                if( !isInterstitial ) {
                    var dfpAdSizes;
                    if( adSizeList ) {
                        debug("defineNewAdSlot :: using adhoc size:" + adSizeList );
                        dfpAdSizes = getSizesFromString(adSizeList);
                    } else if( adSizeType && ad_sizes_list[settings.device_view][adSizeType]) {
                        dfpAdSizes = ad_sizes_list[settings.device_view][adSizeType];
                        debug("defineNewAdSlot :: using sizetype:" + adSizeType );
                    } else {
                        debug("defineNewAdSlot :: NO VALID SIZES FOUND. will expand to element size by default");
                    }
                    newAdSlot = googletag.defineSlot(slotUnit, dfpAdSizes, divId).addService(googletag.pubads());
                    if( dfp_settings.enable_single_request ) {
                        adDiv.data('unfilled', true);
                        defineCallback( "pre.display.ads", function() {
                            if( !adDiv.data('registered') ) {
                                googletag.cmd.push( function() {
                                    googletag.display(divId); // just register the slot in non SRA mode
                                    adDiv.data('registered', true);
                                    debug("defineNewAdSlot :: pushing " + divId + " SRA display to cmd queue");
                                });
                            }
                        });
                    }
                    debug("defineNewAdSlot :: googletag slot[" + divId + "] defined");
                } else {
                    /** can be an array OR assigned value, so support 'contains' style check */
                    if( adDiv.data('pos').indexOf('prestitial') != -1 ) {
                        slotUnit += '/prestitial';
                    } else {
                        slotUnit += '/interstitial';
                    }
                    /** note: these out-of-page slots have no size, but take up block-space if empty, so force collapse */
                    newAdSlot = googletag.defineOutOfPageSlot(slotUnit, divId).addService(googletag.pubads()).setCollapseEmptyDiv(true);
                    if( dfp_settings.enable_single_request ) {
                        adDiv.data('unfilled', true);
                        defineCallback( "pre.display.ads", function() {
                            if( !adDiv.data('registered') ) {
                                googletag.cmd.push( function() {
                                    googletag.display(divId); // just register the slot in non SRA mode
                                    adDiv.data('registered', true);
                                    debug("defineNewAdSlot :: pushing OutOfPageSlot " + divId + " SRA display to cmd queue");
                                });
                            }
                        });
                    }
                    debug("defineNewAdSlot :: googletag out-of-page slot[" + divId + "] defined");

                    /** update the DOM element data with programmatic option */
                    adDiv.data('interstitial', true);
                }

                /** update the DOM element data with programmatic option */
                if( refreshable ) {
                    adDiv.data('refresh', true);
                    debug("defineNewAdSlot :: this slot will REFRESH with each showAds()")
                }

                /** store new object using divId as indexable id where it can be further modified */
                tpixadslots[divId] = new Slot(divId, newAdSlot);
            }

            /** @type {object} get the tpixadslot in context in case of existing slot */
            var localSlot = getSlotById(divId);

            /** todo: if localSlot doesn't exist, skip further slot stuff */
            /** todo: set adSlot options on BOTH tpix and gpt objects */
            /** todo: METHOD A: DISCOVERY set directly on both tpix and gpt or consolidate */
            /** todo: METHOD B: PROGRAMMATIC (set directly on tpix and pass thru to its gpt) */

            /** local slot object: discovery */
            if( adDiv.data('pos') != null ) {
                localSlot.setTargetingParam("pos", adDiv.data('pos') );
            }
            /** todo: add all targeting params to google slot object USE EVENT */
            if( localSlot.slot_data.slot_targeting.pos ) newAdSlot.setTargeting("pos", localSlot.slot_data.slot_targeting.pos);

            /**
             * todo: set additional adSlot options (on both local slot object and actual google slot)
             * ...something like...
             *
             * $.each(slot_options, function (k, v) {
             *  googletag.pubads().setTargeting(k, v);
             * });
             *
             */

            /** Store/update slot reference */
            adDiv.data(settings.data_store, newAdSlot);
        });
        trigger("post.slot.define");

        debug("defineNewAdSlot :: adslot[" + adDiv.attr('id') + "] pushed to google cmd queue");
        return true;
    }

    /**
     * return a single slot reference for modification/custom targeting
     * NOTE: modifications must be called prior to showAds()
     * yes this function is quite trivial now. todo: skip it and handle inline
     * @param {string} id
     * @returns {object}
     */
    function getSlotById(id) {
//        debug("getting locally stored adSlot object with id: " + id );

        if(tpixadslots[id]) {
//            debug("getSlotById :: found:" + tpixadslots[id].div_id);
            return tpixadslots[id];
        }

        debug("getSlotById :: local slot[" + id + "] not found.. ABORTING");
        return null;
    }

    /**
     * display an ad in all defined slots. if refreshable, update slot with a new ad
     * called to tell Google that it's time to put ads in the slots which have already been placed on the page
     */
    function showAds() {
        trigger("pre.display.ads");

        $("."+settings.selector).each( function() {
            var adDiv = $(this);
            var adSlotData = adDiv.data(settings.data_store);
            var refreshable = adDiv.data('refresh') || false;
            var unfilled = adDiv.data('unfilled') || false;
            var filled = adDiv.data('filled') || false;
            var registered = adDiv.data('registered');

            if(dfp_settings.enable_single_request) {
                if(refreshable) {
                    googletag.cmd.push(function () { window.googletag.pubads().refresh([adSlotData]); });
                    debug("showAds :: refreshing ad " + adDiv.id )
                } else if( unfilled /* && adSlotData*/ ) {
                    googletag.cmd.push(function() { googletag.pubads().refresh([adSlotData]); });
                    debug("showAds :: filling unfilled ad " + adDiv.attr('id') );
                    adDiv.data('unfilled',false);
                }
            } else {
                if(refreshable) {
                    if(!registered){
                        googletag.cmd.push( function() {
                            googletag.display(adDiv.attr('id')); // just register the refreshable slot
                            wbads.debug("registering refreshable ad " + adDiv.attr('id') );
                            adDiv.data('registered', true);
                        });
                    }
                    googletag.cmd.push(function () { window.googletag.pubads().refresh([adSlotData]); });
                    debug("showAds :: refreshing ad " + adDiv.id )
                } else if (!filled) {
                    googletag.cmd.push(function() { googletag.display(adDiv.attr('id')); });
                    debug("showAds :: displaying ad " + adDiv.attr('id') + " for the first and only time!");
                    adDiv.data('filled',true);
                } else {
                    debug("showAds :: nonrefreshing ad " + adDiv.attr('id') + " already displayed..skipping.");
                }
            }
        });
        trigger("post.display.ads");
    }

    /**
     * generates a unique id for the container element
     * that the ad will be written into.
     * @param {object} element the element to update
     * @returns {string} the element's id
     */
    function generateId(element) {
        slot_count++;

        if(element !== null && element.attr('id')) {
            debug("generateId :: using existing id : " + element.attr('id'));
            return element.attr('id');
        }

        // else generate a unique id and attach to element
        var id = "dfpAd-" + getRequiredParam("site_domain") + "-" + slot_count;
        element.attr('id', id );
//        debug("generateId :: creating unique id : " + id);

        return id;
    }

    /**
     * param name will be false if it fails
     * to clean up.
     * @param {string} param the param name to clean up
     * @returns {string} the cleaned up param
     */
    function cleanParamName(param) {
        param = trim(param.toLowerCase());
        param = param.replace(/[^a-z0-9_]/g, '');
        var param_regex = /^[a-z_][a-z0-9_]{1,20}$/;
        if (!param_regex.test(param)) {
            debug("_cleanParamName :: invalid param name: " + param);
            return "";
        }
        return param;
    }

    /**
     * sets a param.  returns true if that
     * param was set, false otherwise
     * @param {string} param the param to set
     * @param {string|object|boolean|number} val the value to assign
     * @returns {boolean} success or fail of the set
     */
    function setRequiredParam(param, val) {
        param = cleanParamName(param);
        if (!param) return false;

        required_params[param] = val || false;
        if (typeof(required_params[param]) == "string")
            required_params[param] = trim(required_params[param]);
//        debug("setRequiredParam :: param " + param + " set to: " + required_params[param]);
        return true;
    }

    /**
     * gets a param value.  note that false
     * will be returned if it's not a valid
     * param name or if the param isn't set.
     * @param {string} param
     * @returns {string|object|boolean|number} value of the passed param or false
     */
    function getRequiredParam(param) {
        param = cleanParamName(param);
        if (!param) return false;
        return (required_params[param] || false);
    }

    /**
     * override default selector class for finding ad container divs
     * NOTE: do NOT include the preceding "." so "div" not ".div"
     * @param {string} classname
     */
    function setSelector(classname) {
        if (typeof settings === "undefined") {
            defineCallback("pre.slot.discovery", function(){ setSelector(classname); });
            return;
        }
        if( null !== classname && "" != classname ) {
            // trim preceding "." if present
            // or classname = classname.replace(/^\./,"");
            if( classname.charAt(0) === '.' ) classname = classname.substr(1);
            settings.selector = classname;
        }
    }

    /**
     * enables/disables ads
     * @param {boolean} showAds
     */
    function setEnabled(showAds) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setEnabled(showAds); });
            return;
        }
        settings.enabled = showAds || false;
        debug("setEnabled :: ads enabled : " + settings.enabled);
    }

    /**
     * set the device
     * @param {string} device
     */
    function setDeviceView(device) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setDeviceView(device); });
            return;
        }
        settings.device_view = device || "main";
        debug("setDeviceView :: device_view set to : " + settings.device_view);
    }

    /**
     * enables/disables debugging
     * @param {boolean} enabled
     */
    function setDebug(enabled) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setDebug(enabled); });
            return;
        }
        settings.debug_enabled = enabled || false;
    }

    /**
     * simple little debugger, writes message <tt>msg</tt>
     * to console when enabled
     * @param {string} msg The string to display in the console
     */
    function debug(msg) {
        if (typeof settings === "undefined" || !settings.debug_enabled) return;
        if (window.console && typeof console.log != "undefined")
            console.log("[WBADS] " + msg);
    }

    /**
     * trims the white space from the
     * start and end of a string <tt>str</tt>
     * @param {string} str The string to trim
     * @returns {string}
     */
    function trim(str) {
        return str.replace(/^\s+|\s+$/g, "");
    }

    /**
     * gets param from a uri.  format should be
     * something like url.ext?var=val;var2=val2
     * @param {string} param - the var to get from the key-value pairs
     * @returns {string} value of query string param detected from Uri
     */
    function getParamFromUri(param) {
        var value = decodeURI(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURI(param).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
        debug("getParamFromUri :: param " + param + (value ? " found with value: " + value : " not found"));
        return value;
    }

    /**
     * Get list of width,height pairs from string
     * @param  {string} str
     * @return {Object[]}
     */
    function getSizesFromString( str ) {
        var sizes = [];

        if( str.length ) {
            var pairs = str.split(',');
            $.each(pairs, function (key, value) {
                var currentSize = value.split('x');
                sizes.push([parseInt(currentSize[0], 10), parseInt(currentSize[1], 10)]);
                debug("getSizesFromString :: adding SIZE=[" + currentSize[0] + "," + currentSize[1] + "]");
            });
        } else {
            debug("getSizesFromString :: NO VALID SIZES FOUND. will expand to element size by default");
        }

        return sizes;
    }

    /**
     * gets the full uri after the base not including search nor hash
     * @returns {string}
     */
    function getUriPaths() {
        var paths = window.location.pathname.replace(/\/$/, '');
        debug("getUriPaths :: found paths:" + paths);

        return paths;
    }

    /**
     * enables/disables QuantCast
     */
    function setQuantcast(enabled) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setQuantcast(enabled); });
            return;
        }
        settings.quantcast.enabled = enabled || false;
    }


    /**
     * embeds the Quantcast measurement tag (footer)
     * if quantcast is enabled.
     */
    function embedQuantCastMeasurementTag() {
        if (!settings.quantcast.enabled) return;

        var elem = document.createElement('script');
        elem.src = (document.location.protocol == "https:" ? "https://secure" : "http://edge") + ".quantserve.com/quant.js";
        elem.async = true;
        elem.type = "text/javascript";
        var scpt = document.getElementsByTagName('script')[0];
        scpt.parentNode.insertBefore(elem, scpt);

        _qevents.push({
            qacct: settings.quantcast.qacct
        });
    }

    /**
     * quantcast specific functions/variables.
     */
    function _quantgc(n) {
        var c=document.cookie;if(!c)return '';
        var i=c.indexOf(n+"=");if(-1==i)return '';
        var len=i+n.length+1;
        var end=c.indexOf(";", len);
        return c.substring(len,end<0?c.length:end);
    }

    /**
     * gets the quantcast segments and returns them as array
     * @returns {string}
     */
    function getQCSegs() {
        if (!settings.quantcast.enabled) return "";
        if (settings.quantcast.segs != "")
            return settings.quantcast.segs;
        //var segs = "";
        var segs = [];
        var _qsegs = _quantgc("__qseg").split("|");
        for (var i=0; i < _qsegs.length;i++) {
            var qArr = _qsegs[i].split("_");
            //if (qArr.length > 1)
                //segs += ";qcseg=" + qArr[1];
            segs.push(qArr[1]);
        }
        settings.quantcast.segs = segs;
        debug("getQCSegs :: found segs:" + settings.quantcast.segs);

        return settings.quantcast.segs;
    }

    /**
     * gets the channel (currently passed as "category" for AdOps)
     * @returns {string}
     */
    function getChannel() {
        var channel = "";

        /** todo: get channel */
        debug("getChannel :: found channel:" + channel);

        return channel;
    }

    /**
     * gets the hashtags (currently passed as "tag" for AdOps)
     */
    function getHashtags() {
        var hashtags = [];

        /** todo: get hashtags automagically? or just allow via setGlobalTargeting/init dfp_settings */
        /*if( dfp_settings.global_targeting["tag"] != "" ) {

        } else {

        }
        */
        debug("getHashtags :: found hashtags:" + dfp_settings.global_targeting["tag"]);
    }

    /** bind general wbads events to specified trigger
     * @param {string} trigger
     * @param {object} func
     */
    function bind(trigger, func) {
        debug("bind :: binding callback " + func + " to event " + trigger + ".wbads");
        $(_this).bind(trigger + ".wbads", func);
    }

    /** announce general wbads events
     * @param {string} trigger
     */
    function trigger(trigger) {
        debug("trigger :: " + trigger + ".wbads");
        $(_this).trigger(trigger + ".wbads", _this);
    }

    /**
     * add privileged methods
     */
    _this.setDebug = setDebug;
    _this.setEnabled = setEnabled;
    _this.setSelector = setSelector;
    _this.setGlobalOption = setGlobalOption;
    _this.setGlobalTargetingParam = setGlobalTargetingParam;
    _this.setQuantcast = setQuantcast;
    _this.addSlot = addSlot;
    _this.getSlotById = getSlotById;
    _this.setSlotTargetingParam = setSlotTargetingParam;
    _this.defineCallback = defineCallback;
    _this.debug = debug;
    _this.showAds = showAds;
    _this.buildSlots = buildSlots;
    _this.init = init;

    return _this;
})(window.jQuery, window, document);

