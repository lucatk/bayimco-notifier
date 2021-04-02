import axios from 'axios'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import tough from 'tough-cookie'
import { v4 as uuidv4 } from 'uuid'

import cheerio from 'cheerio'

import TelegramBot from 'node-telegram-bot-api'

import { CITIZENS_API_URL, AUTH_INIT_URL, AUTH_TOKEN_URL, TELEGRAM_BOT_TOKEN } from './constants.js'

axiosCookieJarSupport.default(axios)

const tgBot = new TelegramBot(TELEGRAM_BOT_TOKEN)

async function checkForAppointments(email, password, citizenId, telegramId) {
  const cookieJar = new tough.CookieJar()

  let res = await axios.get(AUTH_INIT_URL, {
    jar: cookieJar,
    withCredentials: true,
    params: {
      nonce: uuidv4()
    }
  })
  const doc = cheerio.load(res.data)
  const authUrl = doc('#kc-form-login').attr('action')

  let postParams = new URLSearchParams()
  postParams.append('username', email)
  postParams.append('password', password)
  postParams.append('credentialId', '')
  res = await axios.post(authUrl, postParams, {
    jar: cookieJar,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    maxRedirects: 0,
    validateStatus: null
  })

  const locationUrl = res.headers.location

  const queryString = new RegExp('([^#]+)#(.*)?', 'g').exec(locationUrl)[2]
  const { code } = queryString.split('&').reduce((obj, param) => {
    const [key, value] = param.split('=')
    return {
      ...obj,
      [key]: value,
    }
  }, {})

  postParams = new URLSearchParams()
  postParams.append('code', code)
  postParams.append('grant_type', 'authorization_code')
  postParams.append('client_id', 'c19v-frontend')
  postParams.append('redirect_uri', 'https://impfzentren.bayern/citizen/')
  res = await axios.post(AUTH_TOKEN_URL, postParams, {
    jar: cookieJar,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  const authorization = res.data
  
  try {
    res = await axios.get(`${CITIZENS_API_URL}/${citizenId}/appointments/next`, {
      jar: cookieJar,
      withCredentials: true,
      params: {
        timeOfDay: 'ALL_DAY',
        lastDate: '2021-04-02',
        lastTime: '00:00',
      },
      headers: {
        'Authorization': `Bearer ${authorization.access_token}`,
      },
    })
  } catch (error) {
    res = error.response
  }
  if (!`${res.data.status}`.startsWith('4')) {
    await notifyHasAppointments(telegramId, citizenId)
  }
}

let hadError = false
const run = async () => {
  try {
    console.log('Checking for appointments.')
    await checkForAppointments(process.env.EMAIL, process.env.PASSWORD, process.env.CITIZEN_ID, process.env.TELEGRAM_ID)
  } catch (error) {
    console.log('An error occurred:', error)
    if (!hadError) {
      hadError = true
      await notifyError(process.env.TELEGRAM_ID, process.env.CITIZEN_ID, error)
    }
  }
}

async function sendStartMessage(telegramId, citizenId) {
  return tgBot.sendMessage(telegramId, `Notifying you of BayIMCO appointments for citizen id ${citizenId}.`)
}

async function notifyError(telegramId, citizenId, error) {
  return tgBot.sendMessage(telegramId, `An error occurred for citizen id ${citizenId}: ${error}`)
}

async function notifyHasAppointments(telegramId, citizenId) {
  return tgBot.sendMessage(telegramId, `There were appointments found for ${citizenId}!`)
}

sendStartMessage(process.env.TELEGRAM_ID, process.env.CITIZEN_ID).then(() => {
  const interval = process.env.INTERVAL || 900
  setInterval(run, interval * 1000)
  console.log(`Notifier is up. Checking every ${interval} seconds.`)
  
  run()
})
