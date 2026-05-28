// src/algorithm/test.js
import { allocate } from './algorithm';

const result = allocate(350);
console.log('--- $350 shift ---');
console.log('Savings:', result.savings);
console.log('Emergency:', result.emergency);
console.log('Funded:', result.funded.length, 'bills');
console.log('Unfunded:', result.unfunded.length, 'bills');
console.log('Discretionary:', result.discretionary);

const result2 = allocate(3500);
console.log('\n--- $3500 shift ---');
console.log('Savings:', result2.savings);
console.log('Emergency:', result2.emergency);
console.log('Funded:', result2.funded.length, 'bills');
console.log('Unfunded:', result2.unfunded.length, 'bills');
console.log('Discretionary:', result2.discretionary);