SASSC?=	sassc
KORE?=	kore
INOTIFYWAIT?=	inotifywait

all: aucatsvc.so

run: all
	${KORE} run

aucatsvc.so: src/aucatsvc.c assets/app.css assets/app.js assets/index.html
	${KORE} build

assets/app.css: src/app.scss src/_inputrange.scss src/_piano.scss
	${SASSC} -t compressed src/app.scss > assets/app.css

watch:
	@${INOTIFYWAIT} -q -m -e close_write src assets | \
		while read -r filename event; do ${MAKE} all || true; done

clean:
	rm -f assets/app.css
	${KORE} clean
