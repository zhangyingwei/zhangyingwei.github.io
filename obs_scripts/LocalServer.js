const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);


// execure command function 
async function executeCommand() {
  const path = app.fileManager.vault.adapter.basePath;
  console.log(path);
  // const { stdout, stderr } = await exec('open -a iTerm -e "/opt/homebrew/bin/hugo serve -w --buildDrafts -s ' + path+'"');
  // const commandStr = `open -a iTerm -e "${path} && /opt/homebrew/bin/hugo serve -w --buildDrafts"`
  const { stdout, stderr } = await exec("open -a iTerm -e "+path);
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
  if (stdout) {
    new Notice("Start Local Server Successed.")
  }else{
    new Notice("Start Local Server Faild. "+stderr)
  }
}

module.exports = async function(context, req) {
  await executeCommand();
}