function annotate (target, key, options = {}) {
  if (!target._annotations) {
    target._annotations = new Map()
  }

  target._annotations.set(key, options)
}

function createSimpleAnnotation (annotationKey) {
  const annotation = function (options = {}) {
    return function decorator (target) {
      if (target.kind === 'method') {
        annotate(target.descriptor.value, annotationKey, options)
      } else {
        throw new Error('unsupported simple annotation type')
      }
    }
  }

  annotation._annotationKey = annotationKey
  return annotation
}

function getAnnotation (target, annotation) {
  if (!target._annotations) {
    return null
  }

  return target._annotations.get(annotation._annotationKey) || null
}

function lookupClassFunctionsWithAnnotation (klass, key) {
  if (!klass.prototype) {
    return []
  }

  const results = []
  for (const name of Object.getOwnPropertyNames(klass.prototype)) {
    if (typeof klass.prototype[name] !== 'function') {
      continue
    }

    if (getAnnotation(klass.prototype[name], key)) {
      results.push(klass.prototype[name])
    }
  }

  return [...results, ...lookupClassFunctionsWithAnnotation(Object.getPrototypeOf(klass), key)]
}

module.exports = {
  annotate,
  getAnnotation,
  createSimpleAnnotation,
  lookupClassFunctionsWithAnnotation
}
