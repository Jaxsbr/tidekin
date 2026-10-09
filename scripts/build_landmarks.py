#!/usr/bin/env python3
"""Build Tidekin's independently placeable, hand-composed limestone landmarks.

/opt/homebrew/bin/blender --background --factory-startup --python-exit-code 1 \
    --python scripts/build_landmarks.py

Exactly three cloneable Y-up groups at local waterline origin. Individual crags
remain editable in Assets scene; Presentation scene contains linked review copies.
Only landmarks.blend, landmarks.glb and landmarks.png are written.
"""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import random
import struct
import sys

import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('tidekin_art_helpers', ROOT/'scripts/build_assets.py')
A = importlib.util.module_from_spec(spec)
spec.loader.exec_module(A)
R = random.Random(803)
TAU = math.tau
STONE = ['LM_Limestone', 'LM_Chalk', 'LM_CoolCrevice']
GREEN = ['LM_Forest', 'LM_Sunleaf']
GROUPS = []


def polygon(name, points, faces, material):
    return A.mesh(name, points, faces, material)


def stone_color(ob):
    for name in STONE[1:]: ob.data.materials.append(A.M[name])
    for p in ob.data.polygons:
        # Large coherent color planes, not randomly speckled triangles.
        p.material_index = 1 if p.normal.z > .35 or p.normal.x < -.6 else 2 if p.normal.y > .45 else 0
    return ob


def crag(name, center, rx, ry, height, lean=(.4, .0), seed=None):
    """Irregular buttress with interrupted shelves, narrow clefts, broken crown."""
    rng=random.Random(seed) if seed is not None else R
    cx,cy,cz=center
    n=9
    phase=rng.uniform(0,.4)
    angles=[phase+i*TAU/n+rng.uniform(-.075,.075) for i in range(n)]
    ridges=[rng.uniform(.78,1.16) for _ in range(n)]
    levels=[(0,1.0),(.10,.88),(.32,.92),(.39,.75),(.67,.81),(.74,.59),(1,.45)]
    levels=[(z+rng.uniform(-.03,.03),scale+rng.uniform(-.055,.055))
            if 0<z<1 else (z,scale) for z,scale in levels]
    points=[]
    for j,(z,scale) in enumerate(levels):
        for i,angle in enumerate(angles):
            r=ridges[i]*scale*(1+rng.uniform(-.045,.045))
            zz=cz+height*z+rng.uniform(-.028,.028)*height if j else cz
            if j==len(levels)-1: zz += height*rng.uniform(-.035,.065)
            # Low-frequency vertical flutes plus abrupt undercut ledges.
            points.append((cx+rx*r*math.cos(angle)+lean[0]*z*z,
                           cy+ry*r*math.sin(angle)+lean[1]*z,zz))
    faces=[tuple(reversed(range(n)))]
    for j in range(len(levels)-1):
        for i in range(n):
            k=(i+1)%n
            a,b,c,d=j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i
            if (i+j)%5==0: faces.extend([(a,b,d),(b,c,d)])
            else: faces.append((a,b,c,d))
    crown=len(points)
    points.append((cx+lean[0]-.2*rx,cy+lean[1]+.12*ry,cz+height*1.035))
    base=(len(levels)-1)*n
    faces += [(base+i,base+(i+1)%n,crown) for i in range(n)]
    ob=stone_color(polygon(name,points,faces,STONE[0]))
    return ob, (cx+lean[0],cy+lean[1],cz+height*.995)


def extruded_fragment(name, outline, depth, y=0):
    """Angular broken arch rock, sculpted in silhouette, with unequal front/back."""
    n=len(outline)
    points=[]
    for side in (-1,1):
        for i,(x,z) in enumerate(outline):
            points.append((x+(R.uniform(-.16,.16) if side==1 else 0),
                           y+side*depth*.5+R.uniform(-.18,.18),z+(R.uniform(-.12,.12) if side==1 else 0)))
    faces=[]
    for offset in (0,n):
        # Triangulate concave broken outlines without filling negative space.
        vs=[Vector((x,0,z)) for x,z in outline]
        tris=tessellate_polygon([vs])
        for tri in tris:
            ids=[(v if isinstance(v,int) else vs.index(v))+offset for v in tri]
            faces.append(tuple(reversed(ids)) if offset==0 else tuple(ids))
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return stone_color(polygon(name,points,faces,STONE[0]))


def shrub(center, scale=1, seed=0):
    """Irregular overlapping canopy lobes, never a circular flat green lid."""
    rng=random.Random(seed+17)
    x,y,z=center
    scale*=1.45
    for i in range(3):
        a=i*2.4+rng.random()
        dx,dy=math.cos(a)*.36*scale,math.sin(a)*.33*scale
        ob=A.ellipsoid('Clinging coastal shrub',(x+dx,y+dy,z+rng.uniform(0,.16)*scale),
                       (rng.uniform(.42,.67)*scale,rng.uniform(.32,.55)*scale,rng.uniform(.36,.58)*scale),GREEN[i%2],6,3)
        for p in ob.data.polygons: p.use_smooth=False


def foliage_shelf(x,y,z,length=2.0):
    # Three torn overlapping clumps instead of a continuous green cap.
    for i in range(3): shrub((x+(i-1)*length*.32,y+R.uniform(-.18,.18),z),.6+R.random()*.4,R.randrange(10000))
    for i in range(2):
        xx=x+R.uniform(-length*.4,length*.4)
        polygon('Hanging cliff vegetation',[(xx-.20,y-.15,z),(xx+.25,y-.14,z+.1),(xx+.11,y-.38,z-R.uniform(.8,1.5)),(xx-.11,y-.32,z-.7)],[(0,1,2),(0,2,3)],GREEN[0])


def palm(center,height=2.8,angle=0):
    x,y,z=center
    lean=.5
    pts=[(x+lean*(i/5)**2*math.cos(angle),y+lean*(i/5)**2*math.sin(angle),z+height*i/5) for i in range(6)]
    A.tube('Weather-bent palm trunk',pts,[.12-.055*i/5 for i in range(6)],'LM_Bark',5,False)
    top=Vector(pts[-1])
    # Seven curved, notched fronds; each is only twelve triangles.
    for i in range(7):
        a=angle+i*TAU/7
        direction=Vector((math.cos(a),math.sin(a),0))
        side=Vector((-math.sin(a),math.cos(a),0))
        length=1.7+R.random()*.6
        verts=[]
        for j in range(7):
            t=j/6
            mid=top+direction*length*t+Vector((0,0,.38*math.sin(math.pi*t)-.44*t*t))
            width=(.44 if j%2 else .23)*math.sin(math.pi*t)
            verts.extend([mid-side*width,mid+Vector((0,0,.045)),mid+side*width])
        faces=[]
        for j in range(6):
            k=j*3
            faces.extend([(k,k+3,k+4,k+1),(k+1,k+4,k+5,k+2)])
        ob=polygon('Wind-combed palm frond',verts,faces,GREEN[0])
        ob.data.materials.append(A.M[GREEN[1]])
        for p in ob.data.polygons: p.material_index=p.index%2


def splinter(x,y,z,h=3,width=.4):
    return crag('Knife-edged limestone flake',(x,y,z),width,width*.55,h,(-.15,.05))


def arch():
    # Left eroded shoulder is taller and wider than the right buttress.
    crag('Arch west shoulder',(-8.2,.6,-.65),3.85,3.25,19.1,(-.75,.2),44)
    crag('Arch west fractured crest',(-9.05,.8,13.1),1.72,1.72,7.25,(.05,.12),47)
    crag('Arch east undercut buttress',(8.1,.35,-.65),2.65,2.7,15.0,(.6,-.2),49)
    crag('Arch east split fin',(10.0,1.4,-.65),1.1,1.6,11.9,(-.15,.0),55)
    # This is five different closed crag fragments, not a tube, torus, or evenly
    # repeated wedge arch. Roof and opening have independently drawn profiles.
    segments=[
        [(-8.0,16.8),(-6.7,18.9),(-4.6,19.3),(-3.4,18.5),(-3.8,15.0),(-5.6,13.5),(-6.8,11.5),(-8.3,12.7)],
        [(-4.4,18.6),(-3.4,19.5),(-1.5,18.4),(.0,18.5),(.35,15.2),(-1.25,14.35),(-3.0,14.7),(-4.0,14.2)],
        [(-.6,18.15),(1.4,18.4),(2.9,17.45),(3.5,17.65),(3.8,14.2),(2.7,14.6),(1.7,13.8),(.1,14.7)],
        [(3.0,17.4),(4.4,17.8),(5.9,16.5),(6.5,16.65),(7.05,12.3),(5.55,12.8),(4.7,13.9),(3.25,14.05)],
        [(5.95,16.2),(7.25,16.6),(9.1,15.3),(9.5,13.5),(8.7,10.6),(7.3,10.7),(6.5,12.6)]
    ]
    for i,outline in enumerate(segments): extruded_fragment('Arch broken span %02d'%i,outline,3.45+R.uniform(-.4,.4),.15+R.uniform(-.18,.18))
    splinter(-10.75,-1.1,.0,9,.85)
    splinter(-6.9,-1.3,3.8,9,.44)
    splinter(9.0,-1.8,2.0,6.4,.43)
    for x,y,h,r in [(-11,-1.9,2.7,1.3),(-10,2.6,4.0,1.8),(11,-1.7,2.5,1.6),(8.8,3.1,2.0,1.0),(-4.4,1.2,1.2,.65)]:
        crag('Arch sea-broken rubble',(x,y,-.6),r,r*.8,h,(.15,.0))
    for x,y,z,l in [(-8.9,.7,20.25,1.4),(-5.3,-.1,18.65,1.9),(-.9,.4,18.3,1.5),(5,.6,17.0,1.2),(8.4,.4,14.5,1.1),(-10.1,-1,7.0,1.5)]:
        foliage_shelf(x,y,z,l)
    palm((-8.9,1,20.3),2.45,-.7)
    palm((7.9,.55,14.5),2.05,.6)


def stacks():
    peaks=[(-6.6,-.5,2.5,2.1,12.7,-.5),(0,1.0,2.7,2.45,21.4,.85),(6.9,-.2,1.85,1.8,16.1,-.55)]
    for i,(x,y,rx,ry,h,lean) in enumerate(peaks):
        ob,top=crag('Stack %d main cleft'%(i+1),(x,y,-.65),rx,ry,h,(lean,.12),200+i)
        crag('Stack %d leaning buttress'%(i+1),(x-rx*.6,y-.4,-.65),rx*.55,ry*.7,h*.62,(lean*.5,.05),210+i)
        splinter(x+.7,y-ry*.70,h*.20,h*.57,.32)
        foliage_shelf(top[0],top[1],top[2]-.15,rx*.62)
        foliage_shelf(x-rx*.38,y-ry*.65,h*.33,.8)
        if i!=2: palm((top[0],top[1],top[2]),2.1 if i else 2.6,.6+i)
        for j in range(2):
            crag('Stack wave-cut foot',(x+(-1 if j else 1)*rx*.9,y-.6,-.65),.75,.8,2.4+j,(.1,.0))


def ridge():
    # Interlocking broad rocks make a single massif with an uneven skyline;
    # the low pass left of center is deliberate silhouette negative space.
    profile=[(-11.6,.9,3.1,2.9,8.8,-.5),(-7.8,.6,3.5,3.0,14.5,-.8),
             (-3.75,1.3,3.3,3.25,12.1,.6),(.25,.6,3.65,3.35,20.9,.65),
             (4.8,1.2,3.1,2.6,17.2,-.4),(8.55,.7,2.8,2.7,13.4,.45),
             (12.2,1.0,2.4,2.6,7.4,-.4)]
    for i,(x,y,rx,ry,h,lean) in enumerate(profile):
        ob,top=crag('Ridge fractured buttress %02d'%i,(x,y,-.6),rx,ry,h,(lean,.18),300+i)
        # Outward buttress fins break the front plane and meet the sea.
        crag('Ridge front talus fin',(x+.6,y-ry*.61,-.6),rx*.43,1.2,h*.48,(.15,-.1),400+i)
        foliage_shelf(top[0],top[1],top[2]-.15,rx*.85)
        foliage_shelf(x-.8,y-ry*.60,h*.34,1.6)
        if i in (0,1,3,5): palm((top[0],top[1],top[2]),2.3 if i==3 else 2.9,-.5+i*.3)
        if i in (1,3,4): splinter(x-rx*.5,y-ry*.7,h*.23,h*.61,.55)
    for x,y,r,h in [(-14.0,-.5,1.0,2.5),(14,-.9,1.1,2.0),(10,-2.7,1.5,3.4),(-3,-2.8,1.3,2.1)]:
        crag('Ridge tidal rubble',(x,y,-.65),r,r*.8,h,(.12,.1))


def merged_export(asset_scene,root):
    bpy.context.window.scene=asset_scene
    bpy.context.view_layer.update()
    temp=bpy.data.collections.new('TEMP export')
    asset_scene.collection.children.link(temp)
    copies=[]
    for group in GROUPS:
        batch=[]
        for source in list(group.children):
            if source.type!='MESH': continue
            ob=bpy.data.objects.new(source.name+'_export',source.data.copy())
            temp.objects.link(ob)
            ob.matrix_world=source.matrix_world.copy()
            batch.append(ob)
        bpy.ops.object.select_all(action='DESELECT')
        for ob in batch: ob.select_set(True)
        bpy.context.view_layer.objects.active=batch[0]
        bpy.ops.object.join()
        ob=bpy.context.object
        ob.name=group.name+'_Geometry'
        ob.parent=group
        mats=[]
        mapping={}
        for i,mat in enumerate(ob.data.materials):
            if mat not in mats: mats.append(mat)
            mapping[i]=mats.index(mat)
        indices=[mapping[p.material_index] for p in ob.data.polygons]
        ob.data.materials.clear()
        for mat in mats: ob.data.materials.append(mat)
        for p,i in zip(ob.data.polygons,indices): p.material_index=i
        copies.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root,*GROUPS,*copies]: ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/landmarks.glb'),export_format='GLB',
        use_selection=True,export_yup=True,export_animations=False,export_extras=True,
        export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True)
    raw=(ROOT/'public/assets/landmarks.glb').read_bytes()
    n=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+n])
    assert len(doc['meshes'])==3
    total=0
    report=[]
    for ob in copies:
        group=ob.parent
        gltf_node=next(n for n in doc['nodes'] if n['name']==ob.name)
        mesh=doc['meshes'][gltf_node['mesh']]
        tris=sum(doc['accessors'][p['indices']]['count']//3 for p in mesh['primitives'])
        assert len(mesh['primitives'])<=6
        total+=tris
        coords=[ob.matrix_world@v.co for v in ob.data.vertices]
        lo=[min(v[i] for v in coords) for i in range(3)]
        hi=[max(v[i] for v in coords) for i in range(3)]
        report.append({'group':group.name,'triangles':tris,'primitives':len(mesh['primitives']),
                       'dimensions_xyz':[round(hi[0]-lo[0],3),round(hi[2]-lo[2],3),round(hi[1]-lo[1],3)],
                       'min_xyz':[round(lo[0],3),round(lo[2],3),round(-hi[1],3)],
                       'max_xyz':[round(hi[0],3),round(hi[2],3),round(-lo[1],3)]})
    assert total<=15000,total
    assert all('uri' not in b for b in doc['buffers'])
    for n in doc['nodes']:
        if n['name'].startswith('Landmark_') and 'mesh' not in n:
            assert n.get('translation',[0,0,0])==[0,0,0]
            assert n.get('rotation',[0,0,0,1])==[0,0,0,1]
    print('LANDMARK_REPORT '+json.dumps({'triangles':total,'bytes':len(raw),'groups':report}),flush=True)
    for ob in list(temp.objects): bpy.data.objects.remove(ob,do_unlink=True)
    bpy.data.collections.remove(temp)
    return report


def presentation(asset_scene):
    """Linked source meshes, staged only in this separate preview scene."""
    scene=bpy.data.scenes.new('Presentation — linked review layout')
    bpy.context.window.scene=scene
    positions=[(-30,5,0),(0,9,0),(31,3,0)]
    for source,offset in zip(GROUPS,positions):
        parent=bpy.data.objects.new('PREVIEW '+source.name,None)
        scene.collection.objects.link(parent)
        parent.location=offset
        for original in source.children:
            if original.type!='MESH': continue
            copy=bpy.data.objects.new(original.name+' [linked review]',original.data)
            scene.collection.objects.link(copy)
            copy.parent=parent
            copy.matrix_basis=original.matrix_basis.copy()
    A.CURRENT=None
    A.material('LM_PreviewOcean','43899A',.44)
    A.box('PREVIEW ONLY ocean',(0,0,-.82),(600,600,.1),'LM_PreviewOcean',0)
    world=bpy.data.worlds.new('Landmark coastal sky')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.61,.72,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.5
    scene.world=world
    light=bpy.data.lights.new('Warm directional sky','SUN')
    light.energy=2.0
    light.angle=.12
    light.color=(1,.89,.73)
    ob=bpy.data.objects.new('Warm directional sky',light)
    scene.collection.objects.link(ob)
    ob.rotation_euler=(.6,-.5,-.55)
    area=bpy.data.lights.new('Broad cool ocean fill','AREA')
    area.energy=6000
    area.shape='DISK'
    area.size=45
    ob=bpy.data.objects.new('Broad cool ocean fill',area)
    scene.collection.objects.link(ob)
    ob.location=(0,-30,40)
    ob.rotation_euler=(Vector((0,0,8))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Landmark art review')
    camera=bpy.data.objects.new('Landmark art review',data)
    scene.collection.objects.link(camera)
    camera.location=(38,-125,62)
    camera.rotation_euler=(Vector((0,4,9))-camera.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO'
    data.ortho_scale=107
    scene.camera=camera
    scene.render.engine='CYCLES'
    scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.resolution_x=2100
    scene.render.resolution_y=1050
    scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(ROOT/'assets/previews/landmarks.png')
    scene.unit_settings.system='METRIC'
    return scene


def main():
    protected=[ROOT/p for p in ('public/assets/workshop.glb','public/assets/island.glb','assets/workshop.blend','assets/island.blend')]
    hashes={p:hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    A.M.clear(); A.GROUPS.clear(); A.CURRENT=None
    for name,color in [('LM_Limestone','BABAA0'),('LM_Chalk','DBD5B6'),('LM_CoolCrevice','829F98'),
                       ('LM_Forest','3B7451'),('LM_Sunleaf','85A958'),('LM_Bark','A38860')]: A.material(name,color)
    scene=bpy.context.scene
    scene.name='Assets — origin-centered cloneable groups'
    root=A.group('Landmarks')
    root['waterline_y']=0
    root['usage']='Clone one named child; all children intentionally share origin.'
    for name,build in [('Landmark_Arch',arch),('Landmark_Stacks',stacks),('Landmark_Ridge',ridge)]:
        group=A.group(name,parent=root)
        GROUPS.append(group)
        A.CURRENT=group
        build()
        bpy.context.view_layer.update()
        # Center each footprint exactly on its own horizontal origin.
        points=[ob.matrix_world@v.co for ob in group.children for v in ob.data.vertices]
        center=Vector(((min(v.x for v in points)+max(v.x for v in points))/2,
                       (min(v.y for v in points)+max(v.y for v in points))/2,0))
        for ob in group.children:
            for v in ob.data.vertices: v.co-=center
        group['waterline_y']=0
        group['forward']='+Z in glTF; best silhouette from bow-facing side'
    merged_export(scene,root)
    presentation(scene)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/landmarks.blend'))
    bpy.ops.render.render(write_still=True)
    for p,h in hashes.items(): assert hashlib.sha256(p.read_bytes()).hexdigest()==h,f'Unexpected change: {p}'
    print('Existing workshop/island GLB and blend hashes unchanged.',flush=True)


if __name__=='__main__': main()
