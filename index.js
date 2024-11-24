(() => {
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    document.body.style.overflow = 'hidden';

    const canvas = document.getElementById('cid');
    const gl = canvas.getContext('webgl2');

    const setCanvasSize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.onresize = setCanvasSize;
    setCanvasSize();

    const vsSrc = `#version 300 es
        in vec2 vert2d;

        void main(void) {
            gl_Position = vec4(vert2d, 0, 1);
        }
    `;
    const fsSrc = `#version 300 es
        precision highp float;

        uniform vec2 screen;
        uniform float time;

        out vec4 fragColor;

        void main() {
            float x = gl_FragCoord.x / screen.x;
            float y = gl_FragCoord.y / screen.y;

            fragColor = vec4(y, x, y, 1.0);
        }
    `;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const program = gl.createProgram();
    
    gl.shaderSource(vs, vsSrc); 
    gl.compileShader(vs);
    gl.attachShader(program, vs); 

    gl.shaderSource(fs, fsSrc); 
    gl.compileShader(fs);
    gl.attachShader(program, fs); 
    
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        console.error(gl.getShaderInfoLog(vs));
        console.error(gl.getShaderInfoLog(fs));
        return;
    }

    const vertCoord = new Float32Array([
        1, 1,
        -1, 1,
        1, -1,
        -1, -1
    ]);
    const vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, vertCoord, gl.STATIC_DRAW);


    const indices = new Uint16Array([
        0, 1, 2,
        3, 2, 1
    ]);
    const indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);


    const vertexArray = gl.createVertexArray();
    const vert2dId = gl.getAttribLocation(program, 'vert2d');
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.enableVertexAttribArray(vert2dId);
    gl.vertexAttribPointer(vert2dId, 2, gl.FLOAT, false, 0, 0);
    
    const screenLoc = gl.getUniformLocation(program, 'screen');
    const timeLoc = gl.getUniformLocation(program, 'time');

    const draw = (time) => {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
       
        gl.uniform2f(screenLoc, canvas.width, canvas.height);
        gl.uniform1f(timeLoc, time); 
    
        gl.bindVertexArray(vertexArray);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

        const error = gl.getError();
        if (error !== gl.NO_ERROR) console.log(error);
    };

    const loop = (time) => {
        draw(time);
        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
})();
