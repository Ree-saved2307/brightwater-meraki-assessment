import {test} from 'node:test';import assert from 'node:assert/strict';import {signature,validSignature,escapeXml} from '../lib/plivo';
test('Plivo V3 authentication covers URL and speech body',()=>{const url='https://example.com/api/plivo/input?turn=1',fields={CallUUID:'test-call',Speech:'Hello'},nonce='test-nonce',token='test-secret';const h=new Headers({'x-plivo-signature-v3':signature(url,fields,nonce,token),'x-plivo-signature-v3-nonce':nonce});assert.equal(validSignature(url,fields,h,token),true);assert.equal(validSignature(url,{...fields,Speech:'tampered'},h,token),false);assert.equal(validSignature(url+'x',fields,h,token),false);assert.equal(validSignature(url,fields,new Headers(),token),false);assert.equal(validSignature(url,fields,h,''),false);});
test('Telephone output escapes model text as XML data',()=>{assert.equal(escapeXml('<Hangup/> & "hi"'),'&lt;Hangup/&gt; &amp; &quot;hi&quot;');});

test("matches official Plivo Python SDK V3 fixtures",()=>{
assert.equal(signature('https://example.com/api/plivo/answer',{CallUUID:"test-call",Speech:"Hello"},"test-nonce","test-secret"),'cjh9UYxR9gzBrtUdD2NYO94yrZxdXB6tua2Aihz8Vs4=');
assert.equal(signature('https://example.com/api/plivo/input?turn=1',{CallUUID:"test-call",Speech:"Hello"},"test-nonce","test-secret"),'fRVG88xSBMZlAiCQDQpLnzGQTyLpezwnyDAPDhxSfbI=');
});
