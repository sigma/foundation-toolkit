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

var leader= new Leader();
leader.addClickToRadioLabel();
