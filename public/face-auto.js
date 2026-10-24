// One challenge per person entering view; re-arm only after two empty frames.
window.createAutoFaceScanner=({detect,scan,status,canRun,schedule=setTimeout,cancel=clearTimeout})=>{
 let running=false,pending=false,waitingForClear=false,empty=0,timer=null,generation=0;
 async function poll(epoch){
  if(!running||epoch!==generation)return;
  try{
   if(canRun()){
    pending=true;const count=await detect();
    if(!running||epoch!==generation)return;
    if(waitingForClear){empty=count===0?empty+1:0;if(empty>=2){waitingForClear=false;empty=0;status('Ready for the next face.');}}
    else if(count===1){waitingForClear=true;status('Face detected. Follow the liveness prompts.');await scan();if(running&&epoch===generation)status('Step out of view before the next scan.');}
    else status(count>1?'Keep only one person in the camera.':'Waiting for a face. Attendance scans automatically.');
   }
  }catch(e){status(e.message);}finally{pending=false;if(running&&epoch===generation)timer=schedule(()=>poll(epoch),800);}
 }
 return {start(){if(running)return;running=true;generation++;poll(generation);},stop(){running=false;generation++;cancel(timer);timer=null;waitingForClear=false;empty=0;},get running(){return running},get pending(){return pending}};
};
