all:
	mkdir -p tutorial/build
	TWEEGO_PATH=./tutorial $(GOPATH)/bin/tweego -o tutorial/build/index.html src tutorial/src

install:
	go get -u bitbucket.org/tmedwards/tweego

upgrade:
	go get -u bitbucket.org/tmedwards/tweego

clean:
	rm -rf build
