function getWordConfig(config_file) {
    var fs = require("fs");
    var url = require("url");

    var word_config = {};
    var data = fs.readFileSync(config_file);
    var data_json = JSON.parse(data);
    word_config.api = getApi(data_json.api);
    var url_parse = url.parse(word_config.api);
    word_config.host = url_parse.host;
    word_config.path = url_parse.path;
    word_config.show_ps_flag = data_json.show_ps_flag;
    word_config.show_pos_flag = data_json.show_pos_flag;
    word_config.show_sent_flag = data_json.show_sent_flag;

    return word_config;
}

function getApi(api_name) {
    var iciba = 'http://dict-co.iciba.com/api/dictionary.php?w=';
    var qqdict = 'http://dict.qq.com/dict?q=';

    if(api_name === 'qqdict') {
        return qqdict;
    } else {
        return iciba;
    }
}

exports.getWordConfig = getWordConfig;


