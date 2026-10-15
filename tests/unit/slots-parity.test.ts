import { it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const positions=vi.hoisted(()=>({queue:[] as number[]}));
vi.mock('node:crypto',()=>({randomInt:()=>positions.queue.shift()}));
import { spin } from '../../backend/src/slots';
const require=createRequire(import.meta.url);
const E=require('../../js/tragamonedas_engine.js').SlotEngine;
it('cliente y backend coinciden en las 40³ paradas: pesos, retorno y RTP exactos',()=>{
 const strip=Object.keys(E.WEIGHTS).flatMap(s=>Array(E.WEIGHTS[s]).fill(s));
 let payout=0;
 for(let a=0;a<40;a++)for(let b=0;b<40;b++)for(let c=0;c<40;c++){
   positions.queue=[a,b,c];const server=spin(100);
   expect(server.symbols).toEqual([strip[a],strip[b],strip[c]]);
   expect(server.payout).toBe(E.evaluate(server.symbols,100).payout);
   payout+=server.payout;
 }
 expect(payout/(64000*100)).toBe(E.analyze().rtp);
},15000);
