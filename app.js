require('dotenv').config()
const configfile = require('./config.json')
const crypto = require('crypto')
const axios = require('axios')
const { cli } = require('cli-ux')
const NetworkSpeed = require('network-speed')
const testNetworkSpeed = new NetworkSpeed()
const perf = require('execution-time')()
var clc = require('cli-color')
var error = clc.red.bold
var warn = clc.yellow
var notice = clc.blue
var msg = clc.xterm(202).bgXterm(236)

const API_KEY = configfile.apiKey

async function getNetworkDownloadSpeed() {
  const baseUrl = 'https://eu.httpbin.org/stream-bytes/500000'
  const fileSizeInBytes = 500000
  const speed = await testNetworkSpeed.checkDownloadSpeed(
    baseUrl,
    fileSizeInBytes
  )
  console.log(msg('Network Speed:', speed.mbps, 'Mbps'))
}

// send an interaction to the Voiceflow API, and log the response, returns true if there is a next step
async function interact(userID, request) {
  // console.log('...')
  perf.start('interact')
  // call the Voiceflow API with the user's name & request, get back a response
  const response = await axios({
    method: 'POST',
    url: `https://general-runtime.voiceflow.com/state/user/${userID}/interact`,
    headers: { Authorization: API_KEY },
    data: { request },
  })
  const results = perf.stop('interact')
  //console.log(results.time) // in milliseconds
  console.log(msg('DM API response time:', results.preciseWords)) // in words

  // loop through the response
  for (const trace of response.data) {
    switch (trace.type) {
      case 'text':
      case 'speak': {
        console.log(trace.payload.message)
        break
      }
      case 'end': {
        // an end trace means the the Voiceflow dialog has ended
        return false
      }
    }
  }
  return true
}

async function main() {
  process.stdout.write(clc.reset)
  var text = '...............\n' + '. DM API TEST .\n' + '...............\n'
  var style = { '.': clc.cyanBright('X') }
  process.stdout.write(clc.art(text, style))
  console.log('')
  await getNetworkDownloadSpeed()
  console.log('')
  const userID = crypto.randomUUID()
  // send a simple launch request starting the dialog
  console.log(notice('Launch')) // in words
  let isRunning = await interact(userID, { type: 'launch' })
  while (isRunning) {
    console.log('')
    const nextInput = await cli.prompt('> Type something')
    // send a simple text type request with the user input
    isRunning = await interact(userID, { type: 'text', payload: nextInput })
  }
  console.log('The end! Start me again with `npm start`')
}

main()
