#!/usr/bin/env node
console.log(JSON.stringify({ cwd: process.cwd(), argv: process.argv.slice(2) }));
