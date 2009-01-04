var url = location.href;
var team = url.substring( url.indexOf("equipe=")+7, url.indexOf("&") );
utils.setOption("team", team);
var accountName = utils.getCookieByName("compte");
utils.setOption("account", accountName);
