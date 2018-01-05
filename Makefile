all:
	mkdir -p tutorial/build
	TWEEGO_PATH=./tutorial $(GOPATH)/bin/tweego -o tutorial/build/index.html src tutorial/src

clean:
	rm -rf build
