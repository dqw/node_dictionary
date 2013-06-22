$(document).ready(function() {

    var gui = require('nw.gui');
    var win = gui.Window.get();
    var url = require("url");
    //var home_path = process.env['HOME']; 

    var w = require('../../lib/word.js');

    function get_api (api_name) {
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
    var word_api;


    win.on('focus', function() {
        $("#key").select();
    });

    var fs = require("fs");
    fs.readFile('../../lib/config.json', function(err, data) {
        if(err) {
            console.log(err);
            word_api = get_api('iciba');
        } else {
            data_json = JSON.parse(data);
            word_api = get_api(data_json.api);

            var url_parse = url.parse(word_api.api);
            word_api.host = url_parse.host;
            word_api.path = url_parse.path;
        }
    });

    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('../../lib/iciba.db');

    var $message = $("#message");

    $("#btn_search").click(function() {
        var key = $("#key").val();
        if(key !== "") { 
            show_message("查询中", "success");
            clear_result();
            w.search_word_local(key, db, function(word) {
                if(word) {
                    show_result(word);
                } else {
                    w.search_word_net(word_api, key, function(word){
                        if(word) {
                            w.add_word_local(word, db);
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
        w.search_word_net(word_api, key, function(word){
            w.update_word_local(word, db);

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
        var result_html = template.render('result', { word: word});
        var ps_html = template.render('ps', { list: word.explain.ps });
        var pos_html = template.render('pos', { list: word.explain.pos });
        var sent_html = template.render('sent', { list: word.explain.sent });
        return result_html + ps_html + pos_html + sent_html;
    }

});
