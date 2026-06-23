(function () {
    var loader = document.getElementById('site-boot-loader');
    if (!loader) return;

    var forceBoot = /(?:\?|&)boot=1(?:&|$)/.test(window.location.search);
    var once = loader.getAttribute('data-session-once') !== 'false';
    var minDuration = parseInt(loader.getAttribute('data-min-duration'), 10) || 3200;
    var maxDuration = parseInt(loader.getAttribute('data-max-duration'), 10) || 5200;
    var fadeDuration = parseInt(loader.getAttribute('data-fade-duration'), 10) || 450;
    var storageKey = 'ggxd.siteBootLoader.seen.v11';
    var start = 0;
    var reducedMotion = false;
    var pageLoaded = document.readyState === 'complete';

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
        document.documentElement.classList.remove('site-boot-title-handoff');
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        loader = null;
    }

    function markSeen() {
        try {
            if (!forceBoot && once) sessionStorage.setItem(storageKey, '1');
        } catch (err) {}
    }

    function prepareTitleHandoff() {
        var bootName = loader.querySelector('.site-boot-name');
        var bootText = loader.querySelector('.site-boot-name span');
        var targetTitle = document.querySelector('.home-body .intro-title');
        if (!bootName || !bootText || !targetTitle) return false;

        var bootRect = bootText.getBoundingClientRect();
        var targetRect = targetTitle.getBoundingClientRect();
        if (!bootRect.width || !bootRect.height || !targetRect.width || !targetRect.height) return false;

        var dx = (targetRect.left + targetRect.width / 2) - (bootRect.left + bootRect.width / 2);
        var dy = (targetRect.top + targetRect.height / 2) - (bootRect.top + bootRect.height / 2);
        var scale = Math.max(0.45, Math.min(1.25, targetRect.width / bootRect.width));
        var targetStyle = window.getComputedStyle(targetTitle);
        bootName.style.setProperty('--site-boot-title-x', dx + 'px');
        bootName.style.setProperty('--site-boot-title-y', dy + 'px');
        bootName.style.setProperty('--site-boot-title-scale', scale);
        bootText.style.setProperty('--site-boot-title-color', targetStyle.color || '#fff');
        bootText.style.setProperty('--site-boot-title-shadow', targetStyle.textShadow || 'none');
        return true;
    }

    function beginFade() {
        if (!loader || fading) return;
        fading = true;
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        markSeen();
        loader.style.setProperty('--site-boot-fade-duration', fadeDuration + 'ms');
        if (prepareTitleHandoff()) {
            document.documentElement.classList.add('site-boot-title-handoff');
            loader.classList.add('site-boot-loader-handoff');
            window.setTimeout(finishLoader, 1680);
            return;
        }
        loader.classList.add('site-boot-loader-fading');
        window.setTimeout(finishLoader, fadeDuration + 80);
    }

    function scheduleFade() {
        if (!start) return;
        var elapsed = Date.now() - start;
        window.setTimeout(beginFade, Math.max(0, minDuration - fadeDuration - elapsed));
    }

    function startIntro() {
        if (!loader || start) return;
        start = Date.now();
        loader.classList.add('site-boot-loader-active');
        window.setTimeout(beginFade, Math.max(0, maxDuration - fadeDuration));
        if (pageLoaded) scheduleFade();
    }

    if (!pageLoaded) {
        window.addEventListener('load', function () {
            pageLoaded = true;
            scheduleFade();
        }, { once: true });
    }

    if (!gl) {
        loader.classList.add('site-boot-loader-css');
        window.requestAnimationFrame(startIntro);
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
        window.requestAnimationFrame(startIntro);
        return;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        loader.classList.add('site-boot-loader-css');
        window.requestAnimationFrame(startIntro);
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
        if (!start) window.requestAnimationFrame(startIntro);
        rafId = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize, { passive: true });
    render();
})();
