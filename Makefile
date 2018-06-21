all:
	mkdir -p tutorial/build
	TWEEGO_PATH=./tutorial $(GOPATH)/bin/tweego -o tutorial/build/index.html src tutorial/src

install:
  go install https://buttplugio.github.io/buttplug-twine

upgrade:
  go get -u https://buttplugio.github.io/buttplug-twine

clean:
	rm -rf build
