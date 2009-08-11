// ==UserScript==
// @name          FTK
// @namespace     http://fondation-toolkit.appspot.com
// @description   Fondation Toolkit
// @require       jquery-1.3.min.js
// @require       jquery.purr.js
// @include       http://fondationjeu.com/*
// @include       http://www.fondationjeu.com/*
// ==/UserScript==

var server;
var store;
var workerPool;
var db;
var request;
var wpMgr;

var utils;
var Constants;

const realWindow = ( typeof(unsafeWindow) == "undefined" ) ? window : unsafeWindow;

const ftkApp = "http://foundation-toolkit.appspot.com/";
// const ftkApp = "http://localhost:8000";

function WorkerPoolManager() {
    this.callbacks = new Array();

    this.ids = new Object();

    this.rootUrl = null;

    this.addWorker = function(id, callback) {
        var childWorkerId = workerPool.createWorkerFromUrl(this.rootUrl + id + ".js");
        this.callbacks[childWorkerId] = callback;
        this.ids[id] = childWorkerId;
    };

    this.runWorker = function(id, message) {
        workerPool.sendMessage(message, this.ids[id]);
    };

    this.loadLib = function(lib, cb) {
        this.addWorker("loader", this.evalCallback(cb));
        this.runWorker("loader", "/lib/" + lib + ".js");
    };

    this.evalCallback = function(cb) {
        return function(message) {
            eval(message.body);
            if (cb) {
                cb();
            }
        };
    };

}

function triggerAllowGearsDialog(){
    window.addEventListener("load",
                            function(){
                                unsafeWindow.GearsFactory().create("beta.localserver");
                                location.href = location.href;
                                return false;
                            }, true);
}

function initGears() {
    if (!unsafeWindow.google) unsafeWindow.google= {};
    if (!unsafeWindow.google.gears){
        try {
            unsafeWindow.google.gears = {};
            unsafeWindow.google.gears.factory = unsafeWindow.GearsFactory();
        } catch(e) {
            alert("Problem in initializing Gears: " + e.message);
        }
    } try {
        server = unsafeWindow.google.gears.factory.create("beta.localserver");
        store = server.createStore("fondation_offline");
        workerPool = unsafeWindow.google.gears.factory.create("beta.workerpool");
        db = unsafeWindow.google.gears.factory.create("beta.database");
        request = unsafeWindow.google.gears.factory.create("beta.httprequest");

        wpMgr = new WorkerPoolManager();
        wpMgr.rootUrl = ftkApp + "/workers/";
        workerPool.onmessage = function(a, b, message) {
            wpMgr.callbacks[message.sender](message);
        };

    } catch(e) {}
    if (!server){
        triggerAllowGearsDialog();
    } else {
        wpMgr.loadLib("root");
    }
}

function addLoadEvent(func) {
    var oldonload = unsafeWindow.onload;
    if (typeof unsafeWindow.onload != "function") {
        unsafeWindow.onload = func;
    } else {
        unsafeWindow.onload = function() {
            if (oldonload) {
                oldonload();
            }
            func();
        };
    }
}

addLoadEvent(initGears);
