all:
	mkdir -p build
	TWEEGO_PATH=. $(GOPATH)/bin/tweego -f SugarCube-2 -o build/tutorial.html tutorial src

clean:
	rm -rf build
