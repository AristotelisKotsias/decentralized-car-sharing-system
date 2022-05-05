import { load_config } from "./file_utils.js";

// specify config fname
var fname = "configs/rinkeby_config.yml";

var config = load_config(fname);
console.log(config);
