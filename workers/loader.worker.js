// worker.js
function doIt() {
    var wp = google.gears.workerPool;
    wp.allowCrossOrigin();
    wp.onmessage = function(a, b, message) {
        var request = google.gears.factory.create("beta.httprequest");
        
        request.open("GET", message.body);
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                wp.sendMessage(request.responseText, message.sender); 
            }
        };
        request.send();
    };
}

doIt();
