var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('../lib/iciba.db');

var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');

var w = require('../lib/word.js');

var c = require('../lib/word_config.js');
var word_config = c.getWordConfig('../lib/config.json');

input_word();

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

function render_template(word) {
    if(!word || !word.explain) {
        console.log('--------------------');
        console.log('没有查到');
        console.log('--------------------');
        return false;
    }

    console.log('--------------------');
    console.log('查询次数：' + word.times);

    if(word_config.show_ps_flag && word.explain.ps) {
        console.log('--------------------');
        console.log('音标：');
        word.explain.ps.forEach(function (element_ps) {
            console.log('[' + encoder.htmlDecode(element_ps) + ']');
        });
    }
    if(word_config.show_pos_flag) {
        console.log('--------------------');
        console.log('解释：');
        word.explain.pos.forEach(function (element_pos) {
            console.log(element_pos.pos + ' ' + element_pos.acceptation);
        });
    }
    if(word_config.show_sent_flag) {
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
                w.search_word_net(word_config, key, function(word) {
                    if(word_local) {
                        w.update_word_local(word, db);
                        word.times = word_local.times;
                    } else {
                        if(word) {
                            w.add_word_local(word, db);
                        }
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

