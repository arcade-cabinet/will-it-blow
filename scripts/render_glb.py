import bpy
import sys
import math

argv = sys.argv
argv = argv[argv.index("--") + 1:]

filepath = argv[0]
outpath = argv[1]

# Clear existing objects
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import GLB
bpy.ops.import_scene.gltf(filepath=filepath)

# Deselect all
bpy.ops.object.select_all(action='DESELECT')

# Select only imported meshes to calculate bounding box
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
for mesh in meshes:
    mesh.select_set(True)

if meshes:
    bpy.context.view_layer.objects.active = meshes[0]

# Set up a camera
camera_data = bpy.data.cameras.new(name="Camera")
camera_object = bpy.data.objects.new("Camera", camera_data)
bpy.context.scene.collection.objects.link(camera_object)
bpy.context.scene.camera = camera_object

# Frame all objects using the operator
bpy.ops.view3d.camera_to_view_selected()

# Add a strong Sun light
light_data = bpy.data.lights.new(name="Sun", type='SUN')
light_data.energy = 5.0
light_object = bpy.data.objects.new("Sun", light_data)
bpy.context.scene.collection.objects.link(light_object)
light_object.location = (5, -5, 5)
light_object.rotation_euler = (math.radians(45), 0, math.radians(45))

# Add a fill light
fill_data = bpy.data.lights.new(name="Fill", type='AREA')
fill_data.energy = 200.0
fill_object = bpy.data.objects.new("Fill", fill_data)
bpy.context.scene.collection.objects.link(fill_object)
fill_object.location = (-5, 5, 2)
fill_object.rotation_euler = (math.radians(-45), 0, math.radians(-135))

# Render settings
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 16
bpy.context.scene.render.filepath = outpath
bpy.context.scene.render.resolution_x = 512
bpy.context.scene.render.resolution_y = 512

bpy.ops.render.render(write_still=True)
