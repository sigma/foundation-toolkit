// ==UserScript==
// @name          FTK
// @namespace     http://foundation-toolkit.appspot.com
// @description   Foundation Toolkit
// @include       http://fondationjeu.com/*
// @include       http://www.fondationjeu.com/*
// ==/UserScript==

var server;
var store;
var workerPool;
var db;
var utils = new Utils();
var wpMgr;

const realWindow = ( typeof(unsafeWindow) == "undefined" ) ? window : unsafeWindow ;

function Constants() {}
Constants.F2 = "5";
Constants.SF = "6";
Constants.Mule = "7";
Constants.deleteImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAAK%2FINwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAYUExURZlmZv%2BZM%2F9mAMwzM8wAAP8AAJkAAAAAAJHQzOoAAAAIdFJOU%2F%2F%2F%2F%2F%2F%2F%2F%2F8A3oO9WQAAAJFJREFUeNpiYEcDAAHEwM7AwgDnsbCzAwQQAzsLIysblAuiAQIIKMvCChEB89kBAgisnAUkAuGzAwQQRD9QBMpnBwggqIEsMHPYAQIIrgImAhBACDOgIgABxIBQDyEBAggowMzEAlHNCiIAAoiBnRnuMLAIQAABBeB8MAAIIKAWJD5QCUAAMaD7FiCAMAQAAgwAYLoGdQu5RxIAAAAASUVORK5CYII%3D';

function WorkerPoolManager() {
    this.callbacks = new Array();

    this.ids = new Object();

    this.rootUrl = null;

    this.addWorker = function(id, callback) {
        var childWorkerId = workerPool.createWorkerFromUrl(this.rootUrl + id + '.js');
        this.callbacks[childWorkerId] = callback;
        this.ids[id] = childWorkerId;
    };

    this.runWorker = function(id, message) {
        workerPool.sendMessage(message, this.ids[id]);
    };
}

function Utils() {

    this.clearLeaders = function() {
        db.execute("delete from Leaders where account = ?", [this.getOption("account")]);
    };

    this.getCookieVal = function(offset) {
        var endstr = document.cookie.indexOf(";", offset);
        if (endstr == -1)
            endstr = document.cookie.length;
        return unescape(document.cookie.substring(offset, endstr));
    };

    this.getCookieByName = function(name) {
        var arg = name + "=";
        var alen = arg.length;
        var clen = document.cookie.length;
        var i = 0;

        while (i < clen) {
            var j = i + alen;
            if (document.cookie.substring(i, j) == arg)
                return utils.getCookieVal(j);
            i = document.cookie.indexOf(" ",i) + 1;
            if (i == 0)
                break;
        }

        return null;
    };

    this.setCookie = function(name, value, domain, path) {
        document.cookie = name + "=" + escape(value) + ((path==null) ? "" : ("; path=" + path)) + ((domain==null) ? "" : ("; domain=" + domain));
    };

    this.getOption = function(key, def) {
        var rs = db.execute('select value from Options where name = ?;', [key]);
        while (rs.isValidRow()) {
            def = rs.field(0);
            rs.next();
        }
        rs.close();
        return def;
    };

    this.setOption = function(key, value) {
        db.execute('replace into Options values (?, ?)', [key, value]);
    };
}

function Stats() {
    this.detectAutoTrading = function() {
        var allElements, thisElement;
        allElements = document.evaluate(
            "//*/text()",
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null);

        for (var i = 0; i < allElements.snapshotLength; i++) {
            thisElement = allElements.snapshotItem(i);
            if (thisElement.nodeValue.match("cette option vous permet de gagner du temps")) {
                return true;
            }
        }
        return false;
    };

    //  used by stats_addSFControls()
    this.addSFCell = function(tBody, allControlledPlanets) {
        var thisRow,
            thisCell,
            thisLink,
            thisPlanetName,
            newCell;

        for (var i = 0; i < tBody.childNodes.length; i++) {
            thisRow = tBody.childNodes[i];

            if ( thisRow.nodeName.toLowerCase() == "tr" && thisRow.firstChild.nodeName.toLowerCase() == "td" ) {
                //for (var j = 0; j < thisRow.childNodes.length; j++ ) {
                thisCell = thisRow.firstChild;
                thisLink = thisCell.childNodes[thisCell.childNodes.length-1];   //  planet name link is always the last element of the first cell in the line

                if ( thisCell.nodeName.toLowerCase() == "td" && thisLink && thisLink.nodeName.toLowerCase() == "a" ) {
                    thisPlanetName = thisLink.firstChild.nodeValue;
                    for (var k = 0; k < allControlledPlanets.length; k++) {
                        if (allControlledPlanets[k] == thisPlanetName) {
                            newCell = document.createElement("td");
                            newCell.setAttribute("style", "background-color: red; color: white");
                            newCell.appendChild(document.createTextNode("SF !"));
                            thisRow.appendChild(newCell);
                            break;
                        }
                    }
                    //break;
                }
                //}
            }
        }
    };

    //  adds a "SF" cell at the end of a planet row if this planet is controlled by the SF (works in F1.2 only)
    this.addSFControls = function() {
        var allHeaders,
            thisHeader,
            thisTBody,
            controlledPlanetsTab,
            allControlledPlanets = new Array();

        allHeaders = document.getElementsByTagName('th');

        for (var i = 0; i < allHeaders.length; i++) {
            thisHeader = allHeaders[i];

            if ( thisHeader.firstChild.nodeName == "#text"
                 && thisHeader.firstChild.nodeValue.match("Plan.tes manipul.es")) {
                controlledPlanetsTab = thisHeader.parentNode.parentNode;
                for (var j = 1; j < controlledPlanetsTab.childNodes.length; j++) {
                    allControlledPlanets[j-1] = controlledPlanetsTab.childNodes[j].firstChild.firstChild.nodeValue;
                }
            }
        }

        if ( allControlledPlanets.length > 0 ) {
            for (var k = 0; k < allHeaders.length; k++) {
                thisHeader = allHeaders[k];

                if ( thisHeader.firstChild.nodeName == "#text"
                     && thisHeader.firstChild.nodeValue.match("Plan.te")
                     && !thisHeader.firstChild.nodeValue.match("Plan.tes manipul.es")) {
                    thisTBody = thisHeader.parentNode.parentNode;
                    this.addSFCell(thisTBody, allControlledPlanets);
                }
            }

            controlledPlanetsTab.parentNode.parentNode.removeChild(controlledPlanetsTab.parentNode.previousSibling);
            controlledPlanetsTab.parentNode.parentNode.removeChild(controlledPlanetsTab.parentNode.previousSibling);
            controlledPlanetsTab.parentNode.parentNode.removeChild(controlledPlanetsTab.parentNode);
        }
    };

    this.createShipsLinks = function() {
        var images,
            img,
            newimg,
            expr,
            planetName,
            allLinks,
            thisLink,
            result,
            finalLink;

        images = document.evaluate(
            "//img[contains(@title,' sur ')]",
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null);

        for (var i = 0; i < images.snapshotLength; i++) {
            img = images.snapshotItem(i);
            alt = img.title;
            expr = /.+ sur (.+)/;
            expr.exec(alt);
            planetName = RegExp.$1;

            allLinks = document.evaluate(
                "//table/tbody/tr/td/a[@target='detail']/text()",
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

            for (var j = 0; j < allLinks.snapshotLength; j++) {
                thisLink = allLinks.snapshotItem(j);
                if (thisLink.nodeValue == planetName) {
                    result = thisLink.parentNode;
                    break;
                }
            }

            finalLink = document.createElement("a");
            finalLink.setAttribute("href", result);
            finalLink.setAttribute("target" ,"detail");


            newimg = document.createElement("img");
            newimg.setAttribute("src", img.src);
            newimg.setAttribute("height", "20");
            newimg.setAttribute("width", "20");
            newimg.setAttribute("title", img.title);
            newimg.setAttribute("border", "0");

            finalLink.appendChild(newimg);

            img.parentNode.replaceChild(finalLink, img);
        }
    };

    //  used by sortTableBySector() to sort a multi-dimensional array
    this.symmetricalSorting = function(array1,array2,how) {
        var copy1 = new Array();
        var copy2 = new Array();
        var smartDouble = new Array();

        for (var i = 0;i < array1.length;i++) {
            copy1.length++;
            copy1[copy1.length - 1] = array1[i];
            smartDouble.length++;
            smartDouble[smartDouble.length - 1] = 0;
        }

        copy2.length = copy1.length;
        copy1.sort();

        var redrawCopy2 = 0;
        for (var x = 0;x < copy1.length;x++) {
            for (var y = 0;y < array1.length;y++) {
                if (copy1[x] == array1[y]) {
                    if (smartDouble[y] == 1) {
                        continue ;
                    }
                    copy2[redrawCopy2++] = array2[y];
                    smartDouble[y] = 1;
                }
            }
        }
        return new Array(copy1, copy2);
        /* keep this comment to reuse freely:
         http://www.unitedscripters.com */
    };

    this.sortTableBySector = function(tBody) {
        var sortedArray = Array();
        var table = Array();
        var tableRow = Array();
        var tableXY = Array();
        var newTable = Array();
        var newTableXY = Array();
        var newTBody,
            sectorTitleTr,
            sectorTitleTd,
            thisHeader,
            thisRow,
            thisCell,
            thisLink,
            thisX,
            thisY,
            x,
            y,
            oldXY,
            cpt = 0;
        var i;

        for (i = 0; i < tBody.childNodes.length; i++) {
            thisRow = tBody.childNodes[i];

            if ( thisRow.nodeName.toLowerCase() == "tr" ) {
                //  save table header for later
                if ( thisRow.firstChild.nodeName.toLowerCase() == "th" ) {
                    thisHeader = thisRow;
                }

                if ( thisRow.firstChild.nodeName.toLowerCase() == "td" ) {
                    for (var j = 0; j < thisRow.childNodes.length; j++ ) {
                        thisCell = thisRow.childNodes[j];
                        thisLink = thisCell.childNodes[thisCell.childNodes.length-1];   //  planet name link is always the last element of the first cell in the line
                        if ( thisCell.nodeName.toLowerCase() == "td" && thisLink && thisLink.nodeName.toLowerCase() == "a" ) {
                            thisX = thisLink.href.substr(thisLink.href.indexOf('&x=')+3, 2);
                            thisY = thisLink.href.substr(thisLink.href.indexOf('&y=')+3, 2);
                            tableXY.push(thisX.concat(thisY));
                            tableRow.push(thisRow);
                            table.push(cpt++);  //  mainly a dummy table for the symmetrical sorting function
                            break;
                        }
                    }
                }
            }
        }

        sortedArray = this.symmetricalSorting(tableXY, table);
        newTableXY = sortedArray[0];
        newTable = sortedArray[1];

        newTBody = document.createElement("tbody");
        newTBody.appendChild(thisHeader);

        oldXY = "";

        for (i = 0; i < tableRow.length; i++) {
            //  create and append sector header row
            if ( newTableXY[i] != oldXY ) {
                x = newTableXY[i].substr(0,2);
                y = newTableXY[i].substr(2,2);
                sectorTitleTr = document.createElement("tr");
                sectorTitleTr.setAttribute('align', 'right');
                sectorTitleTd = document.createElement("td");
                sectorTitleTd.setAttribute('colspan', '4');
                sectorTitleTd.setAttribute('bgcolor', '#ffff33');
                sectorTitleCell = document.createElement("font");
                sectorTitleCell.setAttribute('color', 'black');
                sectorTitleCell.appendChild(document.createTextNode('Secteur ' + x + '0/' + y + '0'));
                sectorTitleTd.appendChild(sectorTitleCell);
                sectorTitleTr.appendChild(sectorTitleTd);
                newTBody.appendChild(sectorTitleTr);
            }

            newTBody.appendChild(tableRow[newTable[i]]);
            oldXY = newTableXY[i];
        }

        return newTBody;
    };

    this.sortPlanetsBySector = function() {
        var allHeaders, thisHeader, thisFirstTd, thisTBody, newTBody;
        allHeaders = document.getElementsByTagName("th");

        for (var i = 0; i < allHeaders.length; i++) {
            thisHeader = allHeaders[i];
            if ( thisHeader.firstChild.nodeName == "#text" && thisHeader.firstChild.nodeValue.match("Plan.te") && !thisHeader.firstChild.nodeValue.match("Plan.tes")) {
                thisTBody = thisHeader.parentNode.parentNode;
                newTBody = this.sortTableBySector(thisTBody);

                thisTBody.parentNode.replaceChild(newTBody, thisTBody);
            }
        }
    };

    this.recordOtherLeaders = function(table) {
        var index = 0;
        var array = table.getElementsByTagName("th");

        // added : test if there is no "leader" header (ie. I1 and I2 levels)
        while(array[index] != null && (array[index].firstChild.nodeName.toLowerCase() != "img" ||
                                       ! (array[index].firstChild.title.match("Leaders pr.sents"))))
            index++;

        if (array[index] == null) {
            utils.clearLeaders();
            return;
        }

        allTableLines = document.evaluate(
            ".//tr",
            table,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null);

        for (var i = 1; i < allTableLines.snapshotLength; i++) {
            var fields = document.evaluate(
                ".//td",
                allTableLines.snapshotItem(i),
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null);

            var planet;
            var cellChildren = fields.snapshotItem(0).childNodes;
            var j;
            for (j = 0; j < cellChildren.length; j++) {
                if (cellChildren[j].nodeName.toLowerCase() == "a") {
                    planet = cellChildren[j].firstChild.nodeValue;
                    break;
                }
            }

            // test for Mule mission : there is a heading TD before the list of planets for each sector, let's avoid it
            if (fields.snapshotItem(index) == null)
                continue;

            cellChildren = fields.snapshotItem(index).childNodes;
            for (j = 0; j < cellChildren.length; j++) {
                if (cellChildren[j].nodeName.toLowerCase() == "img") {
                    var do_push = true;

                    leader = cellChildren[j].title;

                    db.execute("insert into Leaders (name, position, account) values (?,?,?)", [leader, planet, utils.getOption("account")]);
                }
            }
        }
    };

    this.storeUsefulInformation = function() {
        allTablesHeaders = document.evaluate(
            "//th",
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null);

        utils.clearLeaders();
        for (var i = 0; i < allTablesHeaders.snapshotLength; i++) {
            thisTableHeader = allTablesHeaders.snapshotItem(i);

            if (thisTableHeader.firstChild.nodeName == "#text" &&
                thisTableHeader.firstChild.nodeValue.match("Plan.te") &&
                !thisTableHeader.firstChild.nodeValue.match("Plan.tes")) {
                var table = thisTableHeader.parentNode.parentNode;
                this.recordOtherLeaders(table);
            }
        }
        // utils_dumpUsefulInformation();
    };

    this.installHacks = function() {
        var team = utils.getOption("team");
        this.storeUsefulInformation();
        //stats_insertMapLink();
        if (team == Constants.F2)
            this.addSFControls();
        this.createShipsLinks();
        if (team != Constants.Mule)
            this.sortPlanetsBySector();
    };
}

function Messages() {

    this.getSignature = function(account) {
        var def = "";
        var rs = db.execute('select signature from Signatures where account = ?;', [account]);
        while (rs.isValidRow()) {
            def = rs.field(0);
            rs.next();
        }
        rs.close();
        return def;
    }

    this.signOverriddenSubmit = function(event) {
        var target = event ? event.target : this;
        var accountName = utils.getOption("account");
        var equipe = utils.getOption("team");
        var i = 2;
        if ( equipe == Constants.SF )  //  there is an "anonyme" checkbox at SF level so we shift the index
            i++;
        
        if ( location.href.search("repondre") != -1 ) {     //  answer window
            if ( target.elements[i+1].value.length > 0 ) {
                target.elements[i].value = target.elements[i].value + "\n\n\n" + target.elements[i+1].value;
            }
            if ( target.elements[i+2].checked == true ) {
                db.execute("insert or replace into Signatures values (?,?)", [accountName, target.elements[i+1].value]);
            }
        } else {    //  normal window
            if ( target.elements[i+2].value.length > 0 ) {
                target.elements[i+1].value = target.elements[i+1].value + "\n\n\n" + target.elements[i+2].value;
            }
            if ( target.elements[i+3].checked == true ) {
                db.execute("insert or replace into Signatures values (?,?)", [accountName, target.elements[i+2].value]);
            }
        }
    }
    
    this.addSignature = function() {
        var index,
        textAreas,
        msgTextArea,
        signTextArea,
        signTextAreaValue,
        signSaveCheckbox,
        accountName;
        
        accountName = utils.getOption("account");
        
        textAreas = document.getElementsByTagName("textarea");
        if (textAreas.length > 0) {
            index = 0;
            while (textAreas[index].name != "mess")
                index++;
            msgTextArea = textAreas[index];
            
            signTextArea = document.createElement("textarea");
            signTextArea.setAttribute("name", "sign");
            signTextArea.setAttribute("cols", "40");
            signTextArea.setAttribute("rows", "5");
            signTextAreaValue = this.getSignature(accountName);
            signTextArea.appendChild(document.createTextNode(signTextAreaValue));
            
            signSaveCheckbox = document.createElement("input");
            signSaveCheckbox.setAttribute("type", "checkbox");
            signSaveCheckbox.setAttribute("name", "save");
            signSaveCheckbox.setAttribute("checked", "checked");
            
            msgTextArea.removeChild(msgTextArea.firstChild);  //  remove the default string in the textarea ("Corps du message")
            
            msgTextArea.parentNode.insertBefore(document.createTextNode("Corps du message :"), msgTextArea);
            msgTextArea.parentNode.insertBefore(document.createElement("br"), msgTextArea);
            
            msgTextArea.parentNode.insertBefore(document.createElement("br"), msgTextArea.parentNode.lastChild);
            msgTextArea.parentNode.insertBefore(document.createTextNode("Signature :"), msgTextArea.parentNode.lastChild.previousSibling);
            msgTextArea.parentNode.insertBefore(signTextArea, msgTextArea.parentNode.lastChild);
            msgTextArea.parentNode.insertBefore(signTextArea, msgTextArea.parentNode.lastChild);
            msgTextArea.parentNode.insertBefore(document.createElement("br"), msgTextArea.parentNode.lastChild);
            msgTextArea.parentNode.insertBefore(document.createTextNode("Sauvegarder cette signature"), msgTextArea.parentNode.lastChild);
            msgTextArea.parentNode.insertBefore(signSaveCheckbox, msgTextArea.parentNode.lastChild);
            
            realWindow.addEventListener('submit', this.signOverriddenSubmit, true);
        }
    }
    
    this.addReplyToAll = function() {
        var allMsgDiv,
        thisMsgDiv,
        thisMsgAuthor,
        thisMsgLink,
        newMsgLink,
        space,
        center,
        index;
        
        allMsgDiv = document.evaluate(
            "//td/div",
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null);
        
        for (var i = 0; i < allMsgDiv.snapshotLength; i++) {
            thisMsgDiv = allMsgDiv.snapshotItem(i);
            
            index = 0;
            while (thisMsgDiv.childNodes[index] && thisMsgDiv.childNodes[index].nodeName.toLowerCase() != "a")
                index++;
            
            thisMsgLink = thisMsgDiv.childNodes[index];
            
            if ( thisMsgLink && thisMsgLink.nodeName.toLowerCase() == "a" ) {
                thisMsgLink.parentNode.insertBefore(document.createElement("br"), thisMsgLink);
                center = thisMsgLink.parentNode.insertBefore(document.createElement("div"), thisMsgLink);
                center.setAttribute("align", "center");
                center.appendChild(thisMsgLink);
                
                newLink = thisMsgLink.cloneNode(true);
                thisMsgAuthor = thisMsgDiv.firstChild.firstChild.nodeValue;
                
                if ( thisMsgAuthor.match("#Canal v.t.ran#") ) {
                    newLink.href = newLink.href.substring(0, newLink.href.indexOf("repondre=")+9) + thisMsgAuthor.slice(7,14) + "s"; // accents problems...
                    newLink.firstChild.replaceChild(document.createTextNode("Répondre a tous"), newLink.firstChild.firstChild);
                }
                if ( thisMsgAuthor.match("#Canal Orateur#") ) {
                    newLink.href = newLink.href.substring(0, newLink.href.indexOf("repondre=")+9) + "orateurs";
                    newLink.firstChild.replaceChild(document.createTextNode("Répondre a tous"), newLink.firstChild.firstChild);
                }
                if ( thisMsgAuthor.match("#Canal confr.rie#") ) {
                    newLink.href = newLink.href.substring(0, newLink.href.indexOf("repondre=")+9) + "confrérie";
                    newLink.firstChild.replaceChild(document.createTextNode("Répondre a tous"), newLink.firstChild.firstChild);
                }
                if ( thisMsgAuthor.match("#Canal v.t.ran#") || thisMsgAuthor.match("#Canal Orateur#") || thisMsgAuthor.match("#Canal confr.rie#") ) {
                    space = document.createElement("span");
                    space.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;";
                    
                    thisMsgLink.parentNode.appendChild(space);
                    thisMsgLink.parentNode.appendChild(newLink);
                }
            }
        }
    }
    
    this.addDeleteButtons = function() {
        var allCheckboxes,
        thisCheckbox,
        newDeleteImg,
        newDeleteLink;

        allCheckboxes = document.evaluate(
            "//input[@type='checkbox']",
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null);
        
        for (var i = 0; i < allCheckboxes.snapshotLength; i++) {
            thisCheckbox = allCheckboxes.snapshotItem(i);
            
            newDeleteLink = document.createElement("a");
            newDeleteLink.setAttribute("href", "");
            
            newDeleteImg = document.createElement("img");
            newDeleteImg.setAttribute("src", Constants.deleteImg);
            newDeleteImg.setAttribute("id", "delete_" + (i+1));
            newDeleteImg.setAttribute("border", "0");
            newDeleteImg.setAttribute("title", "Supprimer ce message");
            
            newDeleteLink.appendChild(newDeleteImg);
            
            thisCheckbox.parentNode.style.textAlign = "center";
            thisCheckbox.parentNode.insertBefore(document.createElement("br"), thisCheckbox.parentNode.firstChild);
            thisCheckbox.parentNode.insertBefore(document.createElement("br"), thisCheckbox.parentNode.firstChild);
            thisCheckbox.parentNode.insertBefore(newDeleteLink, thisCheckbox.parentNode.firstChild);
        }
        
        document.addEventListener('click', function(event) {
                var imgId = event.target.id,
                    msgNum;
                
                if ( imgId.match("delete_") ) {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    if (confirm("Etes-vous sûr de vouloir supprimer ce message ?")) {
                        for (i = 0; i < realWindow.document.forms[0].elements.length;i++) {
                            realWindow.document.forms[0].elements[i].checked = false;
                        }
                        
                        msgNum = imgId.substring(imgId.indexOf("delete_")+7);
                        
                        realWindow.document.forms[0].elements[msgNum].checked = true;
                        realWindow.document.forms[0].submit();
                    }
                }
                
            }, true);
    }
    
}

function Leader() {
    this.addClickToRadioLabel = function() {
        var allInputTags = document.evaluate(
            "//input",
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null);
        var thisInputTag;
        var newLabel;

        for (var i = 0; i < allInputTags.snapshotLength; i++) {
            thisInputTag = allInputTags.snapshotItem(i);

            if ( thisInputTag.getAttribute("type") == "radio" ) {
                var value = thisInputTag.getAttribute("value");
                thisInputTag.setAttribute("id", "action_"+value);
                newLabel = document.createElement("label");
                newLabel.setAttribute("for", "action_"+value);
                newLabel.appendChild(thisInputTag.nextSibling);
                thisInputTag.parentNode.insertBefore(newLabel, thisInputTag.nextSibling);
            }
        }
    }
}

function Hacks() {
    this.menu = function() {
        var url = location.href;
        var team = url.substring( url.indexOf("equipe=")+7, url.indexOf("&") );
        utils.setOption("team", team);
        var accountName = utils.getCookieByName("compte");
        utils.setOption("account", accountName);
    };

    this.stats = function() {
        var st = new Stats();
        if (!st.detectAutoTrading()) {
            st.installHacks();
        }
    };

    this.messages = function() {
        var msg = new Messages();
        if (location.href.search('ecrire=') != -1)
            msg.addSignature();
        
        if (location.href.search('ecrire=') == -1 && location.href.search('envoi=1') == -1) {
            msg.addDeleteButtons();
            msg.addReplyToAll();
        }
    };

    this.leader = function() {
        var leader= new Leader();
        leader.addClickToRadioLabel();
    }

    this.test = function() {
        function testCallback(message) {
            alert('Received message from worker ' + message.sender + ': \n' + message.body);
        }

        wpMgr.addWorker('test', testCallback);
        wpMgr.runWorker('test', ["3..2..", 1, {helloWorld: "plopida!"}]);
    };
}

function installHacks() {
    var hack = new Hacks();
    var mapping = {'menu.php': 'menu',
                   'stats.php': 'stats',
                   'messages.php': 'messages',
                   'leader.php': 'leader'
        };

    for (var page in mapping) {
        if (location.pathname.search(page) != -1) {
            hack[mapping[page]]();
        }
    }
}

function triggerAllowGearsDialog(){
    window.addEventListener("load",
                            function(){
                                unsafeWindow.GearsFactory().create("beta.localserver", "1.0");
                                location.href = location.href;
                                return false;
                            }, true);
}

function initDB() {
    db.open("fondation_offline");
    db.execute("create table if not exists Options" +
               " (name varchar(255) primary key, value varchar(255))");
    db.execute("create table if not exists Signatures" +
               " (account varchar(255) primary key, signature varchar(255))");
    db.execute("create table if not exists Leaders" +
               " (id integer primary key, name varchar(255), position varchar(255), account varchar(15), date varchar(15))");

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
        workerPool = unsafeWindow.google.gears.factory.create('beta.workerpool');
        wpMgr = new WorkerPoolManager();
        wpMgr.rootUrl = "http://localhost:8080/workers/";

        workerPool.onmessage = function(a, b, message) {
            wpMgr.callbacks[message.sender](message);
        };

        db = unsafeWindow.google.gears.factory.create("beta.database");
        if (db) {
            initDB();
        }
    } catch(e) {}
    if (!server){
        triggerAllowGearsDialog();
    } else {
        installHacks();
    }
}

function addLoadEvent(func) {
    var oldonload = unsafeWindow.onload;
    if (typeof unsafeWindow.onload != 'function') {
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
