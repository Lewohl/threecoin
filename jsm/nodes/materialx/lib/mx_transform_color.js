// Three.js Transpiler
// https://github.com/AcademySoftwareFoundation/MaterialX/blob/main/libraries/stdlib/genglsl/lib/mx_transform_color.glsl

import { bvec3, vec3, tslFn } from '../../shadernode/ShaderNode.js';
import { greaterThan } from '../../math/OperatorNode.js';
import { max, pow, mix } from '../../math/MathNode.js';

const mx_srgb_texture_to_lin_rec709 = tslFn( ( [ color_immutable ] ) => {

	const color = vec3( color_immutable ).toVar();
	const isAbove = bvec3( greaterThan( color, vec3( 0.04045 ) ) ).toVar();
	const linSeg = vec3( color.div( 12.92 ) ).toVar();
	const powSeg = vec3( pow( max( color.add( vec3( 0.055 ) ), vec3( 0.0 ) ).div( 1.055 ), vec3( 2.4 ) ) ).toVar();

	return mix( linSeg, powSeg, isAbove );

} );

// layouts

mx_srgb_texture_to_lin_rec709.setLayout( {
	name: 'mx_srgb_texture_to_lin_rec709',
	type: 'vec3',
	inputs: [
		{ name: 'color', type: 'vec3' }
	]
} );

export { mx_srgb_texture_to_lin_rec709 };