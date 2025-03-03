import tracer from 'dd-trace'
tracer.init({
  logInjection: true,
}) // initialized in a different file to avoid hoisting.

tracer.use('express')
tracer.use('fetch')
tracer.use('winston')

export default tracer
