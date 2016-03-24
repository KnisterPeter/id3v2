#!/usr/bin/env node
import { ID3v2 } from './index';
console.log(new ID3v2(process.argv[2]));
