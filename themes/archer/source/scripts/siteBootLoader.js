(function () {
    var loader = document.getElementById('site-boot-loader');
    if (!loader) return;

    var forceBoot = /(?:\?|&)boot=1(?:&|$)/.test(window.location.search);
    var once = loader.getAttribute('data-session-once') !== 'false';
    var minDuration = parseInt(loader.getAttribute('data-min-duration'), 10) || 1800;
    var maxDuration = parseInt(loader.getAttribute('data-max-duration'), 10) || 5200;
    var fadeDuration = parseInt(loader.getAttribute('data-fade-duration'), 10) || 900;
    var storageKey = 'ggxd.siteBootLoader.seen.v5';
    var start = Date.now();
    var reducedMotion = false;

    try {
        reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!forceBoot && once && sessionStorage.getItem(storageKey) === '1') {
            loader.parentNode.removeChild(loader);
            return;
        }
    } catch (err) {}

    var canvas = loader.querySelector('.site-boot-canvas');
    var gl = !reducedMotion && canvas ? canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) : null;
    var rafId = 0;
    var running = true;
    var fading = false;

    function finishLoader() {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        loader = null;
    }

    function beginFade() {
        if (!loader || fading) return;
        fading = true;
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        try {
            if (!forceBoot && once) sessionStorage.setItem(storageKey, '1');
        } catch (err) {}
        loader.style.setProperty('--site-boot-fade-duration', fadeDuration + 'ms');
        loader.classList.add('site-boot-loader-fading');
        window.setTimeout(finishLoader, fadeDuration + 80);
    }

    function scheduleFade() {
        var elapsed = Date.now() - start;
        window.setTimeout(beginFade, Math.max(0, minDuration - fadeDuration - elapsed));
    }

    window.setTimeout(beginFade, Math.max(0, maxDuration - fadeDuration));
    if (document.readyState === 'complete') {
        scheduleFade();
    } else {
        window.addEventListener('load', scheduleFade, { once: true });
    }

    if (!gl) {
        loader.classList.add('site-boot-loader-css');
        return;
    }

    var vertexSource = [
        'attribute vec3 position;',
        'void main() {',
        '  gl_Position = vec4( position, 1.0 );',
        '}'
    ].join('\n');

    var fragmentSource = [
        '#define TWO_PI 6.2831853072',
        '#define PI 3.14159265359',
        '',
        'precision highp float;',
        'uniform vec2 resolution;',
        'uniform float time;',
        '',
        'void main(void) {',
        '  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);',
        '  float t = time*0.05;',
        '  float lineWidth = 0.002;',
        '',
        '  vec3 color = vec3(0.0);',
        '  for(int j = 0; j < 3; j++){',
        '    for(int i=0; i < 5; i++){',
        '      color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));',
        '    }',
        '  }',
        '  gl_FragColor = vec4(color[0],color[1],color[2],1.0);',
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0,
         1, -1, 0,
        -1,  1, 0,
        -1,  1, 0,
         1, -1, 0,
         1,  1, 0
    ]), gl.STATIC_DRAW);

    var position = gl.getAttribLocation(program, 'position');
    var resolution = gl.getUniformLocation(program, 'resolution');
    var time = gl.getUniformLocation(program, 'time');
    var shaderTime = 1.0;

    function resize() {
        var ratio = window.devicePixelRatio || 1;
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
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        shaderTime += 0.05;
        gl.uniform1f(time, shaderTime);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        rafId = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize, { passive: true });
    render();
})();
