const configfile = require('./config.json')
const generateRandomColor = require('generate-random-color')
const crypto = require('crypto')
const open = require('open')
const ChartJSImage = require('chart.js-image')
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
let rt = []
let type = []
let dataset = []

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
  perf.start('interact')
  // call the Voiceflow API with the user's name & request, get back a response
  const response = await axios({
    method: 'POST',
    url: `https://general-runtime.voiceflow.com/state/user/${userID}/interact`,
    headers: { Authorization: API_KEY },
    data: { request },
  })
  const results = perf.stop('interact')
  rt.push(results.time)
  console.log('')
  console.log('')
  if (request.type == 'launch') {
    console.log(notice('Launch'))
  }
  console.log(msg('DM API response time:', results.preciseWords))
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

async function main(loop, pause) {
  process.stdout.write(clc.reset)
  var text =
    '....................\n' +
    '. DM API BENCHMARK .\n' +
    '....................\n'
  var style = { '.': clc.cyanBright('X') }
  process.stdout.write(clc.art(text, style))
  console.log('')
  await getNetworkDownloadSpeed()
  console.log('')

  for (x = 0; x < loop; x++) {
    rt = []
    type = []
    const userID = crypto.randomUUID()
    //var rightNow = new Date().toLocaleString()
    var text = '. TEST ' + (x + 1) + ' .\n'
    var style = { '.': clc.cyanBright('X') }
    process.stdout.write(clc.art(text, style))

    for (t = 0; t < configfile.tests.length; t++) {
      type.push(configfile.tests[t].label || 'Test')
      await interact(userID, configfile.tests[t].payload)
      sleep(configfile.delay || 0)
    }

    if (x != loop - 1) {
      console.log('')
      if (pause != 0) {
        console.log(notice('Sleep for ' + pause + ' seconds'))
        sleep(pause * 1000)
      }
      console.log('')
    } else {
      console.log('')
      console.log(notice('Benchmark ended!'))
      console.log('')
    }
    let color = generateRandomColor.rgba({
      r: { min: 0, max: 255 },
      g: { min: 0, max: 255 },
      b: { min: 0, max: 255 },
      a: { min: 0.6, max: 0.6 },
    })
    dataset.push({
      fill: true,
      borderSkipped: true,
      data: rt,
      label: 'T' + (x + 1),
      backgroundColor: color,
      borderColor: color,
      borderWidth: 0.1,
      barPercentage: 0.0,
    })
  }
  makeChart(type, dataset)
}

main(configfile.cycles || 5, configfile.pause || 0)

async function makeChart(type, dataset) {
  const line_chart = ChartJSImage()
    .chart({
      type: 'bar',
      data: {
        labels: type,
        datasets: dataset,
      },
      options: {
        title: {
          display: true,
          text: 'DM API Benchmark',
        },
        scales: {
          xAxes: [
            {
              stacked: false,
              scaleLabel: {
                display: false,
                labelString: 'Type',
              },
            },
          ],
          yAxes: [
            {
              stacked: false,
              scaleLabel: {
                display: true,
                labelString: 'ms',
              },
            },
          ],
        },
      },
    })
    .backgroundColor('white')
    .width(1200)
    .height(800)

  //line_chart.toURL(); // String: https://image-charts.com/chart.js/2.8.0?icac=documentation&chart=%7Btype%3A%27line%27%2Cdata%3A%7Blabels%3A%5B%27January%27%2C%27February%27%2C%27March%27%2C%27April%27%2C%27May%27%2C%27June%27%2C%27July%27%5D%2Cdatasets%3A%5B%7Blabel%3A%27My+First+dataset%27%2CborderColor%3A%27rgb%28255%2C+99%2C+132%29%27%2CbackgroundColor%3A%27rgba%28255%2C+99%2C+132%2C+.5%29%27%2Cdata%3A%5B57%2C90%2C11%2C-15%2C37%2C-37%2C-27%5D%7D%2C%7Blabel%3A%27My+Second+dataset%27%2CborderColor%3A%27rgb%2854%2C+162%2C+235%29%27%2CbackgroundColor%3A%27rgba%2854%2C+162%2C+235%2C+.5%29%27%2Cdata%3A%5B71%2C-36%2C-94%2C78%2C98%2C65%2C-61%5D%7D%2C%7Blabel%3A%27My+Third+dataset%27%2CborderColor%3A%27rgb%2875%2C+192%2C+192%29%27%2CbackgroundColor%3A%27rgba%2875%2C+192%2C+192%2C+.5%29%27%2Cdata%3A%5B48%2C-64%2C-61%2C98%2C0%2C-39%2C-70%5D%7D%2C%7Blabel%3A%27My+Third+dataset%27%2CborderColor%3A%27rgb%28255%2C+205%2C+86%29%27%2CbackgroundColor%3A%27rgba%28255%2C+205%2C+86%2C+.5%29%27%2Cdata%3A%5B-58%2C88%2C29%2C44%2C3%2C78%2C-9%5D%7D%5D%7D%2Coptions%3A%7Bresponsive%3Atrue%2Ctitle%3A%7Bdisplay%3Atrue%2Ctext%3A%27Chart.js+Line+Chart+-+Stacked+Area%27%7D%2Ctooltips%3A%7Bmode%3A%27index%27%7D%2Chover%3A%7Bmode%3A%27index%27%7D%2Cscales%3A%7BxAxes%3A%5B%7BscaleLabel%3A%7Bdisplay%3Atrue%2ClabelString%3A%27Month%27%7D%7D%5D%2CyAxes%3A%5B%7Bstacked%3Atrue%2CscaleLabel%3A%7Bdisplay%3Atrue%2ClabelString%3A%27Value%27%7D%7D%5D%7D%7D%7D&bkg=white&width=700&height=390&icretina=1&ichm=922e17b749b1ab7fab2a14cb742029dc46e50e658457913a9f548793910d2a0d
  //line_chart.toDataURI(); // Promise<String> : data:image/png;base64,iVBORw0KGgo...
  await line_chart.toFile('chart.png')
  open('chart.png', { wait: false })
  process.kill(process.pid, 'SIGTERM')
}

function sleep(milliseconds) {
  const date = Date.now()
  let currentDate = null
  do {
    currentDate = Date.now()
  } while (currentDate - date < milliseconds)
}

process.on('SIGTERM', () => {})
