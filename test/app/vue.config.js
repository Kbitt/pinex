const path = require('path')

module.exports = {
  chainWebpack: config => {
    config.resolve.alias.set('pinex', path.resolve('../../'))
    config.resolve.alias.set(
      '@vue/composition-api',
      path.resolve('./node_modules/@vue/composition-api')
    )
  },
}
