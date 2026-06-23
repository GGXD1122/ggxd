(function () {
    var loader = document.getElementById('site-boot-loader');
    if (!loader) return;

    var once = loader.getAttribute('data-session-once') !== 'false';
    var minDuration = parseInt(loader.getAttribute('data-min-duration'), 10) || 1800;
    var maxDuration = parseInt(loader.getAttribute('data-max-duration'), 10) || 5200;
    var storageKey = 'ggxd.siteBootLoader.seen';
    var start = Date.now();
    var reducedMotion = false;

    try {
        reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (once && sessionStorage.getItem(storageKey) === '1') {
            loader.parentNode.removeChild(loader);
            return;
        }
    } catch (err) {}

    var canvas = loader.querySelector('.site-boot-canvas');
    var gl = !reducedMotion && canvas ? canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) : null;
    var rafId = 0;
    var running = true;

    function closeLoader() {
        if (!loader || loader.classList.contains('site-boot-loader-hide')) return;
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        try {
            if (once) sessionStorage.setItem(storageKey, '1');
        } catch (err) {}
        loader.classList.add('site-boot-loader-hide');
        window.setTimeout(function () {
            if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
            loader = null;
        }, 720);
    }

    function scheduleClose() {
        var elapsed = Date.now() - start;
        window.setTimeout(closeLoader, Math.max(0, minDuration - elapsed));
    }

    window.setTimeout(closeLoader, maxDuration);
    if (document.readyState === 'complete') {
        scheduleClose();
    } else {
        window.addEventListener('load', scheduleClose, { once: true });
    }

    if (!gl) {
        loader.classList.add('site-boot-loader-css');
        return;
    }

    var vertexSource = [
        'attribute vec2 a_position;',
        'void main(){',
        '  gl_Position = vec4(a_position, 0.0, 1.0);',
        '}'
    ].join('\n');

    var fragmentSource = [
        'precision highp float;',
        'uniform vec2 u_resolution;',
        'uniform float u_time;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
        'void main(){',
        '  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);',
        '  float t = u_time * 0.42;',
        '  float r = length(uv);',
        '  float angle = atan(uv.y, uv.x);',
        '  float rings = sin((r * 18.0 - t * 6.0) + sin(angle * 4.0 + t) * 0.55);',
        '  float crisp = smoothstep(0.18, 0.98, abs(rings));',
        '  float sweep = sin(angle * 7.0 + r * 8.0 - t * 3.0);',
        '  vec3 dark = vec3(0.015, 0.016, 0.020);',
        '  vec3 amber = vec3(1.0, 0.54, 0.20);',
        '  vec3 cyan = vec3(0.25, 0.88, 1.0);',
        '  vec3 violet = vec3(0.58, 0.32, 1.0);',
        '  vec3 color = mix(dark, amber, smoothstep(0.16, 0.96, crisp));',
        '  color = mix(color, cyan, smoothstep(0.35, 1.0, sweep) * 0.42);',
        '  color = mix(color, violet, smoothstep(0.18, 0.84, -sweep) * 0.35);',
        '  float beam = pow(max(0.0, 1.0 - abs(fract(r * 5.0 - t) - 0.5) * 2.0), 8.0);',
        '  color += beam * vec3(0.9, 0.72, 0.45);',
        '  float grain = (hash(gl_FragCoord.xy + floor(u_time * 24.0)) - 0.5) * 0.035;',
        '  float vignette = smoothstep(1.45, 0.22, r);',
        '  color = color * vignette + grain;',
        '  gl_FragColor = vec4(color, 1.0);',
        '}'
    ].join('\n');

    function compile(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    var vertex = compile(gl.VERTEX_SHADER, vertexSource);
    var fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) {
        loader.classList.add('site-boot-loader-css');
        return;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        loader.classList.add('site-boot-loader-css');
        return;
    }

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    var position = gl.getAttribLocation(program, 'a_position');
    var resolution = gl.getUniformLocation(program, 'u_resolution');
    var time = gl.getUniformLocation(program, 'u_time');

    function resize() {
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        var width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
        var height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
        }
    }

    function render() {
        if (!running) return;
        resize();
        gl.useProgram(program);
        gl.enableVertexAttribArray(position);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, (Date.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        rafId = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize, { passive: true });
    render();
})();
