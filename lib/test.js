function testCallback(message) {
    alert("Received message from worker " + message.sender + ": \n" + message.body);
}

wpMgr.addWorker("test", testCallback);
wpMgr.runWorker("test", ["3..2..", 1, {helloWorld: "plopida!"}]);
