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
                    color = utils.getLeaderColor(leader);
                    if (color == null) {
                        color = utils.leaderColors[0];
                        db.execute("insert into Leaders_color (name, account, color) values (?,?,?)", [leader, utils.getOption("account"), color]);
                    }
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
        var nleaders = db.execute("select count(*) from Leaders where account = '" + utils.getOption("account") + "'").field(0);
        db.execute("insert into Notifications (title, body) values (?,?)", ["Positions", "Updated info for " + nleaders + " leaders"]);
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

var st = new Stats();
if (!st.detectAutoTrading()) {
    st.installHacks();
}

function mynotify() {
    var n = new Notify();
    n.notifyAll();
}

wpMgr.loadLib("notify", mynotify);
