# id3v2

[![GitHub license](https://img.shields.io/github/license/KnisterPeter/id3v2.svg)]()
[![Travis](https://img.shields.io/travis/KnisterPeter/id3v2.svg)](https://travis-ci.org/KnisterPeter/id3v2)
[![npm](https://img.shields.io/npm/v/id3v2.svg)](https://www.npmjs.com/package/id3v2)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![renovate badge](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovateapp.com/)

Read ID3v2 metadata.

## Usage

### Installation

Install as npm package:

```sh
npm install id3v2 --save
```

Install latest development version:

```sh
npm install id3v2@next --save
```

### API

```js
import { ID3v2 } from 'id3v2';

const tag = new ID3v2('/path/to/test.mp3');
console.log(tag.title);
```
