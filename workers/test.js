// worker.js
var wp = google.gears.workerPool;
wp.allowCrossOrigin();
wp.onmessage = function(a, b, message) {
  var reply = message.body[0] + message.body[1] + "... " + message.body[2].helloWorld;
  wp.sendMessage(reply, message.sender);
}
