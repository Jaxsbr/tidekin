// Window-local Chromium renderer-main-thread CPU. This is not GPU time or
// render-submit-only cost. Timestamp is wall time; ThreadTime is CPU time.
export async function cpuCheckpoint(cdp) {
  const {metrics}=await cdp.send('Performance.getMetrics');
  const selected=Object.fromEntries(metrics.filter(m=>['Timestamp','ThreadTime','ProcessTime','TaskDuration','ScriptDuration','LayoutDuration'].includes(m.name)).map(m=>[m.name,m.value]));
  for(const name of ['Timestamp','ThreadTime'])if(!Number.isFinite(selected[name]))throw Error(`Missing CDP CPU metric ${name}`);
  return selected;
}
export function cpuWindow(start,end) {
  return {status:'measured',method:'CDP Performance ThreadTime delta / Timestamp wall-time delta; renderer main thread CPU, includes probe overhead',start,end};
}
