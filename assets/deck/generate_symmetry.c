/* Symmetric icons after Field & Golubitsky. Build with cc -O3 -o /tmp/symmetry generate_symmetry.c -lm.
   Usage: /tmp/symmetry m lambda alpha beta gamma omega iterations output.bin [scale]
   Writes a native-endian 1200x900 uint32 density histogram for color_symmetry.py. */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#define W 1200
#define H 900
static double x, y;
static void step(int m, double l, double a, double b, double g, double o) {
  double pr=1, pi=0;
  for (int k=0; k<m-1; ++k) { double t=pr*x-pi*y; pi=pr*y+pi*x; pr=t; }
  double real_m=pr*x-pi*y;
  double radial=l+a*(x*x+y*y)+b*real_m;
  double nx=radial*x-o*y+g*pr;
  double ny=radial*y+o*x-g*pi;
  x=nx; y=ny;
}
int main(int argc, char **argv) {
  if (argc != 9 && argc != 10) return 2;
  int m=atoi(argv[1]); double l=atof(argv[2]), a=atof(argv[3]), b=atof(argv[4]), g=atof(argv[5]), o=atof(argv[6]);
  long count=atol(argv[7]); double extent=argc == 10 ? atof(argv[9]) : .46;
  if (extent <= 0 || extent >= .5) return 2;
  x=.1; y=.3214;
  double bound=0;
  for (int i=0;i<201000;i++) { step(m,l,a,b,g,o); if (!isfinite(x)||!isfinite(y)||fabs(x)>100||fabs(y)>100) return 3; if(i>1000) { if(fabs(x)>bound) bound=fabs(x); if(fabs(y)>bound) bound=fabs(y); } }
  if (bound < .01) return 4;
  uint32_t *hist=calloc(W*H,sizeof(*hist)); if (!hist) return 5;
  /* A square plot centred in the landscape card art. The optional extent lets
     normal cards fit their 16:9.6 art window; Amazing uses its own cut-out. */
  double scale=(H*extent)/bound;
  for(long i=0;i<count;i++) { step(m,l,a,b,g,o); int ix=(int)(W*.5+x*scale), iy=(int)(H*.5-y*scale); if(ix>=0 && ix<W && iy>=0 && iy<H) hist[iy*W+ix]++; }
  FILE *out=fopen(argv[8],"wb"); if(!out) return 6;
  if(fwrite(hist,sizeof(*hist),W*H,out)!=(size_t)W*H) return 7;
  fclose(out); free(hist); fprintf(stderr,"bound %.5f\n",bound); return 0;
}
