SASSC?=	sassc
KORE?=	kore

all: assets/app.css aucatsvc.so

run: all
	${KORE} run

aucatsvc.so: src/aucatsvc.c
	${KORE} build

assets/app.css: src/app.scss src/_inputrange.scss src/_piano.scss
	${SASSC} -t compressed src/app.scss > assets/app.css

clean:
	rm -f assets/app.css
	${KORE} clean
