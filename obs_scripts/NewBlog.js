const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

function getUUIDAsFileName() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx4xxxyxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid;
}

function getCreateTimeAsFileName() {
  var d = new Date();
  var year = d.getFullYear();
  var month = d.getMonth()+1;
  var day = d.getDate();
  var hour = d.getHours();
  var minute = d.getMinutes();
  var second = d.getSeconds();
  var time = year+"m"+month+"d"+day+"h"+hour+"m"+minute+"s"+second;
  return time;
}

// execure command function 
async function executeCommand() {
  const fileName = getCreateTimeAsFileName()+".md";
  const { stdout, stderr } = await exec('/opt/homebrew/bin/hugo new posts/' +fileName,{cwd: app.fileManager.vault.adapter.basePath});
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
  if (stdout) {
    new Notice("New Blog Created["+fileName+"]")
  }else{
    new Notice("New Blog Create Faild. "+stderr)
  }
}

module.exports = async function(context, req) {
  await executeCommand();
}