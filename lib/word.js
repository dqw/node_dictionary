var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('iciba.db');

function add_word_local(word) {
    //写入本地数据库
    var stmt = db.prepare("REPLACE INTO word_list VALUES (?,?,?)");
    stmt.run(word.word, JSON.stringify(word.explain), word.times);
    stmt.finalize();
}

function update_word_local(word) {
    var stmt = db.prepare("UPDATE word_list SET explain=?,times = times + 1 WHERE word = ?");
    stmt.run(word.explain, word.word);
    stmt.finalize();
}

function search_word_local(key, callback) {
    db.serialize(function() {
        db.get("SELECT word,explain,times FROM word_list WHERE word = '"+ key + "'", function(err, row) {
            if(row) {
                if(row.explain) {
                    db.run("UPDATE word_list SET times = times + 1 WHERE word = ?", key);
                    var word = {};
                    word.word = key;
                    word.explain = JSON.parse(row.explain);
                    word.times = row.times;
                    word.origin = "本地缓存";
                    callback(word);
                } else {
                    callback(null);
                }
            } else {
                callback(null);
            }
        });
    });
}

function search_word_net(word_api, key, callback) {
    var options = {
        host: word_api.host,
        path: word_api.path + key
    };

    http.get(options, function(res) {
        var data = '';

        res.on('data', function (chunk){
            data += chunk;
        });

        res.on('end',function(){
            var explain = qqdict_callback(data);
            var word = {};
            word.word = key;
            word.explain = explain;
            word.times = 1;
            callback(word);
        });

    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}

function iciba_callback(data) {

    var explain = {};

    var $ps = $(data).find("ps");
    var ps = [];
    $ps.each(function(i, ele) {
        ps[i] = $(ele).text();
    });
    explain.ps = ps;

    var $pos = $(data).find("pos");
    var $acceptation = $(data).find("acceptation");
    var pos = [];
    $pos.each(function(i, ele) {
        var temp = {};
        temp.pos = $(ele).text();
        temp.acceptation = $($acceptation[i]).text();
        pos[i] = temp;
    });
    explain.pos = pos;

    var $sent = $(data).find("sent");
    var sent = [];
    $sent.each(function(i, ele) {
        var temp = {};
        temp.orig = $(ele).children("orig").text();
        temp.trans = $(ele).children("trans").text();
        sent[i] = temp;
    });
    explain.sent = sent;

    return explain;
}

function qqdict_callback(data) {

    data = JSON.parse(data);

    if(!data.local) {
        return null;
    }

    data = data.local[0];

    var explain = {};

    explain.ps = data.pho;

    var pos = [];
    if(data.des) {
        data.des.forEach(function(ele, i) {
            var pos_item = {};
            pos_item.pos = ele.p?ele.p:'';
            pos_item.acceptation = ele.d; 
            pos[i] = pos_item;
        });
    }
    explain.pos = pos;

    var sent = [];
    var i = 0;
    if(data.sen) {
        data.sen.forEach(function(element_sent_group) {
            element_sent_group.s.forEach(function(element_sent) {
                var sent_item = {};
                sent_item.orig = element_sent.es + '(' + element_sent_group.p + ')'; 
                sent_item.trans = element_sent.cs; 
                sent[i] = sent_item;
                i++;
            });
        });
    }
    explain.sent = sent;

    return explain;

}

