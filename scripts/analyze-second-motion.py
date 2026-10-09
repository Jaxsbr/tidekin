from PIL import Image
import numpy as np
from scipy.ndimage import label,find_objects
from pathlib import Path
import json,math
root=Path('captures/second-improvement/motion/2026-10-09T00-17-25.164Z')
out={'method':'Color-component tracker of pale sack in bounded open-water ROI; largest tall cream component >250px. This is an image heuristic, not renderer telemetry. Ambiguities are retained.', 'runs':[]}
for name in ['normal','reduced']:
 rows=[]
 for p in sorted((root/name).glob('[0-9]*.jpg')):
  a=np.array(Image.open(p)).astype(int);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
  m=(r>180)&(g>170)&(b<200)&(r-g<35)&(g-b>15);m[:130]=0;m[410:]=0;m[:,:300]=0;m[:,850:]=0
  lab,n=label(m);cs=[]
  for i,sl in enumerate(find_objects(lab),1):
   if not sl:continue
   area=int((lab[sl]==i).sum());h=sl[0].stop-sl[0].start;w=sl[1].stop-sl[1].start
   if area>250 and h>w*1.05:
    yy,xx=np.where(lab==i);cs.append({'area':area,'x':float(xx.mean()),'y':float(yy.mean()),'width':w,'height':h})
  row={'frame':int(p.stem),'candidates':cs,'selected':max(cs,key=lambda c:c['area']) if cs else None};rows.append(row)
 jumps=[]
 for a,b in zip(rows,rows[1:]):
  if a['selected'] and b['selected']:
   d=math.hypot(a['selected']['x']-b['selected']['x'],a['selected']['y']-b['selected']['y']);jumps.append({'from':a['frame'],'to':b['frame'],'pixels':d})
 entry={'name':name,'frames':rows,'missing':[r['frame'] for r in rows if not r['selected']],'largestJumps':sorted(jumps,key=lambda x:-x['pixels'])[:12]};out['runs'].append(entry)
 print(name,'missing',entry['missing'],'largest',entry['largestJumps'][:4])
(root/'pixel-trajectory.json').write_text(json.dumps(out,indent=2))
