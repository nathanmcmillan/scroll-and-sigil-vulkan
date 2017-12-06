uniform mat4 u_mvp;
            
attribute vec4 a_position;
attribute vec4 a_color;
            
varying vec4 v_color;
            
void main() {
  v_color = a_color;
  gl_Position = u_mvp * a_position;
}