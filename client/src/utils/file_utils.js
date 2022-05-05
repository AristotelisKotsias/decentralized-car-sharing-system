var fs = require("fs");
var yaml = require("js-yaml");

export function load_config(config_fname) {
  var flContent = fs.readFileSync(config_fname, "utf8");
  var config = yaml.load(flContent);
  return config;
}
