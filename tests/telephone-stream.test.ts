import {test} from 'node:test';import assert from 'node:assert/strict';
import {ReplyGeneration,ulawRms,tokenHash} from '../lib/telephone-stream';
test('barge-in aborts old work and rejects stale reply generations',()=>{const g=new ReplyGeneration(),old=g.controller.signal,n=g.generation;g.interrupt();assert.equal(old.aborted,true);assert.equal(g.current(n),false);assert.equal(g.current(g.generation),true);for(let i=0;i<100;i++)g.interrupt();assert.equal(g.current(n),false);});
test('mu-law silence does not trigger energy interruption',()=>{assert.equal(ulawRms(Buffer.alloc(160,255)),0);assert.ok(ulawRms(Buffer.alloc(160,0))>650);assert.equal(ulawRms(Buffer.alloc(0)),0);});
test('stream lease stores a digest instead of the bearer token',()=>{const t='a'.repeat(64);assert.notEqual(tokenHash(t),t);assert.equal(tokenHash(t).length,64);assert.notEqual(tokenHash(t),tokenHash('b'.repeat(64)));});
