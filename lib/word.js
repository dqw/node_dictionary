function add_word_local(word, db) {
    //写入本地数据库
    var stmt = db.prepare("REPLACE INTO word_list VALUES (?,?,?)");
    stmt.run(word.word, JSON.stringify(word.explain), word.times);
    stmt.finalize();
}

function update_word_local(word, db) {
    var stmt = db.prepare("UPDATE word_list SET explain=?,times = times + 1 WHERE word = ?");
    stmt.run(word.explain, word.word);
    stmt.finalize();
}

function search_word_local(key, db, callback) {
    db.serialize(function() {
        db.get("SELECT word,explain,times FROM word_list WHERE word = '"+ key + "'", function(err, row) {
            if(row && row.explain) {
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
        });
    });
}

function search_word_net(word_api, key, callback) {
    var options = {
        host: word_api.host,
        path: word_api.path + key
    };

    var http = require("http");

    http.get(options, function(res) {
        var data = '';

        res.on('data', function (chunk){
            data += chunk;
        });

        res.on('end',function(){
            var explain = qqdict_callback(data);
            if(explain) {
                var word = {};
                word.word = key;
                word.explain = explain;
                word.times = 1;
                callback(word);
            } else {
                callback(null);
            }
        });

    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
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

exports.add_word_local = add_word_local;
exports.update_word_local = update_word_local;
exports.search_word_local = search_word_local;
exports.search_word_net = search_word_net;
