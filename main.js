'use strict'; 

let gl;                         
let surfaceU;                    // Модель для U-ліній
let surfaceV;                    // Модель для V-ліній
let shProgram;                   
let spaceball;                   

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Constructor for a Model that supports multiple line segments
function Model(name) {
    this.name = name;
    this.vertexBuffers = [];  // Array to store multiple buffers
    this.counts = [];         // Array to store the number of vertices per line

    this.BufferData = function(lines) {
        for (let vertices of lines) {
            let buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
            this.vertexBuffers.push(buffer);
            this.counts.push(vertices.length / 3);
        }
    }

    this.Draw = function() {
        for (let i = 0; i < this.vertexBuffers.length; i++) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers[i]);
            gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shProgram.iAttribVertex);
            gl.drawArrays(gl.LINE_STRIP, 0, this.counts[i]);
        }
    }
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function draw() { 
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI / 8, 1, 2, 10);  
    let modelView = spaceball.getViewMatrix();
    let scaleMatrix = m4.scaling(0.4, 0.4, 0.4);  
    let rotateToPointZero = m4.axisRotation([0.600, 0.600, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -25);  

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let matAccum2 = m4.multiply(scaleMatrix, matAccum1);
    let modelViewProjection = m4.multiply(projection, matAccum2);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    // Draw U-lines
    gl.uniform4fv(shProgram.iColor, [1, 0, 0, 1]);  // Red color for U-lines
    surfaceU.Draw();

    // Draw V-lines
    gl.uniform4fv(shProgram.iColor, [0, 1, 0, 1]);  // Green color for V-lines
    surfaceV.Draw();
}

function CreateULines() {
    let lines = [];
    let n = 720;
    let m = 100;
    let radius = 1.2;
    let height = 5;
    let frequency = 5;

    for (let i = 0; i < n; i += 60) {
        let theta = deg2rad(i);
        let line = [];

        for (let j = 0; j <= m; j++) {
            let t = j / m;
            let y = height * t;
            let r = radius * Math.sin(frequency * Math.PI * t);
            let x = r * Math.cos(theta);  
            let z = r * Math.sin(theta);

            line.push(x, y, z);
        }
        lines.push(line);
    }

    return lines;
}

function CreateVLines() {
    let lines = [];
    let n = 720;
    let m = 100;
    let radius = 1.2;
    let height = 5;
    let frequency = 5;

    for (let j = 0; j <= m; j += 5) {
        let line = [];
        let t = j / m;
        let y = height * t;
        let r = radius * Math.sin(frequency * Math.PI * t);

        for (let i = 0; i < n; i += 10) {
            let theta = deg2rad(i);
            let x = r * Math.cos(theta);
            let z = r * Math.sin(theta);

            line.push(x, y, z);
        }
        lines.push(line);
    }

    return lines;
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    surfaceU = new Model('U-Lines');
    surfaceU.BufferData(CreateULines());

    surfaceV = new Model('V-Lines');
    surfaceV.BufferData(CreateVLines());

    gl.enable(gl.DEPTH_TEST);
}

// Function to create and link a WebGL program
function createProgram(gl, vShaderSource, fShaderSource) {
    let vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vShaderSource);
    gl.compileShader(vShader);
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        throw new Error('Error in vertex shader: ' + gl.getShaderInfoLog(vShader));
    }

    let fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fShaderSource);
    gl.compileShader(fShader);
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        throw new Error('Error in fragment shader: ' + gl.getShaderInfoLog(fShader));
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error('Link error in program: ' + gl.getProgramInfoLog(prog));
    }

    return prog;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    draw();
}
