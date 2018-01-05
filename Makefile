all:
	mkdir -p build
	TWEEGO_PATH=. $(GOPATH)/bin/tweego -f SugarCube-2 -o build/index.html tutorial src

clean:
	rm -rf build
