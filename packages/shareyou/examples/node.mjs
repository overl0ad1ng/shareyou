import shareyou, { templater } from '@shareyou/core';

console.log(shareyou.templater('Hello, {{name:string}}!', { name: 'Shareyou' }));
console.log(templater('{{count:number!}} messages.', { count: 3 }));
