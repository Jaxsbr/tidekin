#!/usr/bin/env python3
"""Tidekin's reproducible, texture-free Blender asset build.

Run: /opt/homebrew/bin/blender --background --factory-startup --python scripts/build_assets.py
Options after --: --only workshop|island --no-render --no-manifest

All modelling uses Blender Z up, bow -Y, starboard +X. glTF export maps Z to Y
and -Y to +Z. Editable source objects remain separate in the .blend; export
copies are consolidated by articulated group, with a single primitive per
material. No dependencies beyond the installed Blender Python runtime.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
TAU = math.tau
RNG = random.Random(47)
M = {}
GROUPS = {}
CURRENT = None


def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4


def material(name, color, rough=.65, metal=0, emission=0, alpha=1):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    rgb = tuple(linear(int(color[i:i+2], 16) / 255) for i in (0, 2, 4))
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, alpha)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    if emission:
        bs.inputs['Emission Color'].default_value = (*rgb, 1)
        bs.inputs['Emission Strength'].default_value = emission
    bs.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        mat.surface_render_method = 'DITHERED'
        mat.use_transparency_overlap = False
    mat.diffuse_color = (*rgb, alpha)
    M[name] = mat
    return mat


def palette():
    for args in [
        ('Cedar', 'AF673D'), ('Honey', 'C98C50'), ('Sunwood', 'E0AE6D'),
        ('Darkwood', '624737'), ('Rope', 'D9BD86'), ('Canvas', 'FFF0C3'),
        ('Coral', 'E9713F'), ('Patina', '39787B', .47, .25),
        ('Brass', 'D9A547', .34, .55), ('Glow', 'FFD070', .35, 0, 1.2),
        ('Glass', 'A4E3CF', .22, .05, 0, .19),
        ('LeafDark', '285A44'), ('Leaf', '548B42'), ('LeafLight', '96B951'),
        ('Shell', 'F9DAB0', .31), ('ShellShade', 'EBAE99', .38),
        ('Ink', '233E44'), ('Skin', 'E5AD74'), ('Ochre', 'C78331'),
        ('Sand', 'EFD29C'), ('Limestone', 'B7B9A2'),
        ('Chalk', 'DFD7B7'), ('RockShadow', '829A91'),
    ]:
        material(*args)


def reset():
    global CURRENT
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    M.clear()
    GROUPS.clear()
    CURRENT = None
    RNG.seed(47)
    palette()


def group(name, loc=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.empty_display_size = .3
    ob.empty_display_type = 'PLAIN_AXES'
    if parent:
        ob.parent = parent
    GROUPS[name] = ob
    return ob


def put(ob, mat, smooth=False, parent=None):
    ob.data.materials.append(M[mat])
    if smooth:
        for poly in ob.data.polygons:
            poly.use_smooth = True
    target = parent or CURRENT
    if target:
        ob.parent = target
        # Generated geometry uses world coordinates. Keep the chosen pivot.
        ob.matrix_parent_inverse = Matrix.Translation(-target.location)
    return ob


def mesh(name, verts, faces, mat, smooth=False, parent=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    return put(ob, mat, smooth, parent)


def bevel(ob, width=.03):
    mod = ob.modifiers.new('Soft hand-worked edges', 'BEVEL')
    mod.width = width
    mod.segments = 1
    mod.affect = 'EDGES'
    mod = ob.modifiers.new('Weighted broad-face normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return ob


def box(name, loc, size, mat='Honey', edge=.025, rotation=None):
    sx, sy, sz = [v / 2 for v in size]
    verts = [(x*sx, y*sy, z*sz) for x, y, z in
             [(-1,-1,-1), (1,-1,-1), (1,1,-1), (-1,1,-1),
              (-1,-1,1), (1,-1,1), (1,1,1), (-1,1,1)]]
    faces = [(0,3,2,1), (4,5,6,7), (0,1,5,4), (1,2,6,5),
             (2,3,7,6), (3,0,4,7)]
    ob = mesh(name, verts, faces, mat)
    ob.location = loc
    if rotation:
        ob.rotation_euler = rotation
    if edge:
        bevel(ob, edge)
    return ob


def cylinder(name, a, b, radius, mat='Honey', sides=10, r2=None, edge=0):
    a, b = Vector(a), Vector(b)
    length = (b-a).length
    r2 = radius if r2 is None else r2
    verts = [(r*math.cos(i*TAU/sides), r*math.sin(i*TAU/sides), z)
             for z, r in [(0, radius), (length, r2)] for i in range(sides)]
    faces = [tuple(reversed(range(sides))), tuple(range(sides, 2*sides))]
    faces += [(i, (i+1)%sides, (i+1)%sides+sides, i+sides) for i in range(sides)]
    ob = mesh(name, verts, faces, mat)
    ob.location = a
    ob.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    if edge:
        bevel(ob, edge)
    return ob


def beam(name, a, b, width=.1, depth=None, mat='Honey', edge=.02):
    a, b = Vector(a), Vector(b)
    ob = box(name, (a+b)/2, (width, depth or width, (b-a).length), mat, edge)
    ob.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return ob


def tube(name, points, radius, mat='Rope', sides=5, smooth=True):
    points = [Vector(p) for p in points]
    verts = []
    for j, p in enumerate(points):
        tangent = points[min(j+1,len(points)-1)] - points[max(0,j-1)]
        tangent.normalize()
        reference = Vector((0,0,1)) if abs(tangent.z) < .95 else Vector((1,0,0))
        u = tangent.cross(reference).normalized()
        v = tangent.cross(u).normalized()
        rad = radius[j] if isinstance(radius, list) else radius
        verts += [p + rad*(u*math.cos(i*TAU/sides)+v*math.sin(i*TAU/sides)) for i in range(sides)]
    faces = [tuple(reversed(range(sides))), tuple(range((len(points)-1)*sides,len(points)*sides))]
    for j in range(len(points)-1):
        for i in range(sides):
            n = (i+1)%sides
            faces.append((j*sides+i,j*sides+n,(j+1)*sides+n,(j+1)*sides+i))
    return mesh(name, verts, faces, mat, smooth)


def ring(name, center, radius, thick, mat='Rope', axis='Z', major=20, minor=5):
    verts, faces = [], []
    for i in range(major):
        t = i*TAU/major
        for j in range(minor):
            p = j*TAU/minor
            x,y,z = (radius+thick*math.cos(p))*math.cos(t), (radius+thick*math.cos(p))*math.sin(t), thick*math.sin(p)
            if axis == 'X': x,y,z = z,x,y
            if axis == 'Y': x,y,z = x,z,-y
            verts.append((x+center[0],y+center[1],z+center[2]))
    for i in range(major):
        for j in range(minor):
            faces.append((i*minor+j,((i+1)%major)*minor+j,((i+1)%major)*minor+(j+1)%minor,i*minor+(j+1)%minor))
    return mesh(name, verts, faces, mat, True)


def ellipsoid(name, center, scale, mat, segments=12, rings=7):
    verts = [(0,0,-1)]
    for j in range(1,rings):
        phi = -math.pi/2+j*math.pi/rings
        verts += [(math.cos(phi)*math.cos(i*TAU/segments),math.cos(phi)*math.sin(i*TAU/segments),math.sin(phi)) for i in range(segments)]
    verts.append((0,0,1))
    faces = [(0,1+(i+1)%segments,1+i) for i in range(segments)]
    for j in range(rings-2):
        for i in range(segments):
            n = (i+1)%segments
            k = 1+j*segments
            faces.append((k+i,k+n,k+segments+n,k+segments+i))
    last = 1+(rings-2)*segments
    faces += [(last+i,last+(i+1)%segments,len(verts)-1) for i in range(segments)]
    verts = [(center[0]+v[0]*scale[0],center[1]+v[1]*scale[1],center[2]+v[2]*scale[2]) for v in verts]
    return mesh(name,verts,faces,mat,True)


def rope(name, a, b, sag=.18, radius=.036, mat='Rope', steps=9):
    a,b = Vector(a),Vector(b)
    pts = [a.lerp(b,i/(steps-1)) - Vector((0,0,sag*math.sin(i*math.pi/(steps-1)))) for i in range(steps)]
    return tube(name,pts,radius,mat,5)


def bindings(center, radius=.16, axis='Z', count=3):
    for k in range(count):
        c = list(center)
        c['XYZ'.index(axis)] += (k-(count-1)/2)*.068
        ring('Hemp lashing',c,radius,.037,'Rope',axis,12,4)


def leaf(name, base, tip, width, mat='Leaf', curl=.12, stations=5):
    base,tip = Vector(base),Vector(tip)
    d = tip-base
    side = d.cross(Vector((0,0,1)))
    if side.length < .01: side = Vector((1,0,0))
    side.normalize()
    verts=[]
    for i in range(stations):
        t=i/(stations-1)
        c=base.lerp(tip,t)+Vector((0,0,curl*math.sin(math.pi*t)))
        w=width*math.sin(math.pi*t)*.5
        verts += [c-side*w,c+Vector((0,0,.06*math.sin(math.pi*t))),c+side*w]
    faces=[]
    for i in range(stations-1):
        j=i*3
        if i==0:
            faces += [(j,j+3,j+4),(j,j+4,j+5)]
        elif i==stations-2:
            faces += [(j,j+3,j+1),(j+1,j+3,j+2)]
        else:
            faces += [(j,j+3,j+4,j+1),(j+1,j+4,j+5,j+2)]
    ob=mesh(name,verts,faces,mat)
    ob.data.materials.append(M['LeafLight' if mat=='Leaf' else 'Leaf'])
    for i,p in enumerate(ob.data.polygons): p.material_index=i%2
    return ob


def plant(x,y,z,scale=1,pot=True):
    if pot:
        cylinder('Clay planter',(x,y,z),(x,y,z+.34*scale),.23*scale,'Coral',10,.31*scale)
        ring('Planter rim',(x,y,z+.33*scale),.30*scale,.042*scale,'Honey',major=12,minor=4)
        cylinder('Dark fertile soil',(x,y,z+.315*scale),(x,y,z+.325*scale),.26*scale,'Darkwood',10)
        z+=.34*scale
    for i in range(6):
        a=i*2.399+RNG.uniform(-.2,.2)
        length=RNG.uniform(.45,.8)*scale
        tip=(x+math.cos(a)*length,y+math.sin(a)*length,z+RNG.uniform(.2,.65)*scale)
        leaf('Broad kitchen-garden leaf',(x,y,z),tip,.27*scale,['Leaf','LeafLight','LeafDark'][i%3])
    cylinder('Tender central stem',(x,y,z),(x+.06*scale,y,z+.72*scale),.025*scale,'LeafDark',5)


def barrel(x,y,z,s=1):
    n=12
    for i in range(n):
        t=i*TAU/n
        t2=(i+1)*TAU/n-.025
        verts=[]
        for h,r in [(0,.32),(.2,.4),(.65,.4),(.88,.32)]:
            verts += [(x+s*r*math.cos(a),y+s*r*math.sin(a),z+s*h) for a in (t,t2)]
        mesh('Coopered oak stave',verts,[(0,1,3,2),(2,3,5,4),(4,5,7,6)],['Honey','Cedar','Sunwood'][i%3])
    for h,r in [(.14,.38),(.7,.39)]: ring('Barrel hoop',(x,y,z+h*s),r*s,.035*s,'Patina',major=12,minor=4)
    cylinder('Barrel lid',(x,y,z+.85*s),(x,y,z+.88*s),.31*s,'Darkwood',12)
    for k in range(-2,3):
        xx=k*.115*s
        length=2*math.sqrt(max(0,(.29*s)**2-xx**2))
        box('Lid boards',(x+xx,y,z+.89*s),(.105*s,length,.035*s),'Honey',.01)


def lantern(x,y,z):
    cylinder('Lantern base',(x,y,z),(x,y,z+.08),.19,'Patina',8)
    cylinder('Lantern warm glass',(x,y,z+.08),(x,y,z+.48),.135,'Glow',8)
    for a in (0,math.pi/2,math.pi,3*math.pi/2):
        xx,yy=x+.155*math.cos(a),y+.155*math.sin(a)
        cylinder('Lantern cage',(xx,yy,z+.04),(xx,yy,z+.51),.022,'Darkwood',5)
    cylinder('Lantern cap',(x,y,z+.48),(x,y,z+.61),.22,'Patina',8,.08)
    ring('Lantern handle',(x,y,z+.69),.085,.021,'Brass','Y',12,4)


def build_workshop():
    global CURRENT
    reset()
    root=group('Workshop')
    root['waterline']=0.0
    root['deck_width']=7.0
    root['deck_depth']=9.0
    root['forward']='+Z in glTF'
    upgrades={name:group('Upgrade_'+name,parent=root) for name in ('waterwheel','crane','greenhouse','sail','beacon')}
    for ob in upgrades.values():
        ob['upgrade_toggle']=True
        ob['default_visibility']='Renderer decides; all visible for art review'
    CURRENT=group('Hull',parent=root)
    # Long, slightly irregular flotation logs, with pale endgrain and growth rings.
    for i in range(8):
        x=-3.05+i*.87
        end=4.4+RNG.uniform(-.1,.13)
        r=.48+RNG.uniform(-.02,.035)
        cylinder('Cedar pontoon', (x,-end,.05),(x,end,.05),r,['Cedar','Honey','Darkwood'][i%3],10,r*.91,.035)
        for sign in (-1,1):
            y=sign*(end+.018)
            cylinder('Cut endgrain',(x,y,.05),(x,y+sign*.025,.05),r*.82,'Sunwood',10)
            ring('Endgrain growth ring',(x,y+sign*.03,.05),r*.49,.012,'Cedar','Y',12,3)
            ring('Endgrain heart',(x,y+sign*.032,.05),r*.23,.01,'Honey','Y',10,3)
        for y in (-3.8,3.6): bindings((x,y,.05),r+.012,'Y',2)
    for y in (-3.4,0,3.5): box('Under-deck cross bearer',(0,y,.42),(7.17,.25,.23),'Darkwood',.06)
    # Board seams run across a staggered 7 x 9 platform. Ends bow subtly.
    for row in range(19):
        y=-4.26+row*.474
        split=(-.9 if row%2 else .8)
        for a,b in [(-3.5,split),(split+.035,3.5)]:
            ob=box('Individual deck plank',((a+b)/2,y,.65+RNG.uniform(-.008,.008)),(b-a-.023,.44,.19),['Honey','Sunwood','Honey','Cedar'][row%4],.035)
            for x in (a+.13,b-.13):
                cylinder('Deck peg',(x,y,.753),(x,y,.762),.022,'Darkwood',6)
        if row%3==0:
            rope('Carved plank grain',(-3.1,y+.08,.758),(-1.25,y+.06,.758),.004,.009,'Cedar',6)
    for x in (-3.55,3.55): box('Deck edge rubbing strake',(x,0,.52),(.23,9.15,.3),'Cedar',.065)
    for y in (-4.5,4.5): box('Deck bow band',(0,y,.53),(7.2,.23,.3),'Honey',.05)
    # Rail posts, open rope rails, and wrapped connections.
    for x in (-3.3,3.3):
        for y in (-4.1,-2.4,1.4,4.05):
            box('Hand-hewn rail post',(x,y,1.22),(.17,.18,1.1),'Honey',.035, (0,.025 if x>0 else -.025,0))
            box('Post cap',(x,y,1.8),(.26,.26,.10),'Sunwood',.025)
            bindings((x,y,1.55),.13,'Z',2)
        for a,b in [(-4.1,-2.4),(-2.4,1.4),(1.4,4.05)]:
            if x<0 and a==-2.4: continue  # Wheel's moving clearance.
            cylinder('Rounded handrail',(x,a,1.62),(x,b,1.62),.075,'Honey',8)
            rope('Slack safety rope',(x,a,1.25),(x,b,1.25),.25)
    for a,b in [(-3.3,-1.9),(1.2,3.3)]:
        cylinder('Bow railing',(a,-4.1,1.62),(b,-4.1,1.62),.08,'Honey',8)
        rope('Bow rope',(a,-4.1,1.25),(b,-4.1,1.25),.15)
    # Rope cargo net on starboard bow; it reads as a handmade hammock.
    for i in range(6):
        y=-3.95+i*.30
        rope('Cargo net warp',(3.69,y,1.25),(3.7,y+.48,.1),.12,.021,steps=5)
    for j in range(4):
        rope('Cargo net weft',(3.71,-3.95+j*.12,1.16-j*.28),(3.71,-2.43+j*.12,1.16-j*.28),.12,.021,steps=6)
    CURRENT=group('Cabin',parent=root)
    # A tapered cabin wall envelope with visible individual siding.
    cx,cy=-1.25,1.75
    for i in range(10):
        x=cx-1.37+i*.305
        for y in (cy-1.55,cy+1.55):
            box('Vertical cabin siding',(x,y,2.17+RNG.uniform(-.01,.01)),(.285,.12,2.73),['Sunwood','Honey','Sunwood','Canvas'][i%4],.021)
    for i in range(10):
        y=cy-1.4+i*.309
        for x in (cx-1.55,cx+1.55):
            box('Side cabin siding',(x,y,2.16),(.12,.288,2.7),['Honey','Sunwood','Cedar'][i%3],.02)
    for x in (cx-1.57,cx+1.57):
        for y in (cy-1.56,cy+1.56):
            cylinder('Cabin corner timber',(x,y,.78),(x,y,3.65),.115,'Darkwood',8,.1)
    # Layered roof slabs, projecting endgrain, rounded eaves.
    for i in range(12):
        x=cx-1.75+i*.318
        z=3.6+.26*(1-abs(x-cx)/1.9)
        box('Roof cedar cap',(x,cy,z),(.30,3.69,.22),['Cedar','Honey','Sunwood'][i%3],.075)
    for y in (cy-1.85,cy+1.85): cylinder('Roof rolled eave',(cx-1.9,y,3.6),(cx+1.9,y,3.6),.12,'Honey',10)
    # Big welcoming porthole faces bow; low-cost emissive insert.
    window=(cx,cy-1.635,2.28)
    cylinder('Window warm interior',(cx,window[1],2.28),(cx,window[1]-.035,2.28),.57,'Glow',32)
    ring('Porthole dark recess',window,.64,.108,'Darkwood','Y',32,6)
    ring('Patinated round window',(cx,window[1]-.075,2.28),.65,.079,'Patina','Y',32,6)
    beam('Window vertical muntin',(cx,window[1]-.09,1.70),(cx,window[1]-.09,2.86),.052,mat='Darkwood',edge=.012)
    beam('Window cross muntin',(cx-.58,window[1]-.09,2.28),(cx+.58,window[1]-.09,2.28),.052,mat='Darkwood',edge=.012)
    for i in range(8):
        a=i*TAU/8
        ellipsoid('Porthole brass rivet',(cx+.66*math.cos(a),window[1]-.151,2.28+.66*math.sin(a)),(.037,.023,.037),'Brass',8,4)
    box('Porthole flower shelf',(cx,window[1]-.15,1.48),(1.62,.42,.15),'Cedar',.05)
    plant(cx-.68,window[1]-.17,1.56,.45)
    # Starboard side door with diagonal brace and porch step.
    box('Cabin teal door',(cx+1.635,2.1,1.7),(.12,1.04,1.85),'Patina',.045)
    for y in (1.57,2.63): box('Door frame',(cx+1.71,y,1.7),(.13,.1,1.98),'Honey',.02)
    beam('Door diagonal',(cx+1.72,1.64,.88),(cx+1.72,2.56,2.52),.07,mat='Sunwood')
    ellipsoid('Door knob',(cx+1.81,1.85,1.6),(.065,.06,.06),'Brass',8,4)
    box('Doorstep',(cx+1.92,2.1,.82),(.55,1.2,.14),'Sunwood',.04)
    for x,y,s in [(-2.6,2.8,.95),(-2.2,.7,.7),(-.5,3.0,.9),(-.25,.55,.7)]: plant(x,y,3.94,s)
    for i in range(8):
        z=3.7-i*.26
        x=-2.72+.09*math.sin(i)
        if i<7: rope('Trailing vine',(x,-.12,z),(x+.03,-.14,z-.3),0,.021,'LeafDark',3)
        leaf('Hanging heart leaf',(x,-.14,z),(x+(-1)**i*.28,-.29,z-.21),.27,'Leaf')
    # Tall rig, asymmetrically curved sail and hand-stitched panels.
    CURRENT=group('Rigging',parent=upgrades['sail'])
    cylinder('Main mast',(.2,2.8,.76),(.2,2.8,7.55),.14,'Honey',12,.082)
    for z in (1.2,3.8,5.85,6.5,7.25): bindings((.2,2.8,z),.15,'Z')
    cylinder('Sail forward yard',(-3.22,-.50,5.27),(1.3,-.50,5.51),.078,'Darkwood',10)
    cylinder('Sail aft yard',(-3.00,3.30,5.95),(1.25,3.30,6.13),.078,'Honey',10)
    for x,y,z in [(-3.22,-.5,5.27),(1.3,-.5,5.51),(-3,3.3,5.95),(1.25,3.3,6.13)]:
        rope('Sail corner stay',(.2,2.8,7.10),(x,y,z),.09,.028)
    rope('Mast bow stay',(.2,2.8,7.15),(2.95,-3.85,1.73),.12,.032)
    rope('Mast aft stay',(.2,2.8,7.3),(-2.95,4.1,1.72),.05,.032)
    CURRENT=group('Sail',parent=upgrades['sail'])
    def sailpoint(u,v):
        return (-3.16+4.42*u+.2*v, -.5+3.8*v, 5.29+.24*u+.66*v-.66*math.sin(math.pi*u)*math.sin(math.pi*v))
    nu,nv=12,12
    verts=[sailpoint(i/nu,j/nv) for j in range(nv+1) for i in range(nu+1)]
    faces=[(j*(nu+1)+i,j*(nu+1)+i+1,(j+1)*(nu+1)+i+1,(j+1)*(nu+1)+i) for j in range(nv) for i in range(nu)]
    ob=mesh('Billowing cream canvas',verts,faces,'Canvas',True)
    ob.data.materials.append(M['Sunwood'])
    for j,p in enumerate(ob.data.polygons): p.material_index=1 if j%nu in (0,nu-1) else 0
    # glTF standard materials are two-sided, so canvas needs no duplicate back.
    for u in (0,.25,.5,.75,1):
        tube('Canvas stitched seam',[Vector(sailpoint(u,j/12))+Vector((0,0,.015)) for j in range(13)],.012,'Rope',4)
    for v in (0,1): tube('Canvas bolt rope',[sailpoint(i/12,v) for i in range(13)],.037,'Rope',5)
    for u in (0,1):
        for v in (.05,.27,.5,.73,.95):
            x,y,z=sailpoint(u,v)
            ring('Canvas eyelet',(x,y,z),.056,.014,'Brass','Y',8,4)
    # The main coral swallowtail flies clear above the sail silhouette.
    CURRENT=group('Pennant_Main',(.2,2.8,7.2),parent=upgrades['sail'])
    verts=[(.2,2.8,7.3),(-.45,2.89,7.35),(-1.25,2.7,7.5),(-2.18,2.75,7.38),
           (-1.88,2.77,7.0),(-2.24,2.82,6.7),(-1.22,2.7,6.77),(-.45,2.9,6.69),(.2,2.8,6.75)]
    mesh('Coral swallowtail',verts,[(0,1,7,8),(1,2,6,7),(2,3,4,6),(4,5,6)],'Coral')
    # Graphic spiral, drawn geometrically so the asset is completely portable.
    pts=[]
    for i in range(30):
        t=i/29*math.pi*3.5
        r=.035+.0145*t
        pts.append((-1.05+r*math.cos(t),2.67,7.10+r*math.sin(t)))
    tube('Tidekin shell pennant insignia',pts,.024,'Canvas',4)
    CURRENT=group('Bunting',parent=upgrades['sail'])
    a,b=Vector((.2,2.8,6.6)),Vector((3.25,-1.3,4.0))
    rope('Pennant halyard',a,b,.3,.021)
    for i in range(5):
        t=.2+i*.16
        p=a.lerp(b,t)-Vector((0,0,.3*math.sin(math.pi*t)))
        q=a.lerp(b,t+.1)-Vector((0,0,.3*math.sin(math.pi*(t+.1))))
        mesh('Little signal pennant',[p,q,(p+q)/2+Vector((.08,0,-.49))],[(0,1,2)],['Coral','Patina','Sunwood'][i%3])
    # Greenhouse: timber base, narrow glazed panes, brass-colored ribs.
    CURRENT=upgrades['greenhouse']
    gx,gy=2.0,.6
    box('Greenhouse raised planter',(gx,gy,1.0),(2.12,2.28,.49),'Darkwood',.09)
    for z in (.92,1.14):
        for y in (gy-1.14,gy+1.14): box('Planter slat',(gx,y,z),(2.18,.1,.14),'Honey',.026)
        for x in (gx-1.06,gx+1.06): box('Planter slat',(x,gy,z),(.1,2.3,.14),'Cedar',.026)
    for x in (gx-.98,gx+.98):
        for y in (gy-1.08,gy,gy+1.08):
            beam('Greenhouse vertical rib',(x,y,1.23),(x,y,2.63),.055,mat='Rope',edge=.014)
    for y in (gy-1.08,gy,gy+1.08):
        beam('Greenhouse roof ridge L',(gx-.98,y,2.63),(gx,y,3.4),.063,mat='Rope',edge=.015)
        beam('Greenhouse roof ridge R',(gx,y,3.4),(gx+.98,y,2.63),.063,mat='Rope',edge=.015)
    for x,z in [(gx-.98,2.63),(gx,3.4),(gx+.98,2.63)]:
        beam('Greenhouse longitudinal rail',(x,gy-1.12,z),(x,gy+1.12,z),.06,mat='Rope',edge=.012)
    for x in (gx-.98,gx+.98):
        mesh('Greenhouse glass side',[(x,gy-1.07,1.3),(x,gy+1.07,1.3),(x,gy+1.07,2.61),(x,gy-1.07,2.61)],[(0,1,2,3)],'Glass')
        mesh('Greenhouse glass roof',[(x,gy-1.07,2.64),(x,gy+1.07,2.64),(gx,gy+1.07,3.38),(gx,gy-1.07,3.38)],[(0,1,2,3)],'Glass')
    for x in (1.45,2.05,2.62):
        for y in (0, .75,1.38): plant(x,y,1.25,.61,False)
    for x,y in [(1.4,-.1),(2.65,.6),(2,1.3)]:
        for j in range(3): ellipsoid('Ripe greenhouse fruit',(x+.08*j,y,1.87+.14*j),(.075,.075,.08),'Coral',8,4)
    # Wheel: all moving geometry is parented to this exact named pivot.
    pivot=(-3.98,-.25,.74)
    CURRENT=group('Wheel',pivot,parent=upgrades['waterwheel'])
    CURRENT['axis']='local X; positive X points starboard'
    CURRENT['radius']=1.58
    px,py,pz=pivot
    for x in (px-.50,px+.50):
        ring('Wheel laminated rim',(x,py,pz),1.48,.135,'Honey','X',32,6)
        ring('Wheel iron rim band',(x,py,pz),1.59,.035,'Patina','X',32,4)
        cylinder('Wheel hub',(x-.12,py,pz),(x+.12,py,pz),.25,'Darkwood',12)
        for i in range(8):
            a=i*TAU/8
            beam('Wheel radial oak spoke',(x,py+math.sin(a)*.17,pz+math.cos(a)*.17),(x,py+math.sin(a)*1.47,pz+math.cos(a)*1.47),.13,.18,'Cedar',.03)
    for i in range(12):
        a=i*TAU/12
        y,z=py+math.sin(a)*1.51,pz+math.cos(a)*1.51
        ob=box('Waterwheel paddle',(px,y,z),(1.2,.44,.15),['Sunwood','Honey'][i%2],.045,(-a,0,0))
        for x in (px-.48,px+.48): ellipsoid('Wheel paddle bolt',(x,y,z+.09*math.cos(a)),(.04,.04,.04),'Brass',6,4)
    cylinder('Wheel axle',(px-.70,py,pz),(-2.85,py,pz),.145,'Patina',12)
    ring('Axle brass collar',(px-.72,py,pz),.19,.05,'Brass','X',16,5)
    CURRENT=group('Engine',parent=root)
    box('Shell engine mounting bed',(1.45,-3.27,1.0),(1.98,1.75,.22),'Patina',.10)
    for x in (.66,2.25):
        box('Engine curved cradle',(x,-3.05,1.16),(.22,1.5,.36),'Honey',.09)
    # Continuously expanding pearlescent spiral tube: coherent shell silhouette,
    # low-amplitude lobed ridges, open mouth and radial color bands.
    verts,faces=[],[]
    centers=[]
    steps,sides=100,12
    for i in range(steps):
        t=i/(steps-1)
        a=-math.pi*.8+t*math.pi*3.6
        radius=.075+.88*t
        centers.append(Vector((1.38+radius*math.cos(a),-3.04+.13*math.sin(t*math.pi),1.97+radius*math.sin(a))))
    for i,c in enumerate(centers):
        t=i/(steps-1)
        tangent=(centers[min(i+1,steps-1)]-centers[max(0,i-1)]).normalized()
        u=Vector((0,-1,0))
        v=tangent.cross(u).normalized()
        radius=.055+.39*t
        radius*=1+.06*math.sin(t*TAU*15)
        for j in range(sides):
            a=j*TAU/sides
            verts.append(c+radius*(u*math.cos(a)+v*math.sin(a)))
    for i in range(steps-1):
        for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    shell=mesh('Continuous ridged conch',verts,faces,'Shell',True)
    shell.data.materials.append(M['ShellShade'])
    for p in shell.data.polygons: p.material_index=1 if (p.index//sides)%7==0 else 0
    end=centers[-1]
    cylinder('Shell dark aperture',end+Vector((0,.025,0)),end+Vector((0,-.045,0)),.30,'ShellShade',24)
    # Bell nozzle and copper feed pipe below the pearl shell.
    cylinder('Engine outflow brass neck',(1.28,-3.51,1.55),(1.28,-4.03,1.43),.20,'Brass',16,.28)
    cylinder('Engine nozzle dark opening',(1.28,-4.035,1.43),(1.28,-4.055,1.425),.23,'Ink',16)
    ring('Engine nozzle lip',(1.28,-4.07,1.43),.265,.044,'Brass','Y',20,5)
    tube('Conch copper steam line',[(2.2,-3.1,1.3),(2.55,-2.95,1.3),(2.68,-2.72,1.6),(2.68,-2.4,1.8)],.078,'Brass',8)
    cylinder('Engine pressure gauge',(2.65,-2.45,1.93),(2.65,-2.55,1.93),.20,'Brass',16)
    cylinder('Engine gauge face',(2.65,-2.56,1.93),(2.65,-2.57,1.93),.16,'Canvas',16)
    beam('Engine gauge needle',(2.65,-2.58,1.93),(2.57,-2.58,2.03),.018,mat='Coral',edge=0)
    CURRENT=group('Engine_Flywheel',(.28,-3.42,1.6),parent=root)
    ring('Engine small flywheel',(.28,-3.42,1.6),.39,.061,'Brass','Y',20,5)
    for i in range(6):
        a=i*TAU/6
        beam('Flywheel spoke',(.28,-3.42,1.6),(.28+.36*math.cos(a),-3.42,1.6+.36*math.sin(a)),.049,mat='Patina',edge=.01)
    cylinder('Flywheel hub',(.28,-3.51,1.6),(.28,-3.33,1.6),.1,'Brass',10)
    # Inventory props and asymmetrical lived-in details.
    CURRENT=group('Deck_Details',parent=root)
    for x,y,s in [(-2.55,-1.45,.86),(2.8,3.45,.85),(-2.7,3.96,.65)]: barrel(x,y,.77,s)
    plant(2.75,-1.26,.76,.78)
    plant(-2.72,-2.78,.76,.66)
    CURRENT=upgrades['sail']
    lantern(-2.96,-.55,4.0)
    rope('Lantern suspension',(-2.96,-.55,4.69),(-2.96,-.52,5.28),0,.026)
    CURRENT=GROUPS['Deck_Details']
    for j in range(4): ring('Coiled mooring rope',(-1.9,-3.55,.82+j*.052),.3-j*.025,.034,'Rope',major=18,minor=4)
    rope('Loose rope end',(-2.15,-3.7,.83),(-2.55,-4.0,.80),.015,.034)
    box('Tool crate',(-2.65,-3.6,1.03),(.68,.65,.48),'Darkwood',.04)
    for z in (.87,1.13):
        for y in (-3.95,-3.25): box('Crate slat',(-2.65,y,z),(.76,.05,.15),'Honey',.02)
    cylinder('Boat hook shaft',(3.42,.6,1.76),(3.42,3.7,1.76),.04,'Honey',8)
    tube('Boat hook bronze head',[(3.42,.6,1.76),(3.42,.34,1.79),(3.42,.22,1.90),(3.42,.31,2.0),(3.42,.48,1.98)],.032,'Brass',6)
    # Compact, purposeful salvage crane and beacon are separate revealable upgrades.
    CURRENT=upgrades['crane']
    box('Crane bolted mounting foot',(2.78,3.77,.92),(.55,.55,.28),'Patina',.07)
    cylinder('Crane hardwood kingpost',(2.78,3.77,1.05),(2.78,3.77,3.8),.115,'Honey',10,.075)
    bindings((2.78,3.77,1.28),.13)
    CURRENT=group('Crane_Boom',(2.78,3.77,3.30),parent=upgrades['crane'])
    beam('Crane angled boom',(2.78,3.77,3.30),(4.15,3.77,4.12),.145,mat='Sunwood',edge=.03)
    rope('Crane boom tension stay',(2.78,3.77,3.79),(4.15,3.77,4.12),.05,.027)
    ring('Crane pulley',(4.10,3.77,4.05),.12,.04,'Patina','Y',12,4)
    CURRENT=group('Crane_Hook',(4.10,3.77,2.47),parent=upgrades['crane'])
    rope('Crane hanging line',(4.10,3.77,4.02),(4.10,3.77,2.55),0,.027)
    tube('Crane bronze hook',[(4.10,3.77,2.59),(4.10,3.77,2.40),(4.20,3.77,2.32),(4.31,3.77,2.4),(4.29,3.77,2.52)],.046,'Brass',6)
    CURRENT=upgrades['beacon']
    cylinder('Beacon tapered post',(3.21,-3.96,.78),(3.21,-3.96,2.75),.09,'Honey',10,.055)
    lantern(3.21,-3.96,2.78)
    ring('Beacon cage crown',(3.21,-3.96,3.28),.29,.031,'Brass',major=12,minor=4)
    bindings((3.21,-3.96,1.83),.10)
    build_explorer(root)
    build_dog(root)
    return root


def build_explorer(root):
    global CURRENT
    CURRENT=group('Explorer',(-.9,-1.75,.77),parent=root)
    explorer=CURRENT
    limbs={name:[] for name in ('Arm_L','Arm_R','Leg_L','Leg_R')}
    x,y,z=-.9,-1.75,.77
    # A small friendly toy-like navigator, legible at gameplay scale.
    for dx in (-.16,.16):
        parts=limbs['Leg_L' if dx<0 else 'Leg_R']
        parts.append(ellipsoid('Explorer boot',(x+dx,y-.08,z+.12),(.14,.24,.13),'Darkwood',10,6))
        parts.append(cylinder('Explorer calf',(x+dx,y,z+.21),(x+dx,y,z+.60),.095,'Skin',8))
        parts.append(cylinder('Explorer shorts',(x+dx,y,z+.52),(x+dx,y,z+.85),.145,'Patina',8))
    ellipsoid('Explorer linen shirt',(x,y,z+1.10),(.31,.20,.4),'Canvas',12,8)
    cylinder('Explorer neck',(x,y,z+1.35),(x,y,z+1.49),.115,'Skin',10)
    ellipsoid('Explorer face',(x,y-.01,z+1.72),(.29,.255,.33),'Skin',16,10)
    ellipsoid('Explorer hair cap',(x,y+.035,z+1.9),(.31,.265,.2),'Darkwood',12,7)
    for dx,zz in [(-.22,1.81),(-.09,1.94),(.07,1.96),(.22,1.88)]:
        ellipsoid('Tousled hair lock',(x+dx,y-.20,z+zz),(.11,.105,.145),'Darkwood',8,5)
    for dx in (-.105,.105):
        ellipsoid('Explorer eye',(x+dx,y-.246,z+1.74),(.032,.021,.043),'Ink',8,5)
        ellipsoid('Eye light',(x+dx-.008,y-.265,z+1.757),(.01,.008,.012),'Canvas',6,4)
        ring('Goggle brass rim',(x+dx*1.32,y-.215,z+2.00),.107,.027,'Brass','Y',12,4)
        cylinder('Goggle teal lens',(x+dx*1.32,y-.221,z+2.00),(x+dx*1.32,y-.23,z+2.00),.083,'Patina',12)
    ellipsoid('Explorer nose',(x,y-.274,z+1.66),(.045,.045,.038),'Skin',8,5)
    tube('Explorer smile',[(x-.065,y-.237,z+1.585),(x,y-.257,z+1.568),(x+.06,y-.237,z+1.59)],.012,'Darkwood',4)
    # Left arm down, right arm lifting a greeting.
    for a,b,r,mat in [((-.26,0,1.30),(-.4,-.02,1.1),.12,'Canvas'),
                       ((-.4,-.02,1.10),(-.43,-.13,.86),.075,'Skin'),
                       ((.26,0,1.30),(.46,0,1.40),.12,'Canvas'),
                       ((.46,0,1.40),(.56,-.03,1.71),.075,'Skin')]:
        limbs['Arm_L' if a[0]<0 else 'Arm_R'].append(cylinder('Explorer arm',Vector((x,y,z))+Vector(a),Vector((x,y,z))+Vector(b),r,mat,8))
    limbs['Arm_R'].append(ellipsoid('Waving mitten',(x+.57,y-.035,z+1.8),(.09,.075,.13),'Skin',8,5))
    ring('Orange neckerchief',(x,y,z+1.39),.14,.062,'Coral',major=12,minor=5)
    mesh('Trailing neckerchief',[(x+.08,y+.12,z+1.4),(x+.6,y+.33,z+1.47),(x+.57,y+.34,z+1.30),(x+.19,y+.15,z+1.29)],[(0,1,2,3)],'Coral')
    tube('Cross body satchel strap',[(x+.2,y-.18,z+1.38),(x-.09,y-.225,z+1.0),(x-.29,y-.14,z+.86)],.047,'Honey',4)
    box('Explorer field satchel',(x-.32,y,z+.84),(.26,.23,.30),'Ochre',.055)
    # Reparent only the existing limb meshes, preserving their exact world-space
    # rest pose. put() assumes a direct world-space parent, so do not generate
    # geometry under these nested pivots: convert parenting explicitly instead.
    for suffix,pivot in [('Arm_L',(-.26,0,1.30)),('Arm_R',(.26,0,1.30)),
                         ('Leg_L',(-.16,0,.85)),('Leg_R',(.16,0,.85))]:
        joint=group('Explorer_'+suffix,pivot,parent=explorer)
        joint['articulation']='rigid shoulder' if suffix.startswith('Arm') else 'rigid hip'
        joint['gltf_axes']='X: forward/back swing; Y: twist; Z: side sweep'
        joint['rest_rotation_gltf_xyzw']=[0.0,0.0,0.0,1.0]
        bpy.context.view_layer.update()
        for ob in limbs[suffix]:
            world=ob.matrix_world.copy()
            ob.parent=joint
            ob.matrix_parent_inverse=Matrix.Identity(4)
            ob.matrix_world=world


def build_dog(root):
    global CURRENT
    CURRENT=group('Dog',(.50,-1.96,.77),parent=root)
    x,y,z=.50,-1.96,.77
    ellipsoid('Dog body',(x,y,z+.48),(.23,.32,.37),'Canvas',12,8)
    ellipsoid('Dog saddle',(x,y+.09,z+.62),(.235,.25,.23),'Ochre',10,6)
    for dx in (-.16,.16):
        ellipsoid('Dog paw',(x+dx,y-.17,z+.07),(.115,.17,.08),'Canvas',10,5)
        cylinder('Dog foreleg',(x+dx,y-.1,z+.13),(x+dx,y-.12,z+.47),.071,'Canvas',8)
    ellipsoid('Dog head',(x,y-.16,z+.95),(.25,.24,.265),'Canvas',12,8)
    ellipsoid('Dog eye patch',(x-.10,y-.33,z+1.01),(.105,.08,.14),'Ochre',10,6)
    ellipsoid('Dog muzzle',(x,y-.375,z+.9),(.18,.16,.11),'Canvas',12,6)
    for dx in (-.21,.21): ellipsoid('Floppy dog ear',(x+dx,y-.09,z+.94),(.105,.155,.24),'Ochre',10,6)
    for dx in (-.095,.095): ellipsoid('Dog bright eye',(x+dx,y-.378,z+1.045),(.03,.022,.04),'Ink',8,5)
    ellipsoid('Dog nose',(x,y-.526,z+.935),(.065,.039,.045),'Ink',10,6)
    ellipsoid('Dog tongue',(x+.04,y-.495,z+.805),(.046,.03,.083),'Coral',8,5)
    ring('Dog teal collar',(x,y-.07,z+.73),.195,.044,'Patina',major=12,minor=4)
    ellipsoid('Dog brass tag',(x,y-.277,z+.70),(.045,.025,.065),'Brass',8,5)
    CURRENT=group('Dog_Tail',(x,y+.25,z+.5),parent=root)
    tube('Curled happy tail',[(x,y+.25,z+.5),(x+.08,y+.48,z+.60),(x+.16,y+.56,z+.78),(x+.15,y+.52,z+.91)],[.07,.063,.045,.012],'Ochre',7)


def rock(name,center,rx,ry,height,mat='Limestone',count=11,levels=5):
    cx,cy,cz=center
    angles=[i*TAU/count+RNG.uniform(-.10,.10) for i in range(count)]
    radii=[RNG.uniform(.86,1.14) for _ in range(count)]
    verts=[]
    for k in range(levels):
        t=k/(levels-1)
        taper=[1.0,1.02,.83,.79,.52][k] if levels==5 else 1-.32*t
        for i,a in enumerate(angles):
            rr=radii[i]*(1+RNG.uniform(-.1,.1))
            z=cz+height*t + (RNG.uniform(-.09,.09)*height if k else 0)
            verts.append((cx+math.cos(a)*rx*rr*taper+.18*height*t,
                          cy+math.sin(a)*ry*rr*taper+.06*height*t,z))
    faces=[tuple(reversed(range(count)))]
    for k in range(levels-1):
        for i in range(count):
            n=(i+1)%count
            # Split alternate broad facets into wedge planes.
            if i%3==0:
                faces += [(k*count+i,k*count+n,(k+1)*count+i),(k*count+n,(k+1)*count+n,(k+1)*count+i)]
            else: faces.append((k*count+i,k*count+n,(k+1)*count+n,(k+1)*count+i))
    faces.append(tuple(range((levels-1)*count,levels*count)))
    ob=mesh(name,verts,faces,mat)
    for m in ('Chalk','RockShadow'): ob.data.materials.append(M[m])
    for p in ob.data.polygons: p.material_index=RNG.choices((0,1,2),(7,2,2))[0]
    return ob


def terrain(name,rx,ry,z,rings,mat,seed=15):
    rng=random.Random(seed)
    n=48
    jitter=[1+.08*math.sin(i*TAU/n*3)+.06*math.cos(i*TAU/n*5)+rng.uniform(-.025,.025) for i in range(n)]
    verts=[]
    for radius,height in rings:
        for i in range(n):
            a=i*TAU/n
            r=jitter[i]*radius
            verts.append((rx*r*math.cos(a),ry*r*math.sin(a),z+height+rng.uniform(-.025,.025)))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(n):
            k=(i+1)%n
            faces.append((j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i))
    faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
    return mesh(name,verts,faces,mat)


def palm(x,y,z,h=3.0,lean=.6,angle=0):
    pts=[]
    for i in range(8):
        t=i/7
        pts.append(Vector((x+lean*t*t*math.cos(angle),y+lean*t*t*math.sin(angle),z+h*t)))
    tube('Curved palm trunk',pts,[.17*(1-.38*i/7) for i in range(8)],'Honey',7,False)
    for i in range(1,10):
        t=i/10
        c=(x+lean*t*t*math.cos(angle),y+lean*t*t*math.sin(angle),z+h*t)
        ring('Palm trunk scar',c,.17*(1-.38*t),.025,'Darkwood',major=7,minor=3)
    top=pts[-1]
    for i in range(8):
        a=i*TAU/8+angle
        length=RNG.uniform(1.7,2.25)*h/3
        path=[]
        for j in range(6):
            t=j/5
            path.append(top+Vector((math.cos(a)*length*t,math.sin(a)*length*t,math.sin(math.pi*t)*.55-.53*t*t)))
        tube('Palm frond rib',path,.019,'LeafDark',4)
        # Feathered fronds with real notched silhouettes; every leaflet has a ridge.
        direction=Vector((math.cos(a),math.sin(a),0))
        side=Vector((-math.sin(a),math.cos(a),0))
        for j in range(1,7):
            t=j/8
            center=top+Vector((math.cos(a)*length*t,math.sin(a)*length*t,math.sin(math.pi*t)*.55-.53*t*t))
            for sign in (-1,1):
                tip=center+side*sign*(.55*math.sin(t*math.pi)+.06)*h/3+direction*.26+Vector((0,0,-.20))
                leaf('Palm feather',center,tip,.18*h/3,['Leaf','LeafDark','LeafLight'][i%3],.03,stations=3)
    for d in [(-.12,0,-.15),(.13,.07,-.18),(0,-.16,-.23)]:
        ellipsoid('Coconut',top+Vector(d),(.13,.13,.17),'Darkwood',8,5)


def build_island():
    global CURRENT
    reset()
    root=group('Island')
    root['waterline']=0.0
    CURRENT=group('Beach',parent=root)
    terrain('Warm shallow sand shelf',8.8,7.0,0,[(1,-.32),(.95,.06),(.88,.29),(.70,.5),(.4,.53),(0,.55)],'Sand')
    terrain('Low grassy island heart',8.0,5.6,.55,[(1,-.15),(.94,.05),(.78,.16),(.3,.16),(0,.16)],'Leaf',23)
    # Asymmetric karst grouping, not a concentric cake: a split high rear peak,
    # smaller buttresses, front sheltered cove, broad negative space to land.
    CURRENT=group('Limestone_Cliffs',parent=root)
    for args in [((-2.5,2.0,.5),2.25,1.8,6.4),((-.1,2.85,.5),1.75,1.5,8.1),
                 ((2.0,2.55,.5),1.75,1.5,5.9),((-4.25,1.7,.4),1.55,1.5,4.0),
                 ((3.5,2.1,.45),1.7,1.3,3.5),((-2.5,-.35,.45),1.7,1.5,2.6)]:
        center,rx,ry,h=args
        rock('Weathered karst spire',center,rx,ry,h)
        topx=center[0]+.18*h
        topy=center[1]+.06*h
        # Thin interrupted limestone ledges and moss caps emphasize strata.
        rock('Broken chalk terrace',(center[0]+.10*h,center[1]+.02*h,center[2]+h*.48),rx*.86,ry*.88,.3,'Chalk',9,3)
        cap=terrain('Mossy cliff crown',rx*.53,ry*.52,center[2]+h*.97,[(1,0),(.82,.10),(.3,.13),(0,.15)],'LeafDark',int(h*100))
        cap.location.x=topx
        cap.location.y=topy
        for j in range(3):
            a=j*2.3
            leaf('Cliff-top fern',(topx,topy,center[2]+h*1.01),(topx+.6*math.cos(a),topy+.6*math.sin(a),center[2]+h*1.01+.22),.28,'Leaf')
    # Faceted shoreline rocks bed the cliffs into the beach.
    for x,y,r,h in [(-6.1,1.4,1.4,1.5),(-5.4,-1.6,1.0,1.0),(4.8,2.0,1.25,1.3),
                    (5.5,-.2,.7,.85),(-6.7,-.5,.65,.7),(1.7,4.8,.7,1.5),
                    (7.1,1.9,.7,.8),(-7.5,2.6,.55,.95),(3.8,-2.0,.5,.55)]:
        rock('Tumbled coastal limestone',(x,y,.20),r,r*.75,h,count=8,levels=3)
    CURRENT=group('Palms',parent=root)
    for args in [(-5.25,-1.65,.6,3.1,.7,-.3),(-4.10,-2.65,.62,3.65,.6,.8),
                 (4.0,-1.2,.65,3.8,.95,-.4),(5.3,.1,.55,3.2,.5,.7),
                 (1.3,-2.3,.69,2.85,.6,1.1),(-1.4,2.4,6.65,1.65,.4,.5)]: palm(*args)
    CURRENT=group('Undergrowth',parent=root)
    for i in range(34):
        a=RNG.uniform(0,TAU)
        r=RNG.uniform(.58,.94)
        x,y=6.7*r*math.cos(a),4.4*r*math.sin(a)
        if y<-2.2 and -2.7<x<2.8: continue # Readable sandy landing path.
        plant(x,y,.66,RNG.uniform(.45,.9),False)
    for x,y in [(-3.8,-3.1),(3.0,-2.0),(5.7,1.8)]:
        for i in range(5):
            a=i*2.4
            ellipsoid('Coastal ground-cover rosette',(x+.26*math.cos(a),y+.26*math.sin(a),.78),(.24,.22,.19),['LeafDark','Leaf','LeafLight'][i%3],7,4)
    CURRENT=group('Beach_Details',parent=root)
    cylinder('Bleached driftwood',(-3.9,-4.55,.42),(-1.7,-4.05,.6),.17,'Sunwood',9,.12)
    cylinder('Driftwood branch',(-2.7,-4.29,.52),(-2.9,-3.88,.87),.085,'Sunwood',7,.028)
    for x,y in [(-.5,-5.2),(2.8,-4.6),(4.5,-3.6),(-5.9,-3.0)]:
        ellipsoid('Beach shell',(x,y,.37),(.16,.12,.08),'Shell',8,5)
    # Small empty mooring dock gives purpose and recognizable approach scale.
    CURRENT=group('Landing_Dock',parent=root)
    for y in (-4.4,-6.6):
        for x in (-.95,.95):
            cylinder('Dock timber pile',(x,y,-.4),(x,y,1.18),.13,'Darkwood',9,.105)
            bindings((x,y,1.04),.14,'Z',2)
    for x in (-.75,.75): box('Dock bearer',(x,-5.4,.64),(.16,3.25,.22),'Darkwood',.04)
    for j in range(11): box('Dock sun-worn plank',(0,-4.02-j*.276,.82),(2.02,.25,.13),['Honey','Sunwood','Cedar'][j%3],.035)
    return root


def stage(name):
    """Preview-only staging; hidden from export by selection."""
    global CURRENT
    CURRENT=None
    material('Preview_Ocean','478C99',.38)
    plane=box('PREVIEW ONLY • waterline',(0,0,-.39),(200,200,.10),'Preview_Ocean',0)
    plane['preview_only']=True
    world=bpy.data.worlds.new('Ocean sky')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.30,.49,.58,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.45
    bpy.context.scene.world=world
    for label,loc,power,size,color in [
        ('Warm broad key',(-8,-10,16),2300,9,(1,.85,.66)),
        ('Cool ocean fill',(7,-2,10),1700,8,(.61,.84,1)),
        ('Golden rim',(1,9,14),2800,7,(1,.79,.48))]:
        data=bpy.data.lights.new(label,'AREA')
        data.energy=power
        data.shape='DISK'
        data.size=size
        data.color=color
        ob=bpy.data.objects.new(label,data)
        bpy.context.collection.objects.link(ob)
        ob.location=loc
        ob.rotation_euler=(Vector((0,0,1))-ob.location).to_track_quat('-Z','Y').to_euler()
    sun=bpy.data.lights.new('Soft late afternoon sun','SUN')
    sun.energy=1.3
    sun.angle=.2
    ob=bpy.data.objects.new('Soft late afternoon sun',sun)
    bpy.context.collection.objects.link(ob)
    ob.rotation_euler=(.45,-.4,-.45)
    data=bpy.data.cameras.new('Art review camera')
    camera=bpy.data.objects.new('Art review camera',data)
    bpy.context.collection.objects.link(camera)
    if name=='workshop':
        camera.location=(-13,-18,12)
        target=Vector((-.15,0,3.0))
        data.ortho_scale=15.5
    else:
        camera.location=(19,-27,20)
        target=Vector((0,.6,3.0))
        data.ortho_scale=25.6
    data.type='ORTHO'
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene
    scene.camera=camera
    scene.render.engine='CYCLES'
    scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1500
    scene.render.resolution_y=1500
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX'
    scene.render.film_transparent=False
    scene.render.filepath=str(ROOT/'assets'/'previews'/f'{name}.png')
    scene.unit_settings.system='METRIC'
    scene.unit_settings.scale_length=1
    scene.render.fps=30


def export_optimized(root,name):
    """Preserve source meshes, export evaluated & merged copies per logical part."""
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    source=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent]
    export_collection=bpy.data.collections.new('TEMP optimized glTF export')
    bpy.context.scene.collection.children.link(export_collection)
    copies=[]
    # One static batch per island; one raft base batch plus explicit upgrade /
    # articulation boundaries. Source hierarchy is preserved in the .blend.
    batch_parents={}
    if name=='island':
        batch_parents['Island_Static']=group('Island_Static',parent=root)
    else:
        batch_parents['Workshop_Static']=group('Workshop_Static',parent=root)
    moving={'Wheel','Engine_Flywheel','Pennant_Main','Dog_Tail','Crane_Boom','Crane_Hook','Explorer',
            'Explorer_Arm_L','Explorer_Arm_R','Explorer_Leg_L','Explorer_Leg_R'}
    def export_parent(ob):
        parent=ob.parent
        if name=='island': return batch_parents['Island_Static']
        if parent.name in moving: return parent
        cursor=parent
        while cursor and cursor!=root:
            if cursor.name.startswith('Upgrade_'): return cursor
            cursor=cursor.parent
        return batch_parents['Workshop_Static']
    for ob in source:
        evaluated=ob.evaluated_get(deps)
        data=bpy.data.meshes.new_from_object(evaluated,depsgraph=deps)
        copy=bpy.data.objects.new(ob.name+'_export',data)
        export_collection.objects.link(copy)
        copy.matrix_world=ob.matrix_world.copy()
        copy['group_name']=export_parent(ob).name
        copies.append(copy)
    bpy.ops.object.select_all(action='DESELECT')
    originals=[]
    batches={}
    for ob in copies: batches.setdefault(ob['group_name'],[]).append(ob)
    for group_name,batch in sorted(batches.items()):
        for ob in batch: ob.select_set(True)
        bpy.context.view_layer.objects.active=batch[0]
        bpy.ops.object.join()
        merged=bpy.context.view_layer.objects.active
        merged.name=group_name+'_Geometry'
        # Remove unused/duplicate material slots after join for efficient glTF primitives.
        unique=[]
        mapping={}
        for i,slot in enumerate(merged.data.materials):
            if slot not in unique: unique.append(slot)
            mapping[i]=unique.index(slot)
        indices=[mapping[p.material_index] for p in merged.data.polygons]
        merged.data.materials.clear()
        for mat in unique: merged.data.materials.append(mat)
        for p,i in zip(merged.data.polygons,indices): p.material_index=i
        world=merged.matrix_world.copy()
        merged.parent=GROUPS[group_name]
        merged.matrix_world=world
        originals.append(merged)
        bpy.ops.object.select_all(action='DESELECT')
    for ob in originals: ob.select_set(True)
    for ob in GROUPS.values(): ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(ROOT/'public'/'assets'/f'{name}.glb'),
        export_format='GLB',use_selection=True,export_yup=True,
        export_apply=True,export_animations=False,export_extras=True,
        export_cameras=False,export_lights=False,export_texcoords=False,
        export_normals=True,export_materials='EXPORT',export_attributes=False,
    )
    for ob in list(export_collection.objects): bpy.data.objects.remove(ob,do_unlink=True)
    bpy.data.collections.remove(export_collection)
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    bpy.context.view_layer.objects.active=root


def inspect_glb(path):
    raw=path.read_bytes()
    magic,version,total=struct.unpack_from('<4sII',raw)
    assert magic==b'glTF' and version==2 and total==len(raw)
    size,kind=struct.unpack_from('<II',raw,12)
    assert kind==0x4E4F534A
    doc=json.loads(raw[20:20+size])
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    return {'file':str(path.relative_to(ROOT)), 'bytes':len(raw),
            'triangles':triangles,'materials':len(doc.get('materials',[])),
            'meshes':len(doc['meshes']),
            'primitives':sum(len(m['primitives']) for m in doc['meshes']),
            'nodes':[n['name'] for n in doc['nodes'] if 'mesh' not in n]}


def bounds(root):
    bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    points=[]
    for ob in bpy.context.scene.objects:
        if ob.type!='MESH' or not ob.parent: continue
        ev=ob.evaluated_get(dg)
        points += [ev.matrix_world@Vector(c) for c in ev.bound_box]
    low=[min(p[i] for p in points) for i in range(3)]
    high=[max(p[i] for p in points) for i in range(3)]
    return {'min':[round(low[0],3),round(low[2],3),round(-high[1],3)],
            'max':[round(high[0],3),round(high[2],3),round(-low[1],3)],
            'dimensions':[round(high[0]-low[0],3),round(high[2]-low[2],3),round(high[1]-low[1],3)]}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--only',choices=['workshop','island'])
    parser.add_argument('--no-render',action='store_true')
    parser.add_argument('--no-manifest',action='store_true',help='Do not rewrite the shared workshop/island manifest during a narrowly scoped asset revision.')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for folder in ('assets/previews','public/assets'): (ROOT/folder).mkdir(parents=True,exist_ok=True)
    reports=[]
    for name,builder in [('workshop',build_workshop),('island',build_island)]:
        if args.only and args.only!=name: continue
        root=builder()
        asset_bounds=bounds(root)
        export_optimized(root,name)
        report=inspect_glb(ROOT/'public/assets'/f'{name}.glb')
        report['bounds_gltf_xyz']=asset_bounds
        report['waterline_y']=0
        reports.append(report)
        print('ASSET_REPORT '+json.dumps(report),flush=True)
        stage(name)
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets'/f'{name}.blend'))
        if not args.no_render: bpy.ops.render.render(write_still=True)
    report_path=ROOT/'assets'/'asset-manifest.json'
    if args.only and report_path.exists():
        previous=json.loads(report_path.read_text())
        reports += [r for r in previous['assets'] if not r['file'].endswith(args.only+'.glb')]
    reports.sort(key=lambda r:r['file'])
    total=sum(r['triangles'] for r in reports)
    assert total<100000, f'Triangle hard cap exceeded: {total}'
    if not args.no_manifest:
        report_path.write_text(json.dumps({'generator':'scripts/build_assets.py','seed':47,'total_triangles':total,'assets':reports},indent=2)+'\n')
    print(f'COMPLETE: {total:,} triangles. Editable .blend files, GLBs and previews in {ROOT}',flush=True)


if __name__=='__main__': main()
