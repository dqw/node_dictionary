$(document).ready(function() {

    var gui = require('nw.gui');
    var win = gui.Window.get();
    var url = require("url");
    //var home_path = process.env['HOME']; 

    var w = require('../../lib/word.js');

    var c = require('../../lib/word_config.js');
    var word_config = c.getWordConfig('../../lib/config.json');

    win.on('focus', function() {
        $("#key").select();
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
                    w.search_word_net(word_config, key, function(word){
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
        w.search_word_net(word_config, key, function(word){
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
        var ps_html = '';
        var pos_html = '';
        var sent_html = '';
        if(word_config.show_ps_flag) {
            ps_html = template.render('ps', { list: word.explain.ps });
        }
        if(word_config.show_pos_flag) {
            pos_html = template.render('pos', { list: word.explain.pos });
        }
        if(word_config.show_sent_flag) {
            sent_html = template.render('sent', { list: word.explain.sent });
        }
        return result_html + ps_html + pos_html + sent_html;
    }

});
