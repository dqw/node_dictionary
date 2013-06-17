//var key = process.argv[2];
//var argv3 = process.argv[3];
var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var http = require("http");
var url = require("url");

var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');

var word_api;
var show_ps_flag = true;
var show_pos_flag = true;
var show_sent_flag = true;

var fs = require("fs");
fs.readFile('../config.json', function(err, data) {
    if(!err) {
        data_json = JSON.parse(data);
        word_api = get_api(data_json.api);

        show_ps_flag = data_json.show_ps_flag;
        show_pos_flag = data_json.show_pos_flag;
        show_sent_flag = data_json.show_sent_flag;

    } else {
        console.log(err);
        word_api = get_api('iciba');
    }

    var url_parse = url.parse(word_api.api);
    word_api.host = url_parse.host;
    word_api.path = url_parse.path;

    input_word();
});

function input_word() {
    rl.question("word:", function(key) {
        if(key) {
            search_word(key, function() {
                input_word();
            });
        } else {
            rl.close();
        }
    });
}

function search_word(key, callback) {
    if(key) {
        search_word_net(key, function(word) {
            render_template(word);
            callback();
        });
    } else {
        console.log('输入要查的单词');
    }
}

function search_word_net(key, callback) {
    var options = {
        host: word_api.host,
        path: word_api.path + key
    };

    http.get(options, function(res) {
        //console.log(res.statusCode);
        var data = '';

        res.on('data', function (chunk){
            data += chunk;
        });

        res.on('end',function(){
            word = qqdict_callback(data);
            callback(word);
        });

    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}

function get_api(api_name) {
    var iciba = {};
    iciba.api = 'http://dict-co.iciba.com/api/dictionary.php?w=';
    iciba.callback = iciba_callback;

    var qqdict = {}; 
    qqdict.api = 'http://dict.qq.com/dict?q=';
    qqdict.callback = qqdict_callback;

    if(api_name === 'qqdict') {
        return qqdict;
    } else {
        return iciba;
    }
}

function render_template(word) {
    if(!word) {
        console.log('------------------------------------------------------------');
        console.log('没有查到');
        console.log('------------------------------------------------------------');
        return false;
    }

    if(show_ps_flag) {
        console.log('------------------------------------------------------------');
        console.log('音标：');
        word.ps.forEach(function (element_ps) {
            console.log('[' + encoder.htmlDecode(element_ps) + ']');
        });
    }
    if(show_pos_flag) {
        console.log('------------------------------------------------------------');
        console.log('解释：');
        word.pos.forEach(function (element_pos) {
            console.log(element_pos.pos + ' ' + element_pos.acceptation);
        });
    }
    if(show_sent_flag) {
        console.log('------------------------------------------------------------');
        console.log('例句：');
        word.sent.forEach(function (element_sent) {
            console.log(element_sent.orig);
            console.log(element_sent.trans);
        });
    }
    console.log('------------------------------------------------------------');
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
            pos_item.pos = ele.p;
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
