import process from 'process'

async function setup() {
    console.log(process.env.NODE_ENV)
}

export { setup }
