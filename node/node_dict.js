var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var url = require("url");

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('../lib/iciba.db');

var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');

var w = require('../lib/word.js');

var word_api;
var show_ps_flag = true;
var show_pos_flag = true;
var show_sent_flag = true;

var fs = require("fs");
fs.readFile('../lib/config.json', function(err, data) {
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

function get_api(api_name) {
    var iciba = {};
    iciba.api = 'http://dict-co.iciba.com/api/dictionary.php?w=';

    var qqdict = {}; 
    qqdict.api = 'http://dict.qq.com/dict?q=';

    if(api_name === 'qqdict') {
        return qqdict;
    } else {
        return iciba;
    }
}

function render_template(word) {
    if(!word.explain) {
        console.log('--------------------');
        console.log('没有查到');
        console.log('--------------------');
        return false;
    }

    console.log('--------------------');
    console.log('查询次数：' + word.times);

    if(show_ps_flag) {
        console.log('--------------------');
        console.log('音标：');
        word.explain.ps.forEach(function (element_ps) {
            console.log('[' + encoder.htmlDecode(element_ps) + ']');
        });
    }
    if(show_pos_flag) {
        console.log('--------------------');
        console.log('解释：');
        word.explain.pos.forEach(function (element_pos) {
            console.log(element_pos.pos + ' ' + element_pos.acceptation);
        });
    }
    if(show_sent_flag) {
        console.log('--------------------');
        console.log('例句：');
        word.explain.sent.forEach(function (element_sent) {
            console.log(element_sent.orig);
            console.log(element_sent.trans);
        });
    }
    console.log('********************');
}


function search_word(key, callback) {
    if(key) {
        var first_letter = key.substring(0,1);
        if(first_letter === '*') {
            key = key.substring(1);
        }
        w.search_word_local(key, db, function(word_local) {
            if(word_local && first_letter !== '*') {
                render_template(word_local);
                callback();
            } else {
                w.search_word_net(word_api, key, function(word) {
                    if(word_local) {
                        w.update_word_local(word, db);
                        word.times = word_local.times;
                    } else {
                        w.add_word_local(word, db);
                    }
                    render_template(word);
                    callback();
                });
            }
        });
    } else {
        console.log('输入要查的单词');
    }
}

