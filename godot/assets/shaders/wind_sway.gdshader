shader_type canvas_item;

uniform float wind_speed : hint_range(0.0, 5.0) = 1.5;
uniform float wind_strength : hint_range(0.0, 0.2) = 0.03;
uniform float phase_offset : hint_range(0.0, 6.28) = 0.0;
// Objects sway more at top, anchored at bottom
uniform float sway_gradient : hint_range(0.0, 1.0) = 1.0;

void vertex() {
	float sway = sin(TIME * wind_speed + phase_offset + VERTEX.x * 0.05) * wind_strength;
	// More sway at top of sprite (UV.y=0), none at bottom (UV.y=1)
	float height_factor = (1.0 - UV.y) * sway_gradient;
	VERTEX.x += sway * height_factor * 100.0;
}
