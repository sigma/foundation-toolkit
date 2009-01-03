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

const realWindow = ( typeof(unsafeWindow) == "undefined" ) ? window : unsafeWindow;
const ftkApp = "http://foundation-toolkit.appspot.com/";
//const ftkApp = "http://localhost:8080";

function Constants() {}
Constants.I1 = "1";
Constants.I2 = "2";
Constants.E1 = "3";
Constants.M2 = "4";
Constants.F2 = "5";
Constants.SF = "6";
Constants.MU = "7";
Constants.E2 = "8";
Constants.M1 = "9";
Constants.F1 = "10";
Constants.I3 = "11";
Constants.deleteImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAAK%2FINwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAYUExURZlmZv%2BZM%2F9mAMwzM8wAAP8AAJkAAAAAAJHQzOoAAAAIdFJOU%2F%2F%2F%2F%2F%2F%2F%2F%2F8A3oO9WQAAAJFJREFUeNpiYEcDAAHEwM7AwgDnsbCzAwQQAzsLIysblAuiAQIIKMvCChEB89kBAgisnAUkAuGzAwQQRD9QBMpnBwggqIEsMHPYAQIIrgImAhBACDOgIgABxIBQDyEBAggowMzEAlHNCiIAAoiBnRnuMLAIQAABBeB8MAAIIKAWJD5QCUAAMaD7FiCAMAQAAgwAYLoGdQu5RxIAAAAASUVORK5CYII%3D";

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
        var rs = db.execute("select value from Options where name = ?;", [key]);
        while (rs.isValidRow()) {
            def = rs.field(0);
            rs.next();
        }
        rs.close();
        return def;
    };

    this.setOption = function(key, value) {
        db.execute("replace into Options values (?, ?)", [key, value]);
    };

    this.calcBestOffer = function(props) {
        return "fer-1|etain-1";
    }

    this.leaderColors = ["white", "green", "yellow", "red", "blue", "violet"];

    this.normalizeLeaderName = function(leader) {
        var index = leader.lastIndexOf(" (");
        if (index == -1)
            return leader;
        else {
            leader = leader.slice(0,index) + leader.slice(index + 1);
            return leader;
        }
    };

    this.getLeaderColor = function(leader) {
        leader = this.normalizeLeaderName(leader);
        var rs = db.execute("select color from Leaders where name = ? and account = ?;", [leader, this.getOption("account")]);
        var res = rs.field(0);
        rs.close();
        return res;
    };

    this.getNextLeaderColor = function(color) {
        for (var i = 0; i < this.leaderColors.length; i++) {
            if (this.leaderColors[i] == color)
                return this.leaderColors[((i+1) % this.leaderColors.length)];
        }
    };

    this.recordLeaderColor = function(leader,color) {
        leader = this.normalizeLeaderName(leader);
        db.execute("update Leaders set color = ? where name = ? and account = ?;", [color, leader, this.getOption("account")]);
    };

    this.setLeaderColor = function(index,color) {
        var polTabChildren = document.getElementById("politique").childNodes;
        var j = 0;
        var leader;

        for (var i = 0; i < polTabChildren.length; i++) {
            if (polTabChildren[i].nodeName == "#text" &&
                polTabChildren[i].nodeValue.match(" est pr.sent ici !")) {

                if (j == index) {
                    leader = polTabChildren[i-1];
                    break;
                }
                else
                    j++;
            }
        }
        leader.setAttribute("style", "color: " + color);
        leader.setAttribute('href', 'javascript:details_setLeaderColor(' + index + ',"' + this.getNextLeaderColor(color) + '")');

        this.recordLeaderColor(leader.firstChild.nodeValue, color);
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

        allHeaders = document.getElementsByTagName("th");

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
                            thisX = thisLink.href.substr(thisLink.href.indexOf("&x=")+3, 2);
                            thisY = thisLink.href.substr(thisLink.href.indexOf("&y=")+3, 2);
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
                sectorTitleTr.setAttribute("align", "right");
                sectorTitleTd = document.createElement("td");
                sectorTitleTd.setAttribute("colspan", "4");
                sectorTitleTd.setAttribute("bgcolor", "#ffff33");
                sectorTitleCell = document.createElement("font");
                sectorTitleCell.setAttribute("color", "black");
                sectorTitleCell.appendChild(document.createTextNode("Secteur " + x + "0/" + y + "0"));
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

                    db.execute("insert into Leaders (name, position, account, color) values (?,?,?,?)", [leader, planet, utils.getOption("account"), utils.leaderColors[0]]);
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
        if (team != Constants.MU)
            this.sortPlanetsBySector();
    };
}

function Messages() {

    this.getSignature = function(account) {
        var def = "";
        var rs = db.execute("select signature from Signatures where account = ?;", [account]);
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

            realWindow.addEventListener("submit", this.signOverriddenSubmit, true);
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

        document.addEventListener("click", function(event) {
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

function Details() {

    this.clickListener = function(event) {
        var link = event.target,
            linkId = event.target.id,
            linkNum,
            color;

        color = utils.getLeaderColor(link.firstChild.nodeValue);

        if ( linkId.match("link_") ) {
            event.stopPropagation();
            event.preventDefault();

            linkNum = linkId.substring(linkId.indexOf("link_")+5);

            utils.setLeaderColor(linkNum, utils.getNextLeaderColor(color));
        }
    };

    this.linkifyLeaders = function() {
        var polTabChildren = realWindow.document.getElementById("politique").childNodes;
        var leaders = new Array();
        for (var i = 0; i < polTabChildren.length; i++) {
            if (polTabChildren[i].nodeName == "#text" &&
                polTabChildren[i].nodeValue.match(" est pr.sent ici !")) {

                leaders.push(polTabChildren[i]);
            }
        }

        for (var i = 0; i < leaders.length; i++) {
            link = document.createElement("a");

            var name = leaders[i].nodeValue.slice(0,leaders[i].nodeValue.length - 19);
            var color = utils.getLeaderColor(name);

            //link.href = 'javascript:details_setLeaderColor(' + i + ',"' + utils_getNextLeaderColor(color) + '")';
            link.setAttribute("id", "link_"+i);
            link.setAttribute("style", "color:" + color + "; font-size: 10px; font-family: verdana");

            link.appendChild(document.createTextNode(name));

            leaders[i].parentNode.insertBefore(link, leaders[i]);

            leaders[i].nodeValue = leaders[i].nodeValue.slice(name.length);
        }

        document.addEventListener('click', this.clickListener, true);
    };

    this.redesignPage = function() {
        var docHead = document.getElementsByTagName("head")[0];

        var newStyle = document.createElement("style");
        var newStyleContent = document.createTextNode("\n.ordre { visibility: visible } \n.troupes { left: 20px } \n.boutons { visibility: hidden } \n#ressources { top: 165px; height: 100px; visibility: visible } \n#politique { top: 470px; visibility: visible } \n#ordre { top: 345px; visibility: visible }\n");
        newStyle.appendChild(newStyleContent);
        var divOrdre = document.getElementById("ordre");
        //if (divOrdre.lastChild && divOrdre.lastChild.nodeValue.search("NB :") != -1) divOrdre.removeChild(divOrdre.lastChild);

        var divTroupesChildren = divOrdre.parentNode.childNodes[1].childNodes;
        var nbAstros = 0;
        for (var i = 0; i < divTroupesChildren.length; i++) {
            if (divTroupesChildren[i].nodeName == "#text" &&
                divTroupesChildren[i].nodeValue.match("\.\.\. [\(]")) {
                nbAstros = divTroupesChildren[i].nodeValue.slice(5, divTroupesChildren[i].nodeValue.indexOf(" astronefs"));
                break;
            }
        }

        if ( nbAstros == 0 ) {
            for (var i = 0; i < divTroupesChildren.length; i++) {
                if (divTroupesChildren[i].nodeName.toLowerCase() == "img" &&
                    divTroupesChildren[i].src.match("astro") ) {
                    nbAstros++;
                }
            }
        }

        var divTroupes = divTroupesChildren[0].parentNode;
        var nbAstrosString = document.createTextNode(nbAstros + " astronef(s) ");

        var size = divTroupesChildren.length-1;
        for (var i = 0; i < size; i++) {
            divTroupes.removeChild(divTroupes.firstChild);
        }

        divTroupes.insertBefore(nbAstrosString, divTroupes.lastChild);
        divTroupes.insertBefore(document.createElement("br"), divTroupes.lastChild);

        docHead.appendChild(newStyle);
    };

    function findBestOffer() {
        var divResources = document.getElementById("ressources");
        var divPol = document.getElementById("politique");
        var accountName = utils.getOption("account");
        var goldQty,
        goldProd,
        tinQty,
        tinProd,
        ironQty,
        ironProd,
        foodQty,
        foodProd,
        manufQty,
        manufProd,
        prodCycle,
        nextProdCycle,
        pol = 0;

        if ( divResources ) {
            var tBody = divResources.firstChild.firstChild;

            goldQty = tBody.childNodes[1].childNodes[1].firstChild.nodeValue;
            goldProd = (tBody.childNodes[1].childNodes[2].firstChild.nodeValue == "Oui") ? true : false;
            tinQty = tBody.childNodes[2].childNodes[1].firstChild.nodeValue;
            tinProd = (tBody.childNodes[2].childNodes[2].firstChild.nodeValue == "Oui") ? true : false;
            ironQty = tBody.childNodes[3].childNodes[1].firstChild.nodeValue;
            ironProd = (tBody.childNodes[3].childNodes[2].firstChild.nodeValue == "Oui") ? true : false;
            foodQty = tBody.childNodes[4].childNodes[1].firstChild.nodeValue;
            foodProd = (tBody.childNodes[4].childNodes[2].firstChild.nodeValue == "Oui") ? true : false;
            manufQty = tBody.childNodes[5].childNodes[1].firstChild.nodeValue;
            manufProd = (tBody.childNodes[5].childNodes[2].firstChild.nodeValue == "Oui") ? true : false;

            prodCycle = tBody.childNodes[1].childNodes[3].childNodes[4].nodeValue;
            prodCycle = prodCycle.substring(1, prodCycle.indexOf(" heures"));
            nextProdCycle = tBody.childNodes[1].childNodes[3].lastChild.nodeValue;
            nextProdCycle = nextProdCycle.substring(0, nextProdCycle.indexOf(" heures"));

            if ( divPol ) {
                tBody = divPol.firstChild.firstChild;

                for (var i = 0; i < tBody.childNodes.length; i++) {
                    if ( tBody.childNodes[i].nodeName.toLowerCase() == "tr" ) {
                        var thisPlayer = tBody.childNodes[i].childNodes[1].firstChild.firstChild.nodeValue;
                        thisPlayer = thisPlayer.substring(0, thisPlayer.length-1);
                        if ( thisPlayer == accountName ) {
                            pol = tBody.childNodes[i].childNodes[3].childNodes[2].firstChild.nodeValue;
                            pol = pol.substring(0, pol.indexOf(".0%"));
                            break;
                        }
                    }
                }

                var props = {"gold":  { "qty":    goldQty,   "prod": goldProd      },
                             "tin":   { "qty":    tinQty,    "prod": tinProd       },
                             "iron":  { "qty":    ironQty,   "prod": ironProd      },
                             "food":  { "qty":    foodQty,   "prod": foodProd      },
                             "manuf": { "qty":    manufQty,  "prod": manufProd     },
                             "cycle": { "length": prodCycle, "next": nextProdCycle },
                             "pol":   pol
                };
                return utils.calcBestOffer(props);
            }
        }
    };

    function handleAutoTrade () {
        var bestOffer = findBestOffer();
        var selectArray = document.getElementsByTagName("select");
        var offerSelect = null,
        askSelect = null;

        if ( bestOffer ) {
            var offer = bestOffer.substring(0, bestOffer.indexOf('|'));
            var ask = bestOffer.substring(bestOffer.indexOf('|')+1);

            for (var i = 0; i < selectArray.length; i++) {
                if ( selectArray[i].name == "offre" )
                    offerSelect = selectArray[i];
                if ( selectArray[i].name == "demande" )
                    askSelect = selectArray[i];
            }

            if ( offerSelect && askSelect ) {
                for (var i = 0; i < offerSelect.childNodes.length; i++) {
                    if ( offerSelect.childNodes[i].value.search(offer) != -1 ) {
                        offerSelect.selectedIndex = i;
                        break;
                    }
                }
                for (var i = 0; i < askSelect.childNodes.length; i++) {
                    if ( askSelect.childNodes[i].value.search(ask) != -1 ) {
                        askSelect.selectedIndex = i;
                        break;
                    }
                }
            }

            realWindow.document.getElementById("autoTrade").form.submit();
        }
    };

    this.addAutoTradeButton = function() {
        var selectArray = document.getElementsByTagName("select");
        var offerSelect = null;

        for (var i = 0; i < selectArray.length; i++) {
            if ( selectArray[i].name == "offre" ) {
                offerSelect = selectArray[i];
                break;
            }
        }

        if ( offerSelect ) {
            var newTd = document.createElement("td");
            var newButton = document.createElement("input");
            newButton.type = "button";
            newButton.id = "autoTrade";
            newButton.value = "Comm. Auto.";

            newTd.appendChild(newButton);
            offerSelect.parentNode.parentNode.appendChild(newTd);

            document.addEventListener('click', function(event) {
                    if ( event.target.id == "autoTrade" ) {
                        event.stopPropagation();
                        event.preventDefault();
                        handleAutoTrade();
                    }
                }, true);
        }
    };

}

function Map() {

    this.findPlanetByName = function(name) {
        var allPlanets, thisPlanet;
        allPlanets = document.evaluate(
            "//div/a[@target='detail']",
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null);
        for (var i = 0; i < allPlanets.snapshotLength; i++) {

            thisPlanet = allPlanets.snapshotItem(i);

            if (thisPlanet.lastChild.nodeValue &&
                thisPlanet.lastChild.nodeValue == name + " ") {
                return thisPlanet;
            }
        }
    };

    this.putLeader = function(leader,planet) {
        planet = this.findPlanetByName(planet);
        var planetDiv = (planet == null) ? null : planet.parentNode;

        if (planetDiv != null) {
            var myLeaders = document.evaluate(
                ".//a[contains(@href,'leader.php')]/img",
                planetDiv,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

            var put = true;
            for (var i = 0; i < myLeaders.snapshotLength; i++) {
                if (myLeaders.snapshotItem(i).getAttribute("title") + "(" + utils.getOption("account") + ")" == leader)
                    put = false;
            }

            if (put) {
                var lead = document.createElement('img');
                lead.src = redLeader;
                lead.title = leader;
                var color = utils.getLeaderColor(leader);
                lead.style.border = "1px solid " + color;
                planetDiv.insertBefore(lead, planetDiv.lastChild.nextSibling);
            }
        }
    };

    this.displayUsefulInfomation = function() {
        var planet, leader, lead_array, num;

        var rs = db.execute("select name, position from Leaders where account = ?;", [utils.getOption("account")]);
        while (rs.isValidRow()) {
            def = rs.field(0);
            this.putLeader(rs.field(0), rs.field(1));
            rs.next();
        }
        rs.close();
    };

    function changePlanetBackground(planet) {
        var planetDiv = planet.parentNode;
        var thisAttribute, planetName;

        thisAttribute = planet.getAttribute('onmouseover');
        planetName = thisAttribute.substring(thisAttribute.indexOf('montre_legende')+16, thisAttribute.indexOf('\',\'Controle'));

        var back = document.getElementById('bg_' + planetName);
        if (back)
            back.style.visibility = "visible";
        else {
            planetDiv.style.zIndex = 10;

            back = document.createElement('img');
            back.setAttribute("id", "bg_" + planetName);
            back.src = greenBG;
            back.style.position = "absolute";
            back.style.zIndex = "1";
            back.style.left = planetDiv.style.left;
            back.style.top = planetDiv.style.top;
            back.style.height = 50;
            back.style.width = 50;

            planetDiv.parentNode.insertBefore(back, planetDiv);
        }
    }

    function resetPlanetBackground(planet) {
        var planetDiv = planet.parentNode;
        var thisAttribute, planetName;

        thisAttribute = planet.getAttribute('onmouseover');

        if (thisAttribute != null) {
            planetName = thisAttribute.substring(thisAttribute.indexOf('montre_legende')+16, thisAttribute.indexOf('\',\'Controle'));

            var back = document.getElementById('bg_' + planetName);
            if (back)
                back.style.visibility = "hidden";
        }
    }

    function hackAnimations() {
        realWindow.canvas = document.createElement('canvas');
        var body = document.getElementsByTagName("body")[0];
        var canvas = realWindow.canvas;
        var old_canvas = document.getElementsByTagName("canvas")[0];

        var team = utils.getOption("team");
        var ships_switch = utils.getOption("Ships_switch", "1");
        var leaders_switch = utils.getOption("Leaders_switch", "1");

        canvas.style.position = "absolute";
        canvas.style.left = "0";
        canvas.style.top = "80";
        canvas.style.zIndex = "0";


        canvas.width = (team == Constants.M2 ||
                        team == Constants.F1 ||
                        team == Constants.F2 ||
                        team == Constants.MU) ? "1600" : "800";
        canvas.height = ( team == Constants.E2 || 
                          team == Constants.F2 || 
                          team == Constants.MU ) ? "2000" : "1000";

        var ctx = canvas.getContext('2d');
        ctx.lineCap = "round";
        ctx.lineWidth = 2;

        if (old_canvas == undefined) {
            body.insertBefore(canvas,body.firstChild);
        }
        else {
            body.replaceChild(canvas,old_canvas);
        }

        var imgList = document.getElementsByTagName('img');

        for(var i = 0; i < imgList.length; i++) {
            if( imgList[i].src.search("astro_mini.gif") != -1 ) {
                imgList[i].parentNode.removeChild(imgList[i]);
            }
        }

        realWindow.anim = function () {
            var ctx = realWindow.canvas.getContext('2d');
            realWindow.image.visibility = 'hidden';

            for (var i = 0; i < realWindow.totanim; i++) {
                coordx=realWindow.depx[i] - 54;
                coordy=realWindow.depy[i] + 25;
                destx=realWindow.arrx[i] - 54;
                desty=realWindow.arry[i] + 25;

                if ( realWindow.objvol[i] == 7 && leaders_switch == "1" ) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgb(0,0,255)';
                    ctx.moveTo(coordy,coordx);
                    ctx.lineTo(desty,destx);
                    ctx.stroke();
                    continue;
                }

                if ( realWindow.objvol[i] != 7 && ships_switch == "1" ) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgb(255,255,0)';
                    ctx.moveTo(coordy,coordx);
                    ctx.lineTo(desty,destx);
                    ctx.stroke();
                }
            }

            for (i = 0; i < realWindow.totanim; i++) {
                destx=realWindow.arrx[i] - 55;
                desty=realWindow.arry[i] + 25;

                if ( realWindow.objvol[i] == 7 && leaders_switch == "1" ) {
                    ctx.beginPath();
                    ctx.fillStyle = 'rgb(200,0,255)';
                    ctx.arc(desty, destx, 29, 0, Math.PI*2, false);
                    ctx.fill();
                    continue;
                }

                if ( realWindow.objvol[i] != 7 && ships_switch == "1" ) {
                    ctx.beginPath();
                    ctx.fillStyle = 'rgb(255,0,0)';
                    ctx.arc(desty, destx, 29, 0, Math.PI*2, false);
                    ctx.fill();
                }
            }

            for (i = 0; i < realWindow.totanim; i++) {
                coordx=realWindow.depx[i] - 55;
                coordy=realWindow.depy[i] + 25;

                if ( realWindow.objvol[i] == 7 && leaders_switch == "1" ) {
                    ctx.beginPath();
                    ctx.fillStyle = 'rgb(0,200,255)';
                    ctx.arc(coordy, coordx, 27, 0, Math.PI*2, false);
                    ctx.fill();
                    continue;
                }

                if ( realWindow.objvol[i] != 7 && ships_switch == "1" ) {
                    ctx.beginPath();
                    ctx.fillStyle = 'rgb(0,255,0)';
                    ctx.arc(coordy, coordx, 27, 0, Math.PI*2, false);
                    ctx.fill();
                }
            }

        };

        realWindow.affcible = function () {};
        realWindow.effacecible = function () {};
        realWindow.vole = function () {};

        realWindow.anim();
    };

    this.hackShipsMoves = function() {
        hackGenericMoves("Ships");
    };

    this.hackLeadersMoves = function() {
        hackGenericMoves("Leaders");
    };
    
    function hackGenericMoves(sw) {
        var Generic_switch = utils.getOption(sw + "_switch", "1");

        if ( Generic_switch == "0" ) {
            utils.setOption(sw + "_switch", "1");
        } else {
            utils.setOption(sw + "_switch", "0");
        }
        hackAnimations();
    }

    function highlightMatchingPlanets (sw,crit) {
        var selectedPlanets, thisPlanet, thisAttribute, thisPlanetName;

        resetPlanetsBG();

        if (utils.getOption("BG_switch", "0") == "0") {
            utils.setOption("BG_switch", "1");
        }
        else {
            selectedPlanets = document.evaluate(
                crit,
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

            for (var i = 0; i < selectedPlanets.snapshotLength; i++) {
                thisPlanet = selectedPlanets.snapshotItem(i);

                changePlanetBackground(thisPlanet);
            }
            utils.setOption("BG_switch", "0");
        }
    }

    function resetPlanetsBG() {
        var allPlanets, thisPlanet;

        allPlanets = document.evaluate(
            "//div/a",
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null);

        for (var i = 0; i < allPlanets.snapshotLength; i++) {
            thisPlanet = allPlanets.snapshotItem(i);
            resetPlanetBackground(thisPlanet);
        }
    }

    this.addTopLink = function(sw,label,callback) {
        var allTables,
            topTable,
            link;

        allTables = document.getElementsByTagName("table");
        topTable = allTables[0];

        link = document.createElement("a");
        link.id = sw + "Link";
        link.href = "";
        link.setAttribute("style", "font-size:13px; color:#FFFF33; font-weight:bold");
        link.appendChild(document.createTextNode(" : "));
        link.appendChild(document.createTextNode(label));
        link.appendChild(document.createTextNode(" : "));

        topTable.parentNode.insertBefore(link, topTable);

        document.addEventListener('click', function(event) {
                if ( event.target.id == sw + "Link" ) {
                    event.stopPropagation();
                    event.preventDefault();
                    callback();
                }
            }, true);
    };

    this.highlightFastShuttlePlanets = function() {
        this.highlightMatchingPlanets("FSP", "//div/a[contains(@onmouseover, 'Navette rapide')]");
    };

    this.addFSPLink = function() {
        this.addTopLink("FSP","Navettes rapides",this.highlightFastShuttlePlanets);
    };

    this.highlightGoldPlanets = function() {
        this.highlightMatchingPlanets("Gold", "//div[contains(.,'or-')]/a[contains(@onmouseover, 'Controle')]");
    };

    this.addGoldLink = function() {
        this.addTopLink("Gold","Offres en or",this.highlightGoldPlanets);
    };

    this.highlightEmpirePlanets = function() {
        this.highlightMatchingPlanets("Empire", "//div/a[contains(@onmouseover, 'Empire') and not(contains(@onmouseover, 'Controle : " + utils.getOption("account") + "'))]");
    };

    this.addEmpireLink = function() {
        this.addTopLink("Empire","Planetes Empire manquantes",this.highlightEmpirePlanets);
    };

    this.highlightNeutral = function() {
        this.highlightMatchingPlanets("Neutral", "//div/a[contains(@onmouseover, 'astronefs') and number(substring-after(substring-before(@onmouseover, '% Indécis'), '00CC>')) > 40]");
    };

    this.addNeutralLink = function() {
        this.addTopLink("Neutral","Influence neutre",this.highlightNeutral);
    };

    this.addGenericLinks = function() {
        this.addTopLink("ShipsMoves","Mouvements astronefs", this.hackShipsMoves);
        this.addTopLink("LeadersMoves","Mouvements leaders", this.hackLeadersMoves);
    };

    this.drawSectorHLimits = function(team) {
        var docBody,
            imgLine,
            size;

        //  E2 map is only one sector large
        size = (team == Constants.E2) ? 800 : 1600;
        docBody = document.getElementsByTagName("body")[0];

        for (var i = 0; i < size; i += 80) {
            imgLine = document.createElement("img");
            imgLine.style.position = "absolute";
            imgLine.style.zIndex = "1";
            imgLine.style.top = 1070;
            imgLine.style.left = i;
            imgLine.src = hLine;

            docBody.appendChild(imgLine);
        }
    };

    this.drawSectorVLimits = function(team) {
        var docBody,
            imgLine,
            size;

        //  M2 and F1 maps are only one sector tall
        size = (team == Constants.M2 || team == Constants.F1) ? 1080 : 2080;
        docBody = document.getElementsByTagName("body")[0];

        for (var i = 80; i < size; i += 100) {
            imgLine = document.createElement("img");
            imgLine.style.position = "absolute";
            imgLine.style.zIndex = "1";
            imgLine.style.top = i;
            imgLine.style.left = 790;
            imgLine.src = vLine;

            docBody.appendChild(imgLine);
        }
    };

    function autoselectDestination(planetName, x, y) {
        var planetId = x + "-" + y + "-" + planetName;
        var detailFrame = parent.frames[2];
        var select = null,
            selectDef,
            selectArray,
            inputArray,
            radioBomb,
            radioProtect,
            radioLeader;

        //  ships destination
        if ( detailFrame && detailFrame.location.pathname.search('detail.php') != -1 ) {
            selectArray = detailFrame.document.getElementsByTagName("select");

            for (var i = 0; i < selectArray.length; i++) {
                if ( selectArray[i].name == "cible" ) {
                    select = selectArray[i];
                    break;
                }
            }
            if ( select )
                for (i = 0; i < select.childNodes.length; i++) {
                    if ( select.childNodes[i].value.search(planetId) != -1 ) {
                        select.selectedIndex = i;
                        break;
                    }
                }
        }
        //  leader destination
        else if ( detailFrame && detailFrame.location.pathname.search('leader.php') != -1 ) {
            if ( detailFrame.document.getElementById("action_1") != null ) {
                selectArray = detailFrame.document.getElementsByTagName("select");
                inputArray = detailFrame.document.getElementsByTagName("input");

                for (var i = 0; i < inputArray.length; i++) {
                    if ( inputArray[i].type == "radio" )
                        if ( inputArray[i].value == "1" ) {
                            radioLeader = inputArray[i];
                            break;
                        }
                }

                for (i = 0; i < selectArray.length; i++) {
                    if ( selectArray[i].name == "planete" ) {
                        select = selectArray[i];
                        break;
                    }
                }
            }
            if ( select )
                for (i = 1; i < select.childNodes.length; i++) {
                    if ( select.childNodes[i].value.search(planetId) != -1 ) {
                        select.selectedIndex = i-1;
                        radioLeader.checked = "true";
                        break;
                    }
                }
        }
        //  cruiser destination
        else if ( detailFrame && detailFrame.location.pathname.search('croiseur.php') != -1 ) {
            selectArray = detailFrame.document.getElementsByTagName("select");
            inputArray = detailFrame.document.getElementsByTagName("input");

            for (var i = 0; i < inputArray.length; i++) {
                if ( inputArray[i].type == "radio" )
                    if ( inputArray[i].value == "1" )
                        radioProtect = inputArray[i];
                if ( inputArray[i].value == "2" )
                    radioBomb = inputArray[i];
            }

            for (var i = 0; i < selectArray.length; i++) {
                if ( selectArray[i].name == "cible" )
                    select = selectArray[i];
                if ( selectArray[i].name == "cibledef" )
                    selectDef = selectArray[i];
            }

            if ( select )
                for (var i = 0; i < select.childNodes.length; i++) {
                    if ( select.childNodes[i].value.search(planetId) != -1 ) {
                        select.selectedIndex = i;
                        radioBomb.checked = "true";
                        break;
                    }
                }

            if ( selectDef )
                for (var i = 0; i < selectDef.childNodes.length; i++) {
                    if ( selectDef.childNodes[i].value.search(planetId) != -1 ) {
                        selectDef.selectedIndex = i;
                        radioProtect.checked = "true";
                        break;
                    }
                }

            for (var i = 0; i < selectArray.length; i++) {
                if ( selectArray[i].name == "frappe" )
                    selectX33 = selectArray[i];
            }

            if ( selectX33 )
                for (var i = 0; i < selectX33.childNodes.length; i++) {
                    if ( selectX33.childNodes[i].value.search(planetId) != -1 ) {
                        selectX33.selectedIndex = i;
                        break;
                    }
                }
        }
    }

    this.handlePlanetDblClick = function() {
        document.addEventListener('dblclick', function(event) {
                var planetName,
                    img,
                    link,
                    x,
                    y;

                if ( event.target.nodeName.toLowerCase() == "img" && event.target.src.match("planete")) {
                    event.stopPropagation();
                    event.preventDefault();
                    img = event.target;

                    for (var i = 0; i < img.parentNode.childNodes.length; i++) {
                        if ( img.parentNode.childNodes[i].nodeName.toLowerCase() == "a" ) {
                            link = img.parentNode.childNodes[i];
                            break;
                        }
                    }

                    planetName = link.lastChild.nodeValue.slice(0, link.lastChild.nodeValue.length-1);
                    x = link.href.substr(link.href.indexOf('?x=')+3, 3);
                    y = link.href.substr(link.href.indexOf('&y=')+3, 3);
                    autoselectDestination(planetName, x, y);
                }
            }, true);
    };

    this.newStyle = function() {
        var newStyle = document.createElement("style");
        newStyle.appendChild(document.createTextNode("a:link { color: #09f } \na:visited { color: #09f } \na:hover { color: red} \n"));
        var head = document.getElementsByTagName("head")[0];
        head.appendChild(newStyle);
        var body = document.getElementsByTagName("body")[0];
        body.background = "";
        /*
          allImg = document.getElementsByTagName("img");

          for (var i = 0; i < allImg.length; i++) {
          //GM_log(allImg[i].src);
          if (allImg[i].src == "http://www.fondationjeu.com/images/explode2.gif")
          allImg[i].src = explosionImg;
          //GM_log(allImg[i].src);
          }
        */
    };

    this.installHacks = function() {
        var team = utils.getOption("team");

        this.handlePlanetDblClick();
        this.displayUsefulInfomation();

        this.addGenericLinks();

        if (team == Constants.I3 || team == Constants.SF || team == Constants.MU) {
            this.addFSPLink();
        }

        if (team == Constants.M1 || team == Constants.M2) {
            this.addGoldLink();
        }

        if (team == Constants.E1 || team == Constants.E2) {
            this.addEmpireLink();
        }

        if (team == Constants.MU)
            this.addNeutralLink();

        if (team == Constants.F2 || team == Constants.MU || team == Constants.E2)
            this.drawSectorHLimits(team);

        if (team == Constants.M2 || team == Constants.F2 || team == Constants.MU || team == Constants.F1)
            this.drawSectorVLimits(team);

        utils.setOption("BG_switch", "1");
        hackAnimations();
        this.newStyle();

    };

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
        if (location.href.search("ecrire=") != -1)
            msg.addSignature();

        if (location.href.search("ecrire=") == -1 && location.href.search("envoi=1") == -1) {
            msg.addDeleteButtons();
            msg.addReplyToAll();
        }
    };

    this.leader = function() {
        var leader= new Leader();
        leader.addClickToRadioLabel();
    };

    this.detail = function() {
        if (location.href.search("x=") != -1) {
            var details = new Details();
            details.linkifyLeaders();
            details.addAutoTradeButton();
            details.redesignPage();
        }
    };

    this.map = function() {
        var map = new Map();
        map.installHacks();
    };

    this.test = function() {
        function testCallback(message) {
            alert("Received message from worker " + message.sender + ": \n" + message.body);
        }

        wpMgr.addWorker("test", testCallback);
        wpMgr.runWorker("test", ["3..2..", 1, {helloWorld: "plopida!"}]);
    };
}

function installHacks() {
    var hack = new Hacks();
    var mapping = {"menu.php": "menu",
                   "stats.php": "stats",
                   "map.php": "map",
                   "messages.php": "messages",
                   "detail.php": "detail",
                   "leader.php": "leader"
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
               " (id integer primary key, name varchar(255), position varchar(255), account varchar(15), date varchar(15), color varchar(10))");

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
        wpMgr = new WorkerPoolManager();
        wpMgr.rootUrl = ftkApp + "/workers/";

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
