# Buttplug Twine Libraries

[![Patreon donate button](https://img.shields.io/badge/patreon-donate-yellow.svg)](https://www.patreon.com/qdot)
[![Discourse Forum](https://img.shields.io/badge/discourse-forum-blue.svg)](https://metafetish.club)
[![Discord](https://img.shields.io/discord/353303527587708932.svg?logo=discord)](https://discord.buttplug.io)
[![Twitter](https://img.shields.io/twitter/follow/buttplugio.svg?style=social&logo=twitter)](https://twitter.com/buttplugio)

This repo contains examples and macros for using the [Buttplug Sex Toy
Control Protocol](https://github.com/buttplugio/buttplug) with the
[Twine Interactive Fiction Engine](http://twinery.org).

## Table Of Contents

- [Buttplug](#buttplug)
- [Installation](#installation)
- [Tutorial](#tutorial)
- [Projects Using buttplug-twine](#projects-using-buttplug-twine)
- [Support The Project](#support-the-project)
- [License](#license)

## Buttplug

For more information on the Buttplug Sex Toy Control Protocol, visit
the main repo at

[https://github.com/buttplugio/buttplug](https://github.com/buttplugio/buttplug)

There, you can find more information on the protocol, as well as
library implementations and other applications using the protocol.

## Installation

For the moment, most of the files in this repo will require direct
integration into your twine project. You can either check the repo
out, or just cut/paste code and macros out of the relevant file in the
src directory as needed.

## Tutorial

A tutorial on using buttplug-twine with Twine v2 with Sugarcube v2 is
available at:

[https://buttplug-twine-tutorial.docs.buttplug.io](https://buttplug-twine-tutorial.docs.buttplug.io)

Building the tutorial requires
[tweego](https://bitbucket.org/tmedwards/tweego), which in turn will
require the go language environment installed on your machine.

To install tweego using our Makefile, you can run

```
make install
```

This will install the tweego package for you, or upgrade it if it's
already installed.

Once you have tweego installed, you can just run "make" and it will
build the tutorial into the "build" directory.

## Projects Using buttplug-twine

- [Buttplug
  Tutorial](https://github.com/buttplugio/buttplug-tutorial) -
  buttplug-twine was built as the base of the tutorial system for
  setting up the Buttplug Application suite. We're not just the
  developers, we're also users!

## Support The Project

If you find this project helpful, you can [support us on
Patreon](http://patreon.com/qdot)! Every donation helps us afford more
hardware to reverse, document, and write code for!

## License

buttplug-js is BSD 3-Clause licensed.

    Copyright (c) 2017-2018, Nonpolynomial Labs, LLC
    All rights reserved.
    
    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:
    
    * Redistributions of source code must retain the above copyright notice, this
      list of conditions and the following disclaimer.
    
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    
    * Neither the name of the project nor the names of its
      contributors may be used to endorse or promote products derived
      from this software without specific prior written permission.
    
    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
    FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
    DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
    SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
    CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
    OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
