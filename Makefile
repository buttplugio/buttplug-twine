all:
	mkdir -p build
	TWEEGO_PATH=. $(GOPATH)/bin/tweego -o build/index.html tutorial src

clean:
	rm -rf build
