import { MeshPhysicalMaterial } from 'three';



class MeshPostProcessingMaterial extends MeshPhysicalMaterial {

	constructor( parameters ) {

		const aoPassMap = parameters.aoPassMap;
		const aoPassMapScale = parameters.aoPassMapScale || 1.0;
		delete parameters.aoPassMap;
		delete parameters.aoPassMapScale;

		super( parameters );

		this.onBeforeCompile = this._onBeforeCompile;
		this.customProgramCacheKey = this._customProgramCacheKey;
		this._aoPassMap = aoPassMap;
		this.aoPassMapScale = aoPassMapScale;
		this._shader = null;

	}

	get aoPassMap() {

		return this._aoPassMap;

	}

	set aoPassMap( aoPassMap ) {

		this._aoPassMap = aoPassMap;
		this.needsUpdate = true;
		this._setUniforms();

	}

	_customProgramCacheKey() {

		return this._aoPassMap !== undefined && this._aoPassMap !== null ? 'aoPassMap' : '';

	}

	_onBeforeCompile( shader ) {

		this._shader = shader;

		if ( this._aoPassMap !== undefined && this._aoPassMap !== null ) {

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <aomap_pars_fragment>',
				aomap_pars_fragment_replacement
			);
			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <aomap_fragment>',
				aomap_fragment_replacement
			);

		}

		this._setUniforms();

	}

	_setUniforms() {

		if ( this._shader ) {

			this._shader.uniforms.tAoPassMap = { value: this._aoPassMap };
			this._shader.uniforms.aoPassMapScale = { value: this.aoPassMapScale };

		}

	}

}

const aomap_pars_fragment_replacement = /* glsl */`
#ifdef USE_AOMAP

	uniform sampler2D aoMap;
	uniform float aoMapIntensity;

#endif

	uniform sampler2D tAoPassMap;
	uniform float aoPassMapScale;
`;

const aomap_fragment_replacement = /* glsl */`
#ifndef AOPASSMAP_SWIZZLE
	#define AOPASSMAP_SWIZZLE r
#endif
	float ambientOcclusion = texelFetch( tAoPassMap, ivec2( gl_FragCoord.xy * aoPassMapScale ), 0 ).AOPASSMAP_SWIZZLE;

#ifdef USE_AOMAP

	// reads channel R, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
	ambientOcclusion = min( ambientOcclusion, texture2D( aoMap, vAoMapUv ).r );
	ambientOcclusion *= ( ambientOcclusion - 1.0 ) * aoMapIntensity + 1.0;

#endif

	reflectedLight.indirectDiffuse *= ambientOcclusion;

	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif

	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif

	#if defined( USE_ENVMAP ) && defined( STANDARD )

		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );

		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );

	#endif
`;

export { MeshPostProcessingMaterial };