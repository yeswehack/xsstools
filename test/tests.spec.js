mocha.setup({
    require: ['esm', '@babel/register'],
    ui: 'bdd',
    reporter: 'spec',
    growl: false,
})