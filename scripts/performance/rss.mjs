import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import {digest} from './evidence.mjs';

export const RSS_PROTOCOL=Object.freeze({maxAttempts:3,deadlineMs:700});
export const RSS_METHODS=Object.freeze({
  darwin:'macOS batched ps pid,rss; bracketed CDP owned PID membership; up to 3 whole snapshots within 700 ms; shared-page double counting',
  linux:'Linux /proc VmRSS; bracketed CDP owned PID membership; up to 3 whole snapshots within 700 ms; shared-page double counting',
});
const exec=promisify(execFile);
function assert(ok,message){if(!ok)throw Error(message);}
function identities(info) {
  assert(Array.isArray(info)&&info.length,'No owned Chromium process IDs');
  assert(info.every(p=>Number.isSafeInteger(p.id)&&p.id>0&&typeof p.type==='string'),'Invalid owned Chromium PID/type');
  assert(new Set(info.map(p=>p.id)).size===info.length,'Duplicate owned Chromium PID');
  return info.map(p=>({id:p.id,type:p.type})).sort((a,b)=>a.id-b.id);
}
const sameMembership=(a,b)=>digest(identities(a))===digest(identities(b));
const errorData=e=>({message:String(e?.message??e),code:e?.code??null,signal:e?.signal??null});

export function parsePsRows(stdout,info) {
  assert(typeof stdout==='string','Invalid ps stdout');
  identities(info);const rows=[];
  for(const line of stdout.split('\n').filter(line=>line.trim())) {
    const m=line.match(/^\s*(\d+)\s+(\d+)\s*$/);
    assert(m,'Malformed ps PID/RSS row');const pid=Number(m[1]),rssKiB=Number(m[2]);
    const owner=info.find(p=>p.id===pid);
    assert(owner,'RSS PID not owned by measured browser');
    assert(!rows.some(p=>p.pid===pid),'Duplicate RSS PID');
    assert(Number.isSafeInteger(rssKiB)&&rssKiB>0,'Invalid owned RSS KiB');
    rows.push({pid,type:owner.type,rssKiB,rssBytes:rssKiB*1024});
  }
  return rows;
}

// Each retry replaces the whole snapshot. Missing live processes never retry.
// The shorter reader deadline leaves the unchanged 250+1000 ms cadence/gap
// bounds intact. Failed attempts and structured errors remain in raw evidence.
export async function readOwnedRss(browserCdp,{platform=os.platform(),runPs,readStatus,
  clock=()=>performance.now(),protocol=RSS_PROTOCOL}={}) {
  const raw={platform,method:RSS_METHODS[platform],protocol:{...protocol},requestStartMs:clock(),attempts:[],status:'running'};
  const pending=new Set(),controller=new AbortController();let timer;
  function invoke(operation) {
    if(controller.signal.aborted)throw Error('Owned RSS deadline exceeded');
    const promise=Promise.resolve().then(operation);pending.add(promise);
    promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;
  }
  async function enumerate(row) {
    row.requestStartMs=clock();
    try{row.processInfo=(await invoke(()=>browserCdp.send('SystemInfo.getProcessInfo'))).processInfo;identities(row.processInfo);}
    catch(e){row.error=errorData(e);throw e;}finally{row.responseEndMs=clock();}
    return row;
  }
  async function read(info,row) {
    Object.assign(row,{requestStartMs:clock(),processes:[]});
    try {
      if(platform==='darwin') {
        const args=['-o','pid=,rss=','-p',info.map(p=>p.id).join(',')];
        row.command='/bin/ps';row.args=args;
        try {
          const result=await invoke(()=>runPs?runPs(args,{signal:controller.signal}):
            exec('/bin/ps',args,{encoding:'utf8',signal:controller.signal,maxBuffer:1024*1024}));
          row.result={stdout:result.stdout??'',stderr:result.stderr??'',code:result.code??0,signal:result.signal??null};
        }catch(e){row.result={stdout:e.stdout??'',stderr:e.stderr??'',...errorData(e)};}
        assert([0,1].includes(row.result.code)&&row.result.signal===null&&!row.result.stderr.trim(),
          `Owned ps reader failed: ${JSON.stringify(row.result)}`);
        row.processes=parsePsRows(row.result.stdout,info);
      }else if(platform==='linux') {
        row.reads=info.map(p=>({pid:p.id,type:p.type,requestStartMs:clock()}));
        await Promise.all(row.reads.map(async item=>{
          const p={id:item.pid,type:item.type};
          try {
            const text=await invoke(()=>readStatus?readStatus(p.id,{signal:controller.signal}):
              readFile(`/proc/${p.id}/status`,{encoding:'utf8',signal:controller.signal}));
            item.vmRss=text.match(/^VmRSS:\s+(\d+) kB$/m)?.[0];
            const rssKiB=Number(item.vmRss?.match(/(\d+) kB$/)?.[1]);
            assert(Number.isSafeInteger(rssKiB)&&rssKiB>0,`No owned RSS for PID ${p.id}`);
            item.rssKiB=rssKiB;item.rssBytes=rssKiB*1024;
          }catch(e){item.error=errorData(e);}finally{item.responseEndMs=clock();}
        }));
        for(const item of row.reads)if(!item.error)row.processes.push({pid:item.pid,type:item.type,rssKiB:item.rssKiB,rssBytes:item.rssBytes});
        assert(row.reads.every(p=>!p.error||p.error.code==='ENOENT'),'Owned proc reader failed for non-exit reason');
      }else throw Error(`Owned RSS unsupported on ${platform}`);
      row.status=row.processes.length===info.length?'complete':'partial';
    }catch(e){row.status='failed';row.error=errorData(e);}
    finally{row.responseEndMs=clock();}
    return row;
  }
  async function collect() {
    assert(RSS_METHODS[platform],`Owned RSS unsupported on ${platform}`);
    for(let number=1;number<=protocol.maxAttempts;number++) {
      const attempt={number,startMs:clock(),status:'running'};raw.attempts.push(attempt);
      try {
        attempt.before={};await enumerate(attempt.before);
        attempt.read={};await read(attempt.before.processInfo,attempt.read);
        // Even a read failure gets a fresh ownership check and stays retained.
        attempt.after={};await enumerate(attempt.after);
        attempt.departedPids=attempt.before.processInfo.filter(p=>!attempt.after.processInfo.some(q=>q.id===p.id)).map(p=>p.id);
        attempt.arrivedPids=attempt.after.processInfo.filter(p=>!attempt.before.processInfo.some(q=>q.id===p.id)).map(p=>p.id);
        assert(attempt.read.status!=='failed',attempt.read.error?.message??'Owned RSS reader failed');
        const missing=attempt.before.processInfo.filter(p=>!attempt.read.processes.some(q=>q.pid===p.id));
        assert(missing.every(p=>!attempt.after.processInfo.some(q=>q.id===p.id)),
          `Unreadable live owned PID: ${missing.filter(p=>attempt.after.processInfo.some(q=>q.id===p.id)).map(p=>p.id)}`);
        if(sameMembership(attempt.before.processInfo,attempt.after.processInfo)) {
          assert(!missing.length,'Owned RSS process coverage missing');attempt.status='complete';
          raw.value=attempt.read.processes.reduce((sum,p)=>sum+p.rssBytes,0);
          // Preserve an earlier fully read higher sum even when its PID set
          // changed afterwards. Partial sums never supply a fake zero/peak.
          raw.peakValue=Math.max(...raw.attempts.filter(a=>a.read?.status==='complete').map(a=>a.read.processes.reduce((sum,p)=>sum+p.rssBytes,0)));
          return;
        }
        attempt.status='turnover';
      }catch(e){attempt.status='failed';attempt.error=errorData(e);throw e;}
      finally{attempt.endMs=clock();}
    }
    throw Error('Owned RSS turnover exceeded complete-snapshot retry bound');
  }
  try {
    await Promise.race([collect(),new Promise((_,reject)=>{
      timer=setTimeout(()=>{controller.abort();reject(Error('Owned RSS deadline exceeded'));},protocol.deadlineMs);
    })]);
    raw.responseEndMs=clock();raw.status='measured';
    validateOwnedRss(raw,{requestStartMs:raw.requestStartMs,responseEndMs:raw.responseEndMs,protocol});
    return raw;
  }catch(e){
    controller.abort();raw.status='failed';raw.responseEndMs=clock();raw.pendingRequestCount=pending.size;
    const failure=Error(`Owned RSS snapshot failed: ${e.message}`,{cause:e});
    failure.evidence=structuredClone(raw);failure.pendingRequestCount=pending.size;throw failure;
  }finally{clearTimeout(timer);}
}

export function validateOwnedRss(raw,{requestStartMs,responseEndMs,protocol=RSS_PROTOCOL}) {
  assert(raw?.status==='measured'&&RSS_METHODS[raw.platform]===raw.method,'RSS method/platform/status invalid');
  assert(digest(raw.protocol)===digest(protocol),'RSS retry protocol changed');
  assert(raw.requestStartMs>=requestStartMs&&raw.responseEndMs<=responseEndMs&&raw.responseEndMs>=raw.requestStartMs&&
    raw.responseEndMs-raw.requestStartMs<=protocol.deadlineMs,'RSS snapshot request boundary/deadline invalid');
  assert(Array.isArray(raw.attempts)&&raw.attempts.length>0&&raw.attempts.length<=protocol.maxAttempts,'RSS snapshot retry bound invalid');
  let previous=raw.requestStartMs;const sums=[];
  for(const [i,a] of raw.attempts.entries()) {
    assert(a.number===i+1&&a.startMs>=previous&&a.endMs>=a.startMs&&a.endMs<=raw.responseEndMs,'RSS attempt boundary invalid');
    previous=a.endMs;
    for(const enumeration of [a.before,a.after]) {
      identities(enumeration?.processInfo);
      assert(!enumeration.error&&enumeration.requestStartMs>=a.startMs&&enumeration.responseEndMs>=enumeration.requestStartMs&&enumeration.responseEndMs<=a.endMs,'RSS process enumeration boundary invalid');
    }
    const read=a.read,info=a.before.processInfo;
    assert(['complete','partial'].includes(read?.status)&&!read.error&&read.requestStartMs>=a.before.responseEndMs&&
      read.responseEndMs>=read.requestStartMs&&a.after.requestStartMs>=read.responseEndMs,'RSS read boundary/status invalid');
    let rows;
    if(raw.platform==='darwin') {
      assert(read.command==='/bin/ps'&&digest(read.args)===digest(['-o','pid=,rss=','-p',info.map(p=>p.id).join(',')]),'RSS ps command/PID provenance invalid');
      assert([0,1].includes(read.result?.code)&&read.result.signal===null&&typeof read.result.stderr==='string'&&!read.result.stderr.trim(),'RSS ps result failed');
      rows=parsePsRows(read.result.stdout,info);
    }else {
      assert(Array.isArray(read.reads)&&read.reads.length===info.length&&new Set(read.reads.map(p=>p.pid)).size===info.length,'RSS proc process coverage invalid');
      rows=[];
      for(const p of read.reads) {
        assert(info.some(q=>q.id===p.pid&&q.type===p.type),'RSS PID not owned by measured browser');
        assert(p.requestStartMs>=read.requestStartMs&&p.responseEndMs>=p.requestStartMs&&p.responseEndMs<=read.responseEndMs,'RSS PID request boundary invalid');
        if(p.error)assert(p.error.code==='ENOENT'&&!a.after.processInfo.some(q=>q.id===p.pid),'RSS missing live process/invalid exit proof');
        else {
          const m=p.vmRss?.match(/^VmRSS:\s+(\d+) kB$/);
          assert(m&&Number(m[1])===p.rssKiB&&Number.isSafeInteger(p.rssKiB)&&p.rssKiB>0&&p.rssBytes===p.rssKiB*1024,'Forged RSS proc value');
          rows.push({pid:p.pid,type:p.type,rssKiB:p.rssKiB,rssBytes:p.rssBytes});
        }
      }
    }
    assert(digest(rows)===digest(read.processes),'RSS rows differ from raw reader evidence');
    const missing=info.filter(p=>!rows.some(q=>q.pid===p.id));
    assert(missing.every(p=>!a.after.processInfo.some(q=>q.id===p.id)),'RSS missing live process');
    assert(read.status===(missing.length?'partial':'complete'),'RSS complete read coverage forged');
    assert(digest(a.departedPids)===digest(info.filter(p=>!a.after.processInfo.some(q=>q.id===p.id)).map(p=>p.id))&&
      digest(a.arrivedPids)===digest(a.after.processInfo.filter(p=>!info.some(q=>q.id===p.id)).map(p=>p.id)),'RSS turnover summary forged');
    const stable=sameMembership(info,a.after.processInfo),last=i===raw.attempts.length-1;
    assert(a.status===(last?'complete':'turnover')&&stable===last,'RSS retry lacks turnover/final membership proof');
    if(!missing.length)sums.push(rows.reduce((sum,p)=>sum+p.rssBytes,0));
    if(last)assert(raw.value===rows.reduce((sum,p)=>sum+p.rssBytes,0),'Forged RSS final sum');
  }
  assert(raw.peakValue===Math.max(...sums),'Forged RSS sampled peak');
  return raw.peakValue;
}
