import shareyou, { templater } from '@shareyou/templater';

console.log('1. Basic interpolation');
console.log(
  shareyou.templater(
    'This is a template. {{name}}',
    { name: 'Hello, Shareyou!' }
  )
);

console.log('\n2. Matching type constraints');
console.log(
  templater(
    '{{name:string}} has {{count:number!}} messages.',
    { name: "123", count: 3 }
  )
);

console.log('\n3. A mismatch warns and still returns a string');
console.log(
  shareyou.templater(
    'This value must be of type string: {{name:string}}',
    { name: 123 }
  )
);

console.log('\n4. Strict mode throws a TypeError');
try {
  shareyou.templater(
    'This value must be of type string: {{name:string!}}',
    { name: 123 }
  );
} catch (error) {
  if (!(error instanceof TypeError)) throw error;
  console.log(`${error.name}: ${error.message}`);
}
