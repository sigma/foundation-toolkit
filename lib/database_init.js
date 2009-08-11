/* Gearshift, v0.1
 * Copyright (c) 2007 Patrick Quinn-Graham
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

var Gearshift = {
    init: function(a_db, auto_migrate) {
	this.db = a_db;
	if(auto_migrate) {
	    latest_version = this.latestVersion();
	    this.migrateTo(latest_version);
	}
    },
    execSql: function(sql, params) {
	// Taken from the awesome GearsAdmin demo app
	try {
	    var rs = Gearshift.db.execute(sql, params);
	    var rows = new Array();
	    var i = -1;
	    while (rs.isValidRow()) {
		i++;
		var row = new Object();
		for(var j=0; j<rs.fieldCount(); j++) {
		    row[rs.fieldName(j)] = rs.field(j);
		}
		rows[i] = row;
		rs.next();
	    }
	    return {success: true, data: rows};
	} catch (e) {
	    return {success: false, message: e.message};
	}
    },
    latestVersion: function() {
        return this.rules.length - 1;
    },
    initializeGearshiftDB: function() {
	create_table = this.execSql("CREATE TABLE schema_info (version INT)");
	if(!create_table.success) {
	    alert("Gearshift setup failed, couldn't create schema_info table.");
	    return;
	}
	insert_default_migration = this.execSql("INSERT INTO schema_info (version) VALUES (0)");
    },
    setMyVersion: function(i) {
	this.execSql("UPDATE schema_info SET version = ?", [i]);
    },
    whatIsMyVersion: function() {
	b = this.execSql("SELECT version FROM schema_info");
	if(!b.success) {
	    if(!this.initializeGearshiftDB()) {
		return -1; // we couldn't set things up.
	    }
	    return 0;
	}
	if(b.data.length == 0) {
	    return 0;
	}
	return b.data[0].version;
    },
    migrateTo: function(target) {
	currentVersion = this.whatIsMyVersion();
        var rule;
	if(currentVersion == target) {
	    return true; // nothing to do
	}

	if(currentVersion > target) {
	    for(i = currentVersion; i >= target; i--) {
		rule = this.rules[i];
		rule.e = this.execSql;
		if(rule.down()) {
		    this.setMyVersion(i == 0 ? 0 : (i - 1));
		} else {
		    alert("Migrate down from version " + i + " failed.");
		    return false;
		}
	    }
	}
	if(currentVersion < target) {
	    for(i = (currentVersion + 1); i <= target; i++) {
		rule = this.rules[i];
		rule.e = this.execSql;
		if(rule.up()) {
		    this.setMyVersion(i);
		} else {
		    alert("Migrate to version " + i + "failed.");
		    return false;
		}
	    }
	}
        return true;
	// alert("Database upgraded from v" + currentVersion + " to v" + this.whatIsMyVersion());
    },
    rules: [{
		up: function() { return true; }, down: function() { return true; }
	    }]
};

Gearshift.rules[1] = {
    // create the demo table
    up: function() {
        a = this.e("CREATE TABLE Options " +
                   "(name varchar(255) primary key, value varchar(255))").success;
        b = this.e("CREATE TABLE Signatures " +
                   "(account varchar(255) primary key, signature varchar(255))").success;
        c = this.e("CREATE TABLE Leaders " +
                   "(id integer primary key, name varchar(255), " +
                   "position varchar(255), account varchar(15), " +
                   "date varchar(15))").success;
        d = this.e("CREATE TABLE Leaders_color " +
                   "(id integer primary key, name varchar(255), " +
                   "account varchar(15), color varchar(10))").success;
        return a && b && c && d;
    },
    down: function() {
        a = this.e("DROP TABLE Options").success;
        b = this.e("DROP TABLE Signatures").success;
        c = this.e("DROP TABLE Leaders").success;
        d = this.e("DROP TABLE Leaders_color").success;
        return a && b && c && d;
    }
};

Gearshift.rules[2] = {
    up: function() {
        a = this.e("CREATE VIRTUAL TABLE Messages_search USING fts2(author, channel, body)").success;
        b = this.e("CREATE TABLE Messages_meta (date integer)").success;
        c = this.e("CREATE TABLE Notifications " +
                   "(id integer primary key, title varchar(255), " +
                   "body text)").success;
        return a && b && c;
    },
    down: function() {
        a = this.e("DROP TABLE Messages_search").success;
        b = this.e("DROP TABLE Messages_meta").success;
        c = this.e("DROP TABLE Notifications").success;
        return a && b && c;
    }
};

if (db) {
    Gearshift.init(db, true);
}
