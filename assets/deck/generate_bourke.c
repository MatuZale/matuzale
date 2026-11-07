/* Original escape-time renderer for Thorn / Secant Sea and the rational
   Reuleaux triangle map. Mathematical definitions, not source code, from:
   https://paulbourke.net/fractals/thorn/
   https://paulbourke.net/fractals/triangle/
   Build: cc -O3 -o /tmp/bourke generate_bourke.c -lm
   Arguments: family width height maxiter bailout cx cy centrex centrey span rotation channels output
   family 0: x'=x/cos(y)+cx, y'=y/sin(x)+cy, simultaneous old coordinates.
   family 1: z'=z*z+(cx+i*cy)/z. The source uses cx=-1.7/3, cy=0.
   Output native float32: smooth escape count, closest radius, final argument,
   and escape indicator (one per pixel). Zero denominators are poles, not NaN.
*/
#include <math.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
  if(argc!=13) return 2;
  int family=atoi(argv[1]), w=atoi(argv[2]), h=atoi(argv[3]), limit=atoi(argv[4]);
  double bailout=atof(argv[5]), cx=atof(argv[6]), cy=atof(argv[7]);
  double ox=atof(argv[8]), oy=atof(argv[9]), span=atof(argv[10]), angle=atof(argv[11]);
  if((family!=0 && family!=1) || w<1 || h<1 || limit<1 || bailout<=1 || span<=0) return 2;
  FILE *out=fopen(argv[12],"wb"); if(!out) return 3;
  float *row=calloc((size_t)w*4,sizeof(float)); if(!row) return 4;
  double cr=cos(angle), sr=sin(angle), lr=log(bailout);
  for(int j=0;j<h;j++) {
    for(int i=0;i<w;i++) {
      double u=((i+.5)/w-.5)*span, v=(.5-(j+.5)/h)*span*h/w;
      double x=ox+u*cr-v*sr, y=oy+u*sr+v*cr;
      double closest=hypot(x,y), smooth=limit, theta=atan2(y,x); int escaped=0;
      for(int n=0;n<limit;n++) {
        double px=x,py=y,old=hypot(x,y);
        if(family==0) {
          double co=cos(py), si=sin(px);
          if(fabs(co)<1e-15 || fabs(si)<1e-15) { smooth=n; escaped=1; break; }
          x=px/co+cx; y=py/si+cy;
        } else {
          double d=px*px+py*py;
          if(d<1e-30) { smooth=n; escaped=1; break; }
          x=px*px-py*py+(cx*px+cy*py)/d;
          y=2*px*py+(cy*px-cx*py)/d;
        }
        double r=hypot(x,y); if(r<closest)closest=r;
        if(!isfinite(r) || r>bailout) {
          theta=atan2(y,x); escaped=1;
          double lognew=log(fmax(r,1.00001)), logold=log(fmax(old,1e-30));
          double fraction=(lr-logold)/fmax(lognew-logold,1e-15);
          smooth=n+fmax(0,fmin(1,fraction));
          break;
        }
      }
      row[4*i]=(float)smooth; row[4*i+1]=(float)closest;
      row[4*i+2]=(float)theta; row[4*i+3]=(float)escaped;
    }
    if(fwrite(row,sizeof(float),(size_t)w*4,out)!=(size_t)w*4)return 5;
  }
  fclose(out);free(row);return 0;
}
