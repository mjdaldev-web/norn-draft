const assert = require("assert");
const limits = require("../shared/draft-limits.js");

assert.equal(limits.getLimit("prompt", undefined), 12000);
assert.equal(limits.getLimit("context", undefined), 4000);
assert.equal(limits.getLimit("prompt", 500), 1000);
assert.equal(limits.getLimit("prompt", 25000), 20000);
assert.equal(limits.getLimit("context", 25000), 8000);
assert.equal(limits.getLimit("prompt", "18000"), 18000);
assert.equal(limits.getLimit("unknown", "bad"), 12000);

console.log("draft-limits tests passed");
