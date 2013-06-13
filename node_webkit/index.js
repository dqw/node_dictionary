$(document).ready(function() {

    var gui = require('nw.gui');
    var win = gui.Window.get();
    var home_path = process.env['HOME']; 

    function get_api (api_name) {
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
    var word_api;


    win.on('focus', function() {
        $("#key").select();
    });

    var fs = require("fs");
    fs.readFile('../../config.json', function(err, data) {
        if(err) {
            console.log(err);
            word_api = get_api('iciba');
        } else {
            data_json = JSON.parse(data);
            word_api = get_api(data_json.api);
        }
    });

    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('../../iciba.db');

    var $message = $("#message");

    $("#btn_search").click(function() {
        var key = $("#key").val();
        if(key !== "") { 
            show_message("查询中", "success");
            clear_result();
            search_word_local(key, function(word) {
                if(word) {
                    show_result(word);
                } else {
                    search_word_net(key, function(word){
                        if(word) {
                            word.times = 1;
                            //写入本地数据库
                            var stmt = db.prepare("REPLACE INTO word_list VALUES (?,?,?)");
                            stmt.run(word.word, word.explain, word.times);
                            stmt.finalize();

                            show_result(word);
                        } else {
                            show_message("单词查询失败", "fail");
                        }
                    });
                }
            });
        } else {
            show_message("单词不能为空", "fail");
        }
    });

    $("#explain").on("click", "#update", function() {
        show_message("更新中", "success");
        clear_result();
        var key = $(this).attr("data-word");
        search_word_net(key, function(word){
            //写入本地数据库
            var stmt = db.prepare("UPDATE word_list SET explain=?,times = times + 1 WHERE word = ?");
            stmt.run(word.explain, word.word);
            stmt.finalize();

            word.update_flag = 'update';

            show_result(word);
        });
    });

    function clear_result() {
        $("#explain").html("");
    }

    function show_result(word) {
        var html = render_template(word);
        show_message("查询成功", "success");
        $("#explain").html(html);
    }

    function show_message(message, type) {
        if(type == "success") {
            $message.remove("message-fail").addClass("message-success").text(message).show();
        } else {
            $message.removeClass("message-success").addClass("message-fail").text(message).show();
        }
    }

    function render_template(word) {
        var explain = JSON.parse(word.explain);
        var result_html = template.render('result', { word: word });
        var ps_html = template.render('ps', { list: explain.ps });
        var pos_html = template.render('pos', { list: explain.pos });
        var sent_html = template.render('sent', { list: explain.sent });
        return result_html + ps_html + pos_html + sent_html;
    }

    function search_word_local(key, callback) {
        db.serialize(function() {
            db.get("SELECT word,explain,times FROM word_list WHERE word = '"+ key + "'", function(err, row) {
                if(row) {
                    if(row.explain) {
                        db.run("UPDATE word_list SET times = times + 1 WHERE word = ?", key);
                        var word = {};
                        word.word = key;
                        word.explain = row.explain;
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

    function search_word_net(key, callback) {
        $.get(word_api.api + key)
        .done(function(data) {
            var result = word_api.callback(data);
            var word = {};
            word.word = key;
            word.explain = JSON.stringify(result);
            word.origin = "网络";
            callback(word);
        })
        .fail(function(data) {
            callback(null);
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
        data = data.local[0];

        var explain = {};

        explain.ps = data.pho;

        var pos = [];
        data.des.forEach(function(ele, i) {
            var pos_item = {};
            pos_item.pos = ele.p;
            pos_item.acceptation = ele.d; 
            pos[i] = pos_item;
        });
        explain.pos = pos;

        var sent = [];
        var i = 0;
        data.sen.forEach(function(element_sent_group) {
            element_sent_group.s.forEach(function(element_sent) {
                var sent_item = {};
                sent_item.orig = element_sent.es + '(' + element_sent_group.p + ')'; 
                sent_item.trans = element_sent.cs; 
                sent[i] = sent_item;
                i++;
            });
        });
        explain.sent = sent;

        return explain;

    }
});
