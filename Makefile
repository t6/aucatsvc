SASSC?=	sassc
KORE?=	kore
INOTIFYWAIT?=	inotifywait

SCSS_SRC=	src/app.scss \
		src/_inputrange.scss \
		src/_piano.scss \
		src/_toolbar.scss

all: aucatsvc.so

run: all
	${KORE} run

aucatsvc.so: src/aucatsvc.c assets/app.css assets/app.js assets/index.html
	${KORE} build

assets/app.css: ${SCSS_SRC}
	${SASSC} -t compressed src/app.scss assets/app.css

lint: assets/app.js
	@jshint --verbose --reporter unix $>

watch: all
	@${INOTIFYWAIT} -q -m -e close_write src assets | \
		while read -r filename event; do ${MAKE} lint all || true; done

clean:
	rm -f assets/app.css
	${KORE} clean
