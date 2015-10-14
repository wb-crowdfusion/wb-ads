/*
Generalized ad placement script for  all of the tpix websites.

note: script doesn't require any other libraries
like jquery, prototype, etc.
*/

var tpixAdConfig = {
    ad_count: 0,
    ord: "", // set once per page, mutant random string
    debug_enabled: false,
    enabled: true, // if false ads won't render
    ad_server: "",
    params: {
        siteid: "",
        adzone: ""
    },
    quantcast: {
        enabled: false,
        segs: ""
    },
    rsi: {
        enabled: false,
        segs: ""
    },
    default_tiles: {
        ad_728x90:  1,
        ad_160x600: 2,
        ad_300x250: 3,
        ad_300x70:  7,
        ad_88x31:   8
    },

    /*
     * sets up the config object.
     *
     */
    init: function(site_id, ad_zone, debug_mode) {
        this.ord = Math.ceil(1+1E12*Math.random());
        this.setParam("siteId", site_id);
        this.setParam("adZone", ad_zone);
        this.setDebug(debug_mode);
        if (this.isSSL()) {
            this.ad_server = "https://ad.doubleclick.net/";
        } else {
            this.ad_server = "http://ad.doubleclick.net/";
        }
    },

    /*
     * param name will be false if it fails
     * to clean up.
     *
     */
    cleanParamName: function(param) {
        param = this.trim(param.toLowerCase());
        param = param.replace(/[^a-z0-9_]/g, '');
        var param_regex = /^[a-z_][a-z0-9_]{1,20}$/;
        if (!param_regex.test(param)) {
            this.debug("invalid param name: " + param);
            return false;
        }
        return param;
    },

    /*
     * sets a param.  returns true if that
     * param was set, false otherwise
     *
     */
    setParam: function(param, val) {
        param = this.cleanParamName(param);
        if (!param) return false;
        this.debug("setParam: " + param);
        this.params[param] = val || false;
        if (typeof(this.params[param]) == "string")
            this.params[param] = this.trim(this.params[param]);
        this.debug("param " + param + " set to: " + this.params[param]);
        return true;
    },

    /*
     * gets a param value.  note that false
     * will be returned if it's not a valid
     * param name or if the param isn't set.
     *
     */
    getParam: function(param) {
        param = this.cleanParamName(param);
        if (!param) return false;
        return (this.params[param] || false);
    },

    /*
     * enables/disables QuantCast
     *
     */
    setQuantcast: function(enabled) {
        this.quantcast.enabled = enabled || false;
		this.embedQuantCastDeliveryTag();
    },

    /*
     * embeds the Quantcast delivery tag (html head)
     * if quantcast is enabled.
     *
     */
    embedQuantCastDeliveryTag: function() {
        if (!this.quantcast.enabled) return;
        document.write('<scr' + 'ipt src="//pixel.quantserve.com/seg/' + _qoptions.qacct + '.js" type="text/javascript"></scr' + 'ipt>');
    },

    /*
     * embeds the Quantcast measurement tag (footer)
     * if quantcast is enabled.
     *
     */
    embedQuantCastMeasurementTag: function() {
        if (!this.quantcast.enabled) return;
        document.write('<scr' + 'ipt src="//edge.quantserve.com/quant.js" type="text/javascript"></scr' + 'ipt>');
    },

    /*
     * returns the quant cast params if they
     * are to be used.
     *
     */
    getQuantCastSegs: function () {
        if (!this.quantcast.enabled) return "";
        if (this.quantcast.segs != "")
            return this.quantcast.segs;
        var segs = "";
        var _qsegs = _quantgc("__qseg").split("|");
        for (var i=0; i < _qsegs.length;i++) {
            var qArr = _qsegs[i].split("_");
            if (qArr.length > 1)
                segs += ";qcseg=" + qArr[1];
        }
        this.quantcast.segs = segs;
        return this.quantcast.segs;
    },

    /*
     * enables/disables AudienceScience (revsci/rsi)
     *
     */
    setAudienceScience: function(enabled) {
        this.rsi.enabled = enabled || false;
    },

    /*
     * returns the AudienceScience params if they
     * are to be used.
     *
     */
    getAudienceScienceSegs: function () {
        if (!this.rsi.enabled) return "";
        if (this.rsi.segs != "")
            return this.rsi.segs;
		var rsi_segs = [];
		var segs_beg=document.cookie.indexOf('rsi_segs=');
		if (segs_beg>=0){
			segs_beg=document.cookie.indexOf('=',segs_beg)+1;
			if(segs_beg>0){
				var segs_end=document.cookie.indexOf(';',segs_beg);
				if(segs_end==-1) segs_end=document.cookie.length;
					rsi_segs=document.cookie.substring(segs_beg,segs_end).split('|');
			}
		}
		var segLen=20;
		var segQS="";
		if (rsi_segs.length<segLen){segLen=rsi_segs.length}
		for (var i=0;i<segLen;i++){
			segQS+=(";asi"+"="+rsi_segs[i])
		}
		this.rsi.segs = segQS;
        return this.rsi.segs;
    },

    /*
     * embeds the AudienceScience pixel tag
     * if rsi is enabled.
     *
     */
    embedAudienceSciencePixelTag: function() {
        if (!this.rsi.enabled) return;
		document.write('<scr' + 'ipt>function DM_prepClient(csid,client){client.DM_addEncToLoc("zone","' + this.getParam("adzone") + '");}</scr' + 'ipt>');
		document.write('<scr' + 'ipt src="//js.revsci.net/gateway/gw.js?csid=' + _rsioptions.csid + '&auto=t" type="text/javascript"></scr' + 'ipt>');
    },

    /*
     * enables/disables ads
     *
     */
    setEnabled: function(enabled) {
        this.enabled = enabled || false;
    },

	/*
     * enables/disables debugging
     *
     */
    setDebug: function(enabled) {
        this.debug_enabled = enabled || false;
    },

    /*
     * simple little debugger, writes message
     * to console when enabled
     *
     */
    debug: function(msg) {
        if (!this.debug_enabled) return;
        if (window.console && typeof console.log != "undefined")
            console.log("TPIX ADS: " + msg);
    },

    /*
     * trims the white space from the
     * start and end of a string
     *
     */
    trim: function(str) {
        return str.replace(/^\s+|\s+$/g, "");
    },

    /*
     * determines if the site is on an ssl
     * connection.
     *
     */
    isSSL: function() {
        return (document.location.protocol == "https:");
    },

    /*
     * gets the correct ad server
     *
     */
    getAdServer: function() {
        return this.ad_server;
    },

    /*
     * gets params from a uri.  format should be
     * something like url.ext?var=val;var2=val2
     *
     */
    getParamsFromUri: function(uri) {
        var params = [];
        if (!uri || uri == "") return params;
        var qstrIdx = uri.indexOf("?");
        var qstr = "";
        if (qstrIdx > -1) {
            qstr = this.trim(uri.substring(qstrIdx+1));
        } else {
            qstr = this.trim(uri);
        }
        var pairs = qstr.split(";");
        for(var i=0; i<pairs.length; i++) {
            var pair = pairs[i].split("=");

            var param = this.cleanParamName(pair[0]);
            if (param != false)
                params[param] = this.trim(pair[1]);
        }
        return params;
    },

    /*
     * gets the uri of this script
     *
     */
    getScriptUri: function() {
        var scripts = document.getElementsByTagName("script");
        if (scripts && scripts.length > 0) {
            for(var i=0; i<scripts.length; i++) {
                if(/\/tpix.*\?/i.test(scripts[i].src))
                    return scripts[i].src;
	        }
        }
        return '';
    },

    /*
     * returns true if the value passed
     * exists in the array passed
     *
     */
    inArray: function (val, arr) {
        for(var i = 0, l = arr.length; i < l; i++) {
            if (arr[i] == val) {
                return true;
	        }
	    }
	    return false;
    }
};

/*
 * tpixAd object definition, at this point
 * it's pretty basic
 *
 */
var __tpixAds = [];
function tpixAd(width, height, tile, refresh_time, altheight, altwidth, cpos) {
    this.config = tpixAdConfig;

    this.width = width;
    this.height = height;
    this.altheight = altheight || false;
    this.altwidth = altwidth || width;
    this.sz = this.width + "x" + this.height;
    this.tile = tile || false;
    if (!this.tile) this.setTile();
    // cpos = custom pos value
    this.cpos = cpos || false;
    if (this.cpos == 'false' || this.cpos == '0') {
        this.cpos = false;
    }

    this.container_id = "";
    this.generateId();
    __tpixAds[this.container_id] = this;

    this.refresh_time = refresh_time || false;
    if (this.refresh_time != false && !isNaN(this.refresh_time)) {
        if (this.refresh_time < 5 || this.refresh_time > 300) this.refresh_time = 10;
        setTimeout("__tpixAds['" + this.container_id + "'].refresh()", this.refresh_time * 1000);
    }
}

/*
 * generates a unique id for the container element
 * that the ad will be written into.
 *
 */
tpixAd.prototype.generateId = function() {
    this.config.ad_count++;
    var id = "tpixAd" + this.width + this.height + this.tile + this.config.ord + "-" + this.config.ad_count;
    this.container_id = id;
    return id;
};

/*
 * auto discovers the tile if one wasn't
 * passed in using the width and height
 * of the ad.
 *
 */
tpixAd.prototype.setTile = function() {
    this.tile = this.config.default_tiles["ad_" + this.sz] || "-1";
};

/*
 * returns the dcopt string
 * if it needs to be used.
 *
 */
tpixAd.prototype.getDCOpt = function() {
    if (this.sz == "728x90") {
        return ";dcopt=ist";
    }
    return "";
};

/*
 * returns the pos string if it needs to be used.
 *
 * note that these rules are random and no one knows who the hell
 * came up with them.  in fact, they are out of date, probably
 * wrong and we're not certain adops even follows these rules.
 *
 * plus it considers that all sites have the same layout, like tile 3
 * is always above the fold, except it's not.  and with load more concepts
 * the page 2, is the same page and it actually above the fold since page 2
 * is in page 1.  think about it, some weird shit.
 *
 * merica!
 *
 * cpos == custom pos, if that's set we just use that crap
 * and jam it into a string or whatever.
 *
 */
tpixAd.prototype.getPos = function() {
    if (this.cpos != false) {
        return ";pos=" + this.cpos;
    }

    if (this.sz != "300x250" && this.sz != "728x90") return "";
    if (this.sz == "300x250") {
        if (this.tile == 3) return ";pos=atf";
        if (this.tile == 5) return ";pos=atf";
        if (this.tile == 6) return ";pos=btf";
        if (this.tile == 9) return ";pos=inpost";
        if (this.tile == 10) return ";pos=btf2";
        if (this.tile == 11) return ";pos=btf2";
        if (this.tile == 15) return ";pos=btf2";
        if (this.tile == 18) return ";pos=btf3";
    } else if (this.sz == "728x90") {
        if (this.tile == 1) return ";pos=atf";
        if (this.tile == 4) return ";pos=btf";
    }

    return "";
};

/*
 * gets the ad params together that will be
 * appended to the script source in this format:
 * param=val;param2=val2
 *
 */
tpixAd.prototype.getAdParams = function(encode, ignore) {
    var s = "";
    var useEncoding = encode || false;
    var ignoreParams = ignore || "siteid,adzone,ord,tile,width,height,altheight,altwidth,cpos,refresh,quantcast,rsi,r,debug";
    ignoreParams = ignoreParams.split(",");
    var vals;
    for (var param in this.config.params) {
        if (!this.config.inArray(param, ignoreParams)) {
            vals = this.config.getParam(param).toString();
            if (useEncoding) {
                s += ";" + param + "=" + encodeURIComponent(vals);
            } else {
                s += ";" + param + "=" + vals;
            }
        }
    }
    return s;
};

/*
 * gets add code that should be written into the page
 * this is a javascript script tag
 *
 */
tpixAd.prototype.getAdTag = function(refresh) {
    var ad = "";
    var siteId = this.config.getParam("siteId");
    var adZone = this.config.getParam("adZone");
    var ord = this.config.ord;
    ad += '<scr' + 'ipt src="' + this.config.getAdServer() + 'adj/' + siteId;
    ad += '.wb.dart/' + adZone + ';sect=' + adZone;
    ad += this.getAdParams();
    ad += ';tile=' + this.tile + this.getDCOpt() + this.getPos();
    ad += ';sz=' + this.sz;
    if (this.altheight != false) {
        ad += ',' + this.altwidth + 'x' + this.altheight;
    }
    ad += this.config.getAudienceScienceSegs() + this.config.getQuantCastSegs() + ';ord=' + ord;
    ad += '?" type="text/javascript"></scr' + 'ipt>';
    return ad;
};

/*
 * gets the url needed to refresh this ad.  this url
 * should be used to populate the src of an iframe.
 *
 */
tpixAd.prototype.getRefreshURL = function() {
    var theURL = "/wb-ads/iframe.html?";
    var refresh = this.config.getParam("refresh") || this.refresh_time;
    var ord = this.config.getParam("ord") || "";
    theURL += 'siteid=' + encodeURIComponent(this.config.getParam("siteId"));
    theURL += ';adzone=' + encodeURIComponent(this.config.getParam("adZone"));
    theURL += ';width=' + encodeURIComponent(this.width);
    theURL += ';height=' + encodeURIComponent(this.height);
    if (this.altheight != false) {
        theURL += ';altheight=' + encodeURIComponent(this.altheight) + ';altwidth=' + encodeURIComponent(this.altwidth);
    }
    theURL += ';tile=' + encodeURIComponent(this.tile);
    if (this.cpos != false) {
        theURL += ';cpos=' + encodeURIComponent(this.cpos);
    }
    theURL += ';ord=' + encodeURIComponent(ord);
    theURL += ';refresh=' + encodeURIComponent(refresh);
    if (this.config.quantcast.enabled) {
        theURL += ';quantcast=1';
    }
    if (this.config.rsi.enabled) {
        theURL += ';rsi=1';
    }
    theURL += this.getAdParams(true);
    theURL += ';r=' + Math.ceil(1+1E12*Math.random());
    return theURL;
};

/*
 * writes the ad directly into the page
 * using document.write.
 *
 */
tpixAd.prototype.write = function() {
    var ad = '<div align="center" class="tpixAd" id="' + this.container_id + '"><center>';
    ad += this.getAdTag();
    ad += '</center></div>';

    if (!this.config.enabled) {
        this.config.debug("Ads disabled, ad.write ignored, ad: " + ad);
        return;
    }

    this.config.debug(ad);
    document.write(ad);
};

/*
 * writes the ad into a dom id using innerHTML.  this is safe for async
 * ad writing as no document.write is used.  The ad is rendered using
 * an iframe.
 *
 */
tpixAd.prototype.writeTo = function(domId) {
    var container = document.getElementById(domId);
    if (!container) return;
    var ad = '<div align="center" class="tpixAd" id="' + this.container_id + '"><center>';
    ad += '<iframe frameborder="0" scrolling="no"';
    ad += ' width="' + this.width + '"';
    ad += ' height="' + this.height + '"';
    ad += ' src="' + this.getRefreshURL() + '"></iframe>';
    ad += '</center></div>';

    if (!this.config.enabled) {
        this.config.debug("Ads disabled, ad.writeTo ignored, ad: " + ad);
        return;
    }

    this.config.debug(ad);
    container.innerHTML = ad;
};

/*
 * clears out the container div and rewrites the ad
 * code into that div.  this should be used when
 * for some reason you want to refresh the ad without
 * reloading the page
 *
 */
tpixAd.prototype.refresh = function() {
    var container = document.getElementById(this.container_id);
    if (!container) return;
    var ifrm = '<center><iframe frameborder="0" scrolling="no"';
    ifrm += ' width="' + this.width + '"';
    ifrm += ' height="' + this.height + '"';
    ifrm += ' src="' + this.getRefreshURL() + '"></iframe></center>';
    this.config.debug("refreshing ad in container: " + this.container_id);
    container.innerHTML = ifrm;
};

/*
 * quantcast specific functions/variables.
 *
 */
_qoptions = {qacct: "p-21jBY4_vbHNJQ"}; // qacct is global
function _quantgc(n) {
    var c=document.cookie;if(!c)return '';
    var i=c.indexOf(n+"=");if(-1==i)return '';
    var len=i+n.length+1;
    var end=c.indexOf(";", len);
    return c.substring(len,end<0?c.length:end);
}

/*
 * rsi specific functions/variables.
 *
 */
_rsioptions = {csid: "A10862"}; // csid is global
