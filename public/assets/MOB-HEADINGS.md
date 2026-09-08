# Mob facing calibration

`manifest.json` stores `headAngle` in source-image coordinates: right = 0, down = π/2. It describes the original image before the legacy `rotation` field. The renderer calls `mobSpriteAngle(key, heading)` so `draw angle + rotation + headAngle = heading`. SVG and original-image fallback must use the same native front. Thumbnail orientations remain unchanged.

| Sprite | Native front | Evidence / convention |
|---|---:|---|
| bee | −45° | antennae upper-right, stinger lower-left |
| ladybug | −135° | black head upper-left |
| baby-ant | −135° | antennae upper-left |
| worker-ant | −135° | antennae/head upper-left |
| soldier-ant | −135° | antennae/head upper-left |
| centipede | −135° | antennae upper-left, following body lower-right |
| centipede-body | −135° | follows the head axis |
| beetle | −135° | mandibles upper-left |
| scorpion | −135° | front appendages upper-left, curled tail lower-right |
| crab | −45° | two claws upper-right, not the body's long axis |
| spider | −135° | chosen axis between legs; no distinct head in this image |
| shell | −135° | chosen front toward fan; no anatomical head shown |
| jellyfish | 0° | radial image, convention only |
| starfish | 0° | radial image, convention only |
| sandstorm | 0° | no head, convention only |
| mob-rock | 0° | no head; stationary |

Movement smooths a non-negative scalar speed, then computes velocity directly along the current heading. Boundary clipping shortens the whole forward step rather than clamping X/Y independently. Turning never carries sideways inertia. Re-entering the game seeds fresh mob instances without deleting player inventory, level or talents.
