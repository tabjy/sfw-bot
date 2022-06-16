function camelToSnakeCase (str) {
  return str.charAt(0).toLowerCase() + str.substring(1).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
}

function kebabToCamelCase (str) {
  return str.replace(/-./g, x => x[1].toUpperCase())
}

function snakeToCamelCase (str) {
  return str.toLowerCase().replace(/_./g, x => x[1].toUpperCase())
}

module.exports = {
  camelToSnakeCase,
  kebabToCamelCase,
  snakeToCamelCase
}
