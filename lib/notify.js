function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

var purr_style = "#purr-container {position: fixed; top: 0; left: 0; z-index: 99;} " +
    ".notice {position: relative; width: 324px;} " +
    ".notice .close {position: absolute; top: 12px; right: 12px; display: block; width: 18px; height: 17px; text-indent: -9999px; background: url(" +
    ftkApp +
    "/images/purrClose.png) no-repeat 0 10px;} " +
    ".notice-body {min-height: 50px; padding: 22px 22px 0 22px; background: url(" +
    ftkApp +
    "/images/purrTop.png) no-repeat left top; color: #f9f9f9;} " +
    ".notice-body img {width: 50px; margin: 0 10px 0 0; float: left;} " +
    ".notice-body h3 {margin: 0; font-size: 1.1em;} " +
    ".notice-body p {margin: 5px 0 0 60px; font-size: 0.8em; line-height: 1.4em;} " +
    ".notice-bottom {height: 22px; background: url(" +
    ftkApp +
    "/images/purrBottom.png) no-repeat left top;}";

addGlobalStyle(purr_style);

Notify = function() {

    this.notice = function(title, msg) {
        var notice = '<div class="notice">'
            + '<div class="notice-body">'
            + "<img src='"
            + ftkApp
            + "/images/info.png' alt=''>"
            + '<h3>' + title + '</h3>'
            + '<p>' + msg + '</p>'
            + '</div>'
            + '<div class="notice-bottom">'
            + '</div>'
            + '</div>';

        $( notice ).purr(
            {
                usingTransparentPNG: true
            }
        );
    };

    this.notifyAll = function() {
        var rs = db.execute("select title, body from Notifications;");
        while (rs.isValidRow()) {
            this.notice(rs.field(0), rs.field(1));
            rs.next();
        }
        rs.close();
        db.execute("delete from Notifications;").close();
    };
};
