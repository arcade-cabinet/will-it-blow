import bpy
import sys
import math
from mathutils import Vector

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

# Frame all objects using bounding box math (works in headless/background mode)
if meshes:
    # Compute combined world-space bounding box of all meshes
    min_corner = Vector((math.inf, math.inf, math.inf))
    max_corner = Vector((-math.inf, -math.inf, -math.inf))

    for obj in meshes:
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world_corner.x)
            min_corner.y = min(min_corner.y, world_corner.y)
            min_corner.z = min(min_corner.z, world_corner.z)
            max_corner.x = max(max_corner.x, world_corner.x)
            max_corner.y = max(max_corner.y, world_corner.y)
            max_corner.z = max(max_corner.z, world_corner.z)

    center = (min_corner + max_corner) * 0.5
    size = max_corner - min_corner
    # Use the largest dimension as radius estimate
    radius = max(size.x, size.y, size.z) * 0.5

    # Ensure a minimum radius to avoid degenerate cases
    if radius < 0.1:
        radius = 0.1

    # Camera field of view (radians)
    fov = camera_data.angle
    if fov <= 0.0:
        fov = math.radians(50.0)

    # Distance to fit the bounding "sphere" within the vertical FOV
    distance = radius / math.sin(fov * 0.5)
    # Add a margin so the object isn't tight to the frame
    distance *= 1.2

    # Choose a viewing direction (diagonal from above)
    view_direction = Vector((1.0, -1.0, 1.0)).normalized()

    camera_location = center + view_direction * distance
    camera_object.location = camera_location

    # Aim the camera at the center
    direction_to_target = (center - camera_location).normalized()
    rot_quat = direction_to_target.to_track_quat('-Z', 'Y')
    camera_object.rotation_euler = rot_quat.to_euler()
else:
    # Fallback: position camera at a reasonable default looking at the origin
    camera_object.location = (0.0, -5.0, 3.0)
    camera_object.rotation_euler = (math.radians(60.0), 0.0, 0.0)

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
