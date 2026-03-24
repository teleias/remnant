shader_type canvas_item;

uniform float time_scale : hint_range(0.1, 3.0) = 1.0;
uniform vec4 shallow_color : source_color = vec4(0.2, 0.4, 0.6, 0.85);
uniform vec4 deep_color : source_color = vec4(0.08, 0.15, 0.3, 0.95);
uniform float wave_amplitude : hint_range(0.0, 0.1) = 0.02;
uniform float caustic_intensity : hint_range(0.0, 1.0) = 0.4;
uniform float foam_threshold : hint_range(0.0, 1.0) = 0.7;

// Simplex-like hash
vec2 hash22(vec2 p) {
	p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
	return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(dot(hash22(i), f), dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
		mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
		u.y
	);
}

void fragment() {
	float t = TIME * time_scale;
	vec2 uv = UV;

	// Wave distortion
	float wave1 = sin(uv.x * 12.0 + t * 2.0) * wave_amplitude;
	float wave2 = sin(uv.y * 8.0 + t * 1.5 + 1.5) * wave_amplitude * 0.7;
	vec2 distorted_uv = uv + vec2(wave1, wave2);

	// Base water color (depth gradient)
	vec4 base_color = mix(shallow_color, deep_color, distorted_uv.y);

	// Animated caustics
	float caustic1 = noise(distorted_uv * 8.0 + vec2(t * 0.5, t * 0.3));
	float caustic2 = noise(distorted_uv * 12.0 - vec2(t * 0.4, t * 0.6));
	float caustics = (caustic1 + caustic2) * 0.5 + 0.5;
	caustics = pow(caustics, 2.0) * caustic_intensity;

	// Ripple rings
	float ripple = sin(length(distorted_uv - vec2(0.5)) * 20.0 - t * 3.0) * 0.5 + 0.5;
	ripple *= 0.15;

	// Foam at edges (simulates shore)
	float edge_dist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
	float foam = smoothstep(0.05, 0.0, edge_dist) * (sin(t * 2.0 + uv.x * 10.0) * 0.5 + 0.5);

	// Combine
	vec4 final_color = base_color;
	final_color.rgb += vec3(caustics * 0.3);
	final_color.rgb += vec3(ripple);
	final_color.rgb += vec3(foam * 0.6);

	// Specular highlight (NW light source for isometric)
	float spec = pow(max(0.0, noise(uv * 4.0 + vec2(t * 0.3))), 4.0) * 0.2;
	final_color.rgb += vec3(spec);

	COLOR = final_color;
}
