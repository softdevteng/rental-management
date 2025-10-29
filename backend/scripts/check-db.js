const { connectAndSync } = require('../db');
(async ()=>{
  try{
    await connectAndSync();
    console.log('connectAndSync ok');
    process.exit(0);
  }catch(e){
    console.error('connectAndSync failed:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();