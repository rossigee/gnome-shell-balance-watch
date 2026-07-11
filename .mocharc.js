module.exports = {
  spec: 'test/**/*.ts',
  require: 'ts-node/register',
  types: ['mocha', 'tsx'],
  nodeArguments: ['--loader=tsx'],
  timeout: 5000,
};