if (location.href.search("x=") != -1) {

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

    var details = new Details();
    details.linkifyLeaders();
    details.addAutoTradeButton();
    details.redesignPage();

}
