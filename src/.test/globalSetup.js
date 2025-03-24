import process from 'process'

async function setup() {
    process.env.NODE_ENV = 'test'
}

export { setup }
